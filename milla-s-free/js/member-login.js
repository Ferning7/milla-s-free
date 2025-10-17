import { auth } from './firebase-services.js';
import { applyInitialTheme } from './theme-manager.js';
import { showMessageModal } from './ui-helpers.js';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

applyInitialTheme();

document.addEventListener('DOMContentLoaded', () => {
    const memberLoginForm = document.getElementById('member-login-form');
    const emailInput = document.getElementById('member-email');
    const passwordInput = document.getElementById('member-password');
    const forgotPasswordLink = document.getElementById('member-forgot-password');

    if (!memberLoginForm || !emailInput || !passwordInput || !forgotPasswordLink) {
        console.error("Elementos do formulário de login de membro não encontrados.");
        return;
    }
    
    memberLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            showMessageModal("Por favor, preencha e-mail e senha.");
            return;
        }

        const submitButton = memberLoginForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        try {
            // Tenta fazer login com e-mail e senha.
            // O Firebase Auth não distingue entre "usuário não encontrado" e "senha errada" por segurança.
            // No entanto, o login de colaborador é um caso especial.
            // A segurança aqui é garantida pelas regras do Firestore na página de perfil,
            // que verificarão se o UID do usuário logado corresponde a um documento na coleção 'members'.
            await signInWithEmailAndPassword(auth, email, password);
            
            // Se o login for bem-sucedido, redireciona para o painel do colaborador.
            window.location.href = 'profile.html';
            
        } catch (error) {
            console.error("Erro no login do colaborador:", error);
            if (error.code === 'auth/invalid-credential') {
                showMessageModal("E-mail ou senha incorretos. Verifique os dados ou, se for seu primeiro acesso, clique em 'Esqueci minha senha' para criar uma.");
            } else {
                showMessageModal("Ocorreu um erro ao tentar fazer login. Verifique sua conexão e tente novamente.");
            }
        } finally {
            submitButton.disabled = false;
        }
    });

    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        if (!email) {
            showMessageModal("Por favor, digite seu e-mail no campo correspondente antes de solicitar a redefinição de senha.");
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            showMessageModal("Se o seu e-mail estiver cadastrado, um link para criar (primeiro acesso) ou redefinir sua senha foi enviado.");
        } catch (error) {
            console.error("Erro ao enviar e-mail de redefinição:", error);
            showMessageModal("Ocorreu um erro. Verifique o e-mail digitado e tente novamente.");
        }
    });
});