import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import {
  SpreadsheetReader,
  type ReadSpreadsheet,
  type SpreadsheetCell,
} from '../../application/spreadsheet-reader.js';
import { BusinessRuleError } from '../../domain/errors.js';

/** Flattens rich text, formulas and hyperlinks into the plain value a person sees in the cell. */
function toPlainValue(value: ExcelJS.CellValue): SpreadsheetCell {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value !== 'object') return value;
  if ('richText' in value) return value.richText.map((part) => part.text).join('');
  if ('result' in value) return toPlainValue(value.result as ExcelJS.CellValue);
  if ('text' in value) return String(value.text);
  return null;
}

@Injectable()
export class ExcelSpreadsheetReader extends SpreadsheetReader {
  async read(buffer: Buffer, sheetName?: string): Promise<ReadSpreadsheet> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    } catch {
      throw new BusinessRuleError('INVALID_SPREADSHEET', 'The file is not a valid .xlsx workbook');
    }

    const sheet =
      (sheetName ? workbook.getWorksheet(sheetName) : undefined) ?? workbook.worksheets[0];
    if (!sheet) throw new BusinessRuleError('INVALID_SPREADSHEET', 'The workbook has no sheets');

    const rows: ReadSpreadsheet['rows'] = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const values: SpreadsheetCell[] = [];
      for (let column = 1; column <= sheet.columnCount; column++) {
        values.push(toPlainValue(row.getCell(column).value));
      }
      rows.push({ rowNumber, values });
    });
    return { sheetName: sheet.name, rows };
  }
}
