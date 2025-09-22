import firebaseConfig from './FireBase.js';
import { initThemeManager } from './theme-manager.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
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
let allProjects = {}; 
let allTimeEntries = []; // Array para armazenar todas as entradas de tempo
let selectedMemberId = 'all'; // 'all', 'company' (para empresa), ou um memberId
let membersMap = new Map(); // Mapa para armazenar nomes de colaboradores

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
const sidebarOverlay = document.getElementById('sidebar-overlay');
const profileToggle = document.getElementById('profile-toggle');
const profileModal = document.getElementById('profile-modal');
const userView = document.getElementById('user-view');
const guestView = document.getElementById('guest-view');
const userEmailDisplay = document.getElementById('user-email-display');
const logoutButton = document.getElementById('logout-button');
const shareToggle = document.getElementById('share-toggle');
const shareModal = document.getElementById('share-modal');
const appIdDisplay = document.getElementById('app-id-display');
const copyAppIdButton = document.getElementById('copy-app-id');
const closeShareModalButton = document.getElementById('close-share-modal');

const showLoginModalButton = document.getElementById('show-login-modal-button');
const showRegisterModalButton = document.getElementById('show-register-modal-button');
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const cancelLoginButton = document.getElementById('cancel-login-button');
const registerModal = document.getElementById('register-modal');
const registerForm = document.getElementById('register-form');
const cancelRegisterButton = document.getElementById('cancel-register-button');
const messageModal = document.getElementById('message-modal');
const messageText = document.getElementById('message-text');
const messageOkButton = document.getElementById('message-ok');
const messageCancelButton = document.getElementById('message-cancel');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const forgotPasswordModal = document.getElementById('forgot-password-modal');
const forgotPasswordForm = document.getElementById('forgot-password-form');
const forgotEmailInput = document.getElementById('forgot-email');
const cancelForgotButton = document.getElementById('cancel-forgot-button');
const memberFilter = document.getElementById('member-filter');

// Função para mostrar um modal de mensagem
function showMessageModal(message, type = 'alert') {
    return new Promise((resolve) => {
        messageText.textContent = message;

        if (type === 'confirm') {
            messageOkButton.textContent = 'Confirmar';
            messageCancelButton.classList.remove('hidden');
        } else {
            messageOkButton.textContent = 'OK';
            messageCancelButton.classList.add('hidden');
        }

        messageModal.classList.remove('hidden');

        const okListener = () => {
            cleanup();
            resolve(true);
        };

        const cancelListener = () => {
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            messageModal.classList.add('hidden');
            messageOkButton.removeEventListener('click', okListener);
            messageCancelButton.removeEventListener('click', cancelListener);
        };

        messageOkButton.addEventListener('click', okListener, { once: true });
        messageCancelButton.addEventListener('click', cancelListener, { once: true });
    });
}

// Inicialização do Firebase
async function initializeFirebase() {
    try {
        if (Object.keys(firebaseConfig).length > 0) {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);

            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    // Usuário está logado
                    userId = user.uid;
                    console.log("Usuário autenticado:", userId);

                    // Atualiza a UI para usuário logado
                    userEmailDisplay.textContent = user.email || 'Usuário Anônimo';
                    guestView.classList.add('hidden');
                    userView.classList.remove('hidden');

                    appId = firebaseConfig.appId;
                    appIdDisplay.textContent = appId;

                    // Habilita funcionalidades do app
                    projectInput.disabled = false;

                    // Esconde modais de autenticação
                    loginModal.classList.add('hidden');
                    registerModal.classList.add('hidden');
                    profileModal.classList.add('hidden');

                    // Inicializa listeners
                    setupTimeEntriesListener();
                    setupRealtimeChart();
                    updateVerificationStatus(user);
                } else {
                    // Usuário está deslogado
                    userId = null;
                    console.log("Nenhum usuário logado.");

                    // Atualiza a UI para visitante
                    userView.classList.add('hidden');
                    guestView.classList.remove('hidden');

                    // Desabilita funcionalidades e limpa a UI
                    disableAppFeatures();
                    showMessageModal("Por favor, faça login ou cadastre-se para usar o aplicativo.");
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
document.addEventListener('DOMContentLoaded', () => {
    initializeFirebase();
    initThemeManager('theme-toggle', () => updateChart(allProjects));
});

function disableAppFeatures() {
    resetTimer();
    projectInput.disabled = true;
    startButton.disabled = true;
    stopButton.disabled = true;
    resetButton.disabled = true;
    timeEntriesList.innerHTML = '<p class="text-center text-gray-500">Faça login para ver suas entradas de tempo.</p>';
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
    paginationControls.classList.add('hidden');
}

function updateVerificationStatus(user) {
    const verificationStatusEl = document.getElementById('verification-status');
    if (!verificationStatusEl) return;

    if (user.emailVerified) {
        verificationStatusEl.innerHTML = `<span class="text-green-500 flex items-center gap-1"><i class="fas fa-check-circle"></i> E-mail verificado</span>`;
    } else {
        verificationStatusEl.innerHTML = `
            <div class="flex items-center justify-between">
                 <span class="text-yellow-500 flex items-center gap-1"><i class="fas fa-exclamation-triangle"></i> E-mail não verificado</span>
                 <button id="resend-verification-button" class="text-xs text-blue-500 hover:underline ml-2">Reenviar</button>
            </div>
        `;
    }
}

userView.addEventListener('click', async (e) => {
    if (e.target.id === 'resend-verification-button') {
        try {
            await sendEmailVerification(auth.currentUser);
            showMessageModal("Um novo e-mail de verificação foi enviado.");
        } catch (error) {
            console.error("Erro ao reenviar email de verificação:", error);
            showMessageModal("Erro ao reenviar e-mail. Tente novamente mais tarde.");
        }
    }
});

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
    if (!db || !userId) {
        console.error("Firestore ou userId não estão inicializados.");
        return;
    }
    const durationInSeconds = Math.floor(duration / 1000);
    try {
        // A entrada de tempo da própria empresa é salva com seu ID como companyId.
        await addDoc(collection(db, "timeEntries"), {
            projectName: projectName,
            duration: durationInSeconds,
            timestamp: new Date(),
            companyId: userId,
            memberId: null, // Indica que a entrada é do admin da empresa
            status: 'approved'
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

function renderTimeEntries(entries, membersMap) {
    timeEntriesList.innerHTML = '';
    entries.forEach(entry => {
        const entryElement = document.createElement('div');
        entryElement.className = 'flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm';

        const memberName = entry.memberId ? (membersMap.get(entry.memberId) || 'Colaborador Desconhecido') : 'Empresa';
        const isPending = entry.status === 'pending';

        let statusBadge = '';
        let approvalButtons = '';
        if (isPending) {
            statusBadge = `<span class="ml-2 text-xs font-semibold bg-yellow-500 text-white px-2 py-1 rounded-full">Pendente</span>`;
            approvalButtons = `
                <button class="approve-button text-green-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors" data-id="${entry.id}" title="Aprovar"><i class="fas fa-check-circle pointer-events-none"></i></button>
                <button class="reject-button text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors" data-id="${entry.id}" title="Rejeitar"><i class="fas fa-times-circle pointer-events-none"></i></button>
            `;
        }

        entryElement.innerHTML = `
            <div>
                <p class="font-bold">${entry.projectName}${statusBadge}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">${new Date(entry.timestamp.seconds * 1000).toLocaleDateString()} - Duração: ${formatDuration(entry.duration)} <span class="font-semibold text-blue-400">(${memberName})</span></p>
            </div>
            <div class="flex space-x-2">
                ${approvalButtons}
                <button class="edit-button text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors" data-id="${entry.id}" title="Editar"><i class="fas fa-edit pointer-events-none"></i></button>
                <button class="delete-button text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors" data-id="${entry.id}" title="Excluir"><i class="fas fa-trash pointer-events-none"></i></button>
            </div>
        `;

        // Adiciona os event listeners diretamente aos botões criados
        const editButton = entryElement.querySelector('.edit-button');
        const deleteButton = entryElement.querySelector('.delete-button');
        const approveButton = entryElement.querySelector('.approve-button');
        const rejectButton = entryElement.querySelector('.reject-button');

        editButton.addEventListener('click', () => {
            openEditModal(entry.id);
        });

        deleteButton.addEventListener('click', async () => {
            const confirmed = await showMessageModal("Tem certeza que deseja excluir esta entrada de tempo?", 'confirm');
            if (confirmed) {
                deleteTimeEntry(entry.id);
            }
        });

        if (approveButton) {
            approveButton.addEventListener('click', async () => {
                await updateDoc(doc(db, "timeEntries", entry.id), { status: 'approved' });
                showMessageModal("Entrada de tempo aprovada com sucesso.");
            });
        }

        if (rejectButton) {
            rejectButton.addEventListener('click', async () => {
                const confirmed = await showMessageModal("Tem certeza que deseja rejeitar e excluir esta entrada de tempo?", 'confirm');
                if (confirmed) deleteTimeEntry(entry.id);
            });
        }

        timeEntriesList.appendChild(entryElement);
    });
}

function updateChart(data) {
    const projects = Object.keys(data);
    const durations = Object.values(data);

    if (chartInstance) {
        chartInstance.destroy();
    }

    // Define as cores com base no tema
    const isDarkMode = document.body.classList.contains('dark');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? '#E2E8F0' : '#1A202C';

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
                        text: 'Tempo Total (segundos)',
                        color: textColor
                    },
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                },
                x: {
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor,
                        drawOnChartArea: false
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: textColor
                    }
                },
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

function populateMemberFilter(membersMap) {
    const currentFilterValue = memberFilter.value;
    memberFilter.innerHTML = '<option value="all">Todos os Colaboradores</option>';
    memberFilter.innerHTML += '<option value="company">Apenas Empresa</option>';
    membersMap.forEach((name, id) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = name;
        memberFilter.appendChild(option);
    });
    memberFilter.value = currentFilterValue; // Mantém o filtro selecionado após recarregar
}

function renderCurrentPage() {
    let filteredEntries = allTimeEntries;
    if (selectedMemberId === 'company') {
        filteredEntries = allTimeEntries.filter(entry => entry.memberId === null);
    } else if (selectedMemberId !== 'all') {
        filteredEntries = allTimeEntries.filter(entry => entry.memberId === selectedMemberId);
    }

    const totalEntries = filteredEntries.length;
    if (totalEntries === 0) {
        timeEntriesList.innerHTML = '<p class="text-center text-gray-500">Nenhuma entrada de tempo encontrada.</p>';
        paginationControls.classList.add('hidden');
        return;
    }
    
    const totalPages = Math.ceil(totalEntries / pageSize);

    // Garante que a página atual não seja inválida após a exclusão de itens
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    if (currentPage < 1) {
        currentPage = 1;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const pageEntries = filteredEntries.slice(startIndex, startIndex + pageSize);

    renderTimeEntries(pageEntries, membersMap);

    // Atualiza os controles de paginação
    paginationControls.classList.toggle('hidden', totalEntries <= pageSize);
    prevPageButton.disabled = currentPage === 1;
    nextPageButton.disabled = currentPage >= totalPages;
}

// Funções do Firebase
async function setupTimeEntriesListener() {
    if (!db || !userId) {
        console.error("Firestore não está pronto para o listener.");
        return;
    }
    // Uma empresa/usuário logado vê as entradas de todos os seus funcionários
    const q = query(
        collection(db, `timeEntries`),
        where("companyId", "==", userId),
        orderBy("timestamp", "desc")
    );

    onSnapshot(q, async (snapshot) => {
        const membersQuery = query(collection(db, 'members'), where('companyId', '==', userId));
        const membersSnapshot = await getDocs(membersQuery);
        membersMap.clear();
        membersSnapshot.forEach(doc => {
            membersMap.set(doc.id, doc.data().name);
        });

        populateMemberFilter(membersMap);

        if (snapshot.empty) {
            allTimeEntries = [];
            renderCurrentPage();
            return;
        }

        allTimeEntries = [];
        snapshot.forEach(doc => {
            allTimeEntries.push({ id: doc.id, ...doc.data() });
        });

        renderCurrentPage(); // Chama a nova função para renderizar a página atual

    }, (error) => {
        console.error("Erro no onSnapshot:", error);
    });
}

async function setupRealtimeChart() {
    if (!db || !userId) {
        console.error("Firestore não está pronto para o listener do gráfico.");
        return;
    }
    const q = query(
        collection(db, `timeEntries`),
        where("companyId", "==", userId)
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
async function deleteTimeEntry(id) {
    if (!db || !userId) {
        showMessageModal("Erro de autenticação. Não foi possível excluir.");
        return;
    }
    try {
        await deleteDoc(doc(db, `timeEntries`, id));
        showMessageModal("Entrada de tempo excluída com sucesso.");
    } catch (error) {
        console.error("Erro ao excluir documento:", error);
        showMessageModal("Erro ao excluir a entrada. Tente novamente.");
    }
}
async function openEditModal(id) {
    if (!db || !userId) {
        return;
    }
    const docRef = doc(db, `timeEntries`, id);
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
    const saveButton = document.getElementById('save-edit-button');
    const buttonText = saveButton.querySelector('.button-text');
    const spinner = saveButton.querySelector('.button-spinner');

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

    // Desabilita o botão e mostra o spinner
    saveButton.disabled = true;
    buttonText.classList.add('hidden');
    spinner.classList.remove('hidden');
    spinner.style.display = 'inline-block';

    const totalDuration = hours * 3600 + minutes * 60 + seconds;
    const date = new Date(dateStr);

    if (!db || !userId) {
        // Reabilita o botão em caso de erro prematuro
        saveButton.disabled = false;
        buttonText.classList.remove('hidden');
        spinner.style.display = 'none';
        return;
    }
    const docRef = doc(db, `timeEntries`, id);
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
    } finally {
        // Reabilita o botão e esconde o spinner
        saveButton.disabled = false;
        buttonText.classList.remove('hidden');
        spinner.style.display = 'none';
    }
}

// Event Listeners
startButton.addEventListener('click', startTimer);
stopButton.addEventListener('click', stopTimer);
resetButton.addEventListener('click', resetTimer);
saveEditButton.addEventListener('click', saveEditedEntry);
cancelEditButton.addEventListener('click', () => editModal.classList.add('hidden'));

memberFilter.addEventListener('change', () => {
    selectedMemberId = memberFilter.value;
    currentPage = 1; // Reseta para a primeira página ao mudar o filtro
    renderCurrentPage();
});

// UI Interações
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    menuToggle.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
});

sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    menuToggle.classList.remove('active');
    sidebarOverlay.classList.remove('active');
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

showLoginModalButton.addEventListener('click', () => {
    loginModal.classList.remove('hidden');
    profileModal.classList.add('hidden');
});

showRegisterModalButton.addEventListener('click', () => {
    registerModal.classList.remove('hidden');
    profileModal.classList.add('hidden');
});

cancelLoginButton.addEventListener('click', () => {
    loginModal.classList.add('hidden');
});

cancelRegisterButton.addEventListener('click', () => {
    registerModal.classList.add('hidden');
});

forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.classList.add('hidden');
    forgotPasswordModal.classList.remove('hidden');
});

cancelForgotButton.addEventListener('click', () => {
    forgotPasswordModal.classList.add('hidden');
});

forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = forgotEmailInput.value;
    try {
        await sendPasswordResetEmail(auth, email);
        forgotPasswordModal.classList.add('hidden');
        showMessageModal("Um link para redefinição de senha foi enviado para o seu e-mail, caso ele esteja cadastrado.");
        forgotPasswordForm.reset();
    } catch (error) {
        console.error("Erro ao enviar e-mail de redefinição de senha:", error);
        // Mostra uma mensagem genérica para não revelar se um e-mail existe ou não no sistema
        showMessageModal("Se o e-mail estiver correto e cadastrado, um link de redefinição será enviado.");
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showMessageModal("Login realizado com sucesso!");
        loginForm.reset();
    } catch (error) {
        console.error("Erro no login:", error);
        showMessageModal(`Erro no login: ${error.message.replace('Firebase: ', '')}`);
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = registerForm['register-email'].value;
    const password = registerForm['register-password'].value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        registerForm.reset();
        showMessageModal("Cadastro realizado com sucesso! Um e-mail de verificação foi enviado para sua caixa de entrada.");
    } catch (error) {
        console.error("Erro no cadastro:", error);
        showMessageModal(`Erro no cadastro: ${error.message.replace('Firebase: ', '')}`);
    }
});

logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        showMessageModal("Erro ao sair. Tente novamente.");
    }
});

prevPageButton.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderCurrentPage();
    }
});

nextPageButton.addEventListener('click', () => {
    const totalPages = Math.ceil(allTimeEntries.length / pageSize);
    if (currentPage < totalPages) {
        currentPage++;
        renderCurrentPage();
    }
});
