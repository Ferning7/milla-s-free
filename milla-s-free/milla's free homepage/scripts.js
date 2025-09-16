import firebaseConfig from './FireBase.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, orderBy, limit, startAfter, endBefore, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Ativar logging para depuração
setLogLevel('debug');

// Variáveis globais do Firebase
let app, auth, db;
let userId;
let appId;
let lastVisible = null;
const pageSize = 5;

// Variáveis de estado
let isRunning = false;
let startTime = null;
let timerInterval = null;
let projectToStart = '';
let currentPage = 1;
let chartInstance = null;
let allProjects = {}; // Objeto para armazenar todos os projetos para o gráfico

// Elementos da UI
const timerDisplay = document.getElementById('timer-display');
const startButton = document.getElementById('start-button');
const stopButton = document.getElementById('stop-button');
const resetButton = document.getElementById('reset-button');
const projectInput = document.getElementById('project-input');
const timeEntriesList = document.getElementById('time-entries-list');
const prevPageButton = document.getElementById('prev-page-button');
const nextPageButton = document.getElementById('next-page-button');
const paginationControls = document.getElementById('pagination-controls');
const editModal = document.getElementById('edit-modal');
const editEntryIdInput = document.getElementById('edit-entry-id');
const editProjectInput = document.getElementById('edit-project-input');
const editDateInput = document.getElementById('edit-date-input');
const editHoursInput = document.getElementById('edit-hours');
const editMinutesInput = document.getElementById('edit-minutes');
const editSecondsInput = document.getElementById('edit-seconds');
const saveEditButton = document.getElementById('save-edit-button');
const cancelEditButton = document.getElementById('cancel-edit-button');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
const profileToggle = document.getElementById('profile-toggle');
const profileModal = document.getElementById('profile-modal');
const userIdDisplay = document.getElementById('user-id-display');
const logoutButton = document.getElementById('logout-button');
const shareToggle = document.getElementById('share-toggle');
const shareModal = document.getElementById('share-modal');
const appIdDisplay = document.getElementById('app-id-display');
const copyAppIdButton = document.getElementById('copy-app-id');
const closeShareModalButton = document.getElementById('close-share-modal');
const messageModal = document.getElementById('message-modal');
const messageText = document.getElementById('message-text');
const messageOkButton = document.getElementById('message-ok');

// Função para mostrar um modal de mensagem
function showMessageModal(message) {
    messageText.textContent = message;
    messageModal.classList.remove('hidden');
}

// Inicialização do Firebase
async function initializeFirebase() {
    try {
        if (Object.keys(firebaseConfig).length > 0) {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);

            // Para continuar com o login anônimo, substitua o bloco `if/else` abaixo.
            await signInAnonymously(auth);

            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    userId = user.uid;
                    console.log("Usuário autenticado:", userId);
                    userIdDisplay.textContent = userId;
                    appIdDisplay.textContent = firebaseConfig.appId;
                    appId = firebaseConfig.appId;
                    appIdDisplay.textContent = appId;

                    // Inicializa listeners e funções após a autenticação
                    setupTimeEntriesListener();
                    setupRealtimeChart();
                } else {
                    console.log("Nenhum usuário logado. Tentando login anônimo...");
                    signInAnonymously(auth).catch((error) => {
                        console.error("Erro ao tentar login anônimo:", error);
                        showMessageModal("Ocorreu um erro ao inicializar o aplicativo. Por favor, tente novamente.");
                    });
                }
            });
        } else {
            console.error("Configuração do Firebase não encontrada.");
            showMessageModal("Ocorreu um erro ao inicializar o aplicativo. Por favor, tente novamente.");
        }
    } catch (error) {
        console.error("Erro na inicialização do Firebase:", error);
        showMessageModal("Ocorreu um erro ao inicializar o aplicativo. Por favor, tente novamente.");
    }
}

// Iniciar a aplicação
document.addEventListener('DOMContentLoaded', initializeFirebase);


// Funções do Rastreador de Tempo
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
    if (isRunning) {
        showMessageModal("O rastreador já está em andamento.");
        return;
    }

    const projectName = projectInput.value.trim();
    if (projectName === "") {
        showMessageModal("Por favor, insira o nome do projeto ou tarefa.");
        return;
    }

    isRunning = true;
    startTime = Date.now();
    projectToStart = projectName;

    timerInterval = setInterval(updateTimer, 1000);
    startButton.classList.add('timer-active');
    stopButton.disabled = false;
    startButton.disabled = true;
    resetButton.disabled = false;
}

async function stopTimer() {
    if (!isRunning) {
        showMessageModal("Nenhum rastreador está em andamento.");
        return;
    }

    clearInterval(timerInterval);
    isRunning = false;
    startButton.classList.remove('timer-active');
    stopButton.disabled = true;
    startButton.disabled = false;

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
    startButton.classList.remove('timer-active');
    startButton.disabled = false;
    stopButton.disabled = true;
    resetButton.disabled = true;
    projectInput.value = '';
}

async function saveTimeEntry(projectName, duration) {
    if (!db || !userId || !appId) {
        console.error("Firestore, userId ou appId não estão inicializados ou disponíveis.");
        return;
    }
    const durationInSeconds = Math.floor(duration / 1000);
    try {
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/timeEntries`), {
            projectName: projectName,
            duration: durationInSeconds,
            timestamp: new Date(),
        });
        console.log("Entrada de tempo salva com sucesso.");
    } catch (e) {
        console.error("Erro ao adicionar documento: ", e);
        showMessageModal("Erro ao salvar a entrada de tempo. Tente novamente.");
    }
}

// Funções de Gerenciamento de Entradas de Tempo
function formatDuration(seconds) {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function renderTimeEntries(entries) {
    timeEntriesList.innerHTML = '';
    entries.forEach(entry => {
        const entryElement = document.createElement('div');
        entryElement.className = 'flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm';
        entryElement.innerHTML = `
            <div>
                <p class="font-bold">${entry.projectName}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">${new Date(entry.timestamp.seconds * 1000).toLocaleDateString()} - Duração: ${formatDuration(entry.duration)}</p>
            </div>
            <div class="flex space-x-2">
                <button class="edit-button text-blue-500 hover:text-blue-700 transition-colors" data-id="${entry.id}"><i class="fas fa-edit"></i></button>
                <button class="delete-button text-red-500 hover:text-red-700 transition-colors" data-id="${entry.id}"><i class="fas fa-trash"></i></button>
            </div>
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
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Tempo Total (segundos)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += formatDuration(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// Funções do Firebase
async function setupTimeEntriesListener() {
    if (!db || !userId || !appId) {
        console.error("Firestore não está pronto para o listener.");
        return;
    }
    const q = query(
        collection(db, `artifacts/${appId}/users/${userId}/timeEntries`),
        orderBy("timestamp", "desc")
    );

    onSnapshot(q, (snapshot) => {
        let entries = [];
        snapshot.forEach(doc => {
            entries.push({ id: doc.id, ...doc.data() });
        });

        // Re-organiza a paginação e renderiza
        const totalEntries = entries.length;
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const pageEntries = entries.slice(startIndex, endIndex);

        renderTimeEntries(pageEntries);

        // Atualiza os controles de paginação
        paginationControls.classList.toggle('hidden', totalEntries <= pageSize);
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = endIndex >= totalEntries;
    }, (error) => {
        console.error("Erro no onSnapshot:", error);
    });
}

async function setupRealtimeChart() {
    if (!db || !userId || !appId) {
        console.error("Firestore não está pronto para o listener do gráfico.");
        return;
    }
    const q = query(
        collection(db, `artifacts/${appId}/users/${userId}/timeEntries`)
    );

    onSnapshot(q, (snapshot) => {
        allProjects = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            const projectName = data.projectName;
            const duration = data.duration;

            if (allProjects[projectName]) {
                allProjects[projectName] += duration;
            } else {
                allProjects[projectName] = duration;
            }
        });
        updateChart(allProjects);
    }, (error) => {
        console.error("Erro no onSnapshot para o gráfico:", error);
    });
}

// Funções de Edição e Exclusão
timeEntriesList.addEventListener('click', async (e) => {
    if (e.target.closest('.delete-button')) {
        const id = e.target.closest('.delete-button').dataset.id;
        try {
            if (db && userId && appId) {
                await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/timeEntries`, id));
                showMessageModal("Entrada de tempo excluída com sucesso.");
            }
        } catch (error) {
            console.error("Erro ao excluir documento:", error);
            showMessageModal("Erro ao excluir a entrada. Tente novamente.");
        }
    }

    if (e.target.closest('.edit-button')) {
        const id = e.target.closest('.edit-button').dataset.id;
        openEditModal(id);
    }
});

async function openEditModal(id) {
    if (!db || !userId || !appId) {
        return;
    }
    const docRef = doc(db, `artifacts/${appId}/users/${userId}/timeEntries`, id);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const duration = data.duration;
            const date = new Date(data.timestamp.seconds * 1000);

            editEntryIdInput.value = id;
            editProjectInput.value = data.projectName;
            editDateInput.value = date.toISOString().split('T')[0];

            const hours = Math.floor(duration / 3600);
            const minutes = Math.floor((duration % 3600) / 60);
            const seconds = duration % 60;

            editHoursInput.value = hours;
            editMinutesInput.value = minutes;
            editSecondsInput.value = seconds;

            editModal.classList.remove('hidden');
        } else {
            showMessageModal("Documento não encontrado para edição.");
        }
    } catch (error) {
        console.error("Erro ao buscar documento para edição:", error);
        showMessageModal("Erro ao carregar dados para edição.");
    }
}

async function saveEditedEntry() {
    const id = editEntryIdInput.value;
    const projectName = editProjectInput.value.trim();
    const dateStr = editDateInput.value;
    const hours = parseInt(editHoursInput.value) || 0;
    const minutes = parseInt(editMinutesInput.value) || 0;
    const seconds = parseInt(editSecondsInput.value) || 0;

    if (!projectName || !dateStr) {
        showMessageModal("O nome do projeto e a data são obrigatórios.");
        return;
    }

    const totalDuration = hours * 3600 + minutes * 60 + seconds;
    const date = new Date(dateStr);

    if (!db || !userId || !appId) {
        return;
    }
    const docRef = doc(db, `artifacts/${appId}/users/${userId}/timeEntries`, id);
    try {
        await updateDoc(docRef, {
            projectName: projectName,
            duration: totalDuration,
            timestamp: date
        });
        showMessageModal("Entrada de tempo atualizada com sucesso.");
        editModal.classList.add('hidden');
    } catch (error) {
        console.error("Erro ao atualizar documento:", error);
        showMessageModal("Erro ao salvar a edição. Tente novamente.");
    }
}

// Event Listeners
startButton.addEventListener('click', startTimer);
stopButton.addEventListener('click', stopTimer);
resetButton.addEventListener('click', resetTimer);
saveEditButton.addEventListener('click', saveEditedEntry);
cancelEditButton.addEventListener('click', () => editModal.classList.add('hidden'));
messageOkButton.addEventListener('click', () => messageModal.classList.add('hidden'));

// UI Interações
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    menuToggle.classList.toggle('active');
});

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark');
});

profileToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    profileModal.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
    if (!profileModal.contains(e.target) && !profileToggle.contains(e.target)) {
        profileModal.classList.add('hidden');
    }
});

shareToggle.addEventListener('click', () => {
    shareModal.classList.remove('hidden');
});

closeShareModalButton.addEventListener('click', () => {
    shareModal.classList.add('hidden');
});

copyAppIdButton.addEventListener('click', () => {
    const appIdText = appIdDisplay.textContent;
    const tempInput = document.createElement('textarea');
    tempInput.value = appIdText;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showMessageModal("ID do aplicativo copiado!");
});

logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showMessageModal("Você foi desconectado.");
        // O onAuthStateChanged listener se encarregará de fazer o login anônimo novamente
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        showMessageModal("Erro ao sair. Tente novamente.");
    }
});

// Paginação
prevPageButton.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        setupTimeEntriesListener();
    }
});

nextPageButton.addEventListener('click', () => {
    currentPage++;
    setupTimeEntriesListener();
});

