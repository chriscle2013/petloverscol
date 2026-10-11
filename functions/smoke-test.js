import assert from "node:assert/strict";
import { productosMetadatos } from "./productos-data.js";
import { tarifasPesoPorDepartamento, getCostoBultoPromedioParaDepartamento } from "./tarifas-envio.js";

assert.ok(Object.keys(productosMetadatos).length > 0, "Debe existir metadata de productos");

for (const [name, meta] of Object.entries(productosMetadatos)) {
  if (meta.weight !== undefined) {
    assert.ok(Number.isFinite(Number(meta.weight)) && Number(meta.weight) > 0,
      `Peso inválido en metadata: ${name}`);
  }
}

for (const department of Object.keys(tarifasPesoPorDepartamento)) {
  if (department === "default") continue;
  for (const weight of [1, 5, 5.1, 15, 15.1, 25]) {
    const cost = getCostoBultoPromedioParaDepartamento(department, weight);
    assert.ok(Number.isFinite(Number(cost)) && Number(cost) >= 0,
      `Tarifa inválida para ${department} a ${weight} kg: ${cost}`);
  }
}

for (const weight of [1, 5, 5.1, 15, 15.1, 25]) {
  const cost = getCostoBultoPromedioParaDepartamento("Departamento no listado", weight);
  assert.ok(Number.isFinite(Number(cost)) && Number(cost) >= 0,
    `Tarifa por defecto inválida a ${weight} kg: ${cost}`);
}

console.log("Smoke tests passed: product metadata and shipping tariff ranges.");
