import { initThemeManager } from './theme-manager.js';
import { initScrollAnimations } from './animations.js';
import { initLandingAuth } from './landing-auth.js';

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa o gerenciador de tema para o botão na landing page
    initThemeManager('theme-toggle');
    // Inicializa animações de scroll para os cards
    initScrollAnimations('.animate-on-scroll');
    // Inicializa a lógica de autenticação da landing page (modal de login)
    initLandingAuth();

    // --- Logic for Gain/Loss Calculator ---
    const hourlyRateInput = document.getElementById('hourly-rate');
    const lostHoursInput = document.getElementById('lost-hours');
    const lossResultEl = document.getElementById('loss-result');

    function calculateLoss() {
        const rate = parseFloat(hourlyRateInput.value) || 0;
        const hours = parseFloat(lostHoursInput.value) || 0;
        const totalLoss = rate * hours;
        lossResultEl.textContent = `R$ ${totalLoss.toFixed(2).replace('.', ',')}`;
    }

    if (hourlyRateInput && lostHoursInput && lossResultEl) {
        hourlyRateInput.addEventListener('input', calculateLoss);
        lostHoursInput.addEventListener('input', calculateLoss);
    }

    // --- Logic for Sandbox Dashboard ---
    const sandboxTimerEl = document.getElementById('sandbox-timer');
    const sandboxStartBtn = document.getElementById('sandbox-start-btn');
    const sandboxAddHoursBtn = document.getElementById('sandbox-add-hours-btn');
    const sandboxChartBar = document.getElementById('sandbox-chart-bar');
    
    let sandboxTimerInterval;
    let sandboxSeconds = 0;

    if (sandboxStartBtn) {
        sandboxStartBtn.addEventListener('click', () => {
            if (sandboxStartBtn.textContent === 'Iniciar') {
                sandboxStartBtn.textContent = 'Parar';
                sandboxStartBtn.classList.replace('btn-success', 'btn-danger');
                sandboxTimerInterval = setInterval(() => {
                    sandboxSeconds++;
                    const h = String(Math.floor(sandboxSeconds / 3600)).padStart(2, '0');
                    const m = String(Math.floor((sandboxSeconds % 3600) / 60)).padStart(2, '0');
                    const s = String(sandboxSeconds % 60).padStart(2, '0');
                    sandboxTimerEl.textContent = `${h}:${m}:${s}`;
                }, 1000);
            } else {
                // Para o cronômetro e reseta o estado do botão e do tempo
                clearInterval(sandboxTimerInterval);
                sandboxStartBtn.textContent = 'Iniciar';
                sandboxStartBtn.classList.replace('btn-danger', 'btn-success');
                sandboxSeconds = 0;
                sandboxTimerEl.textContent = '00:00:00';
            }
        });
    }

    if (sandboxAddHoursBtn) {
        sandboxAddHoursBtn.addEventListener('click', () => {
            let currentWidth = parseFloat(sandboxChartBar.style.width) || 0;
            let newWidth = currentWidth + 15;
            // Se a barra estiver cheia, reseta para um valor inicial no próximo clique
            if (currentWidth >= 100) {
                newWidth = 15;
            }
            sandboxChartBar.style.width = `${newWidth}%`;
        });
    }
});