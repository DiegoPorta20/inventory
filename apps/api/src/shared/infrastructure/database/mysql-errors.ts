const DUPLICATE_ENTRY = 'ER_DUP_ENTRY';
const REFERENCED_ROW = 'ER_ROW_IS_REFERENCED_2';

function errorCode(error: unknown): string | undefined {
  const candidate = error as { code?: string; cause?: { code?: string } } | null;
  return candidate?.code ?? candidate?.cause?.code;
}

export const isDuplicateEntry = (error: unknown): boolean => errorCode(error) === DUPLICATE_ENTRY;

export const isReferencedRow = (error: unknown): boolean => errorCode(error) === REFERENCED_ROW;
