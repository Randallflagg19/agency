import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CaseCreatePage } from './case-create-page';

describe('CaseCreatePage: создание с фотографией', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CaseCreatePage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-photo');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
  });

  async function setup() {
    const fixture = TestBed.createComponent(CaseCreatePage);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    for (const [selector, value] of [
      ['#case-title', 'Новое дело'],
      ['#case-description', 'Описание'],
    ]) {
      const input = page.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    fixture.detectChanges();
    const submit = () => {
      page
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
    };
    const photo = new File(['image bytes'], 'photo.jpg', { type: 'image/jpeg' });
    const selectPhoto = () => {
      const input = page.querySelector<HTMLInputElement>('#case-photo')!;
      Object.defineProperty(input, 'files', { value: [photo], configurable: true });
      input.dispatchEvent(new Event('change', { bubbles: true }));
      fixture.detectChanges();
    };
    return { fixture, page, submit, selectPhoto, photo };
  }

  it('требует фото до отправки запроса', async () => {
    const { fixture, page, submit } = await setup();
    submit();
    await fixture.whenStable();
    expect(page.querySelector('#case-photo-error')?.textContent).toContain('Добавьте фотографию');
    TestBed.inject(HttpTestingController).expectNone('/api/cases');
  });

  it('отправляет FormData, блокирует повторный submit и открывает полученное дело', async () => {
    const { fixture, page, submit, selectPhoto, photo } = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    selectPhoto();
    submit();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/cases');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('X-Agency-CSRF')).toBe('1');
    expect(request.request.headers.has('Content-Type')).toBe(false);
    const body = request.request.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('photo')).toBe(photo);
    expect(JSON.parse(body.get('draft') as string)).toEqual({
      title: 'Новое дело',
      description: 'Описание',
      category: 'unknown',
      threatLevel: null,
      region: '',
      locationDescription: '',
      address: '',
    });
    expect(page.querySelector<HTMLButtonElement>('[type="submit"]')!.disabled).toBe(true);
    expect(page.querySelector<HTMLInputElement>('#case-photo')!.disabled).toBe(true);
    submit();
    TestBed.inject(HttpTestingController).expectNone('/api/cases');
    request.flush({ id: 'case-0213' });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/cases', 'case-0213']);
  });

  it('сохраняет текст и файл после отказа сервера и позволяет повторить', async () => {
    const { fixture, page, submit, selectPhoto, photo } = await setup();
    selectPhoto();
    submit();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/cases')
      .flush({ message: 'Фотография повреждена.' }, { status: 400, statusText: 'Bad Request' });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(page.textContent).toContain('Фотография повреждена.');
      expect(page.querySelector<HTMLButtonElement>('[type="submit"]')!.disabled).toBe(false);
    });
    expect(page.querySelector<HTMLInputElement>('#case-title')!.value).toBe('Новое дело');
    expect(page.querySelector<HTMLButtonElement>('[type="submit"]')!.disabled).toBe(false);
    submit();
    const retry = TestBed.inject(HttpTestingController).expectOne('/api/cases');
    expect((retry.request.body as FormData).get('photo')).toBe(photo);
    retry.flush({}, { status: 401, statusText: 'Unauthorized' });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(page.textContent).toContain('Войдите снова');
    });
  });
});
