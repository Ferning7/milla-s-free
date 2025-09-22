import firebaseConfig from './FireBase.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, doc, deleteDoc, setLogLevel, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Ativar logging para depuração
setLogLevel('debug');

// Aplica o tema salvo no localStorage ao carregar a página
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark');
} else {
    document.body.classList.remove('dark'); // Garante que o padrão seja claro
}

// Variáveis globais
let app, auth, db;
let userId;
let allMembers = []; // Armazena a lista completa de colaboradores
let allTasks = []; // Armazena a lista completa de tarefas
let membersCurrentPage = 1;
const membersPageSize = 5;

// Elementos da UI
const companyEmailDisplay = document.getElementById('company-email-display');
const addMemberButton = document.getElementById('add-member-button');
const membersList = document.getElementById('members-list');
const createMemberModal = document.getElementById('create-member-modal');
const createMemberForm = document.getElementById('create-member-form');
const cancelCreateMemberButton = document.getElementById('cancel-create-member-button');
const messageModal = document.getElementById('message-modal');
const messageText = document.getElementById('message-text');
const messageOkButton = document.getElementById('message-ok');
const messageCancelButton = document.getElementById('message-cancel');

const editMemberModal = document.getElementById('edit-member-modal');
const editMemberForm = document.getElementById('edit-member-form');
const cancelEditMemberButton = document.getElementById('cancel-edit-member-button');
const saveEditMemberButton = document.getElementById('save-edit-member-button');
const editMemberIdInput = document.getElementById('edit-member-id');
const editMemberNameInput = document.getElementById('edit-member-name');
const editMemberEmailInput = document.getElementById('edit-member-email');
const themeToggle = document.getElementById('theme-toggle');
const searchMemberInput = document.getElementById('search-member-input');
const membersPaginationControls = document.getElementById('members-pagination-controls');
const prevMembersPageButton = document.getElementById('prev-members-page-button');
const nextMembersPageButton = document.getElementById('next-members-page-button');

const addTaskForm = document.getElementById('add-task-form');
const newTaskNameInput = document.getElementById('new-task-name');
const tasksList = document.getElementById('tasks-list');

const editTaskModal = document.getElementById('edit-task-modal');
const editTaskForm = document.getElementById('edit-task-form');
const cancelEditTaskButton = document.getElementById('cancel-edit-task-button');
const saveEditTaskButton = document.getElementById('save-edit-task-button');
const editTaskIdInput = document.getElementById('edit-task-id');
const editTaskNameInput = document.getElementById('edit-task-name');

// Funções de UI
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

messageOkButton.addEventListener('click', () => messageModal.classList.add('hidden'));

addMemberButton.addEventListener('click', () => createMemberModal.classList.remove('hidden'));
cancelCreateMemberButton.addEventListener('click', () => createMemberModal.classList.add('hidden'));

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const currentTheme = document.body.classList.contains('dark') ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
});

addTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const taskName = newTaskNameInput.value.trim();
    if (taskName && userId) {
        // Validação para impedir tarefas duplicadas (case-insensitive)
        const isDuplicate = allTasks.some(task => task.name.toLowerCase() === taskName.toLowerCase());
        if (isDuplicate) {
            showMessageModal(`A tarefa "${taskName}" já existe.`);
            return;
        }

        try {
            await addDoc(collection(db, "tasks"), {
                name: taskName,
                companyId: userId,
                createdAt: new Date()
            });
        } catch (error) {
            console.error("Erro ao adicionar tarefa:", error);
            showMessageModal("Não foi possível adicionar a tarefa.");
        } finally {
            newTaskNameInput.value = '';
        }
    }
});

// Inicialização
async function initializeDashboard() {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    onAuthStateChanged(auth, (user) => {
        if (user) {
            userId = user.uid;
            companyEmailDisplay.textContent = `Logado como: ${user.email}`;
            setupMembersListener();
            setupTasksListener();
        } else {
            // Se não estiver logado, redireciona para a página inicial
            window.location.href = 'index.html';
        }
    });
}

function renderMembers() {
    const searchTerm = searchMemberInput.value.toLowerCase();
    const filteredMembers = allMembers.filter(member =>
        member.name.toLowerCase().includes(searchTerm) ||
        member.email.toLowerCase().includes(searchTerm)
    );

    membersList.innerHTML = '';

    if (filteredMembers.length === 0) {
        if (searchTerm) {
            membersList.innerHTML = `<p class="text-center text-gray-500">Nenhum colaborador encontrado para "${searchTerm}".</p>`;
        } else {
            membersList.innerHTML = '<p class="text-center text-gray-500">Nenhum colaborador cadastrado.</p>';
        }
        membersPaginationControls.classList.add('hidden');
        return;
    }

    const totalPages = Math.ceil(filteredMembers.length / membersPageSize);
    if (membersCurrentPage > totalPages) {
        membersCurrentPage = totalPages;
    }
    if (membersCurrentPage < 1) {
        membersCurrentPage = 1;
    }

    const startIndex = (membersCurrentPage - 1) * membersPageSize;
    const pageMembers = filteredMembers.slice(startIndex, startIndex + membersPageSize);

    pageMembers.forEach(member => {
        const memberElement = document.createElement('div');
        memberElement.className = 'bg-white dark:bg-gray-800 p-4 rounded-lg flex justify-between items-center';
        memberElement.innerHTML = `
            <div>
                <p class="font-bold text-lg">${member.name}</p>
                <p class="text-sm text-gray-400">${member.email}</p>
            </div>
            <div class="flex items-center gap-4">
                <div class="relative">
                    <input type="text" readonly value="${member.loginToken}" class="token-input bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-xs w-48 font-mono select-all">
                </div>
                <button class="copy-token-button px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm" data-token="${member.loginToken}">Copiar</button>
                <button title="Editar Colaborador" class="edit-member-button text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors" data-id="${member.id}" data-name="${member.name}" data-email="${member.email}"><i class="fas fa-edit"></i></button>
                <button title="Gerar Novo Token" class="regenerate-token-button text-yellow-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors" data-id="${member.id}" data-name="${member.name || 'este colaborador'}"><i class="fas fa-sync-alt"></i></button>
                <button title="Excluir Colaborador" class="delete-member-button text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors" data-id="${member.id}" data-name="${member.name || 'este colaborador'}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        membersList.appendChild(memberElement);
    });

    // Atualiza os controles de paginação
    membersPaginationControls.classList.toggle('hidden', filteredMembers.length <= membersPageSize);
    prevMembersPageButton.disabled = membersCurrentPage === 1;
    nextMembersPageButton.disabled = membersCurrentPage >= totalPages;
}

// Listener para a lista de colaboradores
function setupMembersListener() {
    if (!db || !userId) {
        console.error("DB ou UserID não disponível para setupMembersListener.");
        return;
    }

    console.log(`Configurando listener para companyId: ${userId}`);
    membersList.innerHTML = '<p class="text-center text-gray-500">Carregando colaboradores...</p>';

    const q = query(collection(db, "members"), where("companyId", "==", userId));

    onSnapshot(q, (snapshot) => {
        console.log(`Snapshot recebido, encontrados ${snapshot.size} documentos.`);
        allMembers = [];
        snapshot.forEach(doc => {
            allMembers.push({ id: doc.id, ...doc.data() });
        });
        // Ordena a lista de membros por nome
        allMembers.sort((a, b) => a.name.localeCompare(b.name));
        renderMembers(); // Renderiza a lista (filtrada ou não)
    }, (error) => {
        console.error("Erro ao buscar colaboradores:", error);
        membersList.innerHTML = '<p class="text-center text-red-500">Erro ao carregar colaboradores. Verifique o console para mais detalhes.</p>';
        showMessageModal("Ocorreu um erro ao buscar os colaboradores. Verifique se as regras de segurança do Firestore permitem a leitura da coleção 'members'.");
    });
}

// Listener para a lista de tarefas
function setupTasksListener() {
    if (!db || !userId) return;

    const q = query(collection(db, "tasks"), where("companyId", "==", userId), orderBy("name"));

    onSnapshot(q, (snapshot) => {
        tasksList.innerHTML = '';
        allTasks = []; // Limpa a lista antes de preencher
        if (snapshot.empty) {
            tasksList.innerHTML = '<p class="text-center text-gray-500 text-sm">Nenhuma tarefa pré-definida.</p>';
            return;
        }
        snapshot.forEach(doc => {
            const task = doc.data();
            allTasks.push({ id: doc.id, ...task });
            const taskElement = document.createElement('div');
            taskElement.className = 'bg-white dark:bg-gray-800 p-3 rounded-lg flex justify-between items-center';
            taskElement.innerHTML = `
                <span>${task.name}</span>
                <div class="flex items-center gap-2">
                    <button title="Editar Tarefa" class="edit-task-button text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors" data-id="${doc.id}" data-name="${task.name}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button title="Excluir Tarefa" class="delete-task-button text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors" data-id="${doc.id}" data-name="${task.name}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            tasksList.appendChild(taskElement);
        });
    }, (error) => {
        console.error("Erro ao buscar tarefas:", error);
        tasksList.innerHTML = '<p class="text-center text-red-500">Erro ao carregar tarefas.</p>';
    });
}

// Lógica para adicionar colaborador
createMemberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!userId) {
        showMessageModal("Erro de autenticação. Por favor, faça login novamente.");
        return;
    }

    const submitButton = document.getElementById('submit-create-member');
    const buttonText = submitButton.querySelector('.button-text');
    const spinner = submitButton.querySelector('.button-spinner');

    submitButton.disabled = true;
    buttonText.classList.add('hidden');
    spinner.classList.remove('hidden');
    spinner.style.display = 'inline-block';

    const memberName = createMemberForm['member-name'].value;
    const memberEmail = createMemberForm['member-email'].value;

    // Gera um token "vitalício" simples e aleatório
    const loginToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

    try {
        await addDoc(collection(db, "members"), {
            name: memberName,
            email: memberEmail,
            companyId: userId,
            loginToken: loginToken,
            createdAt: new Date()
        });

        createMemberModal.classList.add('hidden');
        createMemberForm.reset();
        showMessageModal(`Colaborador adicionado! O token de acesso é: ${loginToken}. Copie e envie para o colaborador.`);
    } catch (error) {
        console.error("Erro ao adicionar colaborador:", error);
        showMessageModal("Erro ao adicionar colaborador. Tente novamente.");
    } finally {
        submitButton.disabled = false;
        buttonText.classList.remove('hidden');
        spinner.style.display = 'none';
    }
});

// Lógica para copiar token
membersList.addEventListener('click', async (e) => {
    const button = e.target.closest('button');
    if (!button) return;

    if (button.classList.contains('copy-token-button')) {
        const token = button.dataset.token;
        navigator.clipboard.writeText(token).then(() => {
            showMessageModal('Token copiado para a área de transferência!');
            // Adiciona feedback visual no campo do token
            const tokenInput = button.previousElementSibling.querySelector('.token-input');
            if (tokenInput) {
                tokenInput.classList.add('token-copied-glow');
                setTimeout(() => {
                    tokenInput.classList.remove('token-copied-glow');
                }, 1500); // O brilho dura 1.5 segundos
            }
        }).catch(err => {
            console.error('Erro ao copiar token: ', err);
            showMessageModal('Não foi possível copiar o token.');
        });
    }
    
    if (button.classList.contains('delete-member-button')) {
        const memberId = button.dataset.id;
        const memberName = button.dataset.name;
        const confirmed = await showMessageModal(`Tem certeza que deseja excluir o colaborador "${memberName}"? Esta ação não pode ser desfeita.`, 'confirm');
        if (confirmed) {
            deleteDoc(doc(db, "members", memberId)).then(() => {
                showMessageModal("Colaborador excluído com sucesso.");
            }).catch(err => showMessageModal("Erro ao excluir colaborador."));
        }
    }
    
    if (button.classList.contains('regenerate-token-button')) {
        const memberId = button.dataset.id;
        const memberName = button.dataset.name;
        const confirmed = await showMessageModal(`Tem certeza que deseja gerar um novo token para "${memberName}"? O token antigo deixará de funcionar.`, 'confirm');
        if (confirmed) {
            const newLoginToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
            const memberDocRef = doc(db, "members", memberId);
            try {
                await updateDoc(memberDocRef, { loginToken: newLoginToken });
                showMessageModal(`Novo token gerado para ${memberName}. O novo token já está visível na lista.`);
            } catch (error) {
                console.error("Erro ao gerar novo token:", error);
                showMessageModal("Erro ao gerar novo token. Tente novamente.");
            }
        }
    }

    if (button.classList.contains('edit-member-button')) {
        const memberId = button.dataset.id;
        const memberName = button.dataset.name;
        const memberEmail = button.dataset.email;

        editMemberIdInput.value = memberId;
        editMemberNameInput.value = memberName;
        editMemberEmailInput.value = memberEmail;

        editMemberModal.classList.remove('hidden');
    }
});

editMemberForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const memberId = editMemberIdInput.value;
    const newName = editMemberNameInput.value.trim();
    const newEmail = editMemberEmailInput.value.trim();

    if (!memberId || !newName || !newEmail) {
        showMessageModal("Todos os campos são obrigatórios.");
        return;
    }

    const buttonText = saveEditMemberButton.querySelector('.button-text');
    const spinner = saveEditMemberButton.querySelector('.button-spinner');

    saveEditMemberButton.disabled = true;
    buttonText.classList.add('hidden');
    spinner.classList.remove('hidden');
    spinner.style.display = 'inline-block';

    const memberDocRef = doc(db, "members", memberId);

    try {
        await updateDoc(memberDocRef, { name: newName, email: newEmail });
        editMemberModal.classList.add('hidden');
        showMessageModal("Informações do colaborador atualizadas com sucesso.");
    } catch (error) {
        console.error("Erro ao atualizar colaborador:", error);
        showMessageModal("Erro ao atualizar informações. Tente novamente.");
    } finally {
        saveEditMemberButton.disabled = false;
        buttonText.classList.remove('hidden');
        spinner.style.display = 'none';
    }
});

cancelEditMemberButton.addEventListener('click', () => {
    editMemberModal.classList.add('hidden');
});

tasksList.addEventListener('click', async (e) => {
    const button = e.target.closest('button');
    if (!button) return;

    // Handle Edit Task
    if (button.classList.contains('edit-task-button')) {
        const taskId = button.dataset.id;
        const taskName = button.dataset.name;

        editTaskIdInput.value = taskId;
        editTaskNameInput.value = taskName;

        editTaskModal.classList.remove('hidden');
    }

    // Handle Delete Task
    if (button.classList.contains('delete-task-button')) {
        const taskId = button.dataset.id;
        const taskName = button.dataset.name;
        const confirmed = await showMessageModal(`Tem certeza que deseja excluir a tarefa "${taskName}"?`, 'confirm');
        if (confirmed) {
            await deleteDoc(doc(db, "tasks", taskId));
            showMessageModal("Tarefa excluída com sucesso.");
        }
    }
});

cancelEditTaskButton.addEventListener('click', () => {
    editTaskModal.classList.add('hidden');
});

editTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const taskId = editTaskIdInput.value;
    const newName = editTaskNameInput.value.trim();

    if (!newName) {
        showMessageModal("O nome da tarefa não pode ser vazio.");
        return;
    }

    // Validação para impedir tarefas duplicadas (case-insensitive), ignorando a própria tarefa
    const isDuplicate = allTasks.some(task =>
        task.name.toLowerCase() === newName.toLowerCase() && task.id !== taskId
    );

    if (isDuplicate) {
        showMessageModal(`A tarefa "${newName}" já existe.`);
        return;
    }

    const buttonText = saveEditTaskButton.querySelector('.button-text');
    const spinner = saveEditTaskButton.querySelector('.button-spinner');

    saveEditTaskButton.disabled = true;
    buttonText.classList.add('hidden');
    spinner.classList.remove('hidden');
    spinner.style.display = 'inline-block';

    const taskDocRef = doc(db, "tasks", taskId);

    try {
        await updateDoc(taskDocRef, { name: newName });
        editTaskModal.classList.add('hidden');
        showMessageModal("Tarefa atualizada com sucesso.");
    } catch (error) {
        console.error("Erro ao atualizar tarefa:", error);
        showMessageModal("Erro ao atualizar a tarefa. Tente novamente.");
    } finally {
        saveEditTaskButton.disabled = false;
        buttonText.classList.remove('hidden');
        spinner.style.display = 'none';
    }
});

searchMemberInput.addEventListener('input', () => {
    membersCurrentPage = 1;
    renderMembers();
});

prevMembersPageButton.addEventListener('click', () => {
    if (membersCurrentPage > 1) {
        membersCurrentPage--;
        renderMembers();
    }
});

nextMembersPageButton.addEventListener('click', () => {
    const searchTerm = searchMemberInput.value.toLowerCase();
    const filteredMembers = allMembers.filter(member =>
        member.name.toLowerCase().includes(searchTerm) ||
        member.email.toLowerCase().includes(searchTerm)
    );
    const totalPages = Math.ceil(filteredMembers.length / membersPageSize);

    if (membersCurrentPage < totalPages) {
        membersCurrentPage++;
        renderMembers();
    }
});

// Iniciar a página
document.addEventListener('DOMContentLoaded', initializeDashboard);