import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import type { CaseDeletionResult } from '../../cases/case-deletion.model';
import type { IncidentCase } from '../../cases/case.model';
import { CasesApi } from '../../cases/cases-api';

@Component({
  selector: 'app-case-delete-dialog',
  templateUrl: './case-delete-dialog.html',
  styleUrl: './case-delete-dialog.css',
})
export class CaseDeleteDialog {
  private readonly api = inject(CasesApi);
  private readonly auth = inject(AuthService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly cancelButton = viewChild.required<ElementRef<HTMLButtonElement>>('cancelButton');
  private readonly confirmButton =
    viewChild.required<ElementRef<HTMLButtonElement>>('confirmButton');
  private trigger: HTMLButtonElement | undefined;
  private fallbackFocus: HTMLElement | undefined;

  readonly deleted = output<CaseDeletionResult>();
  protected readonly incident = signal<IncidentCase | null>(null);
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  open(incident: IncidentCase, trigger: HTMLButtonElement, fallbackFocus?: HTMLElement): void {
    if (this.dialog().nativeElement.open || this.pending()) return;
    this.incident.set(incident);
    this.error.set(null);
    this.trigger = trigger;
    this.fallbackFocus = fallbackFocus;
    this.dialog().nativeElement.showModal();
    // Безопасное действие получает начальный фокус.
    this.cancelButton().nativeElement.focus();
  }

  protected cancel(event?: Event): void {
    event?.preventDefault();
    if (!this.pending()) this.dialog().nativeElement.close();
  }

  protected restoreFocus(): void {
    if (this.trigger?.isConnected) this.trigger.focus();
    else if (this.fallbackFocus?.isConnected) this.fallbackFocus.focus();
    this.trigger = undefined;
    this.fallbackFocus = undefined;
  }

  protected containFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const dialog = this.dialog().nativeElement;
    const first = this.cancelButton().nativeElement;
    const last = this.confirmButton().nativeElement;
    const active = dialog.ownerDocument.activeElement;
    if (this.pending()) {
      event.preventDefault();
    } else if (event.shiftKey && (active === first || active === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || active === dialog)) {
      event.preventDefault();
      first.focus();
    }
  }

  protected async confirm(): Promise<void> {
    const incident = this.incident();
    if (!incident || this.pending()) return;
    this.pending.set(true);
    this.error.set(null);
    // Кнопки на время запроса отключаются; фокус остаётся внутри модалки.
    this.dialog().nativeElement.focus();
    let result: CaseDeletionResult;
    try {
      result = await firstValueFrom(this.api.deleteCase(incident.id));
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.auth.clearSession();
        this.error.set('Сессия истекла. Закройте окно и войдите снова, затем повторите удаление.');
      } else if (error instanceof HttpErrorResponse && error.status === 403) {
        this.auth.checkSession();
        this.error.set('Удаление запрещено. Проверьте служебный допуск и обновите страницу.');
      } else {
        this.error.set(
          'Не удалось подтвердить удаление. Проверьте соединение и повторите запрос. Повтор безопасен, даже если дело уже удалено.',
        );
      }
      return;
    } finally {
      this.pending.set(false);
    }
    this.trigger = undefined;
    this.fallbackFocus = undefined;
    this.dialog().nativeElement.close();
    this.deleted.emit(result);
  }
}
