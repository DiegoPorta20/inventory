import { HttpErrorResponse, HttpParams } from '@angular/common/http';

type ParamValue = string | number | boolean | null | undefined;

export function toHttpParams(values: Record<string, ParamValue>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '') continue;
    params = params.set(key, String(value));
  }
  return params;
}

export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: { path: string; message: string }[] | Record<string, unknown>;
}

const MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Tu sesión expiró. Inicia sesión nuevamente.',
  FORBIDDEN: 'No tienes permiso para realizar esta acción.',
  NOT_FOUND: 'No se encontró el registro solicitado.',
  CONFLICT: 'Ya existe un registro con esos datos.',
  VALIDATION_ERROR: 'Revisa los campos marcados.',
  INSUFFICIENT_STOCK: 'Stock insuficiente para realizar la salida.',
  INVALID_MOVEMENT_REASON: 'El motivo no es válido para este tipo de movimiento.',
  PRODUCT_HAS_HISTORY: 'El producto tiene historial; desactívalo en lugar de eliminarlo.',
  CATEGORY_IN_USE: 'La categoría tiene productos o subcategorías.',
  CATEGORY_DEPTH_EXCEEDED: 'Solo se permiten dos niveles de categorías.',
  SUPPLIER_IN_USE: 'El proveedor tiene importaciones; desactívalo en lugar de eliminarlo.',
  IMPORT_NOT_EDITABLE: 'La importación ya no se puede modificar.',
  IMPORT_NOT_RECEIVABLE: 'La importación no se puede recibir en su estado actual.',
  INVALID_IMPORT_TRANSITION: 'No se puede cambiar la importación a ese estado.',
  STOCK_COUNT_CLOSED: 'El conteo ya fue cerrado.',
  STOCK_COUNT_EMPTY: 'Registra al menos una cantidad contada antes de completar.',
  STOCK_COUNT_EMPTY_SCOPE: 'No hay productos activos en el alcance seleccionado.',
  CANNOT_MODIFY_SELF: 'No puedes desactivarte ni cambiar tu propio rol.',
  INVALID_CURRENT_PASSWORD: 'La contraseña actual es incorrecta.',
  TOO_MANY_REQUESTS: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
};

export function apiError(error: unknown): ApiErrorBody | null {
  if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
    return error.error as ApiErrorBody;
  }
  return null;
}

export function errorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  const body = apiError(error);
  if (body) return MESSAGES[body.code] ?? body.message ?? fallback;
  if (error instanceof HttpErrorResponse && error.status === 0) {
    return 'No hay conexión con el servidor.';
  }
  return fallback;
}

export function fieldErrors(error: unknown): Record<string, string> {
  const details = apiError(error)?.details;
  if (!Array.isArray(details)) return {};
  return Object.fromEntries(details.map((issue) => [issue.path, issue.message]));
}
