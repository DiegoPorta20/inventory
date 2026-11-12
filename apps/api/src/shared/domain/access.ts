import { Role } from './auth.js';
import {
  ADMIN_ONLY_MODULES,
  ALL_PERMISSIONS,
  GRANTABLE_MODULES,
  moduleOf,
  type PermissionCode,
} from './permissions.js';
import { ForbiddenError } from './errors.js';

/** The part of a company's configuration that decides what its users may do. */
export interface AccessProfile {
  modules: readonly string[];
  permissions: { PERSONAL: readonly string[] };
}

/**
 * What one signed-in user may do inside their company: administrators get everything in the
 * enabled modules, PERSONAL users get what the company granted them there.
 */
export class Access {
  constructor(
    readonly role: Role,
    private readonly profile: AccessProfile,
  ) {}

  moduleEnabled(key: string): boolean {
    return this.profile.modules.includes(key);
  }

  can(code: PermissionCode): boolean {
    if (!this.moduleEnabled(moduleOf(code))) return false;
    if (this.role === Role.ADMIN) return true;
    return this.profile.permissions.PERSONAL.includes(code);
  }

  canAny(codes: readonly PermissionCode[]): boolean {
    return codes.some((code) => this.can(code));
  }

  get canSeeCosts(): boolean {
    return this.can('products.costs.view');
  }

  get canSeePrices(): boolean {
    return this.can('products.prices.view');
  }

  requireCosts(): void {
    if (!this.canSeeCosts) throw new ForbiddenError('You are not allowed to work with costs');
  }

  requirePrices(): void {
    if (!this.canSeePrices) throw new ForbiddenError('You are not allowed to work with prices');
  }

  /** Every permission this user effectively holds. */
  permissions(): PermissionCode[] {
    return ALL_PERMISSIONS.filter((code) => this.can(code));
  }

  /** Modules this user can open: administrators see every enabled one, staff those they can view. */
  allowedModules(): string[] {
    const admin = this.role === Role.ADMIN;
    const operational = GRANTABLE_MODULES.filter((module) =>
      this.can(`${module}.view` as PermissionCode),
    );
    const adminOnly = admin
      ? ADMIN_ONLY_MODULES.filter((module) => this.moduleEnabled(module))
      : [];
    return [...operational, ...adminOnly];
  }
}
