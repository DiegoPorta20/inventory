import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import {
  SpreadsheetWriter,
  type SpreadsheetSheet,
  type WorkbookSheet,
} from '../../application/spreadsheet-writer.js';

const LISTS_SHEET = 'Listas';
const DEFAULT_DROPDOWN_ROWS = 1000;

const columnLetter = (index: number): string => {
  let letter = '';
  for (let n = index; n > 0; n = Math.floor((n - 1) / 26)) {
    letter = String.fromCharCode(65 + ((n - 1) % 26)) + letter;
  }
  return letter;
};

@Injectable()
export class ExcelSpreadsheetWriter extends SpreadsheetWriter {
  write(sheet: SpreadsheetSheet): Promise<Buffer> {
    return this.writeWorkbook([sheet]);
  }

  async writeWorkbook(sheets: WorkbookSheet[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const lists: { header: string; values: string[] }[] = [];

    for (const spec of sheets) {
      const sheet = this.addSheet(workbook, spec);
      for (const dropdown of spec.dropdowns ?? []) {
        const columnIndex = spec.columns.findIndex((column) => column.key === dropdown.key) + 1;
        if (columnIndex === 0 || dropdown.values.length === 0) continue;

        lists.push({
          header: spec.columns[columnIndex - 1]?.header ?? dropdown.key,
          values: dropdown.values,
        });
        const listLetter = columnLetter(lists.length);
        const formula = `${LISTS_SHEET}!$${listLetter}$2:$${listLetter}$${dropdown.values.length + 1}`;
        const lastRow = (spec.dropdownRows ?? DEFAULT_DROPDOWN_ROWS) + 1;
        for (let row = 2; row <= lastRow; row++) {
          sheet.getCell(row, columnIndex).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [formula],
            showErrorMessage: true,
            errorStyle: 'stop',
            errorTitle: 'Valor no válido',
            error: 'Elige un valor de la lista (hoja "Listas").',
          };
        }
      }
    }

    if (lists.length > 0) this.addListsSheet(workbook, lists);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private addSheet(workbook: ExcelJS.Workbook, spec: WorkbookSheet): ExcelJS.Worksheet {
    const sheet = workbook.addWorksheet(spec.name.slice(0, 31), {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = spec.columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width ?? 16,
      style: {
        ...(column.numFmt ? { numFmt: column.numFmt } : {}),
        ...(column.wrap ? { alignment: { wrapText: true, vertical: 'top' as const } } : {}),
      },
    }));
    sheet.addRows(spec.rows);

    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    header.alignment = { vertical: 'middle', wrapText: true };
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: spec.columns.length },
    };

    spec.columns.forEach((column, index) => {
      const note = spec.headerNotes?.[column.key];
      if (note) sheet.getCell(1, index + 1).note = note;
    });
    return sheet;
  }

  private addListsSheet(
    workbook: ExcelJS.Workbook,
    lists: { header: string; values: string[] }[],
  ): void {
    const sheet = workbook.addWorksheet(LISTS_SHEET);
    lists.forEach((list, index) => {
      const column = sheet.getColumn(index + 1);
      column.width = Math.max(18, ...list.values.map((value) => value.length + 2));
      sheet.getCell(1, index + 1).value = list.header;
      list.values.forEach((value, row) => {
        sheet.getCell(row + 2, index + 1).value = value;
      });
    });
    const header = sheet.getRow(1);
    header.font = { bold: true };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  }
}
