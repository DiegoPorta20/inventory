import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { ClientConfigService } from '../config/client-config.service';

const HOME_PATHS: [module: string, path: string][] = [
  ['dashboard', '/dashboard'],
  ['products', '/products'],
  ['movements', '/movements'],
  ['counts', '/counts'],
  ['reorder', '/reorder'],
  ['imports', '/imports'],
  ['categories', '/categories'],
  ['cost-centers', '/cost-centers'],
  ['suppliers', '/suppliers'],
  ['equipment', '/equipment'],
  ['users', '/users'],
  ['settings', '/settings'],
];

/** The first screen the user is allowed to open; their account page if they have none. */
export function homePath(config: ClientConfigService): string {
  return HOME_PATHS.find(([module]) => config.allows(module))?.[1] ?? '/account';
}

/** Lets a route through only when its module is usable by the signed-in user. */
export const moduleGuard =
  (module: string): CanActivateFn =>
  () => {
    const config = inject(ClientConfigService);
    return config.allows(module) ? true : inject(Router).createUrlTree([homePath(config)]);
  };

/** The empty path sends the user to their first available screen. */
export const homeGuard: CanActivateFn = () => {
  const config = inject(ClientConfigService);
  return inject(Router).createUrlTree([homePath(config)]);
};
