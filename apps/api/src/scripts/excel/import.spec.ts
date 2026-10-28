import { describe, expect, it } from 'vitest';
import { classify } from './classifier.js';
import { detectEquipment } from './equipment-links.js';
import { normalizeCode, normalizeDescription, normalizeUnit } from './normalize.js';
import { planImport } from './plan-import.js';
import type { RawRow } from './inventory-sheet.reader.js';

describe('classify', () => {
  it.each([
    ['Broca SDS Max, 32mm x 90 cm - Punta recta', 'drill-bits'],
    ['Conector de transición', 'hoses-fittings'],
    ['Kit de sellos del martillo perforador', 'seal-kits'],
    ['Deslizador de martillo perforador', 'rig-parts'],
    ['Martillo (3 libras)', 'tools'],
    ['Base de zócalo de relé', 'relays-switches'],
    ['1/2" zócalo hexagonal 32mm', 'tools'],
    ['Junta tórica-Anillo O', 'o-rings'],
    ['Junta de transición 6C-36-30LN (L180)', 'hoses-fittings'],
    ['Filtro de aceite del motor', 'filters'],
    ['Fuel Injection Pump', 'engine'],
    ['Neumático 400-8', 'wheels'],
    ['Perno hexagonal M10', 'bolts-screws'],
    ['Mochila', 'uncategorized'],
  ])('%s -> %s', (description, slug) => {
    expect(classify(description)).toBe(slug);
  });
});

describe('normalizers', () => {
  it('removes whitespace from codes and treats blanks as missing', () => {
    expect(normalizeCode('20603000\n057')).toBe('20603000057');
    expect(normalizeCode('  ')).toBeNull();
    expect(normalizeCode(null)).toBeNull();
  });

  it('turns ALL CAPS descriptions into sentence case', () => {
    expect(normalizeDescription('ARANDELA DE SEGURIDAD')).toBe('Arandela de seguridad');
    expect(normalizeDescription('Broca  SDS   Max')).toBe('Broca SDS Max');
  });

  it('maps units', () => {
    expect(normalizeUnit('Unid.')).toBe('UNIT');
    expect(normalizeUnit('pcs')).toBe('PCS');
    expect(normalizeUnit('SET')).toBe('SET');
    expect(normalizeUnit(null)).toBe('UNIT');
  });
});

describe('detectEquipment', () => {
  it('links parts to equipment models mentioned in the description', () => {
    expect(detectEquipment('Cargador para minidumper WY1000')).toEqual(['Minidumper WY1000']);
    expect(detectEquipment('Herramienta U1528 para Instalación del Sello')).toEqual([
      'Martillo perforador U1528',
    ]);
    expect(detectEquipment('Perno')).toEqual([]);
  });
});

describe('planImport', () => {
  const row = (overrides: Partial<RawRow>): RawRow => ({
    rowNumber: 4,
    importNumber: 7,
    code: 'A1',
    description: 'Sello',
    unit: 'pcs',
    received: 10,
    sold: 0,
    notes: null,
    ...overrides,
  });

  it('merges rows with the same code and keeps one line per import', () => {
    const plan = planImport([
      row({ received: 4 }),
      row({ received: 6, importNumber: 9 }),
      row({ received: 2 }),
    ]);
    expect(plan.products).toHaveLength(1);
    expect(plan.products[0]?.received).toBe(12);
    expect(plan.imports.find((i) => i.number === 7)?.lines).toEqual([
      { productCode: 'A1', quantity: 6 },
    ]);
  });

  it('assigns stable internal codes to products without code, merging identical names', () => {
    const plan = planImport([
      row({ code: null, description: 'Winche' }),
      row({ code: '', description: 'winche', importNumber: 8 }),
      row({ code: null, description: 'Ventiladores' }),
    ]);
    expect(plan.products.map((p) => [p.code, p.isInternalCode])).toEqual([
      ['INT-0001', true],
      ['INT-0002', true],
    ]);
  });

  it('clamps sales above received units and reports a warning', () => {
    const plan = planImport([row({ received: 3, sold: 5 })]);
    expect(plan.products[0]?.sold).toBe(3);
    expect(plan.warnings).toHaveLength(1);
  });
});
