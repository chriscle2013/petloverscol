// Agregar al final del archivo js/script.js o dentro del DOMContentLoaded
// Para evitar errores de sobrescritura, voy a proporcionar el bloque completo actualizado para el slider

function initSlider() {
    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');

    if(slides.length === 0) return;

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
    };

    window.setSlide = (index) => {
        currentSlide = index;
        updateSlider();
    };

    // Auto-play cada 5 segundos
    setInterval(() => {
        changeSlide(1);
    }, 5000);
}

// Llamar a initSlider dentro de DOMContentLoaded en script.js
