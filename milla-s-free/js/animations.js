/**
 * Módulo para inicializar animações de scroll.
 * Usa a Intersection Observer API para adicionar uma classe 'visible'
 * aos elementos quando eles entram na viewport.
 */

/**
 * Inicializa o observador de interseção.
 * @param {string} selector - O seletor CSS para os elementos a serem animados.
 */
export function initScrollAnimations(selector) {
    const elementsToAnimate = document.querySelectorAll(selector);

    if (!elementsToAnimate.length) {
        return;
    }

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            // Adiciona a classe 'visible' quando o elemento entra na tela
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            } else {
                // Remove a classe quando o elemento sai da tela, permitindo que a animação ocorra novamente
                entry.target.classList.remove('visible');
            }
        });
    }, {
        threshold: 0.1, // Aciona quando 10% do elemento está visível
        rootMargin: '0px 0px -50px 0px' // Aciona um pouco antes do elemento estar totalmente na tela
    });

    elementsToAnimate.forEach(element => {
        observer.observe(element);
    });
}