import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import type { AuthState } from '../auth/auth.model';
import { LoginDialog } from '../auth/login-dialog/login-dialog';
import { CasesApi } from '../cases/cases-api';
import { MOCK_CASES } from '../cases/cases.mock';
import { ArchivePage } from './archive-page';

describe('ArchivePage new case access', () => {
  const state = signal<AuthState>({ status: 'unauthenticated' });
  const checkSession = vi.fn(() => state.set({ status: 'loading' }));

  beforeEach(() => {
    state.set({ status: 'unauthenticated' });
    checkSession.mockClear();
    TestBed.configureTestingModule({
      imports: [ArchivePage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { state: state.asReadonly(), checkSession } },
        { provide: CasesApi, useValue: { getCases: () => of(MOCK_CASES) } },
      ],
    });
  });

  async function setup() {
    const open = vi.spyOn(LoginDialog.prototype, 'open').mockImplementation(() => {});
    const close = vi.spyOn(LoginDialog.prototype, 'close').mockImplementation(() => {});
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ArchivePage);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const button = page.querySelector<HTMLButtonElement>('.new-case')!;
    return { fixture, page, button, open, close, navigate };
  }

  afterEach(() => vi.restoreAllMocks());

  it('opens the login dialog for an unauthenticated visitor', async () => {
    const { fixture, button, open, navigate } = await setup();
    button.click();
    await fixture.whenStable();
    expect(open).toHaveBeenCalledExactlyOnceWith(button);
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each(['idle', 'loading'] as const)('waits for a session in state %s', async (status) => {
    state.set({ status });
    const { fixture, button, open, navigate } = await setup();
    button.click();
    await fixture.whenStable();
    expect(button.disabled).toBe(true);
    expect(open).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(checkSession).toHaveBeenCalledTimes(status === 'idle' ? 1 : 0);
    state.set({ status: 'unauthenticated' });
    await fixture.whenStable();
    expect(button.disabled).toBe(false);
    expect(open).toHaveBeenCalledExactlyOnceWith(button);
  });

  it('offers a retry after a session network error without opening login', async () => {
    state.set({ status: 'error' });
    const { fixture, page, button, open, navigate } = await setup();
    button.click();
    await fixture.whenStable();
    expect(page.textContent).toContain('Не удалось проверить служебный допуск');
    expect(open).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    page.querySelector<HTMLButtonElement>('.access-feedback button')!.click();
    await fixture.whenStable();
    expect(checkSession).toHaveBeenCalledOnce();
    expect(button.disabled).toBe(true);
    state.set({ status: 'unauthenticated' });
    await fixture.whenStable();
    expect(open).toHaveBeenCalledExactlyOnceWith(button);
  });

  it.each(['admin', 'researcher'])('checks the role of an existing %s session', async (role) => {
    state.set({ status: 'authenticated', user: { id: 'test-user', login: 'test-user', role } });
    const { fixture, page, button, open, navigate } = await setup();
    expect(navigate).not.toHaveBeenCalled();
    button.click();
    await fixture.whenStable();
    expect(open).not.toHaveBeenCalled();
    if (role === 'admin') {
      expect(navigate).toHaveBeenCalledExactlyOnceWith(['/cases/new']);
    } else {
      expect(navigate).not.toHaveBeenCalled();
      expect(page.textContent).toContain('У вашей учётной записи нет необходимого допуска');
    }
  });

  it.each(['admin', 'researcher'])('checks the role after loggedIn for %s', async (role) => {
    const { fixture, page, button, close, navigate } = await setup();
    button.click();
    await fixture.whenStable();
    // Exercise the component event contract with a synthetic session, without signing in.
    state.set({ status: 'authenticated', user: { id: 'test-user', login: 'test-user', role } });
    const login = fixture.debugElement.children.find(
      (child) => child.componentInstance instanceof LoginDialog,
    )!.componentInstance as LoginDialog;
    login.loggedIn.emit();
    await fixture.whenStable();
    expect(close).toHaveBeenCalledOnce();
    if (role === 'admin') {
      expect(navigate).toHaveBeenCalledExactlyOnceWith(['/cases/new']);
    } else {
      expect(navigate).not.toHaveBeenCalled();
      expect(page.textContent).toContain('У вашей учётной записи нет необходимого допуска');
    }
  });
});
