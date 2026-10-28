import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ENV, type Env } from '../../../config/env.js';
import { Role, type AuthenticatedUser } from '../../../shared/domain/auth.js';
import { TokenService, type TokenPair } from '../application/ports/token.service.js';

interface AccessPayload {
  sub: string;
  typ: 'access';
  email: string;
  name: string;
  role: Role;
}

interface RefreshPayload {
  sub: string;
  typ: 'refresh';
}

@Injectable()
export class JwtTokenService extends TokenService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(ENV) private readonly env: Env,
  ) {
    super();
  }

  async issue(user: AuthenticatedUser): Promise<TokenPair> {
    const access: AccessPayload = {
      sub: String(user.id),
      typ: 'access',
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const refresh: RefreshPayload = { sub: String(user.id), typ: 'refresh' };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(access, {
        secret: this.env.JWT_ACCESS_SECRET,
        expiresIn: this.env.JWT_ACCESS_TTL_SECONDS,
      }),
      this.jwt.signAsync(refresh, {
        secret: this.env.JWT_REFRESH_SECRET,
        expiresIn: this.env.JWT_REFRESH_TTL_SECONDS,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  async verifyAccess(token: string): Promise<AuthenticatedUser | null> {
    const payload = await this.verify<AccessPayload>(token, this.env.JWT_ACCESS_SECRET);
    if (payload?.typ !== 'access') return null;
    return {
      id: Number(payload.sub),
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  }

  async verifyRefresh(token: string): Promise<number | null> {
    const payload = await this.verify<RefreshPayload>(token, this.env.JWT_REFRESH_SECRET);
    return payload?.typ === 'refresh' ? Number(payload.sub) : null;
  }

  private async verify<T extends object>(token: string, secret: string): Promise<T | null> {
    try {
      return await this.jwt.verifyAsync<T>(token, { secret });
    } catch {
      return null;
    }
  }
}
