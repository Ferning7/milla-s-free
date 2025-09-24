/**
 * Módulo que encapsula a lógica e o estado do cronômetro de rastreamento de tempo.
 */
export class Timer {
    /**
     * @param {HTMLElement} timerDisplay - O elemento para exibir o tempo.
     * @param {HTMLButtonElement} startButton - O botão de iniciar.
     * @param {HTMLButtonElement} stopButton - O botão de parar.
     * @param {HTMLInputElement} projectInput - O input que mostra a tarefa atual.
     * @param {function(string, number): Promise<void>} saveTimeEntryCallback - Callback para salvar a entrada de tempo.
     */
    constructor(timerDisplay, startButton, stopButton, projectInput, saveTimeEntryCallback) {
        this.timerDisplay = timerDisplay;
        this.startButton = startButton;
        this.stopButton = stopButton;
        this.projectInput = projectInput;
        this.saveTimeEntry = saveTimeEntryCallback;

        this.isRunning = false;
        this.startTime = null;
        this.timerInterval = null;
        this.projectToStart = '';

        if (this.stopButton) this.stopButton.addEventListener('click', () => this.stop());
    }

    /**
     * Atualiza o display do cronômetro a cada segundo.
     */
    update() {
        if (!this.isRunning) return;
        const elapsedTime = Date.now() - this.startTime;
        const totalSeconds = Math.floor(elapsedTime / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        this.timerDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    /**
     * Inicia o cronômetro para uma tarefa específica.
     * @param {string} taskName - O nome da tarefa.
     */
    start(taskName) {
        if (this.isRunning) return;
        this.isRunning = true;
        this.startTime = Date.now();
        this.projectToStart = taskName;
        this.projectInput.value = taskName;
        this.projectInput.readOnly = true;

        this.timerInterval = setInterval(() => this.update(), 1000);
        this.startButton.classList.add('timer-active');
        this.stopButton.disabled = false;
        this.startButton.disabled = true;
    }

    /**
     * Para o cronômetro e salva a entrada de tempo.
     */
    async stop() {
        if (!this.isRunning) return;
        clearInterval(this.timerInterval);
        const endTime = Date.now();
        const duration = endTime - this.startTime;
        await this.saveTimeEntry(this.projectToStart, duration);
        this.reset();
    }

    /**
     * Redefine o cronômetro para o estado inicial.
     */
    reset() {
        clearInterval(this.timerInterval);
        this.isRunning = false;
        this.startTime = null;
        this.timerDisplay.textContent = "00:00:00";
        this.startButton.classList.remove('timer-active');
        this.startButton.disabled = false;
        this.stopButton.disabled = true;
        this.projectInput.value = '';
        this.projectInput.readOnly = false;
    }
}