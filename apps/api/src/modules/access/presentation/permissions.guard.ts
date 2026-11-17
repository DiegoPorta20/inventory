import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Access } from '../../../shared/domain/access.js';
import type { AuthenticatedUser } from '../../../shared/domain/auth.js';
import { ForbiddenError, UnauthorizedError } from '../../../shared/domain/errors.js';
import type { PermissionCode } from '../../../shared/domain/permissions.js';
import {
  AUTHENTICATED_KEY,
  IS_PUBLIC_KEY,
  REQUIRE_ALL_KEY,
  REQUIRE_ANY_KEY,
  REQUIRE_MODULE_KEY,
} from '../../../shared/presentation/decorators.js';
import { CompanyDirectory } from '../../company-directory/application/ports/company-directory.js';

/**
 * Applies the company's configuration to every authenticated route: the company must be active,
 * and the route must declare what it needs. A route that declares nothing is refused, so a new
 * endpoint is never open by accident.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly directory: CompanyDirectory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const read = <T>(key: string) => this.reflector.getAllAndOverride<T | undefined>(key, targets);

    if (read<boolean>(IS_PUBLIC_KEY)) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser; access?: Access }>();
    const user = request.user;
    if (!user) throw new UnauthorizedError('Authentication required');

    const company = await this.directory.findById(user.companyId);
    if (company?.status !== 'ACTIVE') throw new UnauthorizedError('The company is not active');

    const access = new Access(user.role, company.config);
    request.access = access;

    if (read<boolean>(AUTHENTICATED_KEY)) return true;

    const all = read<PermissionCode[]>(REQUIRE_ALL_KEY);
    const any = read<PermissionCode[]>(REQUIRE_ANY_KEY);
    const module = read<string>(REQUIRE_MODULE_KEY);
    if (!all?.length && !any?.length && !module) {
      throw new ForbiddenError('This action is not available');
    }

    if (all?.some((code) => !access.can(code))) {
      throw new ForbiddenError('You do not have permission to perform this action');
    }
    if (any?.length && !access.canAny(any)) {
      throw new ForbiddenError('You do not have permission to perform this action');
    }
    if (module && !access.moduleEnabled(module)) {
      throw new ForbiddenError('This module is not enabled for your company');
    }
    return true;
  }
}
