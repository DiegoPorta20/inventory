import { Global, Module } from '@nestjs/common';
import { SpreadsheetReader } from '../../application/spreadsheet-reader.js';
import { SpreadsheetWriter } from '../../application/spreadsheet-writer.js';
import { ExcelSpreadsheetReader } from './excel-spreadsheet-reader.js';
import { ExcelSpreadsheetWriter } from './excel-spreadsheet-writer.js';

@Global()
@Module({
  providers: [
    { provide: SpreadsheetWriter, useClass: ExcelSpreadsheetWriter },
    { provide: SpreadsheetReader, useClass: ExcelSpreadsheetReader },
  ],
  exports: [SpreadsheetWriter, SpreadsheetReader],
})
export class SpreadsheetModule {}
