import firebaseConfig from './FireBase.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, addDoc, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Variáveis globais
let app, db;
let memberProfile = null;
let chartInstance = null;
let allProjects = {};

// Estado do Timer
let isRunning = false;
let startTime = null;
let timerInterval = null;
let projectToStart = '';

// Elementos da UI
const memberNameDisplay = document.getElementById('member-name-display');
const logoutButton = document.getElementById('logout-button');
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
const timerDisplay = document.getElementById('timer-display');
const startButton = document.getElementById('start-button');
const stopButton = document.getElementById('stop-button');
const resetButton = document.getElementById('reset-button');
const projectInput = document.getElementById('project-input');
const timeEntriesList = document.getElementById('time-entries-list');
const messageModal = document.getElementById('message-modal');
const messageText = document.getElementById('message-text');
const messageOkButton = document.getElementById('message-ok');

// Funções de UI
function showMessageModal(message) {
    messageText.textContent = message;
    messageModal.classList.remove('hidden');
}

messageOkButton.addEventListener('click', () => messageModal.classList.add('hidden'));

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark');
});

// Lógica de Autenticação e Inicialização
async function initializeProfilePage() {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        const auth = getAuth(app);

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // O colaborador está logado via custom token. O UID dele é o ID do documento 'member'.
                const memberId = user.uid;
                const memberDocRef = doc(db, "members", memberId);
                const memberDocSnap = await getDoc(memberDocRef);

                if (memberDocSnap.exists()) {
                    memberProfile = { id: memberDocSnap.id, ...memberDocSnap.data() };

                    // Atualiza UI com dados do colaborador
                    memberNameDisplay.textContent = `Olá, ${memberProfile.name}`;
                    projectInput.disabled = false;
                    startButton.disabled = false;
                    stopButton.disabled = true;
                    resetButton.disabled = true;

                    // Configura listeners
                    setupTimeEntriesListener();
                    setupRealtimeChart();
                } else {
                    showMessageModal("Seu perfil de colaborador não foi encontrado.");
                    await signOut(auth);
                }
            } else {
                // Se não há usuário, redireciona para a tela de login de colaborador
                window.location.href = '../html/member-login.html';
            }
        });

    } catch (error) {
        console.error("Erro ao inicializar a página de perfil:", error);
        showMessageModal("Ocorreu um erro ao carregar seu perfil.");
    }
}

logoutButton.addEventListener('click', async () => {
    const auth = getAuth(app);
    await signOut(auth);
    // O listener onAuthStateChanged irá redirecionar automaticamente.
});

// Funções do Rastreador de Tempo (adaptadas de scripts.js)
function updateTimer() {
    if (!isRunning) return;
    const elapsedTime = Date.now() - startTime;
    const totalSeconds = Math.floor(elapsedTime / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    timerDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

async function startTimer() {
    if (isRunning) return;
    const projectName = projectInput.value.trim();
    if (projectName === "") {
        showMessageModal("Por favor, insira o nome do projeto ou tarefa.");
        return;
    }
    isRunning = true;
    startTime = Date.now();
    projectToStart = projectName;
    timerInterval = setInterval(updateTimer, 1000);
    startButton.disabled = true;
    stopButton.disabled = false;
    resetButton.disabled = false;
}

async function stopTimer() {
    if (!isRunning) return;
    clearInterval(timerInterval);
    isRunning = false;
    const endTime = Date.now();
    const duration = endTime - startTime;
    await saveTimeEntry(projectToStart, duration);
    resetTimer();
}

function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    startTime = null;
    timerDisplay.textContent = "00:00:00";
    startButton.disabled = false;
    stopButton.disabled = true;
    resetButton.disabled = true;
    projectInput.value = '';
}

async function saveTimeEntry(projectName, duration) {
    if (!db || !memberProfile) return;
    const durationInSeconds = Math.floor(duration / 1000);
    try {
        await addDoc(collection(db, "timeEntries"), {
            memberId: memberProfile.id,
            companyId: memberProfile.companyId,
            projectName: projectName,
            duration: durationInSeconds,
            timestamp: new Date(),
        });
    } catch (e) {
        console.error("Erro ao salvar entrada de tempo: ", e);
        showMessageModal("Erro ao salvar a entrada de tempo.");
    }
}

// Funções de Renderização (adaptadas de scripts.js)
function formatDuration(seconds) {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function renderTimeEntries(entries) {
    timeEntriesList.innerHTML = '';
    if (entries.length === 0) {
        timeEntriesList.innerHTML = '<p class="text-center text-gray-500">Nenhuma entrada de tempo encontrada.</p>';
        return;
    }
    entries.forEach(entry => {
        const entryElement = document.createElement('div');
        entryElement.className = 'p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm';
        entryElement.innerHTML = `
            <p class="font-bold">${entry.projectName}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">${new Date(entry.timestamp.seconds * 1000).toLocaleDateString()} - Duração: ${formatDuration(entry.duration)}</p>
        `;
        timeEntriesList.appendChild(entryElement);
    });
}

function updateChart(data) {
    const projects = Object.keys(data);
    const durations = Object.values(data);
    if (chartInstance) {
        chartInstance.destroy();
    }
    const ctx = document.getElementById('project-chart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: projects,
            datasets: [{
                label: 'Tempo Gasto (em segundos)',
                data: durations,
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Tempo Total (segundos)' } } },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => `Duração: ${formatDuration(context.parsed.y)}`
                    }
                }
            }
        }
    });
}

// Listeners do Firestore (adaptados)
function setupTimeEntriesListener() {
    if (!db || !memberProfile) return;
    const q = query(
        collection(db, "timeEntries"),
        where("memberId", "==", memberProfile.id),
        orderBy("timestamp", "desc")
    );
    onSnapshot(q, (snapshot) => {
        let entries = [];
        snapshot.forEach(doc => entries.push({ id: doc.id, ...doc.data() }));
        renderTimeEntries(entries);
    });
}

function setupRealtimeChart() {
    if (!db || !memberProfile) return;
    const q = query(
        collection(db, "timeEntries"),
        where("memberId", "==", memberProfile.id)
    );
    onSnapshot(q, (snapshot) => {
        allProjects = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            if (allProjects[data.projectName]) {
                allProjects[data.projectName] += data.duration;
            } else {
                allProjects[data.projectName] = data.duration;
            }
        });
        updateChart(allProjects);
    });
}

// Event Listeners
startButton.addEventListener('click', startTimer);
stopButton.addEventListener('click', stopTimer);
resetButton.addEventListener('click', resetTimer);

// Iniciar a página
document.addEventListener('DOMContentLoaded', initializeProfilePage);
