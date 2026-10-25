import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter, Router } from '@angular/router';
import { routes } from './app.routes';
import { CasesApi } from './cases/cases-api';
import { MOCK_CASES } from './cases/cases.mock';
import { of } from 'rxjs';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: CasesApi, useValue: { getCases: () => of(MOCK_CASES) } },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Бюро аномальных происшествий');
  });

  it('should render localized case metadata and omit unknown threat levels', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.case-card');

    expect(cards[0]?.textContent).toContain('В работе');
    expect(cards[0]?.textContent).toContain('Аудиальные явления');
    expect(cards[0]?.textContent).toContain('Угроза: 3/5');
    expect(cards[0]?.querySelector('time')?.textContent).toBe('18 февраля 2026');
    expect(cards[1]?.querySelector('.case-card__threat')).toBeNull();
    expect(cards[4]?.querySelector('.case-card__location')).toBeNull();
  });

  it('restores cases after clearing search and filters from the empty results', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/?status=suspended&category=telecommunication&threatLevel=3');
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const search = page.querySelector<HTMLInputElement>('#caseSearch')!;
    search.value = 'Несуществующее дело';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(page.querySelector('app-cases-empty')).not.toBeNull();
    expect(page.querySelector('.case-list')).toBeNull();
    expect(page.querySelector('app-case-details')).toBeNull();
    expect(page.querySelector('app-case-not-found')).toBeNull();

    page.querySelector<HTMLButtonElement>('app-cases-empty button')!.click();
    await fixture.whenStable();

    expect(search.value).toBe('');
    expect(router.url).toBe('/');
    expect(page.querySelector('app-cases-empty')).toBeNull();
    expect(page.querySelectorAll('.case-card')).toHaveLength(6);
  });

  it('keeps an unknown case separate from empty search results', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl(
      '/cases/missing-case?status=suspended&threatLevel=1',
    );
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('app-case-not-found')).not.toBeNull();
    expect(page.querySelector('app-cases-empty')).toBeNull();
  });

  it('keeps the selected card, threat indicator and photograph in sync with the route', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/cases/case-0147');
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('.case-card--selected')?.textContent).toContain('CASE №0147');
    expect(page.querySelectorAll('.case-details__dot--active')).toHaveLength(3);
    expect(page.querySelectorAll('.case-details__dot')).toHaveLength(5);
    expect(page.querySelector('.case-details__photo img')?.getAttribute('src')).toContain(
      'case-0147',
    );
    expect(page.querySelectorAll('app-classified-stamp')).toHaveLength(2);

    await router.navigateByUrl('/cases/case-0211');
    await fixture.whenStable();
    expect(page.querySelector('.case-card--selected')?.textContent).toContain('CASE №0211');
    expect(page.querySelectorAll('.case-details__dot--active')).toHaveLength(2);

    await router.navigateByUrl('/cases/case-0032');
    await fixture.whenStable();
    expect(page.querySelector('.case-details__threat')).toBeNull();
  });
});
