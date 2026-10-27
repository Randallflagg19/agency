import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.getCurrentUser().pipe(
    map((response) => {
      return response.user.role === 'admin' ? true : router.createUrlTree(['/']);
    }),
    catchError(() => of(router.createUrlTree(['/']))),
  );
};
