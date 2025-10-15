import firebaseConfig from './FireBase.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

/**
 * Protege uma página, garantindo que apenas usuários autenticados possam acessá-la.
 * Redireciona para a página de login se o usuário não estiver autenticado.
 */
export function protectPage() {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    onAuthStateChanged(auth, (user) => {
        // Se não houver usuário logado E não estivermos na página de login,
        // redireciona para o login.
        const isLoginPage = window.location.pathname.includes('index.html');
        
        if (!user && !isLoginPage) {
            console.log("Usuário não autenticado. Redirecionando para o login.");
            window.location.href = 'index.html';
        }
    });
}