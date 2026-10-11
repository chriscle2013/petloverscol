# Checkout seguro de PetLoversCol

## Qué cambia
- El navegador envía solo identificadores de producto, variantes, cantidades y datos de entrega.
- `createOrder` valida precio, publicación, descuentos y existencias desde Firestore, calcula el envío en el servidor y crea el pedido mientras reserva el inventario en una sola transacción.
- `updateOrderStatus` solo admite al administrador autorizado: el correo verificado `musclev@yahoo.com` o una cuenta con el custom claim `admin: true`. Al cancelar, devuelve las existencias una sola vez.
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
3. Revisa en Firebase Console que el proyecto sea `petloverscol` y que Firestore esté activo. El acceso administrativo por correo requiere que `musclev@yahoo.com` tenga el correo verificado; alternativamente puedes usar el custom claim `admin: true`.
4. La cuenta administradora debe iniciar sesión con el correo verificado `musclev@yahoo.com` (o tener el custom claim `admin: true`). No cambies la lista blanca sin actualizar también `functions/index.js` y `firestore.rules`.
5. Cuando hayas decidido habilitar Blaze, instala dependencias y despliega:
   ```bash
   cd functions
   npm install
   cd ..
   firebase deploy --only functions,firestore:rules
   ```
6. Publica la rama con estos cambios en Vercel solo después de que las funciones se hayan desplegado correctamente.
7. Prueba una compra con una unidad disponible, otra sin stock y una cancelación. Verifica el stock en Firestore después de cada prueba.

## Notas
- ePayco no se activa aquí; los pedidos quedan en `pending_payment` / `not_paid`.
- El envío gratuito desde $150.000 COP se aplica usando el subtotal calculado en el servidor.
- Si un producto no tiene peso en `productos-data.js` o una presentación cuyo peso pueda identificarse, el checkout se detiene para evitar cotizar un envío incorrecto.
- Las reglas de Firestore permiten leer pedidos a la cuenta `musclev@yahoo.com` solo si el correo está verificado, o a una cuenta con el custom claim `admin: true`. La lista blanca visual de la página de administración no concede permisos por sí sola: deben coincidir las reglas y las Cloud Functions.


## Asistente de investigación de productos (opcional; no desplegado automáticamente)
- La función `researchProduct` usa Gemini 2.5 Flash con Google Search grounding. Intenta priorizar al fabricante oficial y recurre a distribuidores después; siempre muestra fuentes para revisión.
- El precio, stock, descuentos e imágenes **no** se completan con IA: deben verificarse e ingresarse manualmente.
- Para habilitarlo más adelante, crea una clave de Gemini en [Google AI Studio](https://aistudio.google.com/app/apikey) y guárdala como secreto de Firebase. No la pegues en archivos JavaScript ni en el chat:
  ```bash
  firebase functions:secrets:set GEMINI_API_KEY
  ```
  Cuando la terminal lo solicite, pega la clave en el prompt privado.
- Tras revisar presupuesto, permisos y cuota, el despliegue específico sería:
  ```bash
  firebase deploy --only functions:researchProduct
  ```
  Este comando **no se ha ejecutado**.
- Google publica límites gratuitos para Gemini API, pero la disponibilidad y los límites dependen del modelo y del proyecto. Consulta la [tabla oficial de precios y cuotas](https://ai.google.dev/gemini-api/docs/pricing) antes de habilitarlo. El plan Blaze de Firebase puede generar cargos por otros recursos, así que el coste total no está garantizado en cero.
