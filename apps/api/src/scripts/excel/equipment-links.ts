import { searchable } from './classifier.js';

export interface EquipmentSeed {
  name: string;
  legacyNames?: string[];
  description: string;
  pattern: RegExp;
}

export const EQUIPMENT_SEEDS: EquipmentSeed[] = [
  {
    name: 'Jumbo DK0138',
    legacyNames: ['Perforadora frontal WD561'],
    description: 'Jumbo de perforación frontal (WD561)',
    pattern: /wd\s?561|dk\s?0?138/,
  },
  {
    name: 'Motor Yuchai',
    description: 'Motor diésel Yuchai del Jumbo',
    pattern: /yuchai/,
  },
  {
    name: 'Minidumper WY1000',
    description: 'Minidumper de tolva hidráulica de 1000 kg',
    pattern: /wy\s?1000|\b1000\s?(k|kg)\b/,
  },
  {
    name: 'Minidumper WY800',
    description: 'Minidumper de tolva manual de 800 kg',
    pattern: /wy\s?800|\b(800|350-8)\s?(k|kg)?\b.*(vehiculo|minidumper|mindumper)|\b800\s?(k|kg)\b/,
  },
  {
    name: 'Martillo perforador U1528',
    description: 'Martillo perforador hidráulico U1528',
    pattern: /u1528|u1838/,
  },
];

export function detectEquipment(description: string): string[] {
  const text = searchable(description);
  return EQUIPMENT_SEEDS.filter((seed) => seed.pattern.test(text)).map((seed) => seed.name);
}
