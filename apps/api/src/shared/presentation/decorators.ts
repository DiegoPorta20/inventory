import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Access } from '../domain/access.js';
import type { AuthenticatedUser, Role } from '../domain/auth.js';
import type { ModuleKey, PermissionCode } from '../domain/permissions.js';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
export const AUTHENTICATED_KEY = 'authenticatedOnly';
export const REQUIRE_ALL_KEY = 'requireAllPermissions';
export const REQUIRE_ANY_KEY = 'requireAnyPermission';
export const REQUIRE_MODULE_KEY = 'requireModule';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Any signed-in user of an active company, whatever their permissions. */
export const Authenticated = () => SetMetadata(AUTHENTICATED_KEY, true);
/** The user must hold every listed permission. */
export const RequirePermission = (...codes: PermissionCode[]) =>
  SetMetadata(REQUIRE_ALL_KEY, codes);
/** The user must hold at least one of the listed permissions. */
export const RequireAnyPermission = (...codes: PermissionCode[]) =>
  SetMetadata(REQUIRE_ANY_KEY, codes);
/** The module must be enabled for the company (used by administrator-only modules). */
export const RequireModule = (key: ModuleKey) => SetMetadata(REQUIRE_MODULE_KEY, key);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    return request.user;
  },
);

export const CurrentAccess = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Access => {
    const request = context.switchToHttp().getRequest<Request & { access: Access }>();
    return request.access;
  },
);
