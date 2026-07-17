# TODO Admin Dashboard v2 (UI/UX + Edición rápida)

## Objetivo
Mejorar la interfaz del dashboard para que se vea moderna y eficiente, y completar la funcionalidad de pestañas que hoy solo están como “nombre” (tab labels) pero no operan al 100%.

---

## 1) Dashboard moderno (UI)
- [ ] (UI) Mejorar layout general (dashboard) con:
  - [ ] encabezado con búsqueda/estado (opcional)
  - [ ] mejor jerarquía visual (cards, métricas, separadores)
  - [ ] estilos coherentes con la tabla de inventario
- [ ] (UI) En la tabla de inventario:
  - [ ] mejorar columnas (alineación, widths, responsive)
  - [ ] añadir badges visuales consistentes (publicado/oculto, descuento activo, etc.)
  - [ ] mejorar botones de acción (editar/eliminar/ajuste stock)

---

## 2) Edición rápida desde la tabla (clic en el nombre del producto)
- [x] (JS) En el inventario, permitir que al **clic en el nombre del producto** se carguen automáticamente los datos en los campos del formulario para actualizar:

  - [ ] ID (bloqueado/readonly en modo edición)
  - [ ] title
  - [ ] animal
  - [ ] category
  - [ ] price (base)
  - [ ] stock
  - [ ] img
  - [ ] images (textarea)
  - [ ] variants (textarea)
  - [ ] descripcion, beneficios, caracteristicas
  - [ ] published
  - [ ] discount.percent
  - [ ] discount.startAt / discount.endAt
  - [ ] discount.strike (tachado)
- [ ] (JS) Asegurar que el formulario cambie el estado:
  - [ ] Cambiar `form-title` a “Editar Producto”
  - [ ] Mostrar botón “Cancelar” y ocultar “Guardar” si aplica (o ajustar texto)
  - [ ] Reset consistente al cancelar
- [x] (UI) Indicar visualmente que el nombre es clicable (cursor + hover)


---

## 3) Completar pestañas que no están 100% funcionales
Pestañas actuales (según `admin.html`):
- [ ] `tab-inventario` (debe funcionar para CRUD de productos)
- [ ] `tab-precios` (actualmente es texto; debe conectarse a la lógica real)
- [ ] `tab-ajustes` (hoy depende del formulario; debe tener su propia UI mínima funcional)
- [ ] `tab-ventas` (actualmente lista órdenes y filtro de estado; revisar que todo sea funcional)

### 3.1) Pestaña “Publicación & Descuentos” (`tab-precios`)
- [x] (UI) Agregar controles reales en esta pestaña (sin depender solo del formulario de inventario):
  (Se requiere editar `admin.html` y `js/admin.js`).

  - [x] lista/selector de productos
  - [x] toggles/inputs para `published`
  - [x] inputs para `discount.percent`, `discount.startAt`, `discount.endAt`, `discount.strike`
- [x] (JS) Botón “Guardar cambios” que haga update de Firestore sobre el producto seleccionado
- [x] (JS) Render de productos con descuento activo dentro de esta pestaña


### 3.2) Pestaña “Ajuste de Inventario” (`tab-ajustes`)
- [x] (UI) Crear UI dedicada:
  - [x] selector de producto (o buscador)
  - [x] input `delta` (+/-)
  - [x] botón “Aplicar ajuste”
  - [x] mensaje de confirmación/errores más claro
- [x] (JS) Reusar lógica actual de transacción (stock no negativo)
- [x] (JS) Mostrar el stock actual del producto seleccionado antes de aplicar el ajuste



### 3.3) Pestaña “Ventas / Pedidos / Despachos” (`tab-ventas`)
- [x] (UI) Confirmar que el filtro `orders-status-filter` funciona siempre
- [x] (JS) Revisar actualización de estados:
  - [x] validar estados permitidos
  - [x] refrescar tabla luego de actualizar
- [ ] (Opcional UI) Añadir columna o modal con detalles del pedido (items/shipping/buyer)


---

## 4) Validaciones y compatibilidad
- [ ] (Compatibilidad) Asegurar defaults para documentos antiguos:
  - [ ] si no existe `published` => true
  - [ ] si no existe `discount` => sin descuento
- [ ] (JS) Validar rangos:
  - [ ] discount.percent 0..90
  - [ ] startAt <= endAt
  - [ ] stock y delta numéricos

---

## 5) Verificación (manual)
- [ ] Probar: clic en el nombre de un producto -> se cargan campos del producto para editar
- [ ] Probar: guardar cambios -> se reflejan en la tabla
- [ ] Probar: pestaña “Publicación & Descuentos” -> edita correctamente publicado/descuento
- [ ] Probar: pestaña “Ajuste de Inventario” -> aplica transacción y no deja stock negativo
- [ ] Probar: pestaña “Ventas” -> filtra y actualiza estado de órdenes

