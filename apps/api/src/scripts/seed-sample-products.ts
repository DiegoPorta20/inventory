import { count } from 'drizzle-orm';
import type { Database } from '../shared/infrastructure/database/database.service.js';
import {
  productEquipment,
  products,
  stockMovements,
} from '../shared/infrastructure/database/schema.js';
import { openScriptContext } from './script-context.js';
import { ensureEquipment, ensureTaxonomy } from './seed-data.js';

/**
 * Development-only: creates a small catalogue of sample spare parts so the app
 * can be explored without data/inventory.xlsx. Prices, minimum stock, locations
 * and cost centers are left empty on purpose: `pnpm db:seed-demo` fills them.
 */

const JUMBO = 'Jumbo DK0138';
const YUCHAI = 'Motor Yuchai';
const WY1000 = 'Minidumper WY1000';
const WY800 = 'Minidumper WY800';
const HAMMER = 'Martillo perforador U1528';

type Sample = [
  code: string,
  name: string,
  categorySlug: string,
  unit: string,
  stock: number,
  equipment: string[],
];

const SAMPLES: Sample[] = [
  // Perforación
  ['BRO-T38-45', 'Broca de botones T38 45 mm', 'drill-bits', 'PCS', 24, [JUMBO, HAMMER]],
  ['BRO-T38-48', 'Broca de botones T38 48 mm', 'drill-bits', 'PCS', 18, [JUMBO, HAMMER]],
  ['BRO-R32-42', 'Broca de botones R32 42 mm', 'drill-bits', 'PCS', 12, [HAMMER]],
  ['BAR-T38-12', 'Barra de extensión T38 12 pies', 'drill-rods', 'PCS', 8, [JUMBO]],
  ['ACO-T38', 'Acople T38', 'drill-rods', 'PCS', 30, [JUMBO, HAMMER]],
  ['SHK-U1528', 'Shank adapter U1528', 'rig-parts', 'PCS', 3, [HAMMER]],
  ['PIS-U1528', 'Pistón martillo U1528', 'rig-parts', 'PCS', 0, [HAMMER]],
  // Fijación
  ['PER-M12-60', 'Perno hexagonal M12 x 60 grado 8.8', 'bolts-screws', 'PCS', 200, []],
  ['PER-M16-80', 'Perno hexagonal M16 x 80 grado 8.8', 'bolts-screws', 'PCS', 150, []],
  ['TOR-M8-25', 'Tornillo allen M8 x 25', 'bolts-screws', 'PCS', 320, []],
  ['TUE-M12', 'Tuerca hexagonal M12', 'nuts-washers', 'PCS', 400, []],
  ['TUE-M16-AUT', 'Tuerca autoblocante M16', 'nuts-washers', 'PCS', 180, []],
  ['ARA-M12', 'Arandela plana M12', 'nuts-washers', 'PCS', 500, []],
  ['PAS-10X50', 'Pasador cilíndrico 10 x 50', 'pins-rings', 'PCS', 60, [WY1000, WY800]],
  ['ANI-SEG-40', 'Anillo de seguridad interior 40 mm', 'pins-rings', 'PCS', 90, []],
  // Sellos
  ['SEL-ACE-50', 'Sello de aceite 50 x 72 x 8', 'seals', 'PCS', 25, [WY1000]],
  ['SEL-POL-63', 'Sello de polvo 63 mm', 'seals', 'PCS', 40, [JUMBO]],
  ['ORI-30X3', 'Junta tórica 30 x 3 mm (NBR)', 'o-rings', 'PCS', 150, []],
  ['ORI-KIT-382', 'Surtido de juntas tóricas métricas (382 pzs)', 'o-rings', 'SET', 4, []],
  [
    'KIT-SEL-CIL80',
    'Kit de sellos cilindro hidráulico 80 mm',
    'seal-kits',
    'SET',
    6,
    [JUMBO, WY1000],
  ],
  ['KIT-SEL-U1528', 'Kit de sellos martillo U1528', 'seal-kits', 'SET', 2, [HAMMER]],
  // Hidráulica
  [
    'MAN-1-2-2M',
    'Manguera hidráulica 1/2" 2 m con conectores',
    'hoses-fittings',
    'PCS',
    14,
    [JUMBO, WY1000],
  ],
  [
    'MAN-3-4-1M',
    'Manguera hidráulica 3/4" 1 m con conectores',
    'hoses-fittings',
    'PCS',
    9,
    [JUMBO],
  ],
  ['CON-JIC-1-2', 'Conector JIC 1/2" recto', 'hoses-fittings', 'PCS', 45, []],
  ['VAL-DIR-4V', 'Válvula direccional 4/3 vías', 'valves', 'PCS', 3, [JUMBO]],
  ['VAL-ALI-250', 'Válvula de alivio 250 bar', 'valves', 'PCS', 5, [JUMBO, WY1000]],
  ['CIL-VOL-80', 'Cilindro de volteo 80 mm', 'cylinders', 'PCS', 2, [WY1000]],
  // Filtros
  ['FIL-ACE-YC', 'Filtro de aceite motor Yuchai', 'filters', 'PCS', 20, [YUCHAI]],
  ['FIL-COM-YC', 'Filtro de combustible motor Yuchai', 'filters', 'PCS', 16, [YUCHAI]],
  ['FIL-AIR-YC', 'Filtro de aire motor Yuchai', 'filters', 'PCS', 7, [YUCHAI]],
  ['FIL-HID-RET', 'Filtro hidráulico de retorno', 'filters', 'PCS', 11, [JUMBO, WY1000]],
  ['FIL-HID-SUC', 'Filtro hidráulico de succión', 'filters', 'PCS', 0, [JUMBO]],
  // Eléctrico
  ['SEN-PRO-M18', 'Sensor de proximidad inductivo M18', 'sensors', 'PCS', 10, [JUMBO]],
  ['SEN-PRE-400', 'Sensor de presión 0-400 bar', 'sensors', 'PCS', 4, [JUMBO]],
  ['REL-24V-40A', 'Relé automotriz 24 V 40 A', 'relays-switches', 'PCS', 35, [WY1000, WY800]],
  ['CON-3P-25A', 'Contactor tripolar 25 A bobina 24 V', 'relays-switches', 'PCS', 6, [JUMBO]],
  ['CAB-4X2.5', 'Cable flexible 4 x 2.5 mm²', 'cables-connectors', 'PCS', 120, []],
  ['CNT-DEU-4P', 'Conector Deutsch 4 pines', 'cables-connectors', 'PCS', 28, [JUMBO]],
  ['BAT-12V-100', 'Batería 12 V 100 Ah', 'batteries-chargers', 'PCS', 5, [WY1000, WY800]],
  // Motor
  ['BOM-INY-YC', 'Bomba de inyección motor Yuchai', 'engine', 'PCS', 1, [YUCHAI]],
  ['COR-DIS-YC', 'Correa de distribución motor Yuchai', 'engine', 'PCS', 4, [YUCHAI]],
  ['BUJ-PRE-YC', 'Bujía de precalentamiento motor Yuchai', 'engine', 'PCS', 12, [YUCHAI]],
  // Llantas
  ['LLA-825-16', 'Llanta 8.25-16 con cámara', 'wheels', 'PCS', 6, [WY1000]],
  ['LLA-600-12', 'Llanta 6.00-12', 'wheels', 'PCS', 8, [WY800]],
  // Herramientas
  ['HER-LLA-DIN', 'Llave de impacto 1" con dados', 'tools', 'SET', 2, []],
  ['HER-ENG-GRS', 'Engrasadora manual de palanca', 'tools', 'PCS', 5, []],
  // Cables de acero
  ['CAB-ACE-12', 'Cable de acero 12 mm', 'wire-ropes', 'PCS', 80, [JUMBO]],
  // Rodamientos
  ['ROD-6208', 'Rodamiento rígido de bolas 6208', 'bearings', 'PCS', 22, [WY1000, WY800]],
  ['ROD-32010', 'Rodamiento de rodillos cónicos 32010', 'bearings', 'PCS', 9, [WY1000]],
  ['BUJ-BRO-50', 'Buje de bronce 50 mm', 'bearings', 'PCS', 15, [JUMBO]],
  // Kits
  [
    'KIT-MAN-250H',
    'Kit de mantenimiento 250 h motor Yuchai',
    'maintenance-kits',
    'SET',
    3,
    [YUCHAI],
  ],
  ['KIT-MAN-JUMBO', 'Kit de mantenimiento hidráulico Jumbo', 'maintenance-kits', 'SET', 2, [JUMBO]],
];

const LOAD_NOTE = 'Sample catalogue';
const LOAD_DATE = new Date('2026-09-30T12:00:00.000-05:00');

const { db, close } = openScriptContext();

try {
  if (process.env.NODE_ENV === 'production')
    throw new Error('seed-sample-products must not run in production');

  const [existing] = await db.select({ value: count() }).from(products);
  if (Number(existing?.value ?? 0) > 0)
    throw new Error('Products already exist. Sample products only load into an empty catalogue.');

  const categoryIds = await ensureTaxonomy(db);
  const equipmentIds = await ensureEquipment(db);

  await db.transaction(async (transaction) => {
    const tx = transaction as unknown as Database;

    await tx.insert(products).values(
      SAMPLES.map(([code, name, categorySlug, unit, stock]) => {
        const categoryId = categoryIds.get(categorySlug);
        if (categoryId === undefined) throw new Error(`Unknown category: ${categorySlug}`);
        return { code, name, categoryId, unit, stock };
      }),
    );
    const rows = await tx.select({ id: products.id, code: products.code }).from(products);
    const idByCode = new Map(rows.map((row) => [row.code, row.id]));

    const links = SAMPLES.flatMap(([code, , , , , equipment]) =>
      equipment.map((name) => {
        const equipmentId = equipmentIds.get(name);
        if (equipmentId === undefined) throw new Error(`Unknown equipment: ${name}`);
        return { productId: idByCode.get(code) as number, equipmentId };
      }),
    );
    await tx.insert(productEquipment).values(links);

    const movements = SAMPLES.filter(([, , , , stock]) => stock > 0).map(([code, , , , stock]) => ({
      productId: idByCode.get(code) as number,
      type: 'IN' as const,
      reason: 'INITIAL_LOAD',
      quantity: stock,
      stockAfter: stock,
      note: LOAD_NOTE,
      occurredAt: LOAD_DATE,
    }));
    await tx.insert(stockMovements).values(movements);

    console.log(`Sample products: ${SAMPLES.length}`);
    console.log(`Equipment links: ${links.length}`);
    console.log(`Initial stock movements: ${movements.length}`);
  });
} finally {
  await close();
}
