/**
 * Módulo para gerenciar o tema da aplicação (claro/escuro).
 */
const THEME_STORAGE_KEY = 'theme';
const FAVICON_LIGHT_PATH = '../imagens/milasclock.png';
const FAVICON_DARK_PATH = '../imagens/millas_escuro.png';

/**
 * Atualiza o favicon do site com base no tema.
 * @param {string} theme - O tema atual ('light' ou 'dark').
 */
function updateFavicon(theme) {
    const favicon = document.querySelector("link[rel='icon']");
    if (favicon) {
        favicon.href = theme === 'dark' ? FAVICON_DARK_PATH : FAVICON_LIGHT_PATH;
    }
}

/**
 * Atualiza o ícone do botão de tema com base no tema atual do body.
 * @param {HTMLElement} iconElement - O elemento <i> do ícone.
 */
function updateThemeIcon(iconElement) {
    if (!iconElement) return;
    // Verifica a classe no elemento <html>
    if (document.documentElement.classList.contains('dark')) {
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
    // Alterna a classe no elemento <html>
    const isDark = document.documentElement.classList.toggle('dark');
    const newTheme = isDark ? 'dark' : 'light';
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    updateFavicon(newTheme);
    return newTheme;
}

/**
 * Aplica o tema salvo no localStorage.
 * Esta função é chamada por um script inline no <head> para evitar FOUC.
 */
function applyInitialTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    // O padrão é 'dark' se nada estiver salvo ou se for explicitamente 'dark'
    if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
    } else {
        document.documentElement.classList.add('dark');
    }
    updateFavicon(savedTheme === 'light' ? 'light' : 'dark');
}

/**
 * Inicializa o gerenciador de tema.
 * Aplica o tema atual e adiciona um ouvinte de evento ao botão de alternância.
 * @param {string} toggleButtonId - O ID do botão que alterna o tema.
 * @param {function} [onThemeChange] - Callback opcional a ser executado após a mudança de tema.
 */
function initThemeManager(toggleButtonId, onThemeChange) {
    // A aplicação inicial do tema agora é feita por um script inline no <head>
    // para evitar o "flash" de tema.

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