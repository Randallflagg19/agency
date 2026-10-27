import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import type { AuthResponse, AuthState, LoginCredentials } from './auth.model';
import { tap } from 'rxjs';

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);

  getCurrentUser() {
    return this.http.get<AuthResponse>('/api/auth/me', {
      timeout: 15000,
    });
  }

  private readonly authState = signal<AuthState>({ status: 'idle' });

  readonly state = this.authState.asReadonly();

  clearSession(): void {
    this.authState.set({ status: 'unauthenticated' });
  }

  checkSession(): void {
    if (this.authState().status === 'loading') return;

    this.authState.set({ status: 'loading' });

    this.getCurrentUser().subscribe({
      next: (response) => {
        this.authState.set({
          status: 'authenticated',
          user: response.user,
        });
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.authState.set({ status: 'unauthenticated' });
        } else {
          this.authState.set({ status: 'error' });
        }
      },
    });
  }

  login(credentials: LoginCredentials) {
    return this.http
      .post<AuthResponse>('/api/auth/login', credentials, {
        headers: { 'X-Agency-CSRF': '1' },
        timeout: 15000,
      })
      .pipe(
        tap((response) => {
          this.authState.set({
            status: 'authenticated',
            user: response.user,
          });
        }),
      );
  }
}
