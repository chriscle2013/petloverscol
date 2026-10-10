# Checkout seguro de PetLoversCol

## Qué cambia
- El navegador envía solo identificadores de producto, variantes, cantidades y datos de entrega.
- `createOrder` valida precio, publicación, descuentos y existencias desde Firestore, calcula el envío en el servidor y crea el pedido mientras reserva el inventario en una sola transacción.
- `updateOrderStatus` solo admite administradores con el custom claim `admin: true`. Al cancelar, devuelve las existencias una sola vez.
- El cliente ya no puede crear/modificar documentos de `orders` ni cambiar existencias mediante el checkout.

## Requisito de facturación
Firebase exige el plan Blaze para desplegar Cloud Functions. El uso puede quedar dentro de las cuotas gratuitas, pero no se garantiza costo cero. No actives la facturación hasta revisar el presupuesto y configurar alertas. Las alertas notifican; no siempre bloquean automáticamente los cargos.

## Despliegue manual
1. Instala Node.js 20 o superior y Firebase CLI.
2. En una terminal, desde la carpeta del repositorio:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use petloverscol
   ```
3. Revisa en Firebase Console que el proyecto sea `petloverscol`, que Firestore esté activo y que la cuenta administrativa tenga el custom claim `admin: true`. La página admin ya depende de ese claim para las reglas.
4. Cuando hayas decidido habilitar Blaze, instala dependencias y despliega:
   ```bash
   cd functions
   npm install
   cd ..
   firebase deploy --only functions,firestore:rules
   ```
5. Publica la rama con estos cambios en Vercel solo después de que las funciones se hayan desplegado correctamente.
6. Prueba una compra con una unidad disponible, otra sin stock y una cancelación. Verifica el stock en Firestore después de cada prueba.

## Notas
- ePayco no se activa aquí; los pedidos quedan en `pending_payment` / `not_paid`.
- El envío gratuito desde $150.000 COP se aplica usando el subtotal calculado en el servidor.
- Si un producto no tiene peso en `productos-data.js` o una presentación cuyo peso pueda identificarse, el checkout se detiene para evitar cotizar un envío incorrecto.
- La regla de lectura de pedidos requiere el custom claim `admin: true`; el correo de la lista blanca visual de la página admin no sustituye ese claim.
