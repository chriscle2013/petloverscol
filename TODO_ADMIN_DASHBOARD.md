# TODO Admin Dashboard (Inventario + Publicación + Descuentos)

## Estado
- [x] Producto nuevo desde admin aparece en index (ya no falla por índice Firestore).

## Próximo
- [ ] (UI) Rediseñar `admin.html` como dashboard con sidebar y tabs.
- [ ] (Campos) Agregar en el formulario:
  - [ ] published (boolean: publicado/oculto)
  - [ ] discount% (number)
  - [ ] discount startAt (fecha)
  - [ ] discount endAt (fecha)
  - [ ] mostrar tachado (sí/no) -> usar para UI
- [ ] (Admin JS) Actualizar `js/admin.js`:
  - [ ] Render tabla con columnas: publicado, descuento activo, stock
  - [ ] Cargar/editar/crear escribiendo `published` y `discount` al doc.
- [x] (Front index) Actualizar `js/script.js` para:
  - [x] No renderizar productos con `published === false`
  - [x] Aplicar descuento% según rango de fechas
  - [x] Mostrar etiqueta y tachado si aplica
  - [x] Usar precio final para `addToCart`
- [x] (Front product.html) Actualizar `js/product.js` para:
  - [x] Aplicar descuento% en la vista del producto
  - [x] Usar precio final al agregar al carrito
- [x] (Compatibilidad) Asegurar que productos existentes sin campos `published/discount` sigan funcionando (default: published=true, sin descuento).

## Verificación
- [ ] Crear producto publicado y oculto desde admin: validar que el oculto no aparece en index.
- [ ] Crear descuento con start/end: validar que cambia en el tiempo (y muestra tachado).
- [ ] Validar que agregar al carrito usa el precio final.


