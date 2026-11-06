import { inject } from '@angular/core';
import { KhataLockService } from './khata-lock.service';
import { CanActivateFn, Router } from '@angular/router';

/** While the SnapKhata app lock is up, the shared pages (/profile, /master) stay closed and lead back to the PIN screen in the app. */
export const khataLockGuard: CanActivateFn = () => !inject(KhataLockService).blocked() || inject(Router).createUrlTree(['/khata/app']);
