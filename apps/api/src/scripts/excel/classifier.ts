import { FALLBACK_CATEGORY } from './taxonomy.js';

export const stripAccents = (text: string): string =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const searchable = (text: string): string =>
  stripAccents(text).toLowerCase().replace(/\s+/g, ' ').trim();

interface Rule {
  slug: string;
  pattern: RegExp;
}

/** Ordered from most specific to most generic: the first matching rule wins. */
const RULES: Rule[] = [
  { slug: 'seal-kits', pattern: /kit de sellos|juego de juntas/ },
  { slug: 'maintenance-kits', pattern: /kit de (mantenimiento|revision)|paquete de reparacion/ },
  {
    slug: 'equipment',
    pattern:
      /^(winche|ventiladores|equipo de perforacion frontal|vehiculo electrico|minidumper de tolva|jumbo)/,
  },
  { slug: 'drill-bits', pattern: /^(broca|barreno|punta sds)/ },
  {
    slug: 'drill-rods',
    pattern:
      /vastago|shank|tubo de perforacion|barra de perforacion|tubo alargado|manguito (adaptador de vastago|de conexion)|mandril/,
  },
  {
    slug: 'wheels',
    pattern: /\bllantas?\b|neumatico \d|aros? de rueda|cubo de rueda|conjunto de neumatico/,
  },
  {
    slug: 'tools',
    pattern:
      /\bllave\b|destornillador|alicate|^martillo|extractor|herramienta|zocalo (hexagonal|de doce)|casquillo|biela (de zocalo|neumatica)|pistola de engrase|calibrador|pipe clamp|open wrench|adaptador \(sistema|manga larga|gancho de anillo de sellado|sistema de .*zocalo/,
  },
  { slug: 'drill-rods', pattern: /^broca cilindrica/ },
  {
    slug: 'rig-parts',
    pattern:
      /deslizador|bloque deslizante|placa (de desgaste|de montaje|de retencion|de refuerzo|indicadora|de datos)|^base [ab]\b|base de montaje del carrete|baldosa|almohadilla|asiento fijo|soporte de ajuste|guia de perforacion|^eje |polea guia|etiqueta|blocking head|catch plate|^conjunto 2|^set 2 manga|bloquear un tiro|motor de jumbo|motor hidraulico|^impulsor|tapa de proteccion|^tapon|abrazadera de sujecion|^guia$|control deslizante|resorte/,
  },
  {
    slug: 'wire-ropes',
    pattern:
      /cable de acero|cable de (avance|empuje|retorno|retroceso)|(avance|retraiga) el cable|cable del acelerador|cables? de freno|manija (de freno|para)|mango del acelerador|cinta de montar|^cable de acero/,
  },
  {
    slug: 'pins-rings',
    pattern: /pasador|anillo (elastico|de retencion|de sujecion|de tope)|aro de bloqueo/,
  },
  { slug: 'o-rings', pattern: /toric[oa]|anillo o\b|anillo de goma/ },
  {
    slug: 'seals',
    pattern:
      /^sello|\bsello\b|anillo de sellado|diafragma|arandela de sello|^junta\b(?! de transicion)/,
  },
  {
    slug: 'filters',
    pattern: /filtro|elemento filtrante|air filter|separador (de aceite)?$|separador de aceite/,
  },
  {
    slug: 'engine',
    pattern:
      /aftertreatment|boost pressure|crankshaft|coolant heater|differential pressure sensor|engine oil cooler|fuel (injection|injector|metering)|turbocharger|rail pressure|thermostat|^starter|^generator|water pump|water temperature sensor/,
  },
  { slug: 'sensors', pattern: /sensor|transductor/ },
  {
    slug: 'relays-switches',
    pattern:
      /\brele\b|relay|contactor|fusible|interruptor|boton pulsador|estacion de boton|bloque de contacto|contacto normalmente|base de (rele|zocalo de rele)|accesorios de rele/,
  },
  {
    slug: 'batteries-chargers',
    pattern: /bateria|cargador|indicador de carga|visor de carga|fuente de alimentacion/,
  },
  {
    slug: 'cables-connectors',
    pattern: /^cable de (comunicacion|conexion)|ethernet|conector m12|^cable (de )?internet/,
  },
  {
    slug: 'electrical',
    pattern:
      /luces|faros|claxon|altavoz|modulo de visualizacion|teclado|calentador|tarjeta de equipo/,
  },
  { slug: 'cylinders', pattern: /cilindro|piston|manguito de presion/ },
  { slug: 'valves', pattern: /valvula|multi-valve/ },
  {
    slug: 'hoses-fittings',
    pattern:
      /manguera|conector|acople|adaptador|abrazadera|junta de transicion|uniones? de transicion|tubo (de acero )?hidraulico|conjunto de tubo|protector en espiral|conexion de carga|soporte de manguera|manga (de aluminio|del conector)|manguito de aluminio|ensamblaje de manguera|grasera/,
  },
  { slug: 'bearings', pattern: /rodamiento|\bbuje\b|alojamiento de rodamiento/ },
  { slug: 'bolts-screws', pattern: /perno|tornillo|inserto roscado|prisionero/ },
  { slug: 'nuts-washers', pattern: /tuerca|arandela/ },
];

export function classify(description: string): string {
  const text = searchable(description);
  return RULES.find((rule) => rule.pattern.test(text))?.slug ?? FALLBACK_CATEGORY;
}
