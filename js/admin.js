import { db, auth } from './firebase.js';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ADMIN_EMAIL_WHITELIST = ['musclev@yahoo.com'];

import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Elementos del DOM
const authOverlay = document.getElementById('auth-overlay');
const loginForm = {
    email: document.getElementById('admin-email'),
    pass: document.getElementById('admin-password'),
    btn: document.getElementById('btn-login'),
    error: document.getElementById('login-error')
};
const productForm = document.getElementById('product-form');
const productsList = document.getElementById('admin-products-list');
const btnLogout = document.getElementById('btn-logout');

// Estado del formulario
let editingId = null;

// --- Helpers: descuento/published ---
function parseBool(val, fallback = true) {
    if (val === true || val === false) return val;
    if (val === 'true') return true;
    if (val === 'false') return false;
    return fallback;
}

function dateToTimestampStart(input) {
    if (!input) return null;
    const d = new Date(input + 'T00:00:00');
    return Number.isNaN(d.getTime()) ? null : d;
}

function dateToTimestampEnd(input) {
    if (!input) return null;
    const d = new Date(input + 'T23:59:59');
    return Number.isNaN(d.getTime()) ? null : d;
}

function isDiscountActive(discount) {
    if (!discount) return false;
    const percent = Number(discount.percent ?? 0);
    if (!Number.isFinite(percent) || percent <= 0) return false;

    if (!discount.startAt || !discount.endAt) return false;

    const start = discount.startAt?.toDate ? discount.startAt.toDate() : new Date(discount.startAt);
    const end = discount.endAt?.toDate ? discount.endAt.toDate() : new Date(discount.endAt);

    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;

    const now = new Date();
    return now >= start && now <= end;
}

function decodeJwt(token) {
    try {
        const payload = token.split('.')[1] || '';
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decodeURIComponent(escape(json)));
    } catch {
        return null;
    }
}

// --- AUTENTICACIÓN ---
loginForm.btn.onclick = async () => {
    const email = loginForm.email.value;
    const password = loginForm.pass.value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        authOverlay.style.opacity = '0';
        setTimeout(() => authOverlay.style.display = 'none', 500);
    } catch (e) {
        console.error('Error de login:', e);
        loginForm.error.style.display = 'block';
    }
};

btnLogout.onclick = async () => {
    await signOut(auth);
    window.location.reload();
};

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        authOverlay.style.display = 'flex';
        return;
    }

    const isAdmin = ADMIN_EMAIL_WHITELIST.includes((user.email || '').toLowerCase());
    if (!isAdmin) {
        authOverlay.style.display = 'flex';
        authOverlay.innerHTML = `
            <div class="login-box">
                <h2>Acceso Denegado ❌</h2>
                <p>Tu cuenta no tiene permisos de administración.</p>
                <button id="btn-logout" class="btn-primary" style="width: 100%; margin-top: 15px;">Volver</button>
            </div>
        `;
        const btn = document.getElementById('btn-logout');
        if (btn) {
            btn.onclick = async () => {
                await signOut(auth);
                window.location.reload();
            };
        }
        return;
    }

    authOverlay.style.display = 'none';

    try {
        await user.getIdToken(true);
    } catch (e) {
        console.warn('No se pudo forzar refresh del token (se intentará igual):', e);
    }

    try {
        const token = await user.getIdToken();
        const decoded = decodeJwt(token);
        console.log('[admin] token.admin =', decoded?.admin);
    } catch (e) {
        console.warn('[admin] No se pudo decodificar token para debug:', e);
    }

    loadProducts();
    loadOrders();
});

function parseLinesTextarea(text) {
    return (text || '')
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);
}

function parseImagesFromTextarea() {
    const el = document.getElementById('prod-images');
    if (!el) return [];
    return parseLinesTextarea(el.value);
}

function parseVariantsFromTextarea() {

    const el = document.getElementById('prod-variants');
    if (!el) return {};

    const lines = parseLinesTextarea(el.value);
    const variants = {};

    for (const line of lines) {
        // soporta "nombre:precio" (con o sin espacios)
        const parts = line.split(':');
        if (parts.length < 2) continue;
        const name = parts[0].trim();
        const price = Number(parts.slice(1).join(':').trim());
        if (!name) continue;
        if (!Number.isFinite(price) || price < 0) continue;
        variants[name] = price;
    }

    return variants;
}

function renderStockByVariant(productData) {

    const variantStock = productData?.variantStock;
    const variants = productData?.variants;

    if (variantStock && typeof variantStock === 'object' && variants && typeof variants === 'object') {
        const names = Object.keys(variants);
        if (names.length) {
            return names
                .map(name => {
                    const v = Number(variantStock?.[name] ?? 0);
                    const safe = Number.isFinite(v) ? v : 0;
                    const color = safe <= 5 ? 'red' : 'green';
                    return `<div><span style="color:${color}; font-weight:bold;">${safe}</span> <span style="color:#666; font-weight:600;">${name}</span></div>`;
                })
                .join('');
        }
    }

    // fallback: stock global
    const stock = Number(productData?.stock ?? 0);
    const safe = Number.isFinite(stock) ? stock : 0;
    const color = safe <= 5 ? 'red' : 'green';
    return `<div><span style="color:${color}; font-weight:bold;">${safe}</span></div>`;
}

function parseVariantStocksFromTextarea() {

    const el = document.getElementById('prod-variant-stocks');
    if (!el) return {};

    const lines = parseLinesTextarea(el.value);
    const variantStocks = {};

    for (const line of lines) {
        // soporta "nombre:stock" (con o sin espacios)
        const parts = line.split(':');
        if (parts.length < 2) continue;
        const name = parts[0].trim();
        const stock = Number(parts.slice(1).join(':').trim());
        if (!name) continue;
        if (!Number.isFinite(stock) || stock < 0) continue;
        variantStocks[name] = Math.floor(stock);
    }

    return variantStocks;
}

function buildVariantStockFromBase(variantsObj, baseStock) {
    const variantStock = {};
    const base = Math.floor(Number(baseStock ?? 0));
    if (!variantsObj || typeof variantsObj !== 'object') return variantStock;

    for (const name of Object.keys(variantsObj)) {
        variantStock[name] = base;
    }
    return variantStock;
}

function buildVariantStockFromBaseAndOverrides(variantsObj, baseStock, overridesObj) {
    const variantStock = buildVariantStockFromBase(variantsObj, baseStock);

    if (overridesObj && typeof overridesObj === 'object') {
        for (const [name, value] of Object.entries(overridesObj)) {
            if (!Object.prototype.hasOwnProperty.call(variantStock, name)) continue;
            const n = Number(value);
            if (!Number.isFinite(n) || n < 0) continue;
            variantStock[name] = Math.floor(n);
        }
    }

    return variantStock;
}

function getProductFormData() {
    const id = document.getElementById('prod-id').value.trim();
    if (!id) throw new Error('El ID del producto es obligatorio');

    const animal = document.getElementById('prod-animal').value;
    const category = document.getElementById('prod-cat').value;
    const title = document.getElementById('prod-title').value;
    const priceBase = Number(document.getElementById('prod-price').value);
    const stockBase = Number(document.getElementById('prod-stock').value);
    const img = document.getElementById('prod-img').value;

    if (!title) throw new Error('El nombre del producto es obligatorio');
    if (!Number.isFinite(priceBase) || priceBase < 0) throw new Error('Precio base inválido');
    if (!Number.isFinite(stockBase) || stockBase < 0) throw new Error('Stock inválido');

    if (!animal) throw new Error('Animal es requerido');
    if (!category) throw new Error('Categoría es requerida');

    const images = parseImagesFromTextarea();
    const variants = parseVariantsFromTextarea();
    const variantStocksInput = parseVariantStocksFromTextarea();

    const imagesFinal = images.length ? images : (img ? [img] : []);

    const publishedEl = document.getElementById('prod-published');
    const published = publishedEl ? (publishedEl.value === 'true') : true;

    const discountPercentEl = document.getElementById('prod-discount-percent');
    const discountPercent = discountPercentEl ? Number(discountPercentEl.value || 0) : 0;

    const discountStartEl = document.getElementById('prod-discount-start');
    const discountEndEl = document.getElementById('prod-discount-end');

    const discountStrikeEl = document.getElementById('prod-discount-strike');
    const discountStrike = discountStrikeEl ? (discountStrikeEl.value === 'true') : true;

    const startAt = discountStartEl && discountStartEl.value ? new Date(discountStartEl.value + 'T00:00:00') : null;
    const endAt = discountEndEl && discountEndEl.value ? new Date(discountEndEl.value + 'T23:59:59') : null;

    const discount = {
        percent: Number.isFinite(discountPercent) ? discountPercent : 0,
        startAt,
        endAt,
        strike: discountStrike
    };

    const hasDates = !!(startAt && endAt && discount.percent > 0);
    if (!hasDates) {
        discount.percent = 0;
        discount.startAt = null;
        discount.endAt = null;
    }

    const tagEl = document.getElementById('prod-tag');
    const tag = tagEl ? String(tagEl.value || 'Normal') : 'Normal';

    return {
        title,
        animal,
        category,
        tag,
        price: priceBase,
        stock: Math.floor(stockBase),
        img,
        images: imagesFinal,
        variants,
        variantStock: buildVariantStockFromBaseAndOverrides(variants, stockBase, variantStocksInput),
        descripcion: document.getElementById('prod-desc').value,
        beneficios: document.getElementById('prod-beneficios').value,
        caracteristicas: document.getElementById('prod-caracteristicas').value,
        published,
        discount,
        updatedAt: new Date()
    };
}

productForm.onsubmit = async (e) => {
    e.preventDefault();

    try {
        const id = document.getElementById('prod-id').value.trim();
        const productData = getProductFormData();
        await setDoc(doc(db, 'products', id), productData);
        alert('✅ Producto guardado con éxito');
        resetForm();
        loadProducts();
    } catch (e) {
        console.error('Error guardando producto:', e);
        alert('❌ ' + (e?.message || 'Error al guardar el producto'));
    }
};

async function loadProducts() {
    productsList.innerHTML = '<tr><td colspan="8" style="text-align:center;">Cargando inventario... 🐾</td></tr>';

    try {
        const q = query(collection(db, 'products'), orderBy('title'));
        const snapshot = await getDocs(q);
        productsList.innerHTML = '';

        snapshot.forEach(docSnap => {
            const id = docSnap.id;
            const data = docSnap.data();

            const img = data.images?.length ? data.images[0] : data.img;
            const published = (data.published ?? true) === true;
            const discount = data.discount || {};
            const discountPercent = discount.percent ?? 0;
            const discountText = discountPercent > 0 ? `${discountPercent}%` : '—';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${img || ''}" style="width:50px; height:50px; border-radius:8px; object-fit:cover; background:#eee;"></td>
                <td>
                    <strong style="cursor:pointer; text-decoration: underline; text-underline-offset: 3px;" onclick="editProduct('${id}')">${data.title}</strong>
                    <br><small>${id}</small>
                </td>
                <td>${data.animal || 'N/A'}<br><span style="color:#666; font-weight:500;">${data.category || 'N/A'}</span></td>
                <td>$${data.price?.toLocaleString('es-CO')}</td>
                <td>
                    ${renderStockByVariant(data)}
                </td>

                <td><span class="pill ${published ? 'ok' : 'no'}">${published ? 'Publicado' : 'Oculto'}</span></td>
                <td><span style="color:#111; font-weight:800;">${discountText}</span></td>
                <td class="action-btns">
                    <button class="btn-edit" onclick="editProduct('${id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btn-delete" onclick="deleteProduct('${id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            productsList.appendChild(tr);
        });
    } catch (e) {
        console.error('Error cargando productos:', e);
        productsList.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error al cargar productos</td></tr>';
    }
}

window.editProduct = async (id) => {
    try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        const docData = docSnap.exists() ? docSnap.data() : null;
        if (!docData) return;

        document.getElementById('form-title').innerText = 'Editar Producto';
        document.getElementById('prod-id').value = id;
        document.getElementById('prod-id').disabled = true;
        document.getElementById('prod-title').value = docData.title;
        document.getElementById('prod-animal').value = docData.animal || 'perros';
        document.getElementById('prod-cat').value = docData.category || '';
        const tagEl = document.getElementById('prod-tag');
        if (tagEl) tagEl.value = String(docData.tag || 'Normal');
        document.getElementById('prod-price').value = docData.price;
        document.getElementById('prod-stock').value = docData.stock;
        document.getElementById('prod-img').value = docData.img || '';

        const images = Array.isArray(docData.images) ? docData.images : (docData.img ? [docData.img] : []);
        document.getElementById('prod-images').value = images.join('\n');

        const variants = docData.variants || {};
        const variantLines = Object.entries(variants).map(([name, price]) => `${name}:${price}`);
        document.getElementById('prod-variants').value = variantLines.join('\n');

        const variantStocks = docData.variantStock || {};
        const stockLines = Object.entries(variantStocks).map(([name, stock]) => `${name}:${stock}`);
        const variantStocksEl = document.getElementById('prod-variant-stocks');
        if (variantStocksEl) variantStocksEl.value = stockLines.join('\n');

        document.getElementById('prod-desc').value = docData.descripcion;
        document.getElementById('prod-beneficios').value = docData.beneficios;
        document.getElementById('prod-caracteristicas').value = docData.caracteristicas;

        const publishedEl = document.getElementById('prod-published');
        if (publishedEl) publishedEl.value = (docData.published ?? true) === true ? 'true' : 'false';

        const discount = docData.discount || {};
        const discountPercentEl = document.getElementById('prod-discount-percent');
        if (discountPercentEl) discountPercentEl.value = String(discount.percent ?? 0);

        const discountStartEl = document.getElementById('prod-discount-start');
        if (discountStartEl) {
            const v = discount.startAt;
            if (v) {
                const d = v.toDate ? v.toDate() : new Date(v);
                discountStartEl.value = d.toISOString().slice(0, 10);
            } else {
                discountStartEl.value = '';
            }
        }

        const discountEndEl = document.getElementById('prod-discount-end');
        if (discountEndEl) {
            const v = discount.endAt;
            if (v) {
                const d = v.toDate ? v.toDate() : new Date(v);
                discountEndEl.value = d.toISOString().slice(0, 10);
            } else {
                discountEndEl.value = '';
            }
        }

        const discountStrikeEl = document.getElementById('prod-discount-strike');
        if (discountStrikeEl) discountStrikeEl.value = (discount.strike ?? true) === true ? 'true' : 'false';

        document.getElementById('btn-submit').innerText = 'Actualizar Producto 🐾';
        document.getElementById('btn-cancel').style.display = 'inline-block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        console.error('Error editando:', e);
    }
};

window.deleteProduct = async (id) => {
    if (confirm(`¿Estás seguro de que quieres eliminar el producto ${id}?`)) {
        try {
            await deleteDoc(doc(db, 'products', id));
            loadProducts();
        } catch (e) {
            console.error('Error eliminando:', e);
        }
    }
};

document.getElementById('btn-cancel').onclick = resetForm;

async function adjustStockWithTransaction(productId, delta) {
    const d = Math.trunc(Number(delta));
    if (!Number.isFinite(d) || d === 0) {
        alert('⚠️ Ingresa un ajuste distinto de 0');
        return;
    }

    try {
        const { runTransaction } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        await runTransaction(db, async (transaction) => {
            const ref = doc(db, 'products', productId);
            const snap = await transaction.get(ref);
            if (!snap.exists()) throw new Error('Producto no encontrado');
            const data = snap.data();
            const currentStock = Number(data.stock || 0);
            const newStock = currentStock + d;
            if (newStock < 0) throw new Error('No se puede dejar el stock por debajo de 0');
            transaction.update(ref, { stock: newStock, updatedAt: new Date() });
        });

        alert('✅ Ajuste de inventario aplicado');
        resetForm();
        loadProducts();
    } catch (e) {
        console.error('Error ajustando stock:', e);
        alert('❌ ' + (e?.message || 'Error al ajustar stock'));
    }
}

// UI ajuste stock (tab-inventario)
const btnAdjustStock = document.getElementById('btn-adjust-stock');

// --- TAB: Ajuste de Inventario ---
const ajustesProductSelect = document.getElementById('ajustes-product-select');
const ajustesCurrentStockEl = document.getElementById('ajustes-current-stock');
const ajustesDeltaEl = document.getElementById('ajustes-delta');
const btnApplyAjustes = document.getElementById('btn-apply-ajustes');
const ajustesMessageEl = document.getElementById('ajustes-message');

let allProductsForAjustes = [];
let selectedAjustesProductId = '';

async function loadProductsForAjustes() {
    if (!ajustesProductSelect) return;

    ajustesProductSelect.innerHTML = '<option value="">Cargando...</option>';
    try {
        const q = query(collection(db, 'products'), orderBy('title'));
        const snapshot = await getDocs(q);
        allProductsForAjustes = snapshot.docs.map(d => ({ id: d.id, data: d.data() || {} }));

        ajustesProductSelect.innerHTML = '<option value="">Selecciona producto...</option>' +
            allProductsForAjustes.map(({ id, data }) => {
                const label = data?.title ? String(data.title) : id;
                return `<option value="${id}">${label}</option>`;
            }).join('');

        if (allProductsForAjustes.length) {
            ajustesProductSelect.value = allProductsForAjustes[0].id;
            selectedAjustesProductId = allProductsForAjustes[0].id;
            updateAjustesStockUI(selectedAjustesProductId);
        }
    } catch (e) {
        console.error('Error cargando productos para ajustes:', e);
        ajustesProductSelect.innerHTML = '<option value="">Error cargando</option>';
    }
}

function updateAjustesStockUI(productId) {
    const found = allProductsForAjustes.find(p => p.id === productId);
    const stock = found ? Number(found.data?.stock ?? 0) : 0;
    if (ajustesCurrentStockEl) ajustesCurrentStockEl.value = String(stock);
}

async function applyAjustes() {
    if (!selectedAjustesProductId) {
        alert('⚠️ Selecciona un producto');
        return;
    }
    if (!ajustesDeltaEl) return;

    const delta = Number(ajustesDeltaEl.value);
    if (!Number.isFinite(delta) || delta === 0) {
        alert('⚠️ Ingresa un ajuste distinto de 0');
        return;
    }

    if (ajustesMessageEl) ajustesMessageEl.textContent = 'Aplicando ajuste...';

    try {
        await adjustStockWithTransaction(selectedAjustesProductId, delta);
        updateAjustesStockUI(selectedAjustesProductId);
        if (ajustesMessageEl) ajustesMessageEl.textContent = '✅ Ajuste aplicado';
    } catch (e) {
        console.error('Error aplicando ajustes:', e);
        if (ajustesMessageEl) ajustesMessageEl.textContent = '❌ Error al aplicar ajuste';
    }
}

// --- VENTAS ---
async function loadOrders() {
    const ordersList = document.getElementById('admin-orders-list');
    if (!ordersList) return;

    ordersList.innerHTML = '<tr><td colspan="8" style="text-align:center;">Cargando pedidos... 🐾</td></tr>';

    try {
        const statusFilterEl = document.getElementById('orders-status-filter');
        const statusFilter = statusFilterEl ? statusFilterEl.value : '';

        const baseQuery = collection(db, 'orders');

        let q = baseQuery;
        const { getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        if (statusFilter) {
            const { query, where } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const q2 = query(baseQuery, where('status', '==', statusFilter));
            const snapshot = await getDocs(q2);

            const docs = snapshot.docs
                .map(d => ({ id: d.id, data: d.data() || {} }))
                .sort((a, b) => {
                    const ta = a.data?.createdAt?.toDate ? a.data.createdAt.toDate().getTime() : (a.data?.createdAt ? new Date(a.data.createdAt).getTime() : 0);
                    const tb = b.data?.createdAt?.toDate ? b.data.createdAt.toDate().getTime() : (b.data?.createdAt ? new Date(b.data.createdAt).getTime() : 0);
                    return (tb || 0) - (ta || 0);
                });

            ordersList.innerHTML = '';
            docs.forEach(({ id, data }) => {
                const buyerName = data?.buyer?.name || 'N/A';
                const city = data?.shipping?.city || 'N/A';
                const items = Array.isArray(data.items) ? data.items : [];
                const itemsText = items.length
                    ? items.map(i => `${i.name || 'Item'} x${i.qty || 1}`).slice(0, 2).join(', ') + (items.length > 2 ? '…' : '')
                    : '—';
                const total = typeof data.total === 'number' ? data.total.toLocaleString('es-CO') : '0';
                const status = data.status || 'pending_payment';
                const tracking = data.tracking || data.trackingId || data.trackingNumber || '—';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><small>${id}</small></td>
                    <td><b>${buyerName}</b></td>
                    <td>${city}</td>
                    <td>${itemsText}</td>
                    <td>$${total} COP</td>
                    <td><span class="pill ${status === 'delivered' ? 'ok' : status === 'cancelled' ? 'no' : 'warn'}">${status}</span></td>
                    <td>${tracking || '—'}</td>
                    <td class="action-btns">
                        <button class="btn-edit" onclick="updateOrderStatus('${id}')" title="Cambiar estado"><i class="fa-solid fa-pen-to-square"></i></button>
                    </td>
                `;
                ordersList.appendChild(tr);
            });

            if (!docs.length) {
                ordersList.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#666;">No hay pedidos para el filtro</td></tr>';
            }
            return;
        }

        try {
            const { query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            q = query(baseQuery, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);

            ordersList.innerHTML = '';
            snapshot.forEach(docSnap => {
                const id = docSnap.id;
                const data = docSnap.data() || {};

                const buyerName = data?.buyer?.name || 'N/A';
                const city = data?.shipping?.city || 'N/A';
                const items = Array.isArray(data.items) ? data.items : [];
                const itemsText = items.length
                    ? items.map(i => `${i.name || 'Item'} x${i.qty || 1}`).slice(0, 2).join(', ') + (items.length > 2 ? '…' : '')
                    : '—';
                const total = typeof data.total === 'number' ? data.total.toLocaleString('es-CO') : '0';

                const status = data.status || 'pending_payment';
                const tracking = data.tracking || data.trackingId || data.trackingNumber || '—';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><small>${id}</small></td>
                    <td><b>${buyerName}</b></td>
                    <td>${city}</td>
                    <td>${itemsText}</td>
                    <td>$${total} COP</td>
                    <td><span class="pill ${status === 'delivered' ? 'ok' : status === 'cancelled' ? 'no' : 'warn'}">${status}</span></td>
                    <td>${tracking || '—'}</td>
                    <td class="action-btns">
                        <button class="btn-edit" onclick="updateOrderStatus('${id}')" title="Cambiar estado"><i class="fa-solid fa-pen-to-square"></i></button>
                    </td>
                `;
                ordersList.appendChild(tr);
            });

            if (!snapshot.size) {
                ordersList.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#666;">No hay pedidos para el filtro</td></tr>';
            }
        } catch (e) {
            const snapshot = await getDocs(baseQuery);
            ordersList.innerHTML = '';
            snapshot.forEach(docSnap => {
                const id = docSnap.id;
                const data = docSnap.data() || {};

                const buyerName = data?.buyer?.name || 'N/A';
                const city = data?.shipping?.city || 'N/A';
                const items = Array.isArray(data.items) ? data.items : [];
                const itemsText = items.length
                    ? items.map(i => `${i.name || 'Item'} x${i.qty || 1}`).slice(0, 2).join(', ') + (items.length > 2 ? '…' : '')
                    : '—';
                const total = typeof data.total === 'number' ? data.total.toLocaleString('es-CO') : '0';

                const status = data.status || 'pending_payment';
                const tracking = data.tracking || data.trackingId || data.trackingNumber || '—';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><small>${id}</small></td>
                    <td><b>${buyerName}</b></td>
                    <td>${city}</td>
                    <td>${itemsText}</td>
                    <td>$${total} COP</td>
                    <td><span class="pill ${status === 'delivered' ? 'ok' : status === 'cancelled' ? 'no' : 'warn'}">${status}</span></td>
                    <td>${tracking || '—'}</td>
                    <td class="action-btns">
                        <button class="btn-edit" onclick="updateOrderStatus('${id}')" title="Cambiar estado"><i class="fa-solid fa-pen-to-square"></i></button>
                    </td>
                `;
                ordersList.appendChild(tr);
            });

            if (!snapshot.size) {
                ordersList.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#666;">No hay pedidos para el filtro</td></tr>';
            }
        }
    } catch (e) {
        console.error('Error cargando orders:', e);
        ordersList.innerHTML = '<tr><td colspan="8" style="text-align:center; color:red;">Error al cargar pedidos</td></tr>';
    }
}

window.updateOrderStatus = async (orderId) => {
    const status = prompt('Nuevo estado (pending_payment, paid, processing, shipped, delivered, cancelled):', 'processing');
    if (!status) return;

    try {
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        await updateDoc(doc(db, 'orders', orderId), { status, updatedAt: new Date() });
        await loadOrders();
    } catch (e) {
        console.error('Error actualizando order:', e);
        alert('❌ No se pudo actualizar el estado');
    }
};

const ordersStatusFilter = document.getElementById('orders-status-filter');
const btnRefreshOrders = document.getElementById('btn-refresh-orders');
if (ordersStatusFilter) {
    ordersStatusFilter.addEventListener('change', async () => {
        await loadOrders();
    });
}
if (btnRefreshOrders) btnRefreshOrders.addEventListener('click', async () => {
    await loadOrders();
});

if (btnAdjustStock) {
    btnAdjustStock.addEventListener('click', async () => {
        const productId = document.getElementById('prod-id').value.trim();
        if (!productId) {
            alert('⚠️ Selecciona o ingresa el ID del producto para ajustar stock');
            return;
        }
        const delta = Number(document.getElementById('stock-delta').value);
        await adjustStockWithTransaction(productId, delta);
    });
}

if (ajustesProductSelect) {
    ajustesProductSelect.addEventListener('change', (e) => {
        selectedAjustesProductId = e.target.value;
        updateAjustesStockUI(selectedAjustesProductId);
    });
}

if (btnApplyAjustes) btnApplyAjustes.addEventListener('click', applyAjustes);

loadProductsForAjustes();

// --- TAB: Publicación & Descuentos ---
const preciosProductSelect = document.getElementById('precios-product-select');
const preciosPublishedEl = document.getElementById('precios-published');
const preciosDiscountPercentEl = document.getElementById('precios-discount-percent');
const preciosDiscountStartEl = document.getElementById('precios-discount-start');
const preciosDiscountEndEl = document.getElementById('precios-discount-end');
const preciosDiscountStrikeEl = document.getElementById('precios-discount-strike');
const btnSavePrecios = document.getElementById('btn-save-precios');
const preciosDiscountList = document.getElementById('precios-discount-list');

let allProductsForPrecios = [];
let selectedPreciosProductId = '';

async function loadProductsForPrecios() {
    if (!preciosProductSelect || !preciosDiscountList) return;

    preciosProductSelect.innerHTML = '<option value="">Cargando...</option>';

    try {
        const q = query(collection(db, 'products'), orderBy('title'));
        const snapshot = await getDocs(q);

        allProductsForPrecios = snapshot.docs.map(d => ({ id: d.id, data: d.data() || {} }));

        preciosProductSelect.innerHTML = '<option value="">Selecciona producto...</option>' +
            allProductsForPrecios.map(({ id, data }) => {
                const label = data?.title ? String(data.title) : id;
                return `<option value="${id}">${label}</option>`;
            }).join('');

        if (allProductsForPrecios.length) {
            preciosProductSelect.value = allProductsForPrecios[0].id;
            selectedPreciosProductId = allProductsForPrecios[0].id;
            await loadPreciosForm(selectedPreciosProductId);
        }

        await renderPreciosDiscounts();
    } catch (e) {
        console.error('Error cargando productos para tab-precios:', e);
        preciosProductSelect.innerHTML = '<option value="">Error cargando</option>';
    }
}

function fillDateInput(el, value) {
    if (!el) return;
    if (!value) {
        el.value = '';
        return;
    }
    const d = value?.toDate ? value.toDate() : new Date(value);
    if (!d || Number.isNaN(d.getTime())) {
        el.value = '';
        return;
    }
    el.value = d.toISOString().slice(0, 10);
}

async function loadPreciosForm(productId) {
    if (!productId) return;
    const found = allProductsForPrecios.find(p => p.id === productId);
    if (!found) return;

    const docData = found.data || {};

    if (preciosPublishedEl) preciosPublishedEl.value = (docData.published ?? true) === true ? 'true' : 'false';
    if (preciosDiscountPercentEl) preciosDiscountPercentEl.value = String(docData.discount?.percent ?? 0);

    fillDateInput(preciosDiscountStartEl, docData.discount?.startAt);
    fillDateInput(preciosDiscountEndEl, docData.discount?.endAt);

    if (preciosDiscountStrikeEl) preciosDiscountStrikeEl.value = (docData.discount?.strike ?? true) === true ? 'true' : 'false';
}

async function savePreciosChanges() {
    if (!selectedPreciosProductId) {
        alert('⚠️ Selecciona un producto');
        return;
    }

    const published = parseBool(preciosPublishedEl?.value, true);

    const percentRaw = Number(preciosDiscountPercentEl?.value ?? 0);
    const discountPercent = Number.isFinite(percentRaw) ? percentRaw : 0;

    if (discountPercent < 0 || discountPercent > 90) {
        alert('⚠️ discount% debe estar entre 0 y 90');
        return;
    }

    const startAt = dateToTimestampStart(preciosDiscountStartEl?.value);
    const endAt = dateToTimestampEnd(preciosDiscountEndEl?.value);

    if ((startAt && !endAt) || (!startAt && endAt)) {
        alert('⚠️ Debes completar startAt y endAt');
        return;
    }

    if (startAt && endAt && startAt > endAt) {
        alert('⚠️ startAt debe ser menor o igual a endAt');
        return;
    }

    const strike = parseBool(preciosDiscountStrikeEl?.value, true);

    let discount = { percent: discountPercent, startAt, endAt, strike };
    const hasDates = !!(startAt && endAt && discount.percent > 0);
    if (!hasDates) discount = { percent: 0, startAt: null, endAt: null, strike };

    try {
        const ref = doc(db, 'products', selectedPreciosProductId);
        await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js').then(m => m.updateDoc(ref, {
            published,
            discount,
            updatedAt: new Date()
        }));

        alert('✅ Cambios guardados');
        await loadProductsForPrecios();
    } catch (e) {
        console.error('Error guardando precios:', e);
        alert('❌ No se pudo guardar los cambios');
    }
}

async function renderPreciosDiscounts() {
    if (!preciosDiscountList) return;

    const rows = [];

    allProductsForPrecios.forEach(({ id, data }) => {
        const published = (data?.published ?? true) === true;
        const discount = data?.discount || {};
        const active = isDiscountActive(discount);

        if (!published || !active) return;

        const percent = Number(discount.percent ?? 0);
        if (!Number.isFinite(percent) || percent <= 0) return;

        const title = data?.title ? String(data.title) : id;
        rows.push({ id, title, active });
    });

    if (!rows.length) {
        preciosDiscountList.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#666;">No hay descuentos activos en este momento</td></tr>';
        return;
    }

    preciosDiscountList.innerHTML = rows.map(r => {
        return `
            <tr>
                <td>${r.title}</td>
                <td><span class="pill ok">Publicado</span></td>
                <td><span style="color:#111; font-weight:900;">${allProductsForPrecios.find(p=>p.id===r.id)?.data?.discount?.percent ?? 0}%</span></td>
            </tr>
        `;
    }).join('');
}

if (preciosProductSelect) {
    preciosProductSelect.addEventListener('change', async (e) => {
        selectedPreciosProductId = e.target.value;
        await loadPreciosForm(selectedPreciosProductId);
    });
}

if (btnSavePrecios) btnSavePrecios.addEventListener('click', savePreciosChanges);

loadProductsForPrecios();

function resetForm() {
    productForm.reset();
    document.getElementById('prod-id').disabled = false;
    document.getElementById('form-title').innerText = 'Agregar Nuevo Producto';
    document.getElementById('btn-submit').innerText = 'Guardar Producto 🐾';
    document.getElementById('btn-cancel').style.display = 'none';
    document.getElementById('stock-delta').value = 0;

    const animalSel = document.getElementById('prod-animal');
    if (animalSel) animalSel.value = 'perros';

    const tagEl = document.getElementById('prod-tag');
    if (tagEl) tagEl.value = 'Normal';

    const publishedEl = document.getElementById('prod-published');
    if (publishedEl) publishedEl.value = 'true';

    const discountPercentEl = document.getElementById('prod-discount-percent');
    if (discountPercentEl) discountPercentEl.value = '0';

    const strikeEl = document.getElementById('prod-discount-strike');
    if (strikeEl) strikeEl.value = 'true';
}

