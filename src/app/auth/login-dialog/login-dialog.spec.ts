import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LoginDialog } from './login-dialog';

describe('LoginDialog', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoginDialog],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function setup() {
    const fixture = TestBed.createComponent(LoginDialog);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const dialog = page.querySelector<HTMLDialogElement>('dialog')!;
    // jsdom has no modal top layer; keyboard and inertness are checked in the browser.
    dialog.showModal = () => {
      dialog.open = true;
    };
    dialog.close = () => {
      dialog.open = false;
      dialog.dispatchEvent(new Event('close'));
    };
    const trigger = document.createElement('button');
    page.append(trigger);
    fixture.componentInstance.open(trigger);
    await fixture.whenStable();
    const login = page.querySelector<HTMLInputElement>('#service-login')!;
    const password = page.querySelector<HTMLInputElement>('#service-password')!;
    const submit = () => {
      page
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
    };
    const fill = (input: HTMLInputElement, value: string) => {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
    };
    return { fixture, page, dialog, trigger, login, password, submit, fill };
  }

  it('validates empty fields through FormRoot without calling the API', async () => {
    const { page, submit } = await setup();
    expect(page.querySelector('#login-errors')).toBeNull();
    submit();
    expect(page.querySelector('#login-errors')?.textContent).toContain('Введите логин');
    expect(page.querySelector('#password-errors')?.textContent).toContain('Введите пароль');
    TestBed.inject(HttpTestingController).expectNone('/api/auth/login');
  });

  it.each([
    [401, 'Неверный логин или пароль.'],
    [429, 'Слишком много попыток входа. Повторите позже.'],
    [503, 'Не удалось выполнить вход. Попробуйте ещё раз.'],
    [0, 'Не удалось выполнить вход. Попробуйте ещё раз.'],
  ])('announces HTTP %s and enables retry', async (status, message) => {
    const { fixture, page, login, password, fill, submit } = await setup();
    fill(login, 'nonexistent-test-user');
    fill(password, ' test-only-value ');
    submit();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/auth/login');
    expect(request.request.headers.get('X-Agency-CSRF')).toBe('1');
    expect(request.request.body.password).toBe(' test-only-value ');
    request.flush(null, { status, statusText: 'Test failure' });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(page.querySelector<HTMLButtonElement>('[type="submit"]')!.disabled).toBe(false);
    });
    expect(page.querySelector('.login-feedback')?.textContent).toContain(message);
    expect(page.querySelector<HTMLButtonElement>('[type="submit"]')!.disabled).toBe(false);
  });

  it('blocks editing, duplicate submission, cancellation and Escape during the request', async () => {
    const { fixture, page, dialog, login, password, fill, submit } = await setup();
    fill(login, 'nonexistent-test-user');
    fill(password, 'test-only-value');
    submit();
    expect(login.matches(':disabled')).toBe(true);
    expect(password.matches(':disabled')).toBe(true);
    expect(page.querySelector<HTMLButtonElement>('[type="submit"]')!.disabled).toBe(true);
    page.querySelector<HTMLButtonElement>('.form-actions [type="button"]')!.click();
    const escape = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(dialog.open).toBe(true);
    submit();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/auth/login');
    request.flush(null, { status: 401, statusText: 'Unauthorized' });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(page.querySelector('fieldset')!.disabled).toBe(false);
    });
    expect(page.querySelector('fieldset')!.disabled).toBe(false);
  });

  it('clears credentials, errors and visibility on cancellation and reopening, restoring focus', async () => {
    const { fixture, page, dialog, trigger, login, password, fill, submit } = await setup();
    expect(document.activeElement).toBe(login);
    fill(login, 'nonexistent-test-user');
    fill(password, 'test-only-value');
    page.querySelector<HTMLButtonElement>('.password-toggle')!.click();
    await fixture.whenStable();
    expect(password.type).toBe('text');
    submit();
    TestBed.inject(HttpTestingController).expectOne('/api/auth/login').flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(page.querySelector('fieldset')!.disabled).toBe(false);
    });
    page.querySelector<HTMLButtonElement>('.form-actions [type="button"]')!.click();
    await fixture.whenStable();
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(password.value).toBe('');
    fixture.componentInstance.open(trigger);
    await fixture.whenStable();
    expect(login.value).toBe('');
    expect(password.type).toBe('password');
    expect(page.querySelector('.login-feedback')?.textContent?.trim()).toBe('');
    expect(page.querySelector('#login-errors')).toBeNull();
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(dialog.open).toBe(false);
  });
});
