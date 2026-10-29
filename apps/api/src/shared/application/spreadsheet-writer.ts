export interface SpreadsheetColumn {
  header: string;
  key: string;
  width?: number;
  numFmt?: string;
  /** Wrap long text inside the cell (instructions, descriptions). */
  wrap?: boolean;
}

export interface SpreadsheetSheet {
  name: string;
  columns: SpreadsheetColumn[];
  rows: Record<string, string | number | boolean | Date | null>[];
}

/** Restricts a column to a pick-list. The values are written to a shared "Listas" sheet. */
export interface ColumnDropdown {
  key: string;
  values: string[];
}

export interface WorkbookSheet extends SpreadsheetSheet {
  dropdowns?: ColumnDropdown[];
  /** Cell comment shown on the header of each column (by column key). */
  headerNotes?: Record<string, string>;
  /** Number of data rows covered by the dropdowns (default 1000). */
  dropdownRows?: number;
}

export abstract class SpreadsheetWriter {
  abstract write(sheet: SpreadsheetSheet): Promise<Buffer>;
  abstract writeWorkbook(sheets: WorkbookSheet[]): Promise<Buffer>;
}
