# TODO — PetLoversCol

## Prioridad 1 — Inventario y consistencia
- [x] Usar Firestore como fuente de verdad cuando carga correctamente el catálogo.
- [x] Reconocer stock por variante y stock general en el catálogo.
- [x] Guardar productId y variantName en el carrito.
- [x] Revalidar publicación, stock y precio del carrito contra Firestore.
- [x] Revalidar stock y precio antes de crear un pedido.
- [x] Permitir ajuste administrativo por variante y mantener stock total sincronizado.
- [ ] Probar manualmente productos con y sin variantes, agotados y cambios de stock concurrentes.

## Prioridad 2 — Catálogo dinámico
- [x] Evitar que tarjetas HTML antiguas sobrevivan cuando Firestore carga correctamente.
- [x] Sincronizar categorías Firestore con los filtros actuales.
- [ ] Revisar paginación/límite del catálogo cuando haya más de 50 productos por animal.
- [ ] Revisar y eliminar progresivamente datos de producto hardcodeados que ya no sean necesarios como fallback.

## Prioridad 3 — Carrito y checkout
- [x] Evitar precios obsoletos al entrar al carrito.
- [x] Evitar continuar con productos agotados/no publicados.
- [x] Validar nuevamente precio e inventario antes de guardar el pedido.
- [ ] Revisar reserva/descuento de inventario al confirmar una venta para evitar sobreventa entre dos compras simultáneas.
- [ ] Revisar y probar cálculo de envío con casos reales de peso/departamento.

## Prioridad 4 — Administración
- [x] Ajuste de stock general con transacción.
- [x] Ajuste de stock por variante con transacción.
- [ ] Completar validaciones y pruebas de UX del dashboard.
- [ ] Revisar detalles de pedidos y flujo de despacho.

## Pendiente deliberado — ePayco
- [ ] Integrar ePayco únicamente después de estabilizar catálogo, inventario, carrito, checkout y pedidos.
- [ ] Implementar confirmación real del pago y actualización segura del estado del pedido.
- [ ] No considerar el botón/prototipo actual como integración ePayco terminada.
