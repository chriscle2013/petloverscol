import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentPrice = 0;
let currentQty = 1;
let currentProduct = null;
let currentImageIndex = 0;

function isDiscountActive(discount) {
    if (!discount) return false;
    const percent = Number(discount.percent ?? 0);
    if (!Number.isFinite(percent) || percent <= 0) return false;

    // Si no hay fechas, consideramos “no activo”
    if (!discount.startAt || !discount.endAt) return false;

    const now = new Date();
    const start = discount.startAt?.toDate ? discount.startAt.toDate() : new Date(discount.startAt);
    const end = discount.endAt?.toDate ? discount.endAt.toDate() : new Date(discount.endAt);

    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
    return now >= start && now <= end;
}

function getFinalPrice(product, variantPrice) {
    const base = Number(variantPrice ?? product?.price ?? 0);
    if (!Number.isFinite(base) || base <= 0) return 0;

    const published = (product?.published ?? true) === true;
    if (!published) return 0;

    if (isDiscountActive(product?.discount)) {
        const percent = Number(product.discount.percent ?? 0);
        const discounted = base * (1 - percent / 100);
        return Math.max(0, Math.round(discounted));
    }

    return Math.round(base);
}

function renderPrice(basePrice, finalPrice, showStrike) {
    const base = Number(basePrice ?? 0);
    const final = Number(finalPrice ?? 0);

    if (final > 0 && final !== base && showStrike) {
        return `$${base.toLocaleString('es-CO')} <span class="old-price">$${base.toLocaleString('es-CO')}</span> $${final.toLocaleString('es-CO')} COP`;
    }

    if (final > 0 && final !== base) {
        return `$${final.toLocaleString('es-CO')} COP`;
    }

    return `$${base.toLocaleString('es-CO')} COP`;
}

async function initProduct() {
    const urlParams = new URLSearchParams(window.location.search);
    const pid = urlParams.get('id') || 'hills-sd';

    try {
        const docRef = doc(db, 'products', pid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            document.body.innerHTML = '<h1 style="text-align:center; margin-top:100px;">Producto no encontrado en la base de datos 🐾</h1>';
            return;
        }

        const prod = docSnap.data();
        currentProduct = prod;

        document.getElementById('prod-title').innerText = prod.title;
        document.getElementById('prod-cat').innerText = prod.category;
        document.getElementById('text-beneficios').innerText = prod.beneficios;
        document.getElementById('text-caracteristicas').innerText = prod.caracteristicas;
        document.getElementById('text-descripcion').innerText = prod.descripcion;

        const basePrice = Number(prod.price ?? 0);
        const finalPrice = getFinalPrice(prod, basePrice);
        const strike = (prod.discount?.strike ?? true) === true;
        document.getElementById('prod-price').innerHTML = renderPrice(basePrice, finalPrice, strike);



        // --- GALLERY CAROUSEL ---
        const gallery = document.getElementById('prod-gallery');
        const dotsContainer = document.getElementById('gallery-dots');
        gallery.innerHTML = ''; // Clear all
        dotsContainer.innerHTML = '';

        const images = prod.images || [prod.img]; // Use images array or fallback to single img

        images.forEach((imgSrc, idx) => {
            const img = document.createElement('img');
            img.src = imgSrc;
            img.className = idx === 0 ? 'active' : '';
            gallery.appendChild(img);

            const dot = document.createElement('div');
            dot.className = `gallery-dot ${idx === 0 ? 'active' : ''}`;
            dot.onclick = () => setGalleryImage(idx);
            dotsContainer.appendChild(dot);
        });

        // Re-add navigation buttons
        const nav = document.createElement('div');
        nav.className = 'gallery-btns';
        nav.innerHTML = `
            <button class="gallery-btn" onclick="window.changeImage(-1)"><i class="fa-solid fa-chevron-left"></i></button>
            <button class="gallery-btn" onclick="window.changeImage(1)"><i class="fa-solid fa-chevron-right"></i></button>
        `;
        gallery.appendChild(nav);

        // --- VARIANTS ---
        const variantBox = document.getElementById('prod-variants');
        variantBox.innerHTML = '';
        Object.entries(prod.variants).forEach(([name, price], idx) => {
            const btn = document.createElement('button');
            btn.className = `variant-btn ${idx === 0 ? 'active' : ''}`;
            btn.innerText = name;
            btn.onclick = () => changePrice(btn, price);
            variantBox.appendChild(btn);
        });
        currentPrice = prod.price;

        // Inicializa precio final con strike/tachado si aplica
        const baseVariantPrice = currentPrice;
        const finalVariantPrice = getFinalPrice(prod, baseVariantPrice);
        const showStrike = (prod.discount?.strike ?? true) === true;
        document.getElementById('prod-price').innerHTML = renderPrice(baseVariantPrice, finalVariantPrice, showStrike);



        // --- STOCK CHECK ---
        // Si hay variantes, el stock real depende de la variante activa
        // (fallback a stock global si no existe variantStock)
        const initialVariantBtn = document.querySelector('.variant-btn.active');
        if (initialVariantBtn && prod.variants && prod.variantStock) {
            updateAddToCartButton(getVariantStock(prod, initialVariantBtn.innerText));
        } else {
            updateAddToCartButton(prod.stock);
        }


        // Si no está publicado, deshabilitar (protección extra)
        const isPublished = (prod.published ?? true) === true;
        if (!isPublished) {
            updateAddToCartButton(0);
            const btn = document.querySelector('.btn-primary');
            if (btn) btn.innerText = 'No disponible';
        }


    } catch (e) {
        console.error("Error loading product:", e);
        document.body.innerHTML = '<h1 style="text-align:center; margin-top:100px;">Error al conectar con la base de datos 🐾</h1>';
    }
}

window.changeImage = (direction) => {
    const images = document.querySelectorAll('#prod-gallery img');
    if (!images.length) return;

    images[currentImageIndex].classList.remove('active');
    currentImageIndex += direction;
    if (currentImageIndex >= images.length) currentImageIndex = 0;
    if (currentImageIndex < 0) currentImageIndex = images.length - 1;
    images[currentImageIndex].classList.add('active');

    updateGalleryDots();
};

function updateGalleryDots() {
    const dots = document.querySelectorAll('.gallery-dot');
    dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentImageIndex);
    });
}

window.setGalleryImage = (index) => {
    const images = document.querySelectorAll('#prod-gallery img');
    if (!images.length) return;
    images[currentImageIndex].classList.remove('active');
    currentImageIndex = index;
    images[currentImageIndex].classList.add('active');
    updateGalleryDots();
};

function changePrice(btn, price) {
    document.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPrice = price;

    if (!currentProduct) return;

    const finalPrice = getFinalPrice(currentProduct, currentPrice);
    const showStrike = (currentProduct.discount?.strike ?? true) === true;
    document.getElementById('prod-price').innerHTML = renderPrice(currentPrice, finalPrice, showStrike);

    // --- STOCK CHECK POR VARIANTE ---
    const variantName = btn.innerText;
    const variantStockValue = getVariantStock(currentProduct, variantName);
    updateAddToCartButton(variantStockValue);
}


window.changeQty = (delta) => {
    let newQty = currentQty + delta;
    if (newQty >= 1 && newQty <= 7) {
        currentQty = newQty;
        document.getElementById('qty').innerText = currentQty;
    }
};

window.openTab = (evt, tabName) => {
    const contents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < contents.length; i++) contents[i].classList.remove("active");
    const tabs = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < tabs.length; i++) tabs[i].classList.remove("active");
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
};

function getVariantStock(product, variantName) {
    const variantStock = product?.variantStock;
    if (variantStock && typeof variantStock === 'object') {
        const v = Number(variantStock?.[variantName] ?? NaN);
        if (Number.isFinite(v)) return v;
    }
    // fallback
    return Number(product?.stock ?? 0);
}

function updateAddToCartButton(stock) {
    const btn = document.querySelector('.btn-primary');
    if (!btn) return;

    const safeStock = Number(stock ?? 0);
    if (safeStock <= 0) {
        btn.innerText = "Agotado ❌";
        btn.classList.add('out-of-stock');
        btn.disabled = true;
    } else {
        btn.innerText = "Agregar al Carrito 🐾";
        btn.classList.remove('out-of-stock');
        btn.disabled = false;
    }
}



window.handleAddToCart = () => {
    if (!currentProduct) return;

    // Validación extra por stock de la variante activa
    const activeVariantBtn = document.querySelector('.variant-btn.active');
    const activeVariantName = activeVariantBtn?.innerText;
    const activeVariantStock = activeVariantName ? getVariantStock(currentProduct, activeVariantName) : Number(currentProduct?.stock ?? 0);
    if (Number(activeVariantStock) <= 0) {
        alert('Agotado ❌');
        updateAddToCartButton(0);
        // adicional: si por cualquier razón el botón mantiene un texto distinto,
        // garantizamos deshabilitarlo antes de salir.
        const btn = document.querySelector('.btn-primary');
        if (btn) btn.disabled = true;
        return;
    }


    let cart = JSON.parse(localStorage.getItem('cart')) || [];


    const baseVariantPrice = currentPrice;
    const finalVariantPrice = getFinalPrice(currentProduct, baseVariantPrice);

    const product = {
        name: `${document.getElementById('prod-title').innerText} (${document.querySelector('.variant-btn.active').innerText})`,
        price: finalVariantPrice,
        qty: currentQty
    };


    const existing = cart.find(item => item.name === product.name);
    if (existing) {
        existing.qty += currentQty;
        if (existing.qty > 7) existing.qty = 7;
    } else {
        cart.push(product);
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    alert(`🐾 ${currentQty} unidad(es) agregadas al carrito.`);
    window.location.href = 'index.html';
};

document.addEventListener('DOMContentLoaded', () => {
    initProduct();
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    document.querySelector('.cart-count').innerText = cart.length;
});
