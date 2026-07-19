/**
 * js/tarifas-envio.js
 *
 * En este proyecto ya no vamos a consultar Cloud Function.
 *
 * Usamos una tabla:
 * - factor por departamento (multiplicador)
 * - costos por bulto (pequeño/mediano/grande) donde cada rango viene como "$X - $Y"
 *
 * Importante:
 * - Para que coincida con la cotización esperada (Servientrega), el envío se calcula como:
 *   shippingCost = costoBultoPromedioDelTramo * factorDepartamento
 * - No se prorratea linealmente por kg.
 * - Volumen se deja en 0 (solo peso), tal como pediste.
 */

export const tarifasPorDepartamento = {
  // Zona Centro-Occidente (Bajo costo)
  "Valle del Cauca": { factor: 1.0 },
  "Cauca": { factor: 1.1 },
  "Quindío": { factor: 1.2 },
  "Risaralda": { factor: 1.2 },
  "Caldas": { factor: 1.2 },

  // Región Andina (Costo medio)
  "Antioquia": { factor: 1.4 },
  "Cundinamarca": { factor: 1.5 },
  "Bogotá D.C.": { factor: 1.5 },
  "Tolima": { factor: 1.3 },
  "Huila": { factor: 1.3 },

  // Regiones más alejadas (Costo alto)
  "Atlántico": { factor: 1.8 },
  "Bolívar": { factor: 1.8 },
  "Santander": { factor: 1.7 },
  "Norte de Santander": { factor: 1.7 },
  "Meta": { factor: 1.8 },

  // Destinos Especiales (Muy alto costo)
  "Amazonas": { factor: 3.5 },
  "San Andrés y Providencia": { factor: 4.0 },
  "Chocó": { factor: 2.2 },
  "La Guajira": { factor: 2.0 },

  // Default para cualquier departamento no listado
  "default": { factor: 1.9 }
};

/**
 * Tarifas por departamento derivadas desde la "Matriz de Costos..."
 * Formato por bulto:
 *  - pequeno: rango en COP para 1-5 kg
 *  - mediano: rango en COP para 10-15 kg
 *  - grande: rango en COP para 20-30 kg
 *
 * La tabla que pegaste contiene rangos. Aquí usamos promedio del rango como "costoBultoPromedio"
 * y lo convertimos a COP/kg usando kgPromedioBulto (2.5, 12.5, 25).
 *
 * Si en el futuro quisieras meter el rango mínimo/máximo, se puede extender, pero por ahora
 * necesitamos un número determinista.
 */
const kgProm = { pequeno: 2.5, mediano: 12.5, grande: 25 };

/** helper para obtener el mínimo de un rango tipo "$7.500 - $11.000" */
const minRange = (str) => {
  const nums = String(str)
    .replace(/[^\d\-,.]/g, '')
    .split('-')
    .map(s => Number(s.replace(/\./g, '').replace(',', '.').trim()))
    .filter(n => Number.isFinite(n));
  if (nums.length < 1) return 0;
  return nums[0];
};

/** helper promedio (se mantiene para compatibilidad interna si aún lo usamos) */
const avgRange = (str) => {
  const nums = String(str)
    .replace(/[^\d\-,.]/g, '')
    .split('-')
    .map(s => Number(s.replace(/\./g, '').replace(',', '.').trim()))
    .filter(n => Number.isFinite(n));
  if (nums.length < 2) return 0;
  return (nums[0] + nums[1]) / 2;
};

const mkPesoKgTarifa = (tarifasPorBulto) => {
  // calcula promedio costo por bulto => COP/kg
  const costoPeq = avgRange(tarifasPorBulto.pequeno);
  const costoMed = avgRange(tarifasPorBulto.mediano);
  const costoGra = avgRange(tarifasPorBulto.grande);

  return {
    tarifaPesoKgPequeno: costoPeq && kgProm.pequeno ? costoPeq / kgProm.pequeno : 0,
    tarifaPesoKgMediano: costoMed && kgProm.mediano ? costoMed / kgProm.mediano : 0,
    tarifaPesoKgGrande: costoGra && kgProm.grande ? costoGra / kgProm.grande : 0
  };
};

const mkCostoBultoPromedio = (tarifasPorBulto) => {
  // costo bulto promedio COP del tramo (sin prorratear por kg)
  const costoPeq = avgRange(tarifasPorBulto.pequeno);
  const costoMed = avgRange(tarifasPorBulto.mediano);
  const costoGra = avgRange(tarifasPorBulto.grande);

  return {
    costoBultoPromedioPequeno: costoPeq || 0,
    costoBultoPromedioMediano: costoMed || 0,
    costoBultoPromedioGrande: costoGra || 0
  };
};

/**
 * Map final usado por checkout.html para elegir tarifa según peso total.
 * Nota: si tu tabla cambia, ajusta estos rangos.
 */
export const tarifasPesoPorDepartamento = {
  // Amazonas
  "Amazonas": {
    ...mkPesoKgTarifa({
      pequeno: "$28.000 - $38.000",
      mediano: "$58.000 - $85.000",
      grande: "$95.000 - $160.000"
    }),
    ...mkCostoBultoPromedio({
      pequeno: "$28.000 - $38.000",
      mediano: "$58.000 - $85.000",
      grande: "$95.000 - $160.000"
    })
  },

  // Antioquia
  "Antioquia": mkPesoKgTarifa({
    pequeno: "$14.000 - $19.000",
    mediano: "$24.000 - $35.000",
    grande: "$42.000 - $65.000"
  }),

  // Atlántico
  "Atlántico": mkPesoKgTarifa({
    pequeno: "$14.000 - $19.000",
    mediano: "$24.000 - $35.000",
    grande: "$42.000 - $65.000"
  }),

  // Bolívar
  "Bolívar": mkPesoKgTarifa({
    pequeno: "$15.000 - $20.000",
    mediano: "$26.000 - $38.000",
    grande: "$45.000 - $70.000"
  }),

  // Boyacá
  "Boyacá": mkPesoKgTarifa({
    pequeno: "$16.000 - $22.000",
    mediano: "$28.000 - $42.000",
    grande: "$50.000 - $78.000"
  }),

  // Caldas
  "Caldas": mkPesoKgTarifa({
    pequeno: "$9.000 - $14.000",
    mediano: "$15.000 - $22.000",
    grande: "$25.000 - $38.000"
  }),

  // Caquetá
  "Caquetá": mkPesoKgTarifa({
    pequeno: "$18.000 - $25.000",
    mediano: "$32.000 - $48.000",
    grande: "$58.000 - $88.000"
  }),

  // Casanare
  "Casanare": mkPesoKgTarifa({
    pequeno: "$18.000 - $25.000",
    mediano: "$32.000 - $48.000",
    grande: "$58.000 - $88.000"
  }),

  // Cauca
  "Cauca": mkPesoKgTarifa({
    pequeno: "$9.000 - $14.000",
    mediano: "$15.000 - $22.000",
    grande: "$25.000 - $38.000"
  }),

  // Cesar
  "Cesar": mkPesoKgTarifa({
    pequeno: "$16.000 - $22.000",
    mediano: "$28.000 - $42.000",
    grande: "$50.000 - $78.000"
  }),

  // Chocó
  "Chocó": mkPesoKgTarifa({
    pequeno: "$20.000 - $29.000",
    mediano: "$40.000 - $62.000",
    grande: "$70.000 - $110.000"
  }),

  // Córdoba
  "Córdoba": mkPesoKgTarifa({
    pequeno: "$16.000 - $22.000",
    mediano: "$28.000 - $42.000",
    grande: "$50.000 - $78.000"
  }),

  // Cundinamarca
  "Cundinamarca": mkPesoKgTarifa({
    pequeno: "$14.000 - $19.000",
    mediano: "$24.000 - $35.000",
    grande: "$42.000 - $65.000"
  }),

  // Guainía
  "Guainía": mkPesoKgTarifa({
    pequeno: "$28.000 - $38.000",
    mediano: "$58.000 - $85.000",
    grande: "$95.000 - $160.000"
  }),

  // Guaviare
  "Guaviare": mkPesoKgTarifa({
    pequeno: "$22.000 - $29.000",
    mediano: "$38.000 - $55.000",
    grande: "$68.000 - $95.000"
  }),

  // Huila
  "Huila": mkPesoKgTarifa({
    pequeno: "$15.000 - $20.000",
    mediano: "$26.000 - $38.000",
    grande: "$45.000 - $70.000"
  }),

  // La Guajira
  "La Guajira": mkPesoKgTarifa({
    pequeno: "$18.000 - $26.000",
    mediano: "$34.000 - $50.000",
    grande: "$60.000 - $90.000"
  }),

  // Magdalena
  "Magdalena": mkPesoKgTarifa({
    pequeno: "$15.000 - $20.000",
    mediano: "$26.000 - $38.000",
    grande: "$45.000 - $70.000"
  }),

  // Meta
  "Meta": mkPesoKgTarifa({
    pequeno: "$16.000 - $22.000",
    mediano: "$28.000 - $42.000",
    grande: "$50.000 - $78.000"
  }),

  // Nariño
  "Nariño": mkPesoKgTarifa({
    pequeno: "$12.000 - $16.000",
    mediano: "$18.000 - $28.000",
    grande: "$32.000 - $50.000"
  }),

  // Norte de Santander
  "Norte de Santander": mkPesoKgTarifa({
    pequeno: "$16.000 - $22.000",
    mediano: "$28.000 - $42.000",
    grande: "$50.000 - $78.000"
  }),

  // Putumayo
  "Putumayo": mkPesoKgTarifa({
    pequeno: "$22.000 - $29.000",
    mediano: "$38.000 - $55.000",
    grande: "$68.000 - $95.000"
  }),

  // Quindío
  "Quindío": mkPesoKgTarifa({
    pequeno: "$9.000 - $14.000",
    mediano: "$15.000 - $22.000",
    grande: "$25.000 - $38.000"
  }),

  // Risaralda
  "Risaralda": mkPesoKgTarifa({
    pequeno: "$9.000 - $14.000",
    mediano: "$15.000 - $22.000",
    grande: "$25.000 - $38.000"
  }),

  // San Andrés y Providencia
  "San Andrés y Providencia": mkPesoKgTarifa({
    pequeno: "$30.000 - $45.000",
    mediano: "$65.000 - $95.000",
    grande: "$110.000 - $180.000"
  }),

  // Santander
  "Santander": mkPesoKgTarifa({
    pequeno: "$16.000 - $22.000",
    mediano: "$28.000 - $42.000",
    grande: "$50.000 - $78.000"
  }),

  // Sucre
  "Sucre": mkPesoKgTarifa({
    pequeno: "$16.000 - $22.000",
    mediano: "$28.000 - $42.000",
    grande: "$50.000 - $78.000"
  }),

  // Tolima
  "Tolima": mkPesoKgTarifa({
    pequeno: "$14.000 - $18.000",
    mediano: "$22.000 - $32.000",
    grande: "$38.000 - $58.000"
  }),

  // Valle del Cauca (urbano/local/regional) - Cali/municipios
  "Valle del Cauca (Cali/Municipios)": mkPesoKgTarifa({
    pequeno: "$7.500 - $11.000",
    mediano: "$12.000 - $18.000",
    grande: "$20.000 - $30.000"
  }),

  // default (si falta el depto)
  "default": mkPesoKgTarifa({
    pequeno: "$12.000 - $16.000",
    mediano: "$20.000 - $28.000",
    grande: "$35.000 - $50.000"
  })
};

/**
 * Escoge tarifa COP/kg según el peso total (sin volumen).
 * - 1-5 kg => "pequeño"
 * - 10-15 kg => "mediano"
 * - 20-30 kg => "grande"
 *
 * Para pesos intermedios:
 * - si pesoTotalKg <= 5 => pequeño
 * - si <= 15 => mediano
 * - en caso contrario => grande
 */
export function getTarifaPesoKgParaDepartamento(departamentoName, pesoTotalKg) {
  const dep = (departamentoName || '').trim();
  const mapa = tarifasPesoPorDepartamento;
  const meta = mapa[dep] || (dep === 'Valle del Cauca' ? mapa["Valle del Cauca (Cali/Municipios)"] : null) || mapa["default"];

  if (!meta) return 0;

  if (pesoTotalKg <= 5) return meta.tarifaPesoKgPequeno;
  if (pesoTotalKg <= 15) return meta.tarifaPesoKgMediano;
  return meta.tarifaPesoKgGrande;
}

/**
 * Obtiene el costo bulto (COP) del tramo (pequeño/mediano/grande) para el departamento.
 * - En esta versión, la tabla `tarifasPesoPorDepartamento` solo tiene tarifa COP/kg.
 * - Para derivar el COP bulto promedio del tramo, multiplicamos por kgProm del tramo:
 *   costoBultoPromedio = tarifaPesoKgTramo * kgPromTramo
 *
 * Esto evita el bug actual donde `costoBultoPromedio...` es undefined (y entonces checkout devuelve 0).
 */
export function getCostoBultoPromedioParaDepartamento(departamentoName, pesoTotalKg) {
  const dep = (departamentoName || '').trim();
  const mapa = tarifasPesoPorDepartamento;
  const meta = mapa[dep] || (dep === 'Valle del Cauca' ? mapa["Valle del Cauca (Cali/Municipios)"] : null) || mapa["default"];

  if (!meta) return 0;

  if (pesoTotalKg <= 5) return (meta.tarifaPesoKgPequeno || 0) * (kgProm.pequeno || 0);
  if (pesoTotalKg <= 15) return (meta.tarifaPesoKgMediano || 0) * (kgProm.mediano || 0);
  return (meta.tarifaPesoKgGrande || 0) * (kgProm.grande || 0);
}
