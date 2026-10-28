import { Global, Module } from '@nestjs/common';
import { ENV, loadDotEnvFile, loadEnv } from './env.js';

loadDotEnvFile();

@Global()
@Module({
  providers: [{ provide: ENV, useFactory: () => loadEnv() }],
  exports: [ENV],
})
export class ConfigModule {}
