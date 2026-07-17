window.filterPerros = (category, subcategory = null, btnElement = null) => {
    const section = document.getElementById('perros');
    const products = section.querySelectorAll('.product-card');
    const subnavButtons = section.querySelectorAll('.subnav-btn');
    const nestedNav = document.getElementById('perros-nested-nav');
    const nestedButtons = nestedNav.querySelectorAll('.nested-btn');

    // Handle Active States for Primary Sub-nav
    if (btnElement && btnElement.classList.contains('subnav-btn')) {
        subnavButtons.forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
    }

    // Handle Active States for Nested Sub-nav
    if (subcategory && btnElement && btnElement.classList.contains('nested-btn')) {
        nestedButtons.forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
    }

    // Show/Hide Nested Navigation for 'Alimentos'
    if (category === 'alimentos') {
        nestedNav.style.display = 'flex';
    } else {
        nestedNav.style.display = 'none';
        nestedButtons.forEach(btn => btn.classList.remove('active'));
    }

    // Filter Products
    products.forEach(product => {
        const prodCat = product.getAttribute('data-cat');
        const prodSubCat = product.getAttribute('data-subcat');

        if (category === 'all') {
            product.classList.remove('hidden');
        } else if (subcategory) {
            if (prodCat === category && prodSubCat === subcategory) {
                product.classList.remove('hidden');
            } else {
                product.classList.add('hidden');
            }
        } else {
            if (prodCat === category) {
                product.classList.remove('hidden');
            } else {
                product.classList.add('hidden');
            }
        }
    });
};

window.navigateToCategory = (animal, category, subcategory = null) => {
    const sectionId = animal === 'perros' ? 'perros' : 'gatos';
    const section = document.getElementById(sectionId);

    if (!section) return;

    // 1. Smooth scroll to section
    section.scrollIntoView({ behavior: 'smooth' });

    // 2. Trigger the specific filter function
    if (animal === 'perros') {
        filterPerros(category, subcategory);
    } else if (animal === 'gatos') {
        filterGatos(category, subcategory);
    }

    // 3. Sync UI buttons (Find the on-page button and make it active)
    setTimeout(() => {
        const subnavButtons = section.querySelectorAll('.subnav-btn');
        const nestedButtons = section.querySelectorAll('.nested-btn');

        subnavButtons.forEach(btn => {
            if (btn.innerText.toLowerCase().includes(category === 'all' ? 'todos' : category)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        if (subcategory) {
            nestedButtons.forEach(btn => {
                if (btn.innerText.toLowerCase().includes(subcategory)) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
    }, 500);
};

// Mover estas funciones FUERA del DOMContentLoaded para que sean globales
window.addToCart = (name, price) => {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.push({ name, price, qty: 1 });
    localStorage.setItem('cart', JSON.stringify(cart));

    const cartElement = document.querySelector('.cart-count');
    if (cartElement) {
        cartElement.innerText = cart.length;
        cartElement.style.transform = 'scale(1.4)';
        setTimeout(() => { cartElement.style.transform = 'scale(1)'; }, 200);
    }
    alert(`🐾 ${name} se ha añadido al carrito.`);
};

window.checkoutWhatsapp = () => {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        alert('Tu carrito está vacío');
        return;
    }
    const WHATSAPP_NUMBER = "573192640253";
    let productList = "";
    let total = 0;
    cart.forEach((item, index) => {
        productList += `${index + 1}. ${item.name} x${item.qty || 1} - $${(item.price * (item.qty || 1)).toLocaleString('es-CO')} COP\n`;
        total += item.price * (item.qty || 1);
    });
    const message = `Hola PetLoversCol! 👋 Quiero realizar el siguiente pedido:\n\n${productList}\n\n💰 *Total a pagar: $${total.toLocaleString('es-CO')} COP*\n\n¿Me podrían indicar los pasos para el pago y envío?`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');

    const modal = document.getElementById('cart-modal');
    if(modal) modal.style.display = 'none';
};

window.checkoutWeb = () => {
    window.location.href = 'checkout.html';
};

window.filterGatos = (category, subcategory = null, btnElement = null) => {
    const section = document.getElementById('gatos');
    const products = section.querySelectorAll('.product-card');
    const subnavButtons = section.querySelectorAll('.subnav-btn');
    const nestedNav = document.getElementById('alimentos-nested-nav');
    const nestedButtons = nestedNav.querySelectorAll('.nested-btn');

    // Handle Active States for Primary Sub-nav
    if (btnElement && btnElement.classList.contains('subnav-btn')) {
        subnavButtons.forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
    }

    // Handle Active States for Nested Sub-nav
    if (subcategory && btnElement && btnElement.classList.contains('nested-btn')) {
        nestedButtons.forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
    }

    // Show/Hide Nested Navigation for 'Alimentos'
    if (category === 'alimentos') {
        nestedNav.style.display = 'flex';
    } else {
        nestedNav.style.display = 'none';
        nestedButtons.forEach(btn => btn.classList.remove('active'));
    }

    // Filter Products
    products.forEach(product => {
        const prodCat = product.getAttribute('data-cat');
        const prodSubCat = product.getAttribute('data-subcat');

        if (category === 'all') {
            product.classList.remove('hidden');
        } else if (subcategory) {
            if (prodCat === category && prodSubCat === subcategory) {
                product.classList.remove('hidden');
            } else {
                product.classList.add('hidden');
            }
        } else {
            if (prodCat === category) {
                product.classList.remove('hidden');
            } else {
                product.classList.add('hidden');
            }
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartElement = document.querySelector('.cart-count');
    if (cartElement) cartElement.innerText = cart.length;

    const modal = document.getElementById('cart-modal');
    const closeBtn = document.querySelector('.close-modal');

    if (document.querySelector('.cart')) {
        document.querySelector('.cart').addEventListener('click', (e) => {
            e.preventDefault();
            const currentCart = JSON.parse(localStorage.getItem('cart')) || [];
            if (currentCart.length === 0) {
                alert('Tu carrito está vacío 🛒');
                return;
            }
            window.location.href = 'cart.html';
        });
    }

    if(closeBtn) {
        closeBtn.onclick = () => { if(modal) modal.style.display = 'none'; };
    }

    window.onclick = (event) => {
        if (modal && event.target == modal) {
            modal.style.display = 'none';
        }
    };

    const searchInput = document.querySelector('.search-bar input');
    const searchBtn = document.querySelector('.search-bar button');

    if(searchBtn && searchInput) {
        function executeSearch() {
            const query = searchInput.value.toLowerCase().trim();

            if(!query) return;

            const allProducts = document.querySelectorAll('.product-card');
            let resultsHTML = '';
            let foundCount = 0;

            allProducts.forEach(card => {
                const name = card.querySelector('.product-name').innerText.toLowerCase();
                if(name.includes(query)) {
                    resultsHTML += card.outerHTML;
                    foundCount++;
                }
            });

            const searchContainer = document.getElementById('search-results-container');
            const searchGrid = document.getElementById('search-grid');

            if(searchContainer && searchGrid) {
                if(foundCount > 0) {
                    searchGrid.innerHTML = resultsHTML;
                    searchContainer.style.display = 'block';
                    document.body.style.overflow = 'hidden';
                } else {
                    searchGrid.innerHTML = `<div style="text-align:center; padding: 50px; width:100%;">
                        <i class="fa-solid fa-magnifying-glass" style="font-size: 4rem; color: #ccc; margin-bottom: 20px;"></i>
                        <h3 style="color:#333">No encontramos productos que coincidan con "${query}" 🐾</h3>
                        <p>Intenta con otros términos o explora nuestras categorías.</p>
                        <button onclick="document.getElementById('search-results-container').style.display='none'; document.body.style.overflow='auto';" class="btn-primary" style="margin-top:20px; cursor:pointer;">Volver a la tienda</button>
                    </div>`;
                    searchContainer.style.display = 'block';
                }
            }
        }

        searchBtn.onclick = executeSearch;
        searchInput.onkeyup = (e) => { if(e.key === 'Enter') executeSearch(); };
    }

    if(document.getElementById('close-search')) {
        document.getElementById('close-search').onclick = () => {
            document.getElementById('search-results-container').style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({ top: targetElement.offsetTop - 100, behavior: 'smooth' });
            }
        });
    });

    // --- SLIDER LOGIC ---
    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');

    function updateSlider() {
        slides.forEach((slide, index) => {
            slide.classList.toggle('active', index === currentSlide);
        });
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlide);
        });
    }

    window.changeSlide = (direction) => {
        currentSlide += direction;
        if (currentSlide >= slides.length) currentSlide = 0;
        if (currentSlide < 0) currentSlide = slides.length - 1;
        updateSlider();
    }

    window.setSlide = (index) => {
        currentSlide = index;
        updateSlider();
    }

    setInterval(() => {
        changeSlide(1);
    }, 5000);
});
