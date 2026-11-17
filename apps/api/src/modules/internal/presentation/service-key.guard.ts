import { timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { ENV, type Env } from '../../../config/env.js';
import { UnauthorizedError } from '../../../shared/domain/errors.js';

/** Authenticates server-to-server calls from config_inventory with a shared secret. */
@Injectable()
export class ServiceKeyGuard implements CanActivate {
  constructor(@Inject(ENV) private readonly env: Env) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = Buffer.from(String(request.headers['x-service-key'] ?? ''));
    const expected = Buffer.from(this.env.INTERNAL_API_KEY);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw new UnauthorizedError('Invalid service key');
    }
    return true;
  }
}
