import type { AuthenticatedUser } from '../../../../shared/domain/auth.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshClaims {
  userId: number;
  companyId: number;
}

export abstract class TokenService {
  abstract issue(user: AuthenticatedUser): Promise<TokenPair>;
  abstract verifyAccess(token: string): Promise<AuthenticatedUser | null>;
  abstract verifyRefresh(token: string): Promise<RefreshClaims | null>;
}
