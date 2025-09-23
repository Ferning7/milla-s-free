import firebaseConfig from './FireBase.js';
import { initThemeManager } from './theme-manager.js';
import { showMessageModal, toggleButtonLoading } from './ui-helpers.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, doc, deleteDoc, setLogLevel, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

setLogLevel('warn');

let app, auth, db;
let userId;
let allMembers = [];
let allTasks = [];
let membersCurrentPage = 1;
const membersPageSize = 5;
 
let companyEmailDisplay, addMemberButton, membersList, createMemberModal, createMemberForm, cancelCreateMemberButton,
    editMemberModal, editMemberForm, cancelEditMemberButton, saveEditMemberButton, editMemberIdInput, editMemberNameInput,
    editMemberEmailInput, themeToggle, searchMemberInput, membersPaginationControls, prevMembersPageButton, nextMembersPageButton,
    addTaskForm, newTaskNameInput, tasksList, editTaskModal, editTaskForm, cancelEditTaskButton, saveEditTaskButton,
    editTaskIdInput, editTaskNameInput;
 
function initUIElements() {
    companyEmailDisplay = document.getElementById('company-email-display');
    addMemberButton = document.getElementById('add-member-button');
    membersList = document.getElementById('members-list');
    createMemberModal = document.getElementById('create-member-modal');
    createMemberForm = document.getElementById('create-member-form');
    cancelCreateMemberButton = document.getElementById('cancel-create-member-button');
    editMemberModal = document.getElementById('edit-member-modal');
    editMemberForm = document.getElementById('edit-member-form');
    cancelEditMemberButton = document.getElementById('cancel-edit-member-button');
    saveEditMemberButton = document.getElementById('save-edit-member-button');
    editMemberIdInput = document.getElementById('edit-member-id');
    editMemberNameInput = document.getElementById('edit-member-name');
    editMemberEmailInput = document.getElementById('edit-member-email');
    themeToggle = document.getElementById('theme-toggle');
    searchMemberInput = document.getElementById('search-member-input');
    membersPaginationControls = document.getElementById('members-pagination-controls');
    prevMembersPageButton = document.getElementById('prev-members-page-button');
    nextMembersPageButton = document.getElementById('next-members-page-button');
    addTaskForm = document.getElementById('add-task-form');
    newTaskNameInput = document.getElementById('new-task-name');
    tasksList = document.getElementById('tasks-list');
    editTaskModal = document.getElementById('edit-task-modal');
    editTaskForm = document.getElementById('edit-task-form');
    cancelEditTaskButton = document.getElementById('cancel-edit-task-button');
    saveEditTaskButton = document.getElementById('save-edit-task-button');
    editTaskIdInput = document.getElementById('edit-task-id');
    editTaskNameInput = document.getElementById('edit-task-name');
}

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
            window.location.href = '../index.html';
        }
    });
}

function createMemberHTML(member) {
    // Função auxiliar para escapar HTML e prevenir XSS, caso os nomes contenham caracteres especiais.
    const sanitize = (str) => {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    };

    return `
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg flex justify-between items-center">
            <div>
                <p class="font-bold text-lg">${sanitize(member.name)}</p>
                <p class="text-sm text-gray-400">${sanitize(member.email)}</p>
            </div>
            <div class="flex items-center gap-4">
                <div class="relative">
                    <input type="text" readonly value="${sanitize(member.loginToken)}" class="token-input bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-xs w-48 font-mono select-all">
                </div>
                <button class="copy-token-button px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm" data-token="${sanitize(member.loginToken)}">
                    Copiar
                </button>
                <button title="Editar Colaborador" class="edit-member-button text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors" data-id="${member.id}" data-name="${sanitize(member.name)}" data-email="${sanitize(member.email)}">
                    <i class="fas fa-edit"></i>
                </button>
                <button title="Gerar Novo Token" class="regenerate-token-button text-yellow-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors" data-id="${member.id}" data-name="${sanitize(member.name || 'este colaborador')}">
                    <i class="fas fa-sync-alt"></i>
                </button>
                <button title="Excluir Colaborador" class="delete-member-button text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors" data-id="${member.id}" data-name="${sanitize(member.name || 'este colaborador')}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

function renderMembers() {
    const searchTerm = searchMemberInput.value.toLowerCase();
    const filteredMembers = allMembers.filter(member =>
        member.name.toLowerCase().includes(searchTerm) ||
        member.email.toLowerCase().includes(searchTerm)
    );

    membersList.innerHTML = '';

    const setPlaceholder = (element, message) => {
        element.innerHTML = '';
        const p = document.createElement('p');
        p.className = 'text-center text-gray-500';
        p.textContent = message;
        element.appendChild(p);
    };

    if (filteredMembers.length === 0) {
        if (searchTerm) {
            setPlaceholder(membersList, `Nenhum colaborador encontrado para "${searchTerm}".`);
        } else {
            setPlaceholder(membersList, 'Nenhum colaborador cadastrado.');
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

    membersList.innerHTML = pageMembers.map(createMemberHTML).join('');

    membersPaginationControls.classList.toggle('hidden', filteredMembers.length <= membersPageSize);
    prevMembersPageButton.disabled = membersCurrentPage === 1;
    nextMembersPageButton.disabled = membersCurrentPage >= totalPages;
}

function setupMembersListener() {
    if (!db || !userId) {
        console.error("DB ou UserID não disponível para setupMembersListener.");
        return;
    }

    console.log(`Configurando listener para companyId: ${userId}`);
    
    const loadingP = document.createElement('p');
    loadingP.className = 'text-center text-gray-500';
    loadingP.textContent = 'Carregando colaboradores...';
    membersList.innerHTML = '';
    membersList.appendChild(loadingP);

    const q = query(collection(db, "members"), where("companyId", "==", userId));

    onSnapshot(q, (snapshot) => {
        console.log(`Snapshot recebido, encontrados ${snapshot.size} documentos.`);
        allMembers = [];
        snapshot.forEach(doc => {
            allMembers.push({ id: doc.id, ...doc.data() });
        });
        allMembers.sort((a, b) => a.name.localeCompare(b.name));
        renderMembers();
    }, (error) => {
        console.error("Erro ao buscar colaboradores:", error);
        const errorP = document.createElement('p');
        errorP.className = 'text-center text-red-500';
        errorP.textContent = 'Erro ao carregar colaboradores. Verifique o console para mais detalhes.';
        membersList.innerHTML = '';
        membersList.appendChild(errorP);
        showMessageModal("Ocorreu um erro ao buscar os colaboradores. Verifique se as regras de segurança do Firestore permitem a leitura da coleção 'members'.");
    });
}

function setupTasksListener() {
    if (!db || !userId) return;

    const q = query(collection(db, "tasks"), where("companyId", "==", userId), orderBy("name"));

    onSnapshot(q, (snapshot) => {
        console.log(`[setupTasksListener] Snapshot recebido para tarefas. Total: ${snapshot.size} tarefas.`);
        tasksList.innerHTML = '';
        allTasks = [];
        if (snapshot.empty) {
            const p = document.createElement('p');
            p.className = 'text-center text-gray-500 text-sm';
            p.textContent = 'Nenhuma tarefa pré-definida.';
            tasksList.innerHTML = '';
            tasksList.appendChild(p);
            console.log("[setupTasksListener] Nenhuma tarefa encontrada para esta empresa.");
            return;
        }
        snapshot.forEach(doc => {
            const task = doc.data();
            allTasks.push({ id: doc.id, ...task });
            const taskElement = document.createElement('div');
            taskElement.className = 'bg-white dark:bg-gray-800 p-3 rounded-lg flex justify-between items-center';

            const taskNameSpan = document.createElement('span');
            taskNameSpan.textContent = task.name;
            taskElement.appendChild(taskNameSpan);

            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'flex items-center gap-2'; 
            const editButton = document.createElement('button');
            editButton.title = 'Editar Tarefa';
            editButton.className = 'edit-task-button text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors';
            editButton.dataset.id = doc.id;
            editButton.dataset.name = task.name;
            const editIcon = document.createElement('i');
            editIcon.className = 'fas fa-edit';
            editButton.appendChild(editIcon);

            const deleteButton = document.createElement('button');
            deleteButton.title = 'Excluir Tarefa';
            deleteButton.className = 'delete-task-button text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors';
            deleteButton.dataset.id = doc.id;
            deleteButton.dataset.name = task.name;
            const deleteIcon = document.createElement('i');
            deleteIcon.className = 'fas fa-trash';
            deleteButton.appendChild(deleteIcon);

            buttonsDiv.append(editButton, deleteButton);
            taskElement.appendChild(buttonsDiv);

            tasksList.appendChild(taskElement);
        });
    }, (error) => {
        console.error("Erro ao buscar tarefas:", error);
        tasksList.innerHTML = '<p class="text-center text-red-500 text-sm">Erro ao carregar tarefas.</p>';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initUIElements();
    initializeDashboard();
    initThemeManager('theme-toggle');

    if (addMemberButton) addMemberButton.addEventListener('click', () => createMemberModal.classList.remove('hidden'));
    if (cancelCreateMemberButton) cancelCreateMemberButton.addEventListener('click', () => createMemberModal.classList.add('hidden'));

    if (addTaskForm) {
        addTaskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const taskName = newTaskNameInput.value.trim();
            if (taskName && userId) {
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
    }

    if (createMemberForm) {
        createMemberForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!userId) {
                showMessageModal("Erro de autenticação. Por favor, faça login novamente.");
                return;
            }

            const submitButton = document.getElementById('submit-create-member');
            toggleButtonLoading(submitButton, true);

            const memberName = createMemberForm['member-name'].value;
            const memberEmail = createMemberForm['member-email'].value;

            // NOTA DE SEGURANÇA: A geração de tokens no lado do cliente é adequada para protótipos,
            // mas insegura para produção. O ideal é gerar este token em uma Cloud Function
            // para garantir que seja único e criptograficamente seguro.
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
                toggleButtonLoading(submitButton, false);
            }
        });
    }

    if (membersList) {
        membersList.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            if (button.classList.contains('copy-token-button')) {
                const token = button.dataset.token;
                navigator.clipboard.writeText(token).then(() => {
                    showMessageModal('Token copiado para a área de transferência!');
                    const tokenInput = button.previousElementSibling.querySelector('.token-input');
                    if (tokenInput) {
                        tokenInput.classList.add('token-copied-glow');
                        setTimeout(() => {
                            tokenInput.classList.remove('token-copied-glow');
                        }, 1500);
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
                    // NOTA DE SEGURANÇA: Assim como na criação, a regeneração de tokens deve,
                    // idealmente, ocorrer no lado do servidor (server-side) por segurança.
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
                editMemberIdInput.value = button.dataset.id;
                editMemberNameInput.value = button.dataset.name;
                editMemberEmailInput.value = button.dataset.email;
                editMemberModal.classList.remove('hidden');
            }
        });
    }

    if (editMemberForm) {
        editMemberForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const memberId = editMemberIdInput.value;
            const newName = editMemberNameInput.value.trim();
            const newEmail = editMemberEmailInput.value.trim();

            if (!memberId || !newName || !newEmail) {
                showMessageModal("Todos os campos são obrigatórios.");
                return;
            }

            toggleButtonLoading(saveEditMemberButton, true);
            const memberDocRef = doc(db, "members", memberId);

            try {
                await updateDoc(memberDocRef, { name: newName, email: newEmail });
                editMemberModal.classList.add('hidden');
                showMessageModal("Informações do colaborador atualizadas com sucesso.");
            } catch (error) {
                console.error("Erro ao atualizar colaborador:", error);
                showMessageModal("Erro ao atualizar informações. Tente novamente.");
            } finally {
                toggleButtonLoading(saveEditMemberButton, false);
            }
        });
    }

    if (cancelEditMemberButton) cancelEditMemberButton.addEventListener('click', () => editMemberModal.classList.add('hidden'));

    if (tasksList) {
        tasksList.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            if (button.classList.contains('edit-task-button')) {
                editTaskIdInput.value = button.dataset.id;
                editTaskNameInput.value = button.dataset.name;
                editTaskModal.classList.remove('hidden');
            }

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
    }

    if (cancelEditTaskButton) cancelEditTaskButton.addEventListener('click', () => editTaskModal.classList.add('hidden'));

    if (editTaskForm) {
        editTaskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const taskId = editTaskIdInput.value;
            const newName = editTaskNameInput.value.trim();

            if (!newName) {
                showMessageModal("O nome da tarefa não pode ser vazio.");
                return;
            }

            const isDuplicate = allTasks.some(task =>
                task.name.toLowerCase() === newName.toLowerCase() && task.id !== taskId
            );

            if (isDuplicate) {
                showMessageModal(`A tarefa "${newName}" já existe.`);
                return;
            }

            toggleButtonLoading(saveEditTaskButton, true);
            const taskDocRef = doc(db, "tasks", taskId);

            try {
                await updateDoc(taskDocRef, { name: newName });
                editTaskModal.classList.add('hidden');
                showMessageModal("Tarefa atualizada com sucesso.");
            } catch (error) {
                console.error("Erro ao atualizar tarefa:", error);
                showMessageModal("Erro ao atualizar a tarefa. Tente novamente.");
            } finally {
                toggleButtonLoading(saveEditTaskButton, false);
            }
        });
    }

    if (searchMemberInput) {
        searchMemberInput.addEventListener('input', () => {
            membersCurrentPage = 1;
            renderMembers();
        });
    }

    if (prevMembersPageButton) {
        prevMembersPageButton.addEventListener('click', () => {
            if (membersCurrentPage > 1) {
                membersCurrentPage--;
                renderMembers();
            }
        });
    }

    if (nextMembersPageButton) {
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
    }
});