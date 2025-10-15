import { auth, functions } from './firebase-services.js';
import { applyInitialTheme } from './theme-manager.js';
import { showMessageModal } from './ui-helpers.js';
import { signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";

applyInitialTheme();

const exchangeTokenForAuth = httpsCallable(functions, 'exchangeTokenForAuth');

document.addEventListener('DOMContentLoaded', () => {
    const memberLoginForm = document.getElementById('member-login-form');
    const loginTokenInput = document.getElementById('login-token');

    if (!memberLoginForm || !loginTokenInput) {
        console.error("Elementos do formulário de login de membro não encontrados.");
        return;
    }
    
    memberLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = memberLoginForm.querySelector('button[type="submit"]');
        const token = loginTokenInput.value.trim();
        if (!token) {
            showMessageModal("Por favor, insira seu token de acesso.");
            return;
        }

        try {
            submitButton.disabled = true;
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
            // Personaliza a mensagem de erro com base no código de erro da Cloud Function
            if (error.code === 'functions/not-found' || error.code === 'functions/invalid-argument') {
                showMessageModal("Token de acesso inválido ou expirado. Verifique o token e tente novamente.");
            } else {
                showMessageModal("Erro de comunicação com o servidor. Tente novamente mais tarde.");
            }
        } finally {
            submitButton.disabled = false;
        }
    });
});