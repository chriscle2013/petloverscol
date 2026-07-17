# TODO - Front: published/discount/precioFinal

- [ ] js/script.js: 
  - [ ] Filtrar productos con `published === false`
  - [ ] Aplicar descuento por rango de fechas (`discount.startAt/endAt`) y `discount.percent`
  - [ ] Si `discount.strike === true`, mostrar texto con tachado/etiqueta (según UI existente)
  - [ ] Botón `addToCart` debe usar precio final (precio con descuento cuando aplica)

- [ ] js/product.js:
  - [ ] Aplicar descuento por rango de fechas en la vista del producto
  - [ ] Cuando cambie de variante, recalcular el precio final
  - [ ] `handleAddToCart` debe guardar precio final

- [ ] checkout / carrito:
  - [ ] Revisar que el checkout use `item.price` como precio final (ya usa `item.price`)

