import { Injectable } from '@nestjs/common';
import { BusinessRuleError } from '../../../../shared/domain/errors.js';
import {
  assertManualReason,
  signedDelta,
  type MovementReason,
  type MovementType,
  type StockMovement,
} from '../../domain/stock-movement.js';
import { StockLedger } from '../stock-ledger.js';

export interface RegisterStockMovementInput {
  productId: number;
  type: MovementType;
  reason: MovementReason;
  quantity: number;
  unitPriceUsd?: number | null;
  counterparty?: string | null;
  note?: string | null;
  occurredAt?: Date;
}

@Injectable()
export class RegisterStockMovement {
  constructor(private readonly ledger: StockLedger) {}

  execute(input: RegisterStockMovementInput, userId: number): Promise<StockMovement> {
    assertManualReason(input.type, input.reason);
    if (input.occurredAt && input.occurredAt.getTime() > Date.now() + 60_000) {
      throw new BusinessRuleError('FUTURE_MOVEMENT', 'Movement date cannot be in the future');
    }
    return this.ledger.apply({
      productId: input.productId,
      type: input.type,
      reason: input.reason,
      delta: signedDelta(input.type, input.quantity),
      unitPriceUsd: input.unitPriceUsd ?? null,
      counterparty: input.counterparty ?? null,
      note: input.note ?? null,
      occurredAt: input.occurredAt,
      userId,
    });
  }
}
