import firebaseConfig from './FireBase.js';
import { showMessageModal } from './ui-helpers.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

export function initLandingAuth() {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    const loginModal = document.getElementById('login-modal');
    const openLoginModalBtn = document.getElementById('open-login-modal-btn');
    const loginForm = document.getElementById('login-form');
    const loginErrorEl = document.getElementById('login-error-message');
    const allOpenTriggers = document.querySelectorAll('.open-login-modal-trigger');

    if (!loginModal || !openLoginModalBtn || !loginForm || !loginErrorEl) {
        console.error("Elementos do modal de login não encontrados.");
        return;
    }

    const toggleModal = () => loginModal.classList.toggle('hidden');

    openLoginModalBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleModal();
    });

    allOpenTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });
    });
    
    // Fecha o dropdown se clicar em qualquer lugar fora dele
    document.addEventListener('click', (e) => {
        // Verifica se o modal está visível e se o clique foi fora do modal e fora do botão que o abre
        if (!loginModal.classList.contains('hidden') && !loginModal.contains(e.target) && !openLoginModalBtn.contains(e.target)) {
            loginModal.classList.add('hidden');
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginForm['login-email'].value;
        const password = loginForm['login-password'].value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Login bem-sucedido, redireciona para o painel
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Erro no login:", error.code);
            // Verifica se o erro é relacionado a credenciais inválidas
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-email') {
                loginErrorEl.textContent = "E-mail ou senha incorretos.";
            } else {
                // Para outros erros (ex: rede), mostra uma mensagem genérica
                loginErrorEl.textContent = "Erro de conexão. Tente novamente.";
            }
            loginErrorEl.classList.remove('hidden');
        }
    });

    // Esconde a mensagem de erro quando o usuário começar a digitar novamente
    loginForm['login-email'].addEventListener('input', () => {
        if (!loginErrorEl.classList.contains('hidden')) loginErrorEl.classList.add('hidden');
    });
    loginForm['login-password'].addEventListener('input', () => {
        if (!loginErrorEl.classList.contains('hidden')) loginErrorEl.classList.add('hidden');
    });

    // Verifica se a página deve abrir o modal de login automaticamente
    // (útil ao ser redirecionado da página de registro)
    if (localStorage.getItem('openLoginModal') === 'true') {
        loginModal.classList.remove('hidden');
        localStorage.removeItem('openLoginModal'); // Limpa o gatilho
    }

    // Adiciona um listener para o link "Esqueci minha senha" se ele existir
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            // A lógica de esqueci a senha pode ser um novo modal ou redirecionamento
            showMessageModal("A funcionalidade de redefinir senha ainda será implementada.");
        });
    }
}