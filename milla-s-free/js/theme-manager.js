/**
 * Módulo para gerenciar o tema da aplicação (claro/escuro).
 */
const THEME_STORAGE_KEY = 'theme';

/**
 * Atualiza o ícone do botão de tema com base no tema atual do body.
 * @param {HTMLElement} iconElement - O elemento <i> do ícone.
 */
function updateThemeIcon(iconElement) {
    if (!iconElement) return;
    if (document.body.classList.contains('dark')) {
        iconElement.classList.remove('fa-moon');
        iconElement.classList.add('fa-sun');
    } else {
        iconElement.classList.remove('fa-sun');
        iconElement.classList.add('fa-moon');
    }
}

/**
 * Alterna o tema entre 'claro' e 'escuro', salva a preferência no localStorage
 * e aplica a mudança ao documento.
 */
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    const newTheme = isDark ? 'dark' : 'light';
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    return newTheme;
}

/**
 * Aplica o tema salvo no localStorage ou define o tema escuro como padrão.
 */
function applyInitialTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    // Define 'dark' como padrão se nenhum tema estiver salvo
    if (savedTheme === 'light') {
        document.body.classList.remove('dark');
    } else {
        document.body.classList.add('dark');
    }
}

/**
 * Inicializa o gerenciador de tema.
 * Aplica o tema atual e adiciona um ouvinte de evento ao botão de alternância.
 * @param {string} toggleButtonId - O ID do botão que alterna o tema.
 * @param {function} [onThemeChange] - Callback opcional a ser executado após a mudança de tema.
 */
function initThemeManager(toggleButtonId, onThemeChange) {
    applyInitialTheme();

    const themeToggleButton = document.getElementById(toggleButtonId);
    if (themeToggleButton) {
        const themeIcon = themeToggleButton.querySelector('i');
        updateThemeIcon(themeIcon); // Define o ícone correto no carregamento

        themeToggleButton.addEventListener('click', () => {
            toggleTheme();
            updateThemeIcon(themeIcon); // Atualiza o ícone no clique
            if (typeof onThemeChange === 'function') {
                onThemeChange();
            }
        });
    }
}

export { initThemeManager, applyInitialTheme };