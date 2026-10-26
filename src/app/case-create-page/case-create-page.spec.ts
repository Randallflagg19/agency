import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CaseCreatePage } from './case-create-page';

describe('CaseCreatePage', () => {
  let component: CaseCreatePage;
  let fixture: ComponentFixture<CaseCreatePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaseCreatePage],
    }).compileComponents();

    fixture = TestBed.createComponent(CaseCreatePage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
