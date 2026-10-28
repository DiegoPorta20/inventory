import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module.js';
import { TokenService } from './application/ports/token.service.js';
import { ChangePassword } from './application/use-cases/change-password.js';
import { GetCurrentUser } from './application/use-cases/get-current-user.js';
import { Login } from './application/use-cases/login.js';
import { RefreshSession } from './application/use-cases/refresh-session.js';
import { JwtTokenService } from './infrastructure/jwt-token.service.js';
import { AuthController } from './presentation/auth.controller.js';
import { AuthCookies } from './presentation/auth-cookies.js';
import { JwtAuthGuard } from './presentation/jwt-auth.guard.js';
import { RolesGuard } from './presentation/roles.guard.js';

@Module({
  imports: [UsersModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    Login,
    RefreshSession,
    GetCurrentUser,
    ChangePassword,
    AuthCookies,
    { provide: TokenService, useClass: JwtTokenService },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
