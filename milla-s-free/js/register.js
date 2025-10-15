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
                
                // Mostra a mensagem e, quando o usuário clicar em OK, redireciona para o painel.
                await showMessageModal("Cadastro realizado com sucesso! Um e-mail de verificação foi enviado. Você será redirecionado para o painel.");
                window.location.href = 'index.html';

            } catch (error) {
                console.error("Erro no cadastro:", error);
                showMessageModal(`Erro no cadastro: ${error.message.replace('Firebase: ', '')}`);
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