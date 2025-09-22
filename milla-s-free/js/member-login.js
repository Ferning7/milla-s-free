import firebaseConfig from './FireBase.js';
import { applyTheme } from './theme-manager.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";

applyTheme();

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);
const exchangeTokenForAuth = httpsCallable(functions, 'exchangeToken');

const memberLoginForm = document.getElementById('member-login-form');
const loginTokenInput = document.getElementById('login-token');
const messageModal = document.getElementById('message-modal');
const messageText = document.getElementById('message-text');
const messageOkButton = document.getElementById('message-ok');

function showMessageModal(message) {
    messageText.textContent = message;
    messageModal.classList.remove('hidden');
}

messageOkButton.addEventListener('click', () => messageModal.classList.add('hidden'));

memberLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = loginTokenInput.value.trim();
    if (!token) {
        showMessageModal("Por favor, insira seu token de acesso.");
        return;
    }

    try {
        // Passo 1: Troca nosso token de app por um token de autenticação do Firebase via Cloud Function.
        const result = await exchangeTokenForAuth({ token: token });
        const customToken = result.data.token;

        // Passo 2: Faz login no Firebase com o token customizado.
        await signInWithCustomToken(auth, customToken);

        // Não precisamos mais do localStorage, o Firebase gerencia a sessão.
        localStorage.removeItem('memberLoginToken');

        // Passo 3: Redireciona para a página de perfil.
        window.location.href = 'profile.html';
    } catch (error) {
        console.error("Erro no login do colaborador:", error);
        showMessageModal("Token inválido ou erro de comunicação. Tente novamente.");
    }
});