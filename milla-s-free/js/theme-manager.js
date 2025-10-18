/**
 * Módulo para gerenciar o tema da aplicação (claro/escuro).
 */

/**
 * Define as cores globais do Chart.js para o modo escuro.
 */
function setChartJsDefaultsDark() {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.color = '#FFFFFF';
    Chart.defaults.scale.ticks.color = '#CCCCCC';
    Chart.defaults.scale.grid.color = '#444444';
    Chart.defaults.plugins.legend.labels.color = '#CCCCCC';
}

/**
 * Reseta as cores globais do Chart.js para o padrão do modo claro.
 */
function setChartJsDefaultsLight() {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.color = '#666';
    Chart.defaults.scale.ticks.color = '#666';
    Chart.defaults.scale.grid.color = 'rgba(0, 0, 0, 0.1)';
    Chart.defaults.plugins.legend.labels.color = '#666';
}

/**
 * Aplica o tema correto aos gráficos Chart.js e os atualiza.
 */
function updateChartsTheme() {
    if (typeof Chart === 'undefined') return;
    const isDarkMode = document.documentElement.classList.contains('dark');
    isDarkMode ? setChartJsDefaultsDark() : setChartJsDefaultsLight();
    for (const id in Chart.instances) {
        Chart.instances[id].update();
    }
}

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
    updateChartsTheme(); // Atualiza os gráficos após a troca de tema
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
    updateChartsTheme(); // Aplica o tema aos gráficos no carregamento inicial
}

/**
 * Inicializa o gerenciador de tema.
 * Aplica o tema atual e adiciona um ouvinte de evento ao botão de alternância.
 * @param {string} toggleButtonId - O ID do botão que alterna o tema.
 * @param {function} [onThemeChange] - Callback opcional a ser executado após a mudança de tema.
 */
function initThemeManager(toggleButtonId, onThemeChange) {
    updateChartsTheme(); // Garante que o tema do gráfico seja aplicado no carregamento

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