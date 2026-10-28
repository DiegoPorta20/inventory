import { describe, expect, it } from 'vitest';
import { assertEditable, assertReceivable, assertTransition } from './import-order.js';

const order = (status: Parameters<typeof assertEditable>[0]['status']) => ({ status, number: 9 });

describe('import order state machine', () => {
  it('allows the forward path DRAFT -> ORDERED -> IN_TRANSIT', () => {
    expect(() => assertTransition(order('DRAFT'), 'ORDERED')).not.toThrow();
    expect(() => assertTransition(order('ORDERED'), 'IN_TRANSIT')).not.toThrow();
  });

  it('allows cancelling before reception', () => {
    expect(() => assertTransition(order('IN_TRANSIT'), 'CANCELLED')).not.toThrow();
  });

  it('forbids skipping steps and leaving terminal states', () => {
    expect(() => assertTransition(order('DRAFT'), 'IN_TRANSIT')).toThrow();
    expect(() => assertTransition(order('RECEIVED'), 'CANCELLED')).toThrow();
    expect(() => assertTransition(order('DRAFT'), 'RECEIVED')).toThrow();
  });

  it('only edits and receives open imports', () => {
    expect(() => assertEditable(order('ORDERED'))).not.toThrow();
    expect(() => assertEditable(order('RECEIVED'))).toThrow();
    expect(() => assertReceivable(order('CANCELLED'))).toThrow();
  });
});
