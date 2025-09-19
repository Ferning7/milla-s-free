import firebaseConfig from './FireBase.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, doc, deleteDoc, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Ativar logging para depuração
setLogLevel('debug');

// Variáveis globais
let app, auth, db;
let userId;

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
        } else {
            // Se não estiver logado, redireciona para a página inicial
            window.location.href = 'index.html';
        }
    });
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
        if (snapshot.empty) {
            membersList.innerHTML = '<p class="text-center text-gray-500">Nenhum colaborador encontrado.</p>';
            return;
        }

        membersList.innerHTML = ''; // Limpa a lista apenas quando temos dados
        snapshot.forEach(doc => {
            const member = doc.data();
            const memberElement = document.createElement('div');
            memberElement.className = 'bg-gray-800 p-4 rounded-lg flex justify-between items-center';
            memberElement.innerHTML = `
                <div>
                    <p class="font-bold text-lg">${member.name}</p>
                    <p class="text-sm text-gray-400">${member.email}</p>
                </div>
                <div class="flex items-center gap-4">
                    <div class="relative">
                        <input type="text" readonly value="${member.loginToken}" class="token-input bg-gray-700 border border-gray-600 rounded p-1 text-xs w-48 font-mono">
                    </div>
                    <button class="copy-token-button px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm" data-token="${member.loginToken}">Copiar</button>
                    <button class="delete-member-button text-red-500 hover:text-red-700" data-id="${doc.id}" data-name="${member.name || 'este colaborador'}"><i class="fas fa-trash"></i></button>
                </div>
            `;
            membersList.appendChild(memberElement);
        });
    }, (error) => {
        console.error("Erro ao buscar colaboradores:", error);
        membersList.innerHTML = '<p class="text-center text-red-500">Erro ao carregar colaboradores. Verifique o console para mais detalhes.</p>';
        showMessageModal("Ocorreu um erro ao buscar os colaboradores. Verifique se as regras de segurança do Firestore permitem a leitura da coleção 'members'.");
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
    if (e.target.classList.contains('copy-token-button')) {
        const token = e.target.dataset.token;
        navigator.clipboard.writeText(token).then(() => {
            showMessageModal('Token copiado para a área de transferência!');
        }).catch(err => {
            console.error('Erro ao copiar token: ', err);
            showMessageModal('Não foi possível copiar o token.');
        });
    }

    if (e.target.closest('.delete-member-button')) {
        const button = e.target.closest('.delete-member-button');
        const memberId = button.dataset.id;
        const memberName = button.dataset.name;
        const confirmed = await showMessageModal(`Tem certeza que deseja excluir o colaborador "${memberName}"? Esta ação não pode ser desfeita.`, 'confirm');
        if (confirmed) {
            deleteDoc(doc(db, "members", memberId)).then(() => {
                showMessageModal("Colaborador excluído com sucesso.");
            }).catch(err => showMessageModal("Erro ao excluir colaborador."));
        }
    }
});


// Iniciar a página
document.addEventListener('DOMContentLoaded', initializeDashboard);