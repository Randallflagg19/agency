import { Component, signal } from '@angular/core';
import { CaseCard } from './case-card/case-card';

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

  protected readonly caseNumber = '0147';
  protected readonly caseName = 'Голос из закрытого лифта';
}
