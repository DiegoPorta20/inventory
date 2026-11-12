import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ClientConfigController } from './presentation/client-config.controller.js';
import { MoneyRedactionInterceptor } from './presentation/money-redaction.interceptor.js';
import { PermissionsGuard } from './presentation/permissions.guard.js';

@Module({
  controllers: [ClientConfigController],
  providers: [
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: MoneyRedactionInterceptor },
  ],
})
export class AccessModule {}
