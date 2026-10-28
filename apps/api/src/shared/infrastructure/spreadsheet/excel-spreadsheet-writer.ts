import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { SpreadsheetWriter, type SpreadsheetSheet } from '../../application/spreadsheet-writer.js';

@Injectable()
export class ExcelSpreadsheetWriter extends SpreadsheetWriter {
  async write({ name, columns, rows }: SpreadsheetSheet): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(name.slice(0, 31), {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width ?? 16,
      style: column.numFmt ? { numFmt: column.numFmt } : {},
    }));
    sheet.addRows(rows);

    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    header.alignment = { vertical: 'middle' };
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
