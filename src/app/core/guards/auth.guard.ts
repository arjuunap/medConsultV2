import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/auth.model';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

export const noAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    const user = authService.currentUser();
    if (user?.role === UserRole.PATIENT) {
      router.navigate(['/patient']);
    } else if (user?.role === UserRole.DOCTOR) {
      router.navigate(['/doctor']);
    } else if (user?.role === UserRole.CLINIC_ADMIN) {
      router.navigate(['/clinic-admin']);
    } else if (user?.role === UserRole.SYSTEM_ADMIN) {
      router.navigate(['/system-admin']);
    } else {
      router.navigate(['/']);
    }
    return false;
  }

  return true;
};

export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const user = authService.currentUser();

    if (authService.isLoggedIn() && user) {
      if (user.role === UserRole.SYSTEM_ADMIN || allowedRoles.includes(user.role)) {
        return true;
      }
    }

    router.navigate(['/']);
    return false;
  };
};
