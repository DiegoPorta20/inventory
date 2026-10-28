import { Inject, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ENV, type Env } from '../../../config/env.js';
import type { TokenPair } from '../application/ports/token.service.js';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const REFRESH_PATH = '/api/auth';

@Injectable()
export class AuthCookies {
  constructor(@Inject(ENV) private readonly env: Env) {}

  set(response: Response, tokens: TokenPair): void {
    const base = { httpOnly: true, sameSite: 'strict', secure: this.env.COOKIE_SECURE } as const;
    response.cookie(ACCESS_COOKIE, tokens.accessToken, {
      ...base,
      path: '/api',
      maxAge: this.env.JWT_ACCESS_TTL_SECONDS * 1000,
    });
    response.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...base,
      path: REFRESH_PATH,
      maxAge: this.env.JWT_REFRESH_TTL_SECONDS * 1000,
    });
  }

  clear(response: Response): void {
    response.clearCookie(ACCESS_COOKIE, { path: '/api' });
    response.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH });
  }

  accessTokenFrom(request: Request): string | undefined {
    const bearer = request.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    return bearer ?? request.cookies?.[ACCESS_COOKIE];
  }

  refreshTokenFrom(request: Request): string | undefined {
    return request.cookies?.[REFRESH_COOKIE];
  }
}
