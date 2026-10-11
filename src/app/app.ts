import { Component, signal } from '@angular/core';
import { CaseCard } from './case-card/case-card';
import type { IncidentCase } from './cases/case.model';

@Component({
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
  imports: [CaseCard],
})
export class App {
  protected readonly title = signal('agency');
  handleClick(): void {
    this.title.set('Tapir Agency');
  }

  protected readonly caseData: IncidentCase = {
    id: '1',
    number: '0147',
    title: 'Голос из закрытого лифта',
    description:
      'В административном здании на проспекте Металлургов сотрудники несколько раз слышали мужской голос из кабины грузового лифта, находившегося между этажами. Голос произносил короткие фразы и называл сотрудников по имени. В момент каждого эпизода питание лифта было отключено, а кабина оставалась пустой. На одной из аудиозаписей зафиксирована фраза, совпадающая с частью записи из дела CASE-0211.',
    status: 'new',
    category: 'acoustic',
    threatLevel: null,
    location: null,
    assigneeId: null,
    registeredAt: '2024-03-14T10:00:00+03:00',
    tags: [],
    conclusion: null,
    relatedCaseIds: [],
  };
}
