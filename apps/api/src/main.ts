import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { setupApp } from './app.setup.js';
import { loadEnv } from './config/env.js';
import { runMigrations } from './shared/infrastructure/database/migrate.js';

const env = loadEnv();

if (env.RUN_MIGRATIONS) {
  await runMigrations(env.DATABASE_URL);
  new Logger('Bootstrap').log('Database migrations applied');
}

const app = await NestFactory.create<NestExpressApplication>(AppModule);
setupApp(app, env);
await app.listen(env.PORT);
new Logger('Bootstrap').log(`API listening on port ${env.PORT}`);
