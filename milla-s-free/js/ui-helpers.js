/**
 * Módulo com funções de ajuda para a interface do usuário (UI).
 */

/**
 * Exibe um modal de mensagem ou confirmação.
 * @param {string} message - A mensagem a ser exibida.
 * @param {'alert' | 'confirm'} [type='alert'] - O tipo de modal. 'confirm' mostra botões de OK e Cancelar.
 * @returns {Promise<boolean>} Retorna uma Promise que resolve para `true` se OK/Confirmar for clicado, e `false` se Cancelar for clicado.
 */
export function showMessageModal(message, type = 'alert') {
    const messageModal = document.getElementById('message-modal');
    const messageText = document.getElementById('message-text');
    const messageOkButton = document.getElementById('message-ok');
    const messageCancelButton = document.getElementById('message-cancel');
 
    if (!messageModal || !messageText || !messageOkButton) {
        console.error('Elementos essenciais do modal de mensagem (modal, text, ok) não encontrados no DOM.');
        return Promise.resolve(false);
    }
 
    if (type === 'confirm' && !messageCancelButton) {
        console.error('Botão de cancelar do modal não encontrado, mas o tipo é "confirm".');
        return Promise.resolve(false);
    }

    return new Promise((resolve) => {
        messageText.textContent = message;
 
        messageOkButton.textContent = (type === 'confirm') ? 'Confirmar' : 'OK';
        if (messageCancelButton) {
            messageCancelButton.classList.toggle('hidden', type !== 'confirm');
        }
 
        messageModal.classList.remove('hidden');
 
        const cleanup = (result) => {
            messageModal.classList.add('hidden');
            messageOkButton.removeEventListener('click', okListener);
            if (messageCancelButton) {
                messageCancelButton.removeEventListener('click', cancelListener);
            }
            resolve(result);
        };
 
        const okListener = () => cleanup(true);
        const cancelListener = () => cleanup(false);
 
        messageOkButton.addEventListener('click', okListener, { once: true });
        if (type === 'confirm' && messageCancelButton) {
            messageCancelButton.addEventListener('click', cancelListener, { once: true });
        }
    });
}

/**
 * Formata uma duração em segundos para o formato HH:MM:SS.
 * @param {number} seconds - A duração em segundos.
 * @returns {string} A duração formatada.
 */
export function formatDuration(seconds) {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

/**
 * Controla o estado de carregamento de um botão com texto e spinner.
 * @param {HTMLButtonElement} button - O elemento do botão.
 * @param {boolean} isLoading - `true` para mostrar o spinner, `false` para mostrar o texto.
 */
export function toggleButtonLoading(button, isLoading) {
    if (!button) return;
    const buttonText = button.querySelector('.button-text');
    const spinner = button.querySelector('.button-spinner');

    button.disabled = isLoading;
    if (buttonText) buttonText.classList.toggle('hidden', isLoading);
    if (spinner) spinner.classList.toggle('hidden', !isLoading);
}

/**
 * Atualiza ou cria um gráfico de barras com os dados do projeto.
 * @param {Chart | null} chartInstance - A instância do gráfico existente, ou null.
 * @param {object} data - Os dados para o gráfico (labels e valores).
 * @returns {Chart} A nova instância do gráfico.
 */
export function updateChart(chartInstance, data) {
    const projects = Object.keys(data);
    const durations = Object.values(data);

    if (chartInstance) {
        chartInstance.destroy();
    }

    const isDarkMode = document.body.classList.contains('dark');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? '#E2E8F0' : '#1A202C';

    const ctx = document.getElementById('project-chart').getContext('2d');
    const newChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: projects,
            datasets: [{
                label: 'Tempo Gasto (em segundos)',
                data: durations,
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Tempo Total (segundos)', color: textColor }, ticks: { color: textColor }, grid: { color: gridColor } },
                x: { ticks: { color: textColor }, grid: { color: gridColor, drawOnChartArea: false } }
            },
            plugins: {
                legend: { labels: { color: textColor } },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed.y !== null) { label += formatDuration(context.parsed.y); }
                            return label;
                        }
                    }
                }
            }
        }
    });
    return newChartInstance;
}