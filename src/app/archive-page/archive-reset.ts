import { Service, signal } from '@angular/core';

@Service()
export class ArchiveReset {
  private readonly resetVersion = signal(0);
  readonly version = this.resetVersion.asReadonly();

  request(): void {
    this.resetVersion.update((version) => version + 1);
  }
}
