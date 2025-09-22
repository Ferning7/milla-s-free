/**
 * Módulo para gerenciar o tema da aplicação (claro/escuro).
 */

const THEME_STORAGE_KEY = 'theme';

/**
 * Aplica o tema salvo no localStorage ou define o tema escuro como padrão.
 * Adiciona ou remove a classe 'dark' do elemento <body>.
 */
function applyTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    // Define 'dark' como padrão se nenhum tema estiver salvo
    if (savedTheme === 'light') {
        document.body.classList.remove('dark');
    } else {
        document.body.classList.add('dark');
    }
}

/**
 * Alterna o tema entre 'claro' e 'escuro', salva a preferência no localStorage
 * e aplica a mudança ao documento.
 * @returns {string} O novo tema ('light' ou 'dark').
 */
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    const newTheme = isDark ? 'dark' : 'light';
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    return newTheme;
}

/**
 * Inicializa o gerenciador de tema.
 * Aplica o tema atual e adiciona um ouvinte de evento ao botão de alternância.
 * @param {string} toggleButtonId - O ID do botão que alterna o tema.
 * @param {function} [onThemeChange] - Callback opcional a ser executado após a mudança de tema.
 */
function initThemeManager(toggleButtonId, onThemeChange) {
    // Aplica o tema no carregamento inicial da página
    applyTheme();

    const themeToggleButton = document.getElementById(toggleButtonId);
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            toggleTheme();
            // Se um callback foi fornecido (ex: para atualizar um gráfico), ele é chamado aqui.
            if (typeof onThemeChange === 'function') {
                onThemeChange();
            }
        });
    }
}

// Exporta as funções para serem usadas em outros módulos
export { applyTheme, initThemeManager };