import { Component } from '@angular/core';

@Component({
  selector: 'app-classified-stamp',
  template: '<span class="stamp">СЕКРЕТНО</span>',
  styles: `
    :host {
      display: inline-block;
      flex: none;
      color: #93372d;
      transform: rotate(-9deg);
    }

    .stamp {
      display: block;
      padding: 3px 8px 2px;
      border: 3px double currentColor;
      border-radius: 1px;
      font-family: 'Arial Narrow', 'Helvetica Neue', sans-serif;
      font-size: var(--stamp-size, 25px);
      font-stretch: condensed;
      font-weight: 500;
      line-height: 1.1;
      letter-spacing: 0.09em;
      white-space: nowrap;
      mask-image: url('/assets/ink-wear.svg');
      mask-size: 180px 60px;
    }
  `,
})
export class ClassifiedStamp {}
