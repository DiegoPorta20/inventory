import { searchable } from './classifier.js';

export interface EquipmentSeed {
  name: string;
  description: string;
  pattern: RegExp;
}

export const EQUIPMENT_SEEDS: EquipmentSeed[] = [
  {
    name: 'Perforadora frontal WD561',
    description: 'Equipo de perforación frontal',
    pattern: /wd\s?561/,
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
