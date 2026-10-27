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
    const selectPhoto = (file: File = photo) => {
      const input = page.querySelector<HTMLInputElement>('#case-photo')!;
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
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
    expect(page.querySelector<HTMLInputElement>('#case-title')!.matches(':disabled')).toBe(true);
    expect(page.querySelector<HTMLInputElement>('[type="radio"]')!.matches(':disabled')).toBe(true);
    expect(page.querySelector<HTMLButtonElement>('.remove-photo')!.disabled).toBe(true);
    page.querySelector<HTMLButtonElement>('.remove-photo')!.click();
    selectPhoto(new File(['other bytes'], 'other.png', { type: 'image/png' }));
    expect(page.querySelector('.photo-name')?.textContent).toBe(photo.name);
    submit();
    TestBed.inject(HttpTestingController).expectNone('/api/cases');
    request.flush({ id: 'case-0213' });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/cases', 'case-0213']);
  });

  it('показывает миниатюру и полное имя файла без отправки на сервер', async () => {
    const { fixture, page, selectPhoto } = await setup();
    const file = new File([new Uint8Array(1536)], `${'длинное-имя-'.repeat(10)}.webp`, {
      type: 'image/webp',
    });
    selectPhoto(file);
    await fixture.whenStable();
    expect(page.querySelector('.photo-name')?.textContent).toBe(file.name);
    expect(page.querySelector<HTMLImageElement>('.photo-preview img')!.src).toBe('blob:test-photo');
    expect(page.querySelector('#case-photo-action')?.textContent).toContain('Заменить фотографию');
    expect(page.querySelector<HTMLInputElement>('#case-photo')!.value).toBe('');
    TestBed.inject(HttpTestingController).expectNone('/api/cases');
  });

  it('очищает выбор, освобождает предпросмотр и позволяет выбрать тот же файл снова', async () => {
    const { fixture, page, selectPhoto, photo } = await setup();
    selectPhoto();
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('.remove-photo')!.click();
    await fixture.whenStable();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-photo');
    expect(page.querySelector('.photo-preview')).toBeNull();
    expect(page.querySelector<HTMLInputElement>('#case-photo')!.value).toBe('');
    expect(document.activeElement).toBe(page.querySelector('#case-photo'));
    expect(page.querySelector('#case-photo-action')?.textContent).toContain('Выберите фотографию');
    selectPhoto(photo);
    await fixture.whenStable();
    expect(page.querySelector('.photo-name')?.textContent).toBe(photo.name);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    TestBed.inject(HttpTestingController).expectNone('/api/cases');
  });

  it('освобождает object URL при замене и уничтожении формы', async () => {
    const { fixture, selectPhoto } = await setup();
    vi.mocked(URL.createObjectURL)
      .mockReturnValueOnce('blob:first')
      .mockReturnValueOnce('blob:second');
    selectPhoto();
    await fixture.whenStable();
    selectPhoto(new File(['second'], 'second.png', { type: 'image/png' }));
    await fixture.whenStable();
    expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:first');
    fixture.destroy();
    expect(URL.revokeObjectURL).toHaveBeenLastCalledWith('blob:second');
  });

  it('сохраняет выбранное фото при отмене системного выбора файла', async () => {
    const { fixture, page, selectPhoto, photo } = await setup();
    selectPhoto();
    await fixture.whenStable();
    const input = page.querySelector<HTMLInputElement>('#case-photo')!;
    Object.defineProperty(input, 'files', { value: [], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    expect(page.querySelector('.photo-name')?.textContent).toBe(photo.name);
  });

  it.each([
    ['image/gif', 50, 'Выберите изображение JPEG, PNG или WebP.'],
    ['image/jpeg', 0, 'Фотография должна быть непустой'],
    ['image/png', 5 * 1024 * 1024 + 1, 'не превышать 5 МиБ'],
  ])('отклоняет неподходящий файл %s размером %s', async (type, size, message) => {
    const { fixture, page, selectPhoto } = await setup();
    const file = new File(['bytes'], 'invalid-image', { type });
    Object.defineProperty(file, 'size', { value: size });
    selectPhoto(file);
    await fixture.whenStable();
    expect(page.querySelector('#case-photo-error')?.textContent).toContain(message);
    expect(page.querySelector('.photo-preview')).toBeNull();
    expect(page.querySelector<HTMLInputElement>('#case-photo')!.value).toBe('');
    TestBed.inject(HttpTestingController).expectNone('/api/cases');
  });

  it('сохраняет реальные ограничения пяти текстовых полей', async () => {
    const { fixture, page, submit } = await setup();
    const limits = [
      ['case-title', 150],
      ['case-description', 10000],
      ['case-region', 150],
      ['case-locationDescription', 1000],
      ['case-address', 300],
    ] as const;
    for (const [id, limit] of limits) {
      const input = page.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;
      input.value = 'а'.repeat(limit + 1);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    fixture.detectChanges();
    submit();
    await fixture.whenStable();
    for (const [id, limit] of limits) {
      expect(page.querySelector(`#${id}-errors`)?.textContent).toContain(`${limit} символов`);
    }
    expect(page.querySelector('#case-photo-error')?.textContent).toContain('Добавьте фотографию');
    TestBed.inject(HttpTestingController).expectNone('/api/cases');
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
