import { auth } from './firebase-services.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { initThemeManager } from './theme-manager.js';

/**
 * Módulo principal da aplicação.
 * Gerencia o estado de autenticação, tema e UI global para todas as páginas autenticadas.
 */

/**
 * Inicializa os componentes de UI globais e os listeners de eventos.
 * @param {Firebase.User} user - O objeto do usuário autenticado.
 */
function initializeGlobalUI(user) {
    const profileToggle = document.getElementById('profile-toggle');
    const profileModal = document.getElementById('profile-modal');
    const userEmailDisplay = document.getElementById('user-email-display');
    const memberNameDisplay = document.getElementById('member-name-display');
    const logoutButtons = document.querySelectorAll('#logout-button, #sidebar-logout-button');

    // Atualiza o e-mail/nome no modal de perfil
    if (userEmailDisplay && user.email) {
        userEmailDisplay.textContent = user.email;
    }
    // O nome do membro é preenchido pelo script da página de perfil

    // Lógica para abrir/fechar o modal de perfil
    if (profileToggle && profileModal) {
        profileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            profileModal.classList.toggle('hidden');
        });
    }

    // Lógica para fechar o modal ao clicar fora
    document.addEventListener('click', (e) => {
        if (profileModal && !profileModal.classList.contains('hidden') && !profileModal.contains(e.target) && !profileToggle.contains(e.target)) {
            profileModal.classList.add('hidden');
        }
    });

    // Lógica de logout centralizada
    logoutButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                // O listener onAuthStateChanged cuidará do redirecionamento
            } catch (error) {
                console.error("Erro ao fazer logout:", error);
            }
        });
    });
}

/**
 * Ponto de entrada da aplicação. Verifica a autenticação e inicializa a página.
 * @param {function(Firebase.User): void} initPageSpecificScript - A função de inicialização para a página específica.
 */
export function initializeApp(initPageSpecificScript) {
    document.addEventListener('DOMContentLoaded', () => {
        // Inicializa o tema antes de tudo
        initThemeManager('theme-toggle');

        onAuthStateChanged(auth, (user) => {
            if (user) {
                // Usuário está logado
                initializeGlobalUI(user);
                if (typeof initPageSpecificScript === 'function') {
                    initPageSpecificScript(user);
                }
            } else {
                // Usuário não está logado, redireciona para a landing page
                window.location.href = 'landing.html';
            }
        });
    });
}