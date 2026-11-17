import { Global, Module } from '@nestjs/common';
import { CompanyDirectory } from './application/ports/company-directory.js';
import { HttpCompanyDirectory } from './infrastructure/http-company-directory.js';

@Global()
@Module({
  providers: [{ provide: CompanyDirectory, useClass: HttpCompanyDirectory }],
  exports: [CompanyDirectory],
})
export class CompanyDirectoryModule {}
