import firebaseConfig from './FireBase.js';
import { initThemeManager } from './theme-manager.js';
import { showMessageModal, formatDuration, updateChart } from './ui-helpers.js';
import { Timer } from './timer.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, addDoc, onSnapshot, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Variáveis globais
let app, db;
let memberProfile = null;
let chartInstance = null;
let allProjects = {};
let allTasks = []; // Armazena a lista completa de tarefas

let timer;

let memberNameDisplay, logoutButton, timerDisplay, startButton, stopButton, resetButton,
    projectInput, timeEntriesList, messageModal, messageText, messageOkButton,
    taskSelectionModal, existingTasksList, newTaskInput, startTimerConfirmButton,
    cancelTaskSelectionButton;

function initUIElements() {
    memberNameDisplay = document.getElementById('member-name-display');
    logoutButton = document.getElementById('logout-button');
    timerDisplay = document.getElementById('timer-display');
    startButton = document.getElementById('start-button');
    stopButton = document.getElementById('stop-button');
    resetButton = document.getElementById('reset-button');
    projectInput = document.getElementById('project-input');
    timeEntriesList = document.getElementById('time-entries-list');
    messageModal = document.getElementById('message-modal');
    messageText = document.getElementById('message-text');
    messageOkButton = document.getElementById('message-ok');
    taskSelectionModal = document.getElementById('task-selection-modal');
    existingTasksList = document.getElementById('existing-tasks-list');
    newTaskInput = document.getElementById('new-task-input');
    startTimerConfirmButton = document.getElementById('start-timer-confirm-button');
    cancelTaskSelectionButton = document.getElementById('cancel-task-selection-button');
}

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
                    timer = new Timer(
                        document.getElementById('timer-display'),
                        document.getElementById('start-button'),
                        document.getElementById('stop-button'),
                        document.getElementById('reset-button'),
                        document.getElementById('project-input'),
                        saveTimeEntry);
                    memberNameDisplay.textContent = `Olá, ${memberProfile.name}`;
                    projectInput.disabled = false;
                    startButton.disabled = false;
                    stopButton.disabled = true;
                    resetButton.disabled = true;

                    // Configura listeners
                    setupTimeEntriesListener();
                    setupTasksListener(memberProfile.companyId);
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

async function openTaskSelectionModal() {
    if (timer && timer.isRunning) return;
    populateTaskSelectionModal(allTasks);
    taskSelectionModal.classList.remove('hidden');
}

function populateTaskSelectionModal(tasks) {
    existingTasksList.innerHTML = '';
    newTaskInput.value = ''; // Limpa o campo de nova tarefa
    if (tasks.length === 0) {
        const p = document.createElement('p');
        p.className = 'p-3 text-center text-sm text-gray-500';
        p.textContent = 'Nenhuma tarefa pré-definida.';
        existingTasksList.innerHTML = '';
        existingTasksList.appendChild(p);
    } else {
        tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'p-3 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md';
            taskElement.textContent = task.name;
            taskElement.dataset.taskName = task.name;
            existingTasksList.appendChild(taskElement);
        });
    }
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
            status: 'pending', // Tarefas de colaboradores agora são sempre 'pending' para aprovação
            timestamp: new Date(),
        });
    } catch (e) {
        console.error("Erro ao salvar entrada de tempo: ", e);
        showMessageModal("Erro ao salvar a entrada de tempo.");
    }
}

function renderTimeEntries(entries) {
    timeEntriesList.innerHTML = '';
    if (entries.length === 0) {
        const p = document.createElement('p');
        p.className = 'text-center text-gray-500';
        p.textContent = 'Nenhuma entrada de tempo encontrada.';
        timeEntriesList.appendChild(p);
        return;
    }
    entries.forEach(entry => {
        const entryElement = document.createElement('div');
        entryElement.className = 'p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm';
        const projectP = document.createElement('p');
        projectP.className = 'font-bold';
        projectP.textContent = entry.projectName;
        const detailsP = document.createElement('p');
        detailsP.className = 'text-sm text-gray-500 dark:text-gray-400';
        detailsP.textContent = `${new Date(entry.timestamp.seconds * 1000).toLocaleDateString()} - Duração: ${formatDuration(entry.duration)}`;
        entryElement.append(projectP, detailsP);
        timeEntriesList.appendChild(entryElement);
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
        chartInstance = updateChart(chartInstance, allProjects);
    });
}

function setupTasksListener(companyId) {
    if (!db) return;

    const q = query(collection(db, "tasks"), where("companyId", "==", companyId), orderBy("name"));
    onSnapshot(q, (snapshot) => {
        allTasks = [];
        snapshot.forEach(doc => {
            allTasks.push({ id: doc.id, ...doc.data() });
        });
    });
}

// Iniciar a página
document.addEventListener('DOMContentLoaded', () => {
    initUIElements();
    initializeProfilePage();
    initThemeManager('theme-toggle', () => chartInstance = updateChart(chartInstance, allProjects));

    if (messageOkButton) messageOkButton.addEventListener('click', () => messageModal.classList.add('hidden'));

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            const auth = getAuth(app);
            await signOut(auth);
            // O listener onAuthStateChanged irá redirecionar automaticamente.
        });
    }

    if (startButton) {
        startButton.addEventListener('click', openTaskSelectionModal);
    }

    if (cancelTaskSelectionButton) {
        cancelTaskSelectionButton.addEventListener('click', () => {
            taskSelectionModal.classList.add('hidden');
        });
    }

    if (existingTasksList) {
        existingTasksList.addEventListener('click', (e) => {
            if (e.target && e.target.dataset.taskName) {
                newTaskInput.value = e.target.dataset.taskName;
            }
        });
    }

    if (startTimerConfirmButton) {
        startTimerConfirmButton.addEventListener('click', () => {
            const selectedTask = newTaskInput.value.trim();
            if (selectedTask === "") {
                showMessageModal("Por favor, selecione ou digite uma tarefa.");
                return;
            }
            taskSelectionModal.classList.add('hidden');
            timer.start(selectedTask);
        });
    }
});
