import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../../shared/domain/auth.js';
import { UnauthorizedError } from '../../../shared/domain/errors.js';
import { IS_PUBLIC_KEY } from '../../../shared/presentation/decorators.js';
import { TokenService } from '../application/ports/token.service.js';
import { AuthCookies } from './auth-cookies.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly cookies: AuthCookies,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = this.cookies.accessTokenFrom(request);
    const user = token ? await this.tokens.verifyAccess(token) : null;
    if (!user) throw new UnauthorizedError('Authentication required');

    request.user = user;
    return true;
  }
}
