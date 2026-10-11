import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { productosMetadatos } from "./productos-data.js";
import { getCostoBultoPromedioParaDepartamento } from "./tarifas-envio.js";

if (!getApps().length) initializeApp();
const db = getFirestore();
const ADMIN_EMAIL = "musclev@yahoo.com";
const ALLOWED_ORIGINS = [
  "https://petloverscol.vercel.app",
  "https://petloverscol.com",
  "https://www.petloverscol.com",
  "http://localhost:3000",
  "http://127.0.0.1:5500"
];

function cleanText(value, maxLength = 250) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}
function asPositiveInteger(value, max = 50) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > max) return null;
  return n;
}
function dateValue(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
function isDiscountActive(discount, now) {
  if (!discount) return false;
  const percent = Number(discount.percent ?? 0);
  const start = dateValue(discount.startAt);
  const end = dateValue(discount.endAt);
  return Number.isFinite(percent) && percent > 0 && percent < 100 &&
    !!start && !!end && now >= start && now <= end;
}
function getFinalPrice(product, variantName, now) {
  const variants = product.variants && typeof product.variants === "object" ? product.variants : {};
  if (Object.keys(variants).length > 0 && !variantName) {
    throw new HttpsError("invalid-argument", `Selecciona una presentación para "${product.title || "el producto"}".`);
  }
  if (variantName && Object.keys(variants).length > 0 && variants[variantName] === undefined) {
    throw new HttpsError("failed-precondition", `La presentación "${variantName}" ya no está disponible para "${product.title || "el producto"}".`);
  }
  const raw = variantName && variants[variantName] !== undefined ? variants[variantName] : product.price;
  const base = Number(raw ?? 0);
  if (!Number.isFinite(base) || base <= 0) {
    throw new HttpsError("failed-precondition", `No se pudo validar el precio de "${product.title || "el producto"}".`);
  }
  const discount = product.discount || {};
  if (isDiscountActive(discount, now)) {
    const percent = Number(discount.percent);
    return Math.max(0, Math.round(base * (1 - percent / 100)));
  }
  return Math.round(base);
}
function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function weightFromProduct(product, variantName) {
  const title = String(product.title || "");
  // La variante seleccionada tiene prioridad sobre el título base del producto.
  // Ejemplo: título "Alimento 1 KG" y variante seleccionada "3 KG".
  const parseWeight = (value) => {
    const match = String(value || "").match(/(\d+(?:[.,]\d+)?)\s*(kg|kgs|g|gr|gramos)\b/i);
    if (!match) return null;
    const amount = Number(match[1].replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return /^(g|gr|gramos)$/i.test(match[2]) ? amount / 1000 : amount;
  };
  const variantWeight = parseWeight(variantName);
  if (variantWeight) return variantWeight;
  const titleWeight = parseWeight(title);
  if (titleWeight) return titleWeight;

  const titleNorm = normalize(title);
  const entries = Object.entries(productosMetadatos);
  const exact = entries.find(([key]) => normalize(key) === titleNorm);
  if (exact && Number(exact[1]?.weight) > 0) return Number(exact[1].weight);
  // Coincidencia de nombre base para productos cuyo peso se guarda en metadatos.
  const titleBase = titleNorm.replace(/\b\d+(?:[.,]\d+)?\s*(kg|kgs|g|gr|gramos)\b/gi, "").trim();
  let best = null;
  let bestScore = 0;
  for (const [key, meta] of entries) {
    const keyNorm = normalize(key);
    const keyBase = keyNorm.replace(/\b\d+(?:[.,]\d+)?\s*(kg|kgs|g|gr|gramos)\b/gi, "").trim();
    if (keyBase === titleBase && Number(meta?.weight) > 0) return Number(meta.weight);
    const tokens = titleBase.split(" ").filter(t => t.length >= 3);
    const keyTokens = new Set(keyBase.split(" ").filter(t => t.length >= 3));
    const score = tokens.filter(t => keyTokens.has(t)).length;
    if (score > bestScore && Number(meta?.weight) > 0) {
      best = Number(meta.weight);
      bestScore = score;
    }
  }
  if (best && bestScore >= 2) return best;
  return null;
}
function calculateShipping(items, department, subtotal) {
  // La tienda anuncia envío gratis desde $150.000 COP; se aplica al subtotal validado.
  if (subtotal >= 150000) return { cost: 0, weight: 0 };
  let totalWeight = 0;
  for (const item of items) {
    const weight = weightFromProduct(item.product, item.variantName);
    if (!weight || !Number.isFinite(weight) || weight <= 0) {
      throw new HttpsError(
        "failed-precondition",
        `No se pudo calcular el envío de "${item.product.title || item.productId}". Agrega su peso en productos-data.js antes de confirmar el pedido.`
      );
    }
    totalWeight += weight * item.qty;
  }
  const cost = Math.round(Number(getCostoBultoPromedioParaDepartamento(department, totalWeight) || 0));
  if (!Number.isFinite(cost) || cost < 0) {
    throw new HttpsError("failed-precondition", "No fue posible calcular el envío para ese destino.");
  }
  return { cost, weight: totalWeight };
}

export const createOrder = onCall(
  { region: "us-central1", cors: ALLOWED_ORIGINS, maxInstances: 10 },
  async (request) => {
    const data = request.data || {};
    const rawItems = Array.isArray(data.items) ? data.items : [];
    if (!rawItems.length || rawItems.length > 30) {
      throw new HttpsError("invalid-argument", "El carrito está vacío o contiene demasiados artículos.");
    }

    const buyer = {
      name: cleanText(data.buyer?.name, 120),
      email: cleanText(data.buyer?.email, 160).toLowerCase(),
      phone: cleanText(data.buyer?.phone, 40)
    };
    const shipping = {
      address: cleanText(data.shipping?.address, 250),
      city: cleanText(data.shipping?.city, 100),
      department: cleanText(data.shipping?.department, 100)
    };
    if (buyer.name.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email) || buyer.phone.length < 7) {
      throw new HttpsError("invalid-argument", "Verifica el nombre, correo y teléfono de contacto.");
    }
    if (shipping.address.length < 5 || !shipping.city || !shipping.department) {
      throw new HttpsError("invalid-argument", "Completa dirección, departamento y ciudad de entrega.");
    }

    const requirements = new Map();
    for (const raw of rawItems) {
      const productId = cleanText(raw?.productId, 120);
      const qty = asPositiveInteger(raw?.qty, 20);
      const variantName = cleanText(raw?.variantName, 100) || null;
      if (!productId || !qty) throw new HttpsError("invalid-argument", "Hay un artículo del carrito con datos inválidos.");
      const key = `${productId}::${variantName || "base"}`;
      const current = requirements.get(key) || { productId, variantName, qty: 0 };
      current.qty += qty;
      if (current.qty > 50) throw new HttpsError("invalid-argument", "La cantidad solicitada supera el máximo permitido.");
      requirements.set(key, current);
    }

    const productRefs = new Map();
    for (const req of requirements.values()) {
      if (!productRefs.has(req.productId)) productRefs.set(req.productId, db.collection("products").doc(req.productId));
    }

    const now = new Date();
    const orderRef = db.collection("orders").doc();
    let response;
    await db.runTransaction(async (transaction) => {
      const productSnapshots = new Map();
      for (const [id, ref] of productRefs) {
        const snap = await transaction.get(ref);
        if (!snap.exists) throw new HttpsError("failed-precondition", "Uno de los productos ya no existe.");
        const product = snap.data() || {};
        if ((product.published ?? true) !== true) {
          throw new HttpsError("failed-precondition", `"${product.title || id}" ya no está disponible.`);
        }
        productSnapshots.set(id, product);
      }

      const items = [];
      let subtotal = 0;
      for (const req of requirements.values()) {
        const product = productSnapshots.get(req.productId);
        const variantStockMap = product.variantStock && typeof product.variantStock === "object" &&
          Object.keys(product.variantStock).length ? { ...product.variantStock } : null;
        if (variantStockMap && (!req.variantName || product.variants?.[req.variantName] === undefined)) {
          throw new HttpsError("failed-precondition", `Selecciona una presentación válida para "${product.title || req.productId}".`);
        }
        const stockRaw = variantStockMap ? variantStockMap[req.variantName] : product.stock;
        const stock = Number(stockRaw ?? 0);
        if (!Number.isFinite(stock) || Math.trunc(stock) < req.qty) {
          throw new HttpsError("failed-precondition", `Inventario insuficiente para "${product.title || req.productId}". Disponible: ${Math.max(0, Math.trunc(Number.isFinite(stock) ? stock : 0))}.`);
        }
        const price = getFinalPrice(product, req.variantName, now);
        subtotal += price * req.qty;
        items.push({
          productId: req.productId,
          name: req.variantName ? `${product.title || req.productId} (${req.variantName})` : (product.title || req.productId),
          price,
          qty: req.qty,
          variantName: req.variantName,
          img: product.img || (Array.isArray(product.images) ? product.images[0] : null) || null,
          product
        });
      }

      const shippingResult = calculateShipping(items, shipping.department, subtotal);
      const updates = new Map();
      for (const req of requirements.values()) {
        const product = productSnapshots.get(req.productId);
        const update = updates.get(req.productId) || {};
        const variantStockMap = product.variantStock && typeof product.variantStock === "object" &&
          Object.keys(product.variantStock).length ? { ...(update.variantStock || product.variantStock) } : null;
        if (variantStockMap && req.variantName) {
          variantStockMap[req.variantName] = Math.max(0, Math.trunc(Number(variantStockMap[req.variantName] ?? 0)) - req.qty);
          update.variantStock = variantStockMap;
        } else {
          update.stock = Math.max(0, Math.trunc(Number(update.stock ?? product.stock ?? 0)) - req.qty);
        }
        updates.set(req.productId, update);
      }

      for (const [id, update] of updates) {
        if (update.variantStock) {
          update.stock = Object.values(update.variantStock).reduce((sum, value) => {
            const n = Number(value);
            return sum + (Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0);
          }, 0);
        }
        transaction.update(productRefs.get(id), { ...update, updatedAt: FieldValue.serverTimestamp() });
      }

      const orderItems = items.map(({ product, ...item }) => item);
      const total = subtotal + shippingResult.cost;
      transaction.create(orderRef, {
        items: orderItems,
        subtotal,
        total,
        buyer,
        shipping: { ...shipping, cost: shippingResult.cost },
        status: "pending_payment",
        paymentStatus: "not_paid",
        stockReserved: true,
        stockReleased: false,
        tracking: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      response = {
        orderId: orderRef.id,
        subtotal,
        shippingCost: shippingResult.cost,
        total,
        status: "pending_payment"
      };
    });
    return response;
  }
);

export const updateOrderStatus = onCall(
  { region: "us-central1", cors: ALLOWED_ORIGINS, maxInstances: 5 },
  async (request) => {
    if (!request.auth || !(request.auth.token?.admin === true || (request.auth.token?.email === ADMIN_EMAIL && request.auth.token?.email_verified === true))) {
      throw new HttpsError("permission-denied", "Solo un administrador autorizado puede actualizar pedidos.");
    }
    const orderId = cleanText(request.data?.orderId, 120);
    const nextStatus = cleanText(request.data?.status, 40);
    const allowedStatuses = ["pending_payment", "paid", "processing", "shipped", "delivered", "cancelled"];
    if (!orderId || !allowedStatuses.includes(nextStatus)) {
      throw new HttpsError("invalid-argument", "Pedido o estado inválido.");
    }

    const orderRef = db.collection("orders").doc(orderId);
    await db.runTransaction(async (transaction) => {
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists) throw new HttpsError("not-found", "Pedido no encontrado.");
      const order = orderSnap.data() || {};
      const currentStatus = order.status || "pending_payment";
      if (currentStatus === "cancelled" && nextStatus !== "cancelled") {
        throw new HttpsError("failed-precondition", "Un pedido cancelado no puede reactivarse; crea un pedido nuevo.");
      }
      if (nextStatus === "cancelled" && ["shipped", "delivered"].includes(currentStatus)) {
        throw new HttpsError("failed-precondition", "No se puede cancelar un pedido ya despachado o entregado.");
      }

      const shouldRelease = nextStatus === "cancelled" &&
        order.stockReserved === true && order.stockReleased !== true;
      const quantities = new Map();
      if (shouldRelease) {
        for (const item of (Array.isArray(order.items) ? order.items : [])) {
          if (!item.productId) continue;
          const variantName = item.variantName || null;
          const key = `${item.productId}::${variantName || "base"}`;
          const entry = quantities.get(key) || { productId: item.productId, variantName, qty: 0 };
          entry.qty += Math.max(1, Math.trunc(Number(item.qty) || 1));
          quantities.set(key, entry);
        }
      }
      const productRefs = new Map();
      for (const entry of quantities.values()) {
        if (!productRefs.has(entry.productId)) productRefs.set(entry.productId, db.collection("products").doc(entry.productId));
      }
      const products = new Map();
      for (const [id, ref] of productRefs) {
        const snap = await transaction.get(ref);
        if (!snap.exists) throw new HttpsError("failed-precondition", `No se puede devolver el inventario: falta el producto ${id}.`);
        products.set(id, snap.data() || {});
      }
      const changes = new Map();
      for (const entry of quantities.values()) {
        const product = products.get(entry.productId);
        const change = changes.get(entry.productId) || {};
        const variantMap = product.variantStock && typeof product.variantStock === "object" &&
          Object.keys(product.variantStock).length ? { ...(change.variantStock || product.variantStock) } : null;
        if (entry.variantName && variantMap) {
          if (variantMap[entry.variantName] === undefined) {
            throw new HttpsError("failed-precondition", `No se encontró la variante "${entry.variantName}" para devolver el inventario.`);
          }
          variantMap[entry.variantName] = Math.max(0, Math.trunc(Number(variantMap[entry.variantName] ?? 0))) + entry.qty;
          change.variantStock = variantMap;
        } else {
          change.stock = Math.max(0, Math.trunc(Number(change.stock ?? product.stock ?? 0))) + entry.qty;
        }
        changes.set(entry.productId, change);
      }
      for (const [id, change] of changes) {
        if (change.variantStock) {
          change.stock = Object.values(change.variantStock).reduce((sum, value) => {
            const n = Number(value);
            return sum + (Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0);
          }, 0);
        }
        transaction.update(productRefs.get(id), { ...change, updatedAt: FieldValue.serverTimestamp() });
      }
      transaction.update(orderRef, {
        status: nextStatus,
        updatedAt: FieldValue.serverTimestamp(),
        ...(shouldRelease ? { stockReleased: true } : {})
      });
    });
    return { success: true, orderId, status: nextStatus };
  }
);


// Investigación de fichas de producto con Google Search grounding.
// La clave Gemini se guarda en Secret Manager; nunca se expone al navegador.
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

export const researchProduct = onCall(
  { region: "us-central1", cors: ALLOWED_ORIGINS, maxInstances: 3, secrets: [GEMINI_API_KEY], timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión para investigar productos.");
    const isAdmin = request.auth.token?.admin === true ||
      (request.auth.token?.email === ADMIN_EMAIL && request.auth.token?.email_verified === true);
    if (!isAdmin) throw new HttpsError("permission-denied", "Solo un administrador puede investigar productos.");

    const productName = cleanText(request.data?.productName, 180);
    const animal = request.data?.animal === "gatos" ? "gatos" : "perros";
    if (productName.length < 3) throw new HttpsError("invalid-argument", "Escribe un nombre de producto más completo.");

    const prompt = `
Investiga en la web este producto para una tienda colombiana de mascotas.
Producto buscado: "${productName}"
Animal indicado por el administrador: ${animal}
IDIOMA: español latinoamericano.
ORDEN OBLIGATORIO DE FUENTES:
1) Busca primero la web oficial del fabricante y prioriza la ficha oficial del producto.
2) Solo después consulta distribuidores reconocidos de Colombia si la fuente oficial no contiene el dato.
3) No uses marketplaces como fuente principal si existe fabricante oficial.
4) Incluye fuentes con URL y título; nunca inventes enlaces ni afirmes que una fuente es oficial si no puedes verificarlo.
REGLAS DE VERACIDAD:
- No inventes ingredientes, beneficios, etapas de vida, composición, peso, recomendaciones ni datos clínicos.
- Si un dato no está respaldado por las fuentes, deja ese campo como cadena vacía.
- No generes precio de venta, stock, descuentos ni cantidades disponibles: esos datos los ingresa manualmente el administrador.
- Los beneficios deben corresponder a afirmaciones del fabricante, sin exagerarlas ni convertirlas en promesas médicas.
- Si no puedes identificar con certeza el producto exacto, indica la duda en "notas" y no completes datos dudosos.
- Devuelve SOLO un objeto JSON válido, sin Markdown ni texto antes/después, con esta estructura exacta:
{
  "title": "nombre comercial confirmado o vacío",
  "animal": "perros o gatos",
  "category": "Alimento concentrado | Alimento humedo | Prescripcion seco | Prescripcion humedo | Juguetes | Farmapet | Accesorios | Higiene | Arenas",
  "tag": "Normal | Premium | Super Premium | Veterinary | Prescription | Therapeutic | Clinical",
  "descripcion": "descripción respaldada por las fuentes",
  "beneficios": "beneficios confirmados separados por saltos de línea",
  "caracteristicas": "características confirmadas separadas por saltos de línea",
  "notas": "dudas o campos no confirmados",
  "sources": [{"title":"título de la fuente","url":"URL completa","type":"fabricante oficial o distribuidor"}]
}
Si la categoría no se puede determinar, usa cadena vacía. Si el nombre comercial no se confirma, conserva el nombre buscado en title y explica la duda en notas.
`;

    let response;
    try {
      response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY.value()
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          tools: [{ google_search_retrieval: {} }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 5000, responseMimeType: "application/json" }
        }),
        signal: AbortSignal.timeout(50000)
      });
    } catch (error) {
      console.error("Error de conexión con Gemini:", error);
      throw new HttpsError("unavailable", "No fue posible conectar con el servicio de investigación.");
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("Gemini API respondió con error:", response.status, detail.slice(0, 1200));
      if (response.status === 429) throw new HttpsError("resource-exhausted", "Se alcanzó el límite gratuito temporal de investigación. Inténtalo más tarde.");
      if (response.status === 401 || response.status === 403) throw new HttpsError("failed-precondition", "La clave Gemini no es válida o no tiene acceso a este servicio.");
      throw new HttpsError("unavailable", "El servicio de investigación no respondió correctamente.");
    }

    const payload = await response.json();
    const parts = payload?.candidates?.[0]?.content?.parts || [];
    const rawText = parts.map(part => part.text || "").join("").trim();
    if (!rawText) throw new HttpsError("internal", "La investigación no devolvió una ficha utilizable.");

    let result;
    try {
      const cleanJson = rawText.replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/, "");
      result = JSON.parse(cleanJson);
    } catch (error) {
      console.error("No se pudo interpretar la ficha Gemini:", error, rawText.slice(0, 800));
      throw new HttpsError("internal", "La respuesta de investigación no tenía un formato válido. Inténtalo otra vez.");
    }

    const allowedCategories = new Set(["Alimento concentrado", "Alimento humedo", "Prescripcion seco", "Prescripcion humedo", "Juguetes", "Farmapet", "Accesorios", "Higiene", "Arenas"]);
    const allowedTags = new Set(["Normal", "Premium", "Super Premium", "Veterinary", "Prescription", "Therapeutic", "Clinical"]);
    const groundingSources = (payload?.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
      .map(chunk => chunk?.web)
      .filter(web => web && typeof web.uri === "string" && /^https?:\/\//i.test(web.uri))
      .map(web => ({ title: cleanText(web.title || "Fuente web", 200), url: web.uri }))
      .filter((source, index, all) => all.findIndex(item => item.url === source.url) === index)
      .slice(0, 12);

    const modelSources = Array.isArray(result.sources) ? result.sources
      .filter(source => source && typeof source.url === "string" && /^https?:\/\//i.test(source.url))
      .map(source => ({ title: cleanText(source.title || "Fuente web", 200), url: source.url, type: cleanText(source.type || "Por verificar", 60) }))
      .slice(0, 12) : [];
    const sources = groundingSources.map(source => {
      const matching = modelSources.find(candidate => candidate.url === source.url);
      return { ...source, type: matching?.type || "Fuente encontrada por Google; revisar si es fabricante o distribuidor" };
    });

    return {
      title: cleanText(result.title || productName, 180),
      animal,
      category: allowedCategories.has(result.category) ? result.category : "",
      tag: allowedTags.has(result.tag) ? result.tag : "Normal",
      descripcion: cleanText(result.descripcion, 4000),
      beneficios: cleanText(result.beneficios, 2500),
      caracteristicas: cleanText(result.caracteristicas, 2500),
      notas: cleanText(result.notas, 1200),
      sources
    };
  }
);
