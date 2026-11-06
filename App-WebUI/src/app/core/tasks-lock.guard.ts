import { inject } from '@angular/core';
import { TasksLockService } from './tasks-lock.service';
import { CanActivateFn, Router } from '@angular/router';

/** While the My Tasks App Lock is up, the shared pages (/profile, /master) stay closed and lead back to the PIN screen in the app. */
export const tasksLockGuard: CanActivateFn = () => !inject(TasksLockService).blocked() || inject(Router).createUrlTree(['/tasks/app']);
