export interface CategoryNode {
  slug: string;
  name: string;
  children?: { slug: string; name: string }[];
}

export const CATEGORY_TREE: CategoryNode[] = [
  { slug: 'equipment', name: 'Equipos y maquinaria' },
  {
    slug: 'drilling',
    name: 'Perforación',
    children: [
      { slug: 'drill-bits', name: 'Brocas' },
      { slug: 'drill-rods', name: 'Barras, vástagos y acoples' },
      { slug: 'rig-parts', name: 'Partes de equipo de perforación' },
    ],
  },
  {
    slug: 'fasteners',
    name: 'Fijación',
    children: [
      { slug: 'bolts-screws', name: 'Pernos y tornillos' },
      { slug: 'nuts-washers', name: 'Tuercas y arandelas' },
      { slug: 'pins-rings', name: 'Pasadores y anillos' },
    ],
  },
  {
    slug: 'sealing',
    name: 'Sellos y juntas',
    children: [
      { slug: 'seals', name: 'Sellos' },
      { slug: 'o-rings', name: 'Juntas tóricas y anillos' },
      { slug: 'seal-kits', name: 'Kits de sellos' },
    ],
  },
  {
    slug: 'hydraulics',
    name: 'Hidráulica y neumática',
    children: [
      { slug: 'hoses-fittings', name: 'Mangueras y conectores' },
      { slug: 'valves', name: 'Válvulas' },
      { slug: 'cylinders', name: 'Cilindros y pistones' },
    ],
  },
  { slug: 'filters', name: 'Filtros' },
  {
    slug: 'electrical',
    name: 'Eléctrico y electrónico',
    children: [
      { slug: 'sensors', name: 'Sensores' },
      { slug: 'relays-switches', name: 'Relés, contactores e interruptores' },
      { slug: 'cables-connectors', name: 'Cables y conectores eléctricos' },
      { slug: 'batteries-chargers', name: 'Baterías y cargadores' },
    ],
  },
  { slug: 'engine', name: 'Motor' },
  { slug: 'wheels', name: 'Llantas y ruedas' },
  { slug: 'tools', name: 'Herramientas' },
  { slug: 'wire-ropes', name: 'Cables de acero y controles' },
  { slug: 'bearings', name: 'Rodamientos y bujes' },
  { slug: 'maintenance-kits', name: 'Kits de mantenimiento' },
  { slug: 'uncategorized', name: 'Sin clasificar' },
];

export const FALLBACK_CATEGORY = 'uncategorized';
