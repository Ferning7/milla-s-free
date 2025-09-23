import firebaseConfig from './FireBase.js';
import { initThemeManager } from './theme-manager.js';
import { showMessageModal, formatDuration, updateChart, toggleButtonLoading } from './ui-helpers.js';
import { Timer } from './timer.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, orderBy, limit, startAfter, endBefore, getDocs, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

setLogLevel('warn');

let app, auth, db;
let userId;
let appId;
let pageQueryCursors = []; // Armazena o primeiro documento de cada página
let lastDocOnPage = null; // Armazena o último documento da página atual
const pageSize = 5;

let timer;
let currentPage = 1;
let allTasks = [];
let chartInstance = null;
let allProjects = {}; 
let allTimeEntries = [];
let selectedMemberId = 'all';
let membersMap = new Map();

let timerDisplay, startButton, stopButton, resetButton, projectInput, timeEntriesList,
    prevPageButton, nextPageButton, paginationControls, editModal, editEntryIdInput,
    editProjectInput, editDateInput, editHoursInput, editMinutesInput, editSecondsInput,
    saveEditButton, cancelEditButton, menuToggle, sidebar, sidebarOverlay, profileToggle,
    profileModal, userView, guestView, userEmailDisplay, logoutButton, shareToggle,
    shareModal, appIdDisplay, copyAppIdButton, closeShareModalButton, showLoginModalButton,
    showRegisterModalButton, loginModal, loginForm, loginEmailInput, loginPasswordInput,
    cancelLoginButton, registerModal, registerForm, cancelRegisterButton, messageModal,
    messageText, messageOkButton, messageCancelButton, forgotPasswordLink,
    forgotPasswordModal, forgotPasswordForm, forgotEmailInput, cancelForgotButton,
    taskSelectionModal, existingTasksList, newTaskInput, startTimerConfirmButton,
    cancelTaskSelectionButton, memberFilter;

function initUIElements() {
    timerDisplay = document.getElementById('timer-display');
    startButton = document.getElementById('start-button');
    stopButton = document.getElementById('stop-button');
    resetButton = document.getElementById('reset-button');
    projectInput = document.getElementById('project-input');
    timeEntriesList = document.getElementById('time-entries-list');
    prevPageButton = document.getElementById('prev-page-button');
    nextPageButton = document.getElementById('next-page-button');
    paginationControls = document.getElementById('pagination-controls');
    editModal = document.getElementById('edit-modal');
    editEntryIdInput = document.getElementById('edit-entry-id');
    editProjectInput = document.getElementById('edit-project-input');
    editDateInput = document.getElementById('edit-date-input');
    editHoursInput = document.getElementById('edit-hours');
    editMinutesInput = document.getElementById('edit-minutes');
    editSecondsInput = document.getElementById('edit-seconds');
    saveEditButton = document.getElementById('save-edit-button');
    cancelEditButton = document.getElementById('cancel-edit-button');
    menuToggle = document.getElementById('menu-toggle');
    sidebar = document.getElementById('sidebar');
    sidebarOverlay = document.getElementById('sidebar-overlay');
    profileToggle = document.getElementById('profile-toggle');
    profileModal = document.getElementById('profile-modal');
    userView = document.getElementById('user-view');
    guestView = document.getElementById('guest-view');
    userEmailDisplay = document.getElementById('user-email-display');
    logoutButton = document.getElementById('logout-button');
    shareToggle = document.getElementById('share-toggle');
    shareModal = document.getElementById('share-modal');
    appIdDisplay = document.getElementById('app-id-display');
    copyAppIdButton = document.getElementById('copy-app-id');
    closeShareModalButton = document.getElementById('close-share-modal');
    showLoginModalButton = document.getElementById('show-login-modal-button');
    showRegisterModalButton = document.getElementById('show-register-modal-button');
    loginModal = document.getElementById('login-modal');
    loginForm = document.getElementById('login-form');
    loginEmailInput = document.getElementById('login-email');
    loginPasswordInput = document.getElementById('login-password');
    cancelLoginButton = document.getElementById('cancel-login-button');
    registerModal = document.getElementById('register-modal');
    registerForm = document.getElementById('register-form');
    cancelRegisterButton = document.getElementById('cancel-register-button');
    messageModal = document.getElementById('message-modal');
    messageText = document.getElementById('message-text');
    messageOkButton = document.getElementById('message-ok');
    messageCancelButton = document.getElementById('message-cancel');
    forgotPasswordLink = document.getElementById('forgot-password-link');
    forgotPasswordModal = document.getElementById('forgot-password-modal');
    forgotPasswordForm = document.getElementById('forgot-password-form');
    forgotEmailInput = document.getElementById('forgot-email');
    cancelForgotButton = document.getElementById('cancel-forgot-button');
    taskSelectionModal = document.getElementById('task-selection-modal');
    existingTasksList = document.getElementById('existing-tasks-list');
    newTaskInput = document.getElementById('new-task-input');
    startTimerConfirmButton = document.getElementById('start-timer-confirm-button');
    cancelTaskSelectionButton = document.getElementById('cancel-task-selection-button');
    memberFilter = document.getElementById('member-filter');
}

async function initializeFirebase() {
    try {
        if (Object.keys(firebaseConfig).length > 0) {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);

            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    userId = user.uid;
                    console.log("Usuário autenticado:", userId);

                    userEmailDisplay.textContent = user.email || 'Usuário Anônimo';
                    guestView.classList.add('hidden');
                    userView.classList.remove('hidden');

                    appId = firebaseConfig.appId;
                    appIdDisplay.textContent = appId;

                    projectInput.disabled = false;

                    loginModal.classList.add('hidden');
                    registerModal.classList.add('hidden');
                    profileModal.classList.add('hidden');

                    fetchTimeEntriesPage('first'); // Carrega a primeira página em vez de tudo
                    setupMembersListener();
                    setupRealtimeChart();
                    setupTasksListener();
                    updateVerificationStatus(user);
                    timer = new Timer(
                        document.getElementById('timer-display'),
                        document.getElementById('start-button'),
                        document.getElementById('stop-button'),
                        document.getElementById('reset-button'),
                        document.getElementById('project-input'),
                        saveTimeEntry);
                } else {
                    userId = null;
                    console.log("Nenhum usuário logado.");

                    userView.classList.add('hidden');
                    guestView.classList.remove('hidden');

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

document.addEventListener('DOMContentLoaded', () => {
    initUIElements();
    initializeFirebase();
    initThemeManager('theme-toggle', () => chartInstance = updateChart(chartInstance, allProjects));

    if (userView) {
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
    }

    if (startButton) startButton.addEventListener('click', openTaskSelectionModal);
    if (saveEditButton) saveEditButton.addEventListener('click', saveEditedEntry);
    if (cancelEditButton) cancelEditButton.addEventListener('click', () => editModal.classList.add('hidden'));

    if (timeEntriesList) {
        timeEntriesList.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const entryId = button.dataset.id;

            if (button.classList.contains('edit-button')) {
                openEditModal(entryId);
            } else if (button.classList.contains('delete-button')) {
                const confirmed = await showMessageModal("Tem certeza que deseja excluir esta entrada de tempo?", 'confirm');
                if (confirmed) {
                    deleteTimeEntry(entryId);
                }
            } else if (button.classList.contains('approve-button')) {
                await updateDoc(doc(db, "timeEntries", entryId), { status: 'approved' });
                showMessageModal("Entrada de tempo aprovada com sucesso.");
            } else if (button.classList.contains('reject-button')) {
                const confirmed = await showMessageModal("Tem certeza que deseja rejeitar e excluir esta entrada de tempo?", 'confirm');
                if (confirmed) deleteTimeEntry(entryId);
            }
        });
    }

    if (memberFilter) {
        memberFilter.addEventListener('change', () => {
            selectedMemberId = memberFilter.value;
            currentPage = 1;
            renderCurrentPage();
        });
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

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            menuToggle.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            menuToggle.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }

    if (profileToggle) {
        profileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            profileModal.classList.toggle('hidden');
        });
    }

    // Listener global no documento para fechar o modal de perfil
    document.addEventListener('click', (e) => {
        if (profileModal && !profileModal.contains(e.target) && profileToggle && !profileToggle.contains(e.target)) {
            profileModal.classList.add('hidden');
        }
    });

    if (shareToggle) shareToggle.addEventListener('click', () => shareModal.classList.remove('hidden'));
    if (closeShareModalButton) closeShareModalButton.addEventListener('click', () => shareModal.classList.add('hidden'));

    if (copyAppIdButton) {
        copyAppIdButton.addEventListener('click', async () => {
            const appIdText = appIdDisplay.textContent;
            try {
                await navigator.clipboard.writeText(appIdText);
                showMessageModal("ID do aplicativo copiado!");
            } catch (err) {
                console.error('Erro ao copiar ID: ', err);
                showMessageModal('Não foi possível copiar o ID.');
            }
        });
    }

    if (showLoginModalButton) {
        showLoginModalButton.addEventListener('click', () => {
            loginModal.classList.remove('hidden');
            if (profileModal) profileModal.classList.add('hidden');
        });
    }

    if (showRegisterModalButton) {
        showRegisterModalButton.addEventListener('click', () => {
            registerModal.classList.remove('hidden');
            if (profileModal) profileModal.classList.add('hidden');
        });
    }

    if (cancelLoginButton) cancelLoginButton.addEventListener('click', () => loginModal.classList.add('hidden'));
    if (cancelRegisterButton) cancelRegisterButton.addEventListener('click', () => registerModal.classList.add('hidden'));

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginModal.classList.add('hidden');
            forgotPasswordModal.classList.remove('hidden');
        });
    }

    if (cancelForgotButton) cancelForgotButton.addEventListener('click', () => forgotPasswordModal.classList.add('hidden'));

    if (forgotPasswordForm) {
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
                showMessageModal("Se o e-mail estiver correto e cadastrado, um link de redefinição será enviado.");
            }
        });
    }

    if (loginForm) {
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
    }

    if (registerForm) {
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
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await signOut(auth);
            } catch (error) {
                console.error("Erro ao fazer logout:", error);
                showMessageModal("Erro ao sair. Tente novamente.");
            }
        });
    }

    if (prevPageButton) {
        prevPageButton.addEventListener('click', () => {
            fetchTimeEntriesPage('prev');
        });
    }

    if (nextPageButton) {
        nextPageButton.addEventListener('click', () => {
            fetchTimeEntriesPage('next');
        });
    }
});

function disableAppFeatures() {
    timer?.reset();
    projectInput.disabled = true;
    startButton.disabled = true;
    stopButton.disabled = true;
    resetButton.disabled = true;
    timeEntriesList.innerHTML = '<p class="text-center text-gray-500">Faça login para ver suas entradas de tempo.</p>';
    const placeholder = document.createElement('p');
    placeholder.className = 'text-center text-gray-500';
    placeholder.textContent = 'Faça login para ver suas entradas de tempo.';
    timeEntriesList.innerHTML = '';
    timeEntriesList.appendChild(placeholder);
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
    paginationControls.classList.add('hidden');
}

function updateVerificationStatus(user) {
    const verificationStatusEl = document.getElementById('verification-status');
    if (!verificationStatusEl) return;

    verificationStatusEl.innerHTML = '';
    if (user.emailVerified) {
        const verifiedSpan = document.createElement('span');
        verifiedSpan.className = 'text-green-500 flex items-center gap-1';
        const icon = document.createElement('i');
        icon.className = 'fas fa-check-circle';
        verifiedSpan.append(icon, ' E-mail verificado');
        verificationStatusEl.appendChild(verifiedSpan);
    } else {
        const containerDiv = document.createElement('div');
        containerDiv.className = 'flex items-center justify-between';
        const unverifiedSpan = document.createElement('span');
        unverifiedSpan.className = 'text-yellow-500 flex items-center gap-1';
        const icon = document.createElement('i');
        icon.className = 'fas fa-exclamation-triangle';
        unverifiedSpan.append(icon, ' E-mail não verificado');
        const resendButton = document.createElement('button');
        resendButton.id = 'resend-verification-button';
        resendButton.className = 'text-xs text-blue-500 hover:underline ml-2';
        resendButton.textContent = 'Reenviar';
        containerDiv.append(unverifiedSpan, resendButton);
        verificationStatusEl.appendChild(containerDiv);
    }
}

async function openTaskSelectionModal() {
    if (timer && timer.isRunning) {
        showMessageModal("O rastreador já está em andamento.");
        return;
    }
    populateTaskSelectionModal(allTasks);
    taskSelectionModal.classList.remove('hidden');
}

function populateTaskSelectionModal(tasks) {
    existingTasksList.innerHTML = '';
    newTaskInput.value = '';
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
    if (!db || !userId) {
        console.error("Firestore ou userId não estão inicializados.");
        return;
    }
    const durationInSeconds = Math.floor(duration / 1000);
    try {
        await addDoc(collection(db, "timeEntries"), {
            projectName: projectName,
            duration: durationInSeconds,
            timestamp: new Date(),
            companyId: userId,
            memberId: null,
            status: 'approved'
        });
        console.log("Entrada de tempo salva com sucesso.");
    } catch (e) {
        console.error("Erro ao adicionar documento: ", e);
        showMessageModal("Erro ao salvar a entrada de tempo. Tente novamente.");
    }
}

function renderTimeEntries(entries, membersMap) {
    timeEntriesList.innerHTML = '';
    entries.forEach(entry => {
        const entryElement = document.createElement('div');
        entryElement.className = 'flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm';

        const memberName = entry.memberId ? (membersMap.get(entry.memberId) || 'Colaborador Desconhecido') : 'Empresa';
        const isPending = entry.status === 'pending';

        const infoDiv = document.createElement('div');
        const projectP = document.createElement('p');
        projectP.className = 'font-bold';
        projectP.textContent = entry.projectName;

        if (isPending) {
            const statusBadge = document.createElement('span');
            statusBadge.className = 'ml-2 text-xs font-semibold bg-yellow-500 text-white px-2 py-1 rounded-full';
            statusBadge.textContent = 'Pendente';
            projectP.appendChild(statusBadge);
        }

        const detailsP = document.createElement('p');
        detailsP.className = 'text-sm text-gray-500 dark:text-gray-400';
        detailsP.textContent = `${new Date(entry.timestamp.seconds * 1000).toLocaleDateString()} - Duração: ${formatDuration(entry.duration)} `;

        const memberSpan = document.createElement('span');
        memberSpan.className = 'font-semibold text-blue-400';
        memberSpan.textContent = `(${memberName})`;
        detailsP.appendChild(memberSpan);

        infoDiv.append(projectP, detailsP);

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'flex space-x-2';

        let approveButton, rejectButton;

        const createIconButton = (title, classes, iconClasses) => {
            const button = document.createElement('button');
            button.className = classes;
            button.dataset.id = entry.id;
            button.title = title;
            const icon = document.createElement('i');
            icon.className = iconClasses + ' pointer-events-none';
            button.appendChild(icon);
            return button;
        };

        if (isPending) {
            approveButton = createIconButton('Aprovar', 'approve-button text-green-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors', 'fas fa-check-circle');
            rejectButton = createIconButton('Rejeitar', 'reject-button text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors', 'fas fa-times-circle');
            buttonsDiv.append(approveButton, rejectButton);
        }

        const editButton = createIconButton('Editar', 'edit-button text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors', 'fas fa-edit');
        const deleteButton = createIconButton('Excluir', 'delete-button text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors', 'fas fa-trash');

        buttonsDiv.append(editButton, deleteButton);
        entryElement.append(infoDiv, buttonsDiv);

        timeEntriesList.appendChild(entryElement);
    });
}

function populateMemberFilter(membersMap) {
    const currentFilterValue = memberFilter.value;
    memberFilter.innerHTML = '';

    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'Todos os Colaboradores';
    memberFilter.appendChild(allOption);

    const companyOption = document.createElement('option');
    companyOption.value = 'company';
    companyOption.textContent = 'Apenas Empresa';
    memberFilter.appendChild(companyOption);

    membersMap.forEach((name, id) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = name;
        memberFilter.appendChild(option);
    });
    memberFilter.value = currentFilterValue;
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
        const p = document.createElement('p');
        p.className = 'text-center text-gray-500';
        p.textContent = 'Nenhuma entrada de tempo encontrada.';
        timeEntriesList.innerHTML = '';
        timeEntriesList.appendChild(p); // Corrigido para adicionar o parágrafo
        paginationControls.classList.add('hidden');
        return;
    }
    
    const totalPages = Math.ceil(totalEntries / pageSize);

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    if (currentPage < 1) {
        currentPage = 1;
    }

    // Com a paginação no servidor, allTimeEntries já contém apenas os itens da página.
    renderTimeEntries(filteredEntries, membersMap);

    // A lógica de visibilidade dos botões agora depende dos cursores.
    paginationControls.classList.remove('hidden');
    prevPageButton.disabled = currentPage === 1;
    // Desabilita 'next' se a página atual tiver menos itens que o tamanho da página.
    nextPageButton.disabled = filteredEntries.length < pageSize;
}

async function fetchTimeEntriesPage(direction) {
    if (!db || !userId) {
        console.error("Firestore não está pronto para o listener.");
        return;
    }

    let q;
    const baseQuery = [
        collection(db, 'timeEntries'),
        where("companyId", "==", userId),
        orderBy("timestamp", "desc")
    ];

    if (direction === 'first') {
        currentPage = 1;
        pageQueryCursors = [null]; // O cursor da primeira página é nulo
        q = query(...baseQuery, limit(pageSize));
    } else if (direction === 'next' && lastDocOnPage) {
        currentPage++;
        pageQueryCursors[currentPage - 1] = lastDocOnPage;
        q = query(...baseQuery, startAfter(lastDocOnPage), limit(pageSize));
    } else if (direction === 'prev' && currentPage > 1) {
        currentPage--;
        const prevPageCursor = pageQueryCursors[currentPage - 1];
        q = query(...baseQuery, startAfter(prevPageCursor), limit(pageSize));
    } else {
        return; // Não faz nada se não houver direção válida
    }

    try {
        const documentSnapshots = await getDocs(q);

        // Se estamos voltando e a página está vazia, pode ser um bug, então recarregamos a primeira.
        if (documentSnapshots.empty && direction === 'prev') {
            fetchTimeEntriesPage('first');
            return;
        }

        // Atualiza os cursores para a próxima navegação
        lastDocOnPage = documentSnapshots.docs[documentSnapshots.docs.length - 1];

        allTimeEntries = [];
        documentSnapshots.forEach(doc => {
            allTimeEntries.push({ id: doc.id, ...doc.data() });
        });

        renderCurrentPage();
    } catch (error) {
        console.error("Erro ao buscar página de entradas de tempo:", error);
        showMessageModal("Não foi possível carregar as entradas de tempo.");
    }
}

async function setupTimeEntriesListener() {
    // Esta função foi substituída por fetchTimeEntriesPage para implementar
    // a paginação no lado do servidor e melhorar drasticamente a performance.
    // A carga inicial agora é feita em initializeFirebase.
}

function setupMembersListener() {
    if (!db || !userId) return;
    const q = query(collection(db, 'members'), where('companyId', '==', userId));
    onSnapshot(q, (snapshot) => {
        const currentFilterValue = memberFilter.value;
        membersMap.clear();
        snapshot.forEach(doc => {
            membersMap.set(doc.id, doc.data().name);
        });
        populateMemberFilter(membersMap);
        memberFilter.value = currentFilterValue;

        // Re-render a página atual, pois os nomes dos membros podem ter mudado
        renderCurrentPage();
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
        chartInstance = updateChart(chartInstance, allProjects);
    }, (error) => {
        console.error("Erro no onSnapshot para o gráfico:", error);
    });
}

async function setupTasksListener() {
    if (!db || !userId) return;

    const q = query(collection(db, "tasks"), where("companyId", "==", userId), orderBy("name"));
    onSnapshot(q, (snapshot) => {
        allTasks = [];
        snapshot.forEach(doc => {
            allTasks.push({ id: doc.id, ...doc.data() });
        });
    });
}

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
    const id = editEntryIdInput.value;
    const projectName = editProjectInput.value.trim();
    const dateStr = editDateInput.value;

    if (!projectName || !dateStr) {
        showMessageModal("O nome do projeto e a data são obrigatórios.");
        return;
    }

    toggleButtonLoading(saveEditButton, true);

    try {
        if (!db || !userId) {
            showMessageModal("Erro de autenticação. Por favor, faça login novamente.");
            return; // O finally vai rodar e desativar o loading.
        }

        const hours = parseInt(editHoursInput.value) || 0;
        const minutes = parseInt(editMinutesInput.value) || 0;
        const seconds = parseInt(editSecondsInput.value) || 0;
        const totalDuration = hours * 3600 + minutes * 60 + seconds;

        // Analisa a string de data (YYYY-MM-DD) para criar um objeto Date
        // na meia-noite do fuso horário local do usuário, evitando problemas de fuso horário
        // que podem fazer a data pular para o dia anterior.
        const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
        const date = new Date(year, month - 1, day);

        const docRef = doc(db, `timeEntries`, id);
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
        toggleButtonLoading(saveEditButton, false);
    }
}
