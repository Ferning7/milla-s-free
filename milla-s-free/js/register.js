import { auth, db } from './firebase-services.js';
import { showMessageModal } from './ui-helpers.js';
import { createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = registerForm['register-email'].value;
            const password = registerForm['register-password'].value;

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                
                // Cria um perfil de empresa inicial para o novo usuário.
                const companyDocRef = doc(db, "companies", userCredential.user.uid);
                await setDoc(companyDocRef, { name: email, email: email });

                await sendEmailVerification(userCredential.user);
                registerForm.reset();
                
                // Define um gatilho para abrir o modal de login na landing page.
                localStorage.setItem('openLoginModal', 'true');
                // Mostra a mensagem e, quando o usuário clicar em OK, redireciona para a landing page.
                await showMessageModal("Cadastro realizado com sucesso! Um e-mail de verificação foi enviado. Agora, faça login para acessar seu painel.");
                window.location.href = 'landing.html';

            } catch (error) {
                console.error("Erro no cadastro:", error);
                let errorMessage = "Ocorreu um erro inesperado durante o cadastro. Tente novamente.";
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = "Este endereço de e-mail já está em uso por outra conta.";
                        break;
                    case 'auth/invalid-email':
                        errorMessage = "O endereço de e-mail fornecido não é válido.";
                        break;
                    case 'auth/weak-password':
                        errorMessage = "A senha é muito fraca. Por favor, use uma senha com pelo menos 6 caracteres.";
                        break;
                }
                showMessageModal(errorMessage);
            }
        });
    }

    // Adiciona funcionalidade ao link "Faça login" para abrir o modal na landing page
    const showLoginLink = document.getElementById('show-login-modal-link');
    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Define um item no localStorage para a landing page saber que deve abrir o modal
            localStorage.setItem('openLoginModal', 'true');
            window.location.href = 'landing.html';
        });
    }
});