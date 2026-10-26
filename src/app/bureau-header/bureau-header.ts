import { NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArchiveReset } from '../archive-page/archive-reset';
import { ClassifiedStamp } from '../classified-stamp/classified-stamp';

@Component({
  selector: 'app-bureau-header',
  imports: [NgOptimizedImage, ClassifiedStamp, RouterLink],
  templateUrl: './bureau-header.html',
  styleUrl: './bureau-header.css',
})
export class BureauHeader {
  private readonly archiveReset = inject(ArchiveReset);

  protected resetArchive(event: MouseEvent): void {
    if (
      event.button === 0 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      this.archiveReset.request();
    }
  }
}
