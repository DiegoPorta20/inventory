import { Global, Module } from '@nestjs/common';
import { SpreadsheetWriter } from '../../application/spreadsheet-writer.js';
import { ExcelSpreadsheetWriter } from './excel-spreadsheet-writer.js';

@Global()
@Module({
  providers: [{ provide: SpreadsheetWriter, useClass: ExcelSpreadsheetWriter }],
  exports: [SpreadsheetWriter],
})
export class SpreadsheetModule {}
