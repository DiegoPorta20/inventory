import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../../shared/application/page.js';
import { SpreadsheetWriter } from '../../../../shared/application/spreadsheet-writer.js';
import type { StockMovementView } from '../../domain/stock-movement.js';
import {
  StockMovementRepository,
  type MovementFilters,
} from '../ports/stock-movement.repository.js';

const EXPORT_LIMIT = 10_000;

@Injectable()
export class SearchStockMovements {
  constructor(private readonly movements: StockMovementRepository) {}

  execute(filters: MovementFilters, page: PageRequest): Promise<Page<StockMovementView>> {
    return this.movements.search(filters, page);
  }
}

const TYPE_LABEL = { IN: 'Entrada', OUT: 'Salida', ADJUSTMENT: 'Ajuste' } as const;

@Injectable()
export class ExportStockMovements {
  constructor(
    private readonly movements: StockMovementRepository,
    private readonly spreadsheet: SpreadsheetWriter,
  ) {}

  async execute(filters: MovementFilters): Promise<Buffer> {
    const items = await this.movements.searchAll(filters, EXPORT_LIMIT);
    return this.spreadsheet.write({
      name: 'Movimientos',
      columns: [
        { header: 'Fecha', key: 'date', width: 20, numFmt: 'yyyy-mm-dd hh:mm' },
        { header: 'Código', key: 'code', width: 20 },
        { header: 'Descripción', key: 'name', width: 46 },
        { header: 'Tipo', key: 'type', width: 10 },
        { header: 'Motivo', key: 'reason', width: 20 },
        { header: 'Cantidad', key: 'quantity', width: 10 },
        { header: 'Stock resultante', key: 'stockAfter', width: 16 },
        { header: 'Contraparte', key: 'counterparty', width: 24 },
        { header: 'Usuario', key: 'user', width: 20 },
        { header: 'Nota', key: 'note', width: 40 },
      ],
      rows: items.map((item) => ({
        date: item.occurredAt,
        code: item.productCode,
        name: item.productName,
        type: TYPE_LABEL[item.type],
        reason: item.reason,
        quantity: item.quantity,
        stockAfter: item.stockAfter,
        counterparty: item.counterparty,
        user: item.userName,
        note: item.note,
      })),
    });
  }
}
