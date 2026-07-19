// js/tarifas-envio.js
// Factores basados en la distancia y complejidad de entrega desde Cali (Origen: Valle del Cauca)

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
