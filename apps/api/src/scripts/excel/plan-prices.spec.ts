import { describe, expect, it } from 'vitest';
import { cleanSpecification, normalizeCostCenter, planPrices } from './plan-prices.js';
import type { PriceRow } from './price-sheet.reader.js';

const row = (overrides: Partial<PriceRow>): PriceRow => ({
  rowNumber: 10,
  section: 'JUMBO',
  description: 'Sello',
  code: '20311000860',
  specification: null,
  costCenter: 'repuesto Jumbo',
  unit: 'pcs',
  totalQuantity: 1,
  consumedQuantity: null,
  stock: 1,
  priceUsd: 10,
  priceWithIgvPen: null,
  wholesaleUsdWithIgv: null,
  wholesaleMinQty: null,
  ...overrides,
});

const inventory = [
  { id: 1, code: '20311000860', name: 'Diafragma de retorno' },
  { id: 2, code: 'INT-0007', name: 'Broca SDS Max, 32mm x 60 cm - Punta recta' },
  { id: 3, code: '20306000354', name: 'Blocking head' },
];

describe('cleanSpecification', () => {
  it('drops Chinese text and generic placeholders', () => {
    expect(cleanSpecification('零件\nRepuesto')).toBeNull();
    expect(cleanSpecification('/')).toBeNull();
    expect(cleanSpecification('40Cr（锻件 Pieza Forjada）')).toBe('40Cr(Pieza Forjada)');
    expect(cleanSpecification('Capacidad 1 TN')).toBe('Capacidad 1 TN');
  });

  it('drops a specification that repeats the cost center', () => {
    expect(cleanSpecification('Repuesto Minidumper', 'Repuesto Minidumper')).toBeNull();
  });
});

describe('normalizeCostCenter', () => {
  it('unifies case variants and restores accents', () => {
    expect(normalizeCostCenter('repuesto Jumbo')).toBe('Repuesto Jumbo');
    expect(normalizeCostCenter('Barrenos conicos')).toBe('Barrenos cónicos');
    expect(normalizeCostCenter(null)).toBeNull();
  });
});

const conversion = { igvRate: 0.18, exchangeRate: 3.6 };

describe('planPrices', () => {
  it('matches rows by code, tolerating O/D typos for zero', () => {
    const plan = planPrices(
      [
        row({ code: '2O311000860' }),
        row({ code: '20306D00354', description: 'Blocking head', priceUsd: 5 }),
      ],
      inventory,
      conversion,
    );
    expect(plan.updates.map((update) => update.productId).sort()).toEqual([1, 3]);
    expect(plan.missing).toHaveLength(0);
  });

  it('averages different prices of the same code weighted by quantity', () => {
    const plan = planPrices(
      [row({ priceUsd: 10, totalQuantity: 1 }), row({ priceUsd: 20, totalQuantity: 3 })],
      inventory,
      conversion,
    );
    expect(plan.updates[0]?.pricePen).toBe(63);
    expect(plan.updates[0]?.priceVariants).toBe(2);
  });

  it('marks products found only in consignment sections', () => {
    const consignment = row({ section: 'Repuestos a Consignación Jumbo DK0138' });
    expect(planPrices([consignment], inventory, conversion).updates[0]?.isConsignment).toBe(true);
    expect(
      planPrices([consignment, row({})], inventory, conversion).updates[0]?.isConsignment,
    ).toBe(false);
  });

  it('converts the wholesale price to soles without IGV and links section equipment', () => {
    const plan = planPrices(
      [
        row({
          code: null,
          description: 'Broca SDS Max, 32mm x 60 cm - Punta recta',
          section: 'MINIDUMPER',
          priceUsd: 54.5,
          wholesaleUsdWithIgv: 59.0,
          wholesaleMinQty: 24,
        }),
        row({}),
      ],
      inventory,
      conversion,
    );
    const drill = plan.updates.find((update) => update.productId === 2);
    expect(drill?.wholesalePricePen).toBe(180);
    expect(drill?.wholesaleMinQty).toBe(24);
    expect(plan.updates.find((update) => update.productId === 1)?.equipmentNames).toEqual([
      'Jumbo DK0138',
    ]);
  });

  it('reports rows without a matching product', () => {
    const plan = planPrices(
      [row({ code: '999', description: 'Nuevo repuesto' })],
      inventory,
      conversion,
    );
    expect(plan.missing).toHaveLength(1);
    expect(plan.productsWithoutPrice).toBe(3);
  });
});
