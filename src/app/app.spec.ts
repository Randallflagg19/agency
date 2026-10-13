import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
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
});
