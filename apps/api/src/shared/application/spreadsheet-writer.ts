export interface SpreadsheetColumn {
  header: string;
  key: string;
  width?: number;
  numFmt?: string;
}

export interface SpreadsheetSheet {
  name: string;
  columns: SpreadsheetColumn[];
  rows: Record<string, string | number | boolean | Date | null>[];
}

export abstract class SpreadsheetWriter {
  abstract write(sheet: SpreadsheetSheet): Promise<Buffer>;
}
