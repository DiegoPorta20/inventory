import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { errorMessage, fieldErrors, toHttpParams } from './api-utils';

describe('toHttpParams', () => {
  it('drops empty values and stringifies the rest', () => {
    const params = toHttpParams({
      search: '',
      page: 2,
      active: false,
      category: null,
      unit: undefined,
    });
    expect(params.keys().sort()).toEqual(['active', 'page']);
    expect(params.get('active')).toBe('false');
  });
});

describe('error helpers', () => {
  const validation = new HttpErrorResponse({
    status: 400,
    error: {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{ path: 'name', message: 'Required' }],
    },
  });

  it('translates known error codes to Spanish', () => {
    const insufficient = new HttpErrorResponse({
      status: 422,
      error: { statusCode: 422, code: 'INSUFFICIENT_STOCK', message: 'x' },
    });
    expect(errorMessage(insufficient)).toBe('Stock insuficiente para realizar la salida.');
  });

  it('falls back when the error is not an API error', () => {
    expect(errorMessage(new Error('boom'), 'Algo falló')).toBe('Algo falló');
  });

  it('maps validation details by field path', () => {
    expect(fieldErrors(validation)).toEqual({ name: 'Required' });
  });
});
