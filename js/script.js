import { db } from './firebase.js';
import { collection, getDocs, query, where, limit, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthChange, getCurrentUser, logoutUser } from './auth.js';

// --- FUNCIONES DE AUTENTICACIÓN ---
function renderAuthUI(user) {
    const userMenu = document.getElementById('userMenu');
    if (!userMenu) return;

    // Limpiar primero para evitar que queden enlaces antiguos si hubo un render previo.
    userMenu.innerHTML = '';

    if (user) {
        userMenu.innerHTML = `
            <a href="profile.html" style="
                text-decoration: none;
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--primary-blue);
                font-weight: 600;
                transition: all 0.3s;
            ">
                <i class="fa-solid fa-user-circle" style="font-size: 1.3rem;"></i>
                <span style="font-size: 0.9rem;">${user.displayName || user.email.split('@')[0]}</span>
            </a>
            <button id="logoutBtn" onclick="handleLogout()" style="
                background: none;
                border: none;
                cursor: pointer;
                color: #dc3545;
                font-weight: 600;
                padding: 8px 12px;
                border-radius: 6px;
                transition: all 0.3s;
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 6px;
            ">
                <i class="fa-solid fa-sign-out"></i>
            </button>
        `;
    } else {
        userMenu.innerHTML = `
            <a href="login.html" style="
                text-decoration: none;
                color: var(--primary-blue);
                font-weight: 600;
                padding: 8px 12px;
                border-radius: 6px;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                gap: 6px;
            ">
                <i class="fa-solid fa-sign-in"></i> <span>Iniciar Sesión</span>
            </a>
        `;
    }
}


onAuthChange((user) => {
    renderAuthUI(user);
});

window.handleLogout = async function() {
    const result = await logoutUser();
    if (result.success) {
        localStorage.removeItem('userLoggedIn');
        window.location.href = 'index.html';
    }
};

// --- FUNCIONES RESPONSIVAS ---
window.toggleMobileMenu = function() {
    const categoryNav = document.getElementById('categoryNav');
    const menuToggle = document.getElementById('menuToggle');
    
    if (categoryNav) {
        categoryNav.classList.toggle('active');
        menuToggle.classList.toggle('active');
    }
};

// Cerrar menú al hacer clic en un enlace
document.addEventListener('click', function(event) {
    const categoryNav = document.getElementById('categoryNav');
    const menuToggle = document.getElementById('menuToggle');
    
    if (event.target.closest('.category-nav a')) {
        categoryNav.classList.remove('active');
        if (menuToggle) menuToggle.classList.remove('active');
    }
});

// --- Base de Datos Local (Backup) ---
const productsDB = {
    'equilibrio-filhotes': { title: 'Equilibrio Filhotes Cachorros 2kg', price: 87900, img: 'img/equilibrio-filhotes.jpg' },
    'equilibrio-adulto-rp': { title: 'Equilibrio Adulto Razas Pequenas 7.5kg', price: 253700, img: 'img/equilibrio-adulto-rp.jpg' },
    'gran-plus-adulto-carne': { title: 'Gran Plus Adulto Carne y Arroz 15kg', price: 182306, img: 'img/gran-plus-adulto-carne.jpg' },
    'equilibrio-vet-hypo': { title: 'Equilibrio Veterinary Hypoallergenic Perro 2kg', price: 142600, img: 'img/equilibrio-vet-hypo.jpg' },
    'gran-plus-cachorro-3': { title: 'Gran Plus Cachorro Mini Pollo y Arroz 3kg', price: 55650, img: 'img/gran-plus-cachorro-3.jpg' },
    'gran-plus-cachorro-20': { title: 'Gran Plus Menu Cachorro Carne y Arroz 20kg', price: 278381, img: 'img/gran-plus-cachorro-20kg.jpg' },
    'gran-plus-adulto-pollo': { title: 'Gran Plus Menu Adulto Pollo y Arroz 20kg', price: 243075, img: 'img/gran-plus-adulto-pollo.jpg' },
    'equilibrio-gato-castrado': { title: 'Equilibrio Gato Adulto Castrado 1.5kg', price: 102700, img: 'img/equilibrio-gato-castrado.jpg' },
    'equilibrio-gato-largos': { title: 'Equilibrio Gato Adulto Pelos Largos 7.5kg', price: 344000, img: 'img/equilibrio-gato-largos.jpg' },
    'hills-sd': { title: 'Hills SD - Alimento Gato Adulto Pollo', price: 185000, img: 'https://placehold.co/600x600?text=Hills+SD+Gatos' }
};

// --- Funcion para agregar al carrito (CORREGIDA) ---
window.addToCart = (name, price, img) => {
    if (!name || !price) {
        console.error('Error: nombre o precio invalido', { name, price });
        alert('Error al agregar el producto. Intenta de nuevo.');
        return;
    }
    
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingIndex = cart.findIndex(item => item.name === name);
    
    if (existingIndex > -1) {
        cart[existingIndex].qty = (cart[existingIndex].qty || 1) + 1;
    } else {
        cart.push({ 
            name: name, 
            price: parseInt(price), 
            qty: 1,
            img: img || 'https://placehold.co/300x250?text=Producto'
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Actualizar contador del carrito
    const cartElement = document.querySelector('.cart-count');
    if (cartElement) {
        const totalItems = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
        cartElement.innerText = totalItems;
        cartElement.style.transform = 'scale(1.4)';
        setTimeout(() => { cartElement.style.transform = 'scale(1)'; }, 200);
    }
    
    // Mostrar notificacion
    showNotification(`${name} agregado al carrito`);
};

// --- Notificacion flotante ---
function showNotification(message) {
    // Remover notificacion anterior si existe
    const existing = document.querySelector('.cart-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.innerHTML = `<i class="fa-solid fa-check-circle"></i> ${message}`;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        font-family: 'Poppins', sans-serif;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2500);
}

// --- Helpers: published/discount/precio final ---
function isDiscountActive(discount) {
    if (!discount) return false;
    const percent = Number(discount.percent ?? 0);
    if (!Number.isFinite(percent) || percent <= 0) return false;

    const now = new Date();

    // Si no hay fechas, consideramos “no activo” para cumplir start/end
    if (!discount.startAt || !discount.endAt) return false;

    const start = discount.startAt?.toDate ? discount.startAt.toDate() : new Date(discount.startAt);
    const end = discount.endAt?.toDate ? discount.endAt.toDate() : new Date(discount.endAt);

    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
    return now >= start && now <= end;
}

function getFinalPrice(product) {
    const base = Number(product?.price ?? 0);
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

function getDisplayedPriceUI({ basePrice, finalPrice, showStrike }) {
    const base = Number(basePrice ?? 0);
    const final = Number(finalPrice ?? 0);

    if (final > 0 && final !== base && showStrike) {
        return `$${base.toLocaleString('es-CO')} <span class="old-price">$${base.toLocaleString('es-CO')}</span> $${final.toLocaleString('es-CO')}`;
    }

    if (final > 0 && final !== base) {
        return `$${final.toLocaleString('es-CO')} COP`;
    }

    return `$${base.toLocaleString('es-CO')} COP`;
}

// --- Carga de productos desde Firebase (MEJORADO) ---
async function loadFromFirebase(category, gridSelector) {
    // (legacy) mantenido por compatibilidad
    return loadFromFirebaseInternal({ category }, gridSelector);
}

async function loadFromFirebaseByAnimal(animal, gridSelector) {
    return loadFromFirebaseInternal({ animal }, gridSelector);
}

async function loadFromFirebaseInternal(filters, gridSelector) {
    const grid = document.querySelector(gridSelector);
    if (!grid) return;
    
    // Verificar si hay productos estaticos
    const staticProducts = grid.querySelectorAll('.product-card');
    
    try {
        let q = query(
            collection(db, 'products'),
            orderBy('title'),
            limit(12)
        );

        // aplicar filtros dinámicos
        if (filters && filters.category) {
            // Importante: evitar queries compuestas (where + orderBy) que requieren índice.
            // Primero filtramos y luego ordenamos en el cliente.
            q = query(
                collection(db, 'products'),
                where('category', '==', filters.category),
                limit(50)
            );
        } else if (filters && filters.animal) {
            // Importante: evitar queries compuestas (where + orderBy) que requieren índice.
            // Primero filtramos y luego ordenamos en el cliente.
            q = query(
                collection(db, 'products'),
                where('animal', '==', filters.animal),
                limit(50)
            );
        }

        // Si usamos where con limit (sin orderBy), ordenamos en cliente por title.
        // Esto mantiene el layout consistente sin crear índices adicionales.
        const snapshot = await getDocs(q);

        // Ordenar snapshot en memoria
        const docs = snapshot.docs
            .map(d => ({ id: d.id, data: d.data() }))
            .sort((a, b) => (a.data.title || '').localeCompare(b.data.title || '', 'es'));

        if (docs.length) {
            // IMPORTANTE: no vaciamos grid si ya hay cards HTML estáticas.
            // Así evitamos que falten productos cuando Firebase no trae todos (o hay filtros/discounts).
            //grid.innerHTML = '';

            docs.forEach(({id, data: product}) => {
                const isPublished = (product.published ?? true) === true;
                if (!isPublished) return;

                const isOutOfStock = (product.stock || 0) <= 0;
                const escapedTitle = (product.title || '').replace(/'/g, "\\'");


                const basePrice = Number(product.price ?? 0);
                const finalPrice = getFinalPrice(product);

                const discount = product.discount || {};
                const showStrike = (discount.strike ?? true) === true;

                const priceUI = getDisplayedPriceUI({
                    basePrice,
                    finalPrice,
                    showStrike
                });

                // Evitar duplicados: si ya existe una card para este producto, no la re-creamos.
                // (Esto pasa cuando index.html trae cards estáticas y Firebase también renderiza.)
                // Anti-duplicados: evitamos render si ya existe (por id) o si el DOM estático ya tiene el mismo enlace.
                const existingById = grid.querySelector(`.product-card[data-id="${id}"]`);
                const existingByLink = grid.querySelector(`a.prod-link[href="product.html?id=${id}"]`);
                if (existingById || existingByLink) return;

                const card = document.createElement('div');

                card.className = 'product-card';
                card.dataset.id = id;
                card.dataset.cat = product.animal || category || '';
                card.innerHTML = `
                    <div class="badge">${product.tag ? String(product.tag) : 'Normal'}</div>

                    <a href="product.html?id=${id}" class="prod-link">
                        <img src="${product.img}" alt="${product.title}" onerror="this.src='https://placehold.co/300x250?text=${encodeURIComponent(product.title || '')}'">
                    </a>
                    <div class="info">
                        <a href="product.html?id=${id}" class="prod-link">
                            <h3 class="product-name">${product.title}</h3>
                            <p class="price">${priceUI}</p>
                        </a>
                        <button class="btn-add ${isOutOfStock ? 'out-of-stock' : ''}" 
                                onclick="${isOutOfStock ? "alert('Producto agotado')" : `addToCart('${escapedTitle}', ${finalPrice}, '${product.img}')`}">
                            ${isOutOfStock ? 'Agotado' : 'Agregar al carrito'}
                        </button>
                    </div>
                `;
                grid.appendChild(card);
            });
        }
    } catch (e) {
        console.error('Firebase no disponible o error, manteniendo productos estaticos:', e);
    }
}

// --- Filtros de categorias ---
// Estas funciones se usan desde inline onclick en index.html.
// Deben ser síncronas y solo filtrar (no depender de Firebase),
// porque si Firebase tarda o falla, los botones se sienten “no funcionales”.
//
// Cuando Firebase está disponible, loadFromFirebase puede sobrescribir cards,
// pero mantendremos un comportamiento consistente.
window.filterPerros = (category) => {
    const section = document.getElementById('perros');
    if (!section) return;

    const products = section.querySelectorAll('.product-card');

    // Mapeo a data-cat (index.html usa data-cat/data-subcat)
    const map = {
        all: 'all',
        alimentos: 'alimentos',
        juguetes: 'juguetes',
        farmapet: 'farmapet',
        accesorios: 'accesorios',
        higiene: 'higiene'
    };

    // Importante: en index.html los cards de Farmapet/Prescripción usan data-subcat,
    // pero data-cat para farmapet no existe en todos los cards.
    // Para que funcione el botón Farmapet, si data-cat no coincide,
    // usamos data-subcat === 'prescripcion' como respaldo.
    const isFarmapet = (category === 'farmapet');
    const target = map[category] || category;

    products.forEach(p => {
        const prodCat = p.getAttribute('data-cat');
        const prodSub = p.getAttribute('data-subcat');

        if (target === 'all') {
            p.classList.remove('hidden');
            return;
        }

        // Respaldo: en index.html Farmapet usa cards con data-subcat="prescripcion"
        if (isFarmapet) {
            p.classList.toggle('hidden', prodSub !== 'prescripcion');
            return;
        }

        p.classList.toggle('hidden', prodCat !== target);
    });

    // Mantener nested visible si es alimentos
    const nestedNav = document.getElementById('perros-nested-nav');
    if (nestedNav) nestedNav.style.display = category === 'alimentos' ? 'flex' : 'none';
};

window.filterGatos = (category) => {
    const section = document.getElementById('gatos');
    if (!section) return;

    const products = section.querySelectorAll('.product-card');

    const map = {
        all: 'all',
        alimentos: 'alimentos',
        arenas: 'arenas',
        juguetes: 'juguetes',
        farmapet: 'farmapet',
        accesorios: 'accesorios',
        higiene: 'higiene'
    };
    const target = map[category] || category;

    products.forEach(p => {
        const prodCat = p.getAttribute('data-cat');
        if (target === 'all') p.classList.remove('hidden');
        else p.classList.toggle('hidden', prodCat !== target);
    });

    const nestedNav = document.getElementById('alimentos-nested-nav');
    if (nestedNav) nestedNav.style.display = category === 'alimentos' ? 'flex' : 'none';
};

window.navigateToCategory = (animal, category) => {
    const sectionId = animal === 'perros' ? 'perros' : 'gatos';
    const section = document.getElementById(sectionId);
    if (!section) return;

    section.scrollIntoView({ behavior: 'smooth' });

    // Sincronizar UI y habilitar el comportamiento de los menús (subcategorías)
    setTimeout(() => {
        if (animal === 'perros') {
            // Mostrar/ocultar subnav anidado (solo alimentos)
            const nestedNav = document.getElementById('perros-nested-nav');
            if (nestedNav) nestedNav.style.display = category === 'alimentos' ? 'flex' : 'none';

            // Marcar botón activo (primary)
            section.querySelectorAll('.subnav-btn').forEach(btn => {
                const label = btn.innerText.trim().toLowerCase();
                const map = {
                    all: 'todos',
                    alimentos: 'alimentos',
                    juguetes: 'juguetes',
                    farmapet: 'farmapet',
                    accesorios: 'accesorios',
                    higiene: 'cuidado e higiene'
                };
                const expected = (map[category] || category).toLowerCase();
                if (label.includes(expected)) btn.classList.add('active');
                else btn.classList.remove('active');
            });

            // Marcar nested si aplica
            if (nestedNav && category === 'alimentos') {
                nestedNav.querySelectorAll('.nested-btn').forEach(btn => {
                    // si solo navegaste a 'alimentos' sin subcat, deja el primero activo
                    btn.classList.toggle('active', btn.innerText.toLowerCase().includes('concentrado'));
                });
            }

            filterPerros(category);
        } else {
            const nestedNav = document.getElementById('alimentos-nested-nav');
            if (nestedNav) nestedNav.style.display = category === 'alimentos' ? 'flex' : 'none';

            section.querySelectorAll('.subnav-btn').forEach(btn => {
                const label = btn.innerText.trim().toLowerCase();
                const map = {
                    all: 'todos',
                    alimentos: 'alimentos',
                    arenas: 'arenas',
                    juguetes: 'juguetes',
                    farmapet: 'farmapet',
                    accesorios: 'accesorios',
                    higiene: 'cuidado e higiene'
                };
                const expected = (map[category] || category).toLowerCase();
                if (label.includes(expected)) btn.classList.add('active');
                else btn.classList.remove('active');
            });

            if (nestedNav && category === 'alimentos') {
                nestedNav.querySelectorAll('.nested-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.innerText.toLowerCase().includes('concentrado'));
                });
            }

            filterGatos(category);
        }
    }, 300);
};

// --- Checkout WhatsApp ---
window.checkoutWhatsapp = () => {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        alert('Tu carrito esta vacio');
        return;
    }
    const WHATSAPP_NUMBER = "573192640253";
    let productList = "";
    let total = 0;
    cart.forEach((item, index) => {
        const subtotal = item.price * (item.qty || 1);
        productList += `${index + 1}. ${item.name} x${item.qty || 1} - $${subtotal.toLocaleString('es-CO')} COP\n`;
        total += subtotal;
    });
    const message = `Hola PetLoversCol! Quiero realizar el siguiente pedido:\n\n${productList}\n\nTotal a pagar: $${total.toLocaleString('es-CO')} COP\n\nIndiquenme los pasos para el pago y envio`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
    document.getElementById('cart-modal').style.display = 'none';
};

window.checkoutWeb = () => {
    window.location.href = 'checkout.html';
};

// --- Inicializacion ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('PetLoversCol: Sistema iniciado');

    // Render inmediato con el estado actual de Firebase Auth para evitar que el menú
    // muestre temporalmente "Iniciar Sesión".
    renderAuthUI(getCurrentUser());

    // Respaldo UI: si localStorage indica que estaba logueado, intentamos renderizar de nuevo.
    // (La fuente de verdad sigue siendo Firebase; esto solo evita que el DOM quede desfasado).
    if (!getCurrentUser()) {
        const userLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
        if (userLoggedIn) {
            renderAuthUI(getCurrentUser());
        }
    }

    // Actualizar contador del carrito
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartElement = document.querySelector('.cart-count');
    if (cartElement) {
        const totalItems = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
        cartElement.innerText = totalItems;
    }
    
    // Intentar cargar desde Firebase (por animal)
    await loadFromFirebaseByAnimal('perros', '#perros .product-grid');
    await loadFromFirebaseByAnimal('gatos', '#gatos .product-grid');
    
    // Modal de carrito
    const modal = document.getElementById('cart-modal');
    const closeBtn = document.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.onclick = () => { if(modal) modal.style.display = 'none'; };
    }
    window.onclick = (event) => {
        if (modal && event.target === modal) modal.style.display = 'none';
    };
    
    // Buscador
    const searchInput = document.querySelector('.search-bar input');
    const searchBtn = document.querySelector('.search-bar button');
    if (searchBtn && searchInput) {
        function executeSearch() {
            const query = searchInput.value.toLowerCase().trim();
            if (!query) return;
            
            const allProducts = document.querySelectorAll('.product-card');
            let resultsHTML = '';
            let foundCount = 0;
            
            allProducts.forEach(card => {
                const name = card.querySelector('.product-name')?.innerText.toLowerCase() || '';
                if (name.includes(query)) {
                    resultsHTML += card.outerHTML;
                    foundCount++;
                }
            });
            
            const searchContainer = document.getElementById('search-results-container');
            const searchGrid = document.getElementById('search-grid');
            
            if (searchContainer && searchGrid) {
                if (foundCount > 0) {
                    searchGrid.innerHTML = resultsHTML;
                    searchContainer.style.display = 'block';
                    document.body.style.overflow = 'hidden';
                } else {
                    searchGrid.innerHTML = '<div style="text-align:center; padding: 50px; width:100%;"><i class="fa-solid fa-magnifying-glass" style="font-size: 4rem; color: #ccc; margin-bottom: 20px;"></i><h3 style="color:#333">No encontramos productos</h3><p>Intenta con otros terminos.</p></div>';
                    searchContainer.style.display = 'block';
                }
            }
        }
        searchBtn.onclick = executeSearch;
        searchInput.onkeyup = (e) => { if(e.key === 'Enter') executeSearch(); };
    }
    
    if (document.getElementById('close-search')) {
        document.getElementById('close-search').onclick = () => {
            document.getElementById('search-results-container').style.display = 'none';
            document.body.style.overflow = 'auto';
        };
    }
    
    // Anclas suaves
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            e.preventDefault();
            const target = document.querySelector(targetId);
            if (target) window.scrollTo({ top: target.offsetTop - 100, behavior: 'smooth' });
        });
    });
    
    // Slider
    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    
    function updateSlider() {
        slides.forEach((slide, i) => slide.classList.toggle('active', i === currentSlide));
        dots.forEach((dot, i) => dot.classList.toggle('active', i === currentSlide));
    }
    
    window.changeSlide = (dir) => {
        currentSlide += dir;
        if (currentSlide >= slides.length) currentSlide = 0;
        if (currentSlide < 0) currentSlide = slides.length - 1;
        updateSlider();
    };
    window.setSlide = (i) => { currentSlide = i; updateSlider(); };
    setInterval(() => changeSlide(1), 5000);
});

// Agregar estilos para animacion
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
