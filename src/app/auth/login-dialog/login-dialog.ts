import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth.service';
import type { LoginCredentials } from '../auth.model';
import { form, required } from '@angular/forms/signals';

@Component({
  imports: [],
  selector: 'app-login-dialog',
  styleUrl: './login-dialog.css',
  templateUrl: './login-dialog.html',
})
export class LoginDialog {
  private readonly auth = inject(AuthService);

  protected readonly loginError = signal<string | null>(null);

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
