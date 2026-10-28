import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../../../shared/domain/auth.js';
import { CurrentUser, Public } from '../../../shared/presentation/decorators.js';
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe.js';
import { ChangePassword } from '../application/use-cases/change-password.js';
import { GetCurrentUser } from '../application/use-cases/get-current-user.js';
import { Login } from '../application/use-cases/login.js';
import { RefreshSession } from '../application/use-cases/refresh-session.js';
import { AuthCookies } from './auth-cookies.js';
import {
  changePasswordSchema,
  loginSchema,
  type ChangePasswordBody,
  type LoginBody,
} from './auth.schemas.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly login: Login,
    private readonly refreshSession: RefreshSession,
    private readonly getCurrentUser: GetCurrentUser,
    private readonly changePassword: ChangePassword,
    private readonly cookies: AuthCookies,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async signIn(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginBody,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, tokens } = await this.login.execute(body);
    this.cookies.set(response, tokens);
    return user;
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const { user, tokens } = await this.refreshSession.execute(
      this.cookies.refreshTokenFrom(request),
    );
    this.cookies.set(response, tokens);
    return user;
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  signOut(@Res({ passthrough: true }) response: Response): void {
    this.cookies.clear(response);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.getCurrentUser.execute(user.id);
  }

  @Post('change-password')
  @HttpCode(204)
  async updatePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordBody,
  ): Promise<void> {
    await this.changePassword.execute(user.id, body);
  }
}
