import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { KhataSessionService } from './khata-session.service';

/** Logged in (any token): the PIN screens. Without a session the visitor goes to the login screen. */
export const khataSessionGuard: CanActivateFn = async () => {
  const router = inject(Router);
  return (await inject(KhataSessionService).ensureSession()) || router.createUrlTree(['/khata/login']);
};

/** Logged in and unlocked: everything under /khata/app. A missing PIN goes to "set PIN", a locked app to the PIN screen (then back here). */
export const khataUnlockedGuard: CanActivateFn = async (_route, state) => {
  const router = inject(Router);
  const session = inject(KhataSessionService);
  if (!(await session.ensureSession()))
    return router.createUrlTree(['/khata/login']);
  if (!session.hasPin())
    return router.createUrlTree(['/khata/set-pin']);
  return session.unlocked() || router.createUrlTree(['/khata/unlock'], { queryParams: { next: state.url } });
};
