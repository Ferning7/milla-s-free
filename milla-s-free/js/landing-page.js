import { initThemeManager } from './theme-manager.js';
import { initScrollAnimations } from './animations.js';
import { initLandingAuth } from './landing-auth.js';

/**
 * Inicializa a calculadora de perdas.
 */
function initCalculator() {
    const hourlyRateInput = document.getElementById('hourly-rate');
    const lostHoursInput = document.getElementById('lost-hours');
    const lossResultEl = document.getElementById('loss-result');
    
    if (!hourlyRateInput || !lostHoursInput || !lossResultEl) {
        // Se os elementos não existirem, não faz nada.
        return;
    }
    
    function calculateLoss() {
        const rate = parseFloat(hourlyRateInput.value) || 0;
        const hours = parseFloat(lostHoursInput.value) || 0;
        const totalLoss = rate * hours;
        lossResultEl.textContent = `R$ ${totalLoss.toFixed(2).replace('.', ',')}`;
    }
    
    hourlyRateInput.addEventListener('input', calculateLoss);
    lostHoursInput.addEventListener('input', calculateLoss);
}

/**
 * Inicializa a demonstração interativa (sandbox).
 */
function initSandbox() {
    // Variáveis globais para o sandbox
    let intervalId = null;
    let elapsedSeconds = 0;
    const MAX_SECONDS = 30;
    let isRunning = false;
    
    // Elementos DOM do sandbox
    const timerDisplay = document.getElementById('sandbox-timerDisplay');
    const statusMessage = document.getElementById('sandbox-statusMessage');
    const mainButton = document.getElementById('sandbox-mainButton');
    const pieChartCanvas = document.getElementById('sandbox-pieChart');
    const resetButton = document.getElementById('sandbox-resetButton');
    const finalActions = document.getElementById('sandbox-finalActions');
    const keepButton = document.getElementById('sandbox-keepButton');
    const resetFinalButton = document.getElementById('sandbox-resetFinalButton');
    const confirmationMessage = document.getElementById('sandbox-confirmationMessage');
    
    // Validação para garantir que todos os elementos existem antes de continuar
    const requiredElements = [timerDisplay, statusMessage, mainButton, pieChartCanvas, resetButton, finalActions, keepButton, resetFinalButton, confirmationMessage];
    if (requiredElements.some(el => !el)) {
        console.error("Sandbox não pôde ser inicializado: um ou mais elementos do DOM não foram encontrados.");
        return;
    }
    
    function formatTime(seconds) {
        const secs = Math.floor(seconds);
        return String(secs).padStart(2, '0');
    }
    
    // Captura as cores do tema dinamicamente a partir das variáveis CSS
    const themeAccentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-purple').trim();
    const themeBorderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();

    // Configuração inicial do gráfico de pizza
    const pieChart = new Chart(pieChartCanvas, {
        type: 'doughnut',
        data: {
            labels: ['Tempo Decorrido', 'Tempo Restante'],
            datasets: [{
                data: [0, MAX_SECONDS], // Inicia com 0s decorridos e 30s restantes
                backgroundColor: [
                    themeAccentColor, // Cor roxa do tema para tempo decorrido
                    themeBorderColor  // Cor de fundo do tema para tempo restante
                ],
                borderColor: 'transparent',
                borderWidth: 0,
            }]
        },
        options: {
            cutout: '75%', // Cria o efeito "doughnut"
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            animation: { duration: 0 } // Desativa a animação padrão para atualizações mais rápidas
        }
    });

    function updateDisplay() {
        timerDisplay.textContent = formatTime(elapsedSeconds); 
        pieChart.data.datasets[0].data[0] = elapsedSeconds;
        pieChart.data.datasets[0].data[1] = Math.max(0, MAX_SECONDS - elapsedSeconds);
        pieChart.update();
    }
    
    function tick() {
        elapsedSeconds += 0.01;
        if (elapsedSeconds >= MAX_SECONDS) {
            elapsedSeconds = MAX_SECONDS;
            stopTimer(true); // Para e marca como concluído
        }
        updateDisplay();
    }
    
    function startTimer() {
        if (isRunning || elapsedSeconds >= MAX_SECONDS) return;
        
        isRunning = true;
        statusMessage.textContent = "Rastreando...";
        statusMessage.classList.remove('hidden');
        confirmationMessage.classList.add('hidden');
        
        mainButton.textContent = "Pausar";
        mainButton.classList.replace('btn-success', 'btn-danger');
        resetButton.classList.add('hidden');
        
        intervalId = setInterval(tick, 10);
    }
    
    function stopTimer(finished = false) {
        clearInterval(intervalId);
        intervalId = null;
        isRunning = false;
        
        if (!finished) { // Pausado pelo usuário
            // CORREÇÃO: O texto deve ser "Continuar" ou similar, e a cor deve indicar pausa.
            mainButton.textContent = "Continuar"; 
            mainButton.classList.replace('btn-danger', 'btn-success'); // Mantém o botão verde para continuar
            statusMessage.textContent = "Pausado";
            if (elapsedSeconds > 0) {
                resetButton.classList.remove('hidden');
            }
        } else { // Atingiu 30s
            statusMessage.textContent = "Tempo Esgotado! (30s)";
            mainButton.classList.add('hidden');
            finalActions.classList.remove('hidden');
            resetButton.classList.add('hidden');
        }
    }
    
    function toggleTimer() {
        if (elapsedSeconds >= MAX_SECONDS && !isRunning) return;
        if (isRunning) {
            stopTimer();
        } else {
            startTimer();
        }
    }
    
    function resetTimer() {
        stopTimer();
        elapsedSeconds = 0;
        updateDisplay();
        
        statusMessage.textContent = "Pronto para iniciar.";
        statusMessage.classList.remove('hidden');
        confirmationMessage.classList.add('hidden');
        
        mainButton.classList.remove('hidden');
        mainButton.textContent = "Iniciar";
        mainButton.classList.replace('btn-danger', 'btn-success');
        finalActions.classList.add('hidden');
        resetButton.classList.add('hidden');
    }
    
    function keepState() {
        finalActions.classList.add('hidden');
        mainButton.classList.add('hidden');
        statusMessage.classList.add('hidden');
        confirmationMessage.textContent = "Cronômetro finalizado. Clique em Redefinir para começar um novo ciclo.";
        confirmationMessage.classList.remove('hidden');
    }
    
    mainButton.addEventListener('click', toggleTimer);
    resetButton.addEventListener('click', resetTimer);
    keepButton.addEventListener('click', keepState);
    resetFinalButton.addEventListener('click', resetTimer);
    
    timerDisplay.textContent = "00";
}

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa o gerenciador de tema para o botão na landing page
    initThemeManager('theme-toggle');
    // Inicializa animações de scroll para os cards
    initScrollAnimations('.animate-on-scroll');
    // Inicializa a lógica de autenticação da landing page (modal de login)
    initLandingAuth();
    // Inicializa a calculadora de perdas
    initCalculator();
    // Inicializa a demonstração interativa
    initSandbox();
});