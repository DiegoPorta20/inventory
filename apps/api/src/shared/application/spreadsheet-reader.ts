export type SpreadsheetCell = string | number | boolean | Date | null;

export interface SpreadsheetRow {
  /** 1-based row number as shown in Excel. */
  rowNumber: number;
  /** Cell values by column, index 0 is column A. */
  values: SpreadsheetCell[];
}

export interface ReadSpreadsheet {
  sheetName: string;
  rows: SpreadsheetRow[];
}

export abstract class SpreadsheetReader {
  /**
   * Reads one worksheet of an `.xlsx` file: `sheetName` when it exists, otherwise the first one.
   * Throws `BusinessRuleError('INVALID_SPREADSHEET')` when the buffer is not a valid workbook.
   */
  abstract read(buffer: Buffer, sheetName?: string): Promise<ReadSpreadsheet>;
}
