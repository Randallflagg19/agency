import { HttpErrorResponse } from '@angular/common/http';
import { NgOptimizedImage } from '@angular/common';
import { Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth.service';
import type { LoginCredentials } from '../auth.model';
import { form, FormField, FormRoot, required } from '@angular/forms/signals';

@Component({
  imports: [FormRoot, FormField, NgOptimizedImage],
  selector: 'app-login-dialog',
  styleUrl: './login-dialog.css',
  templateUrl: './login-dialog.html',
})
export class LoginDialog {
  private readonly auth = inject(AuthService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('loginDialog');
  private readonly loginInput = viewChild.required<ElementRef<HTMLInputElement>>('loginInput');
  private trigger: HTMLButtonElement | undefined;

  protected readonly loginError = signal<string | null>(null);
  protected readonly passwordVisible = signal(false);

  open(trigger: HTMLButtonElement): void {
    if (this.dialog().nativeElement.open) return;

    this.reset();
    this.trigger = trigger;
    this.dialog().nativeElement.showModal();
    this.loginInput().nativeElement.focus();
  }

  // The parent calls this after loggedIn; user cancellation is guarded separately.
  close(): void {
    this.dialog().nativeElement.close();
  }

  protected cancel(event?: Event): void {
    event?.preventDefault();
    if (!this.loginForm().submitting()) this.close();
  }

  protected onClosed(): void {
    this.reset();
    this.trigger?.focus();
    this.trigger = undefined;
  }

  private reset(): void {
    this.loginForm().reset({ login: '', password: '' });
    this.loginError.set(null);
    this.passwordVisible.set(false);
  }

  readonly loggedIn = output<void>();
  protected readonly draft = signal<LoginCredentials>({
    login: '',
    password: '',
  });

  protected readonly loginForm = form(
    this.draft,
    (schema) => {
      required(schema.login, {
        message: 'Введите логин',
      });
      required(schema.password, {
        message: 'Введите пароль',
      });
    },
    {
      submission: {
        action: () => this.submitLogin(),
      },
    },
  );

  protected async submitLogin(): Promise<void> {
    this.loginError.set(null);

    try {
      await firstValueFrom(this.auth.login(this.draft()));
      this.loggedIn.emit();
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.loginError.set('Неверный логин или пароль.');
      } else if (error instanceof HttpErrorResponse && error.status === 429) {
        this.loginError.set('Слишком много попыток входа. Повторите позже.');
      } else {
        this.loginError.set('Не удалось выполнить вход. Попробуйте ещё раз.');
      }
    }
  }
}
