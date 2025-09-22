/**
 * Módulo com funções de ajuda para a interface do usuário (UI).
 */

/**
 * Exibe um modal de mensagem ou confirmação.
 * @param {string} message - A mensagem a ser exibida.
 * @param {'alert' | 'confirm'} [type='alert'] - O tipo de modal. 'confirm' mostra botões de OK e Cancelar.
 * @returns {Promise<boolean>} Retorna uma Promise que resolve para `true` se OK/Confirmar for clicado, e `false` se Cancelar for clicado.
 */
export function showMessageModal(message, type = 'alert') {
    // Assume que os elementos do modal existem no HTML de quem o chama.
    const messageModal = document.getElementById('message-modal');
    const messageText = document.getElementById('message-text');
    const messageOkButton = document.getElementById('message-ok');
    const messageCancelButton = document.getElementById('message-cancel');

    if (!messageModal || !messageText || !messageOkButton || !messageCancelButton) {
        console.error('Elementos do modal de mensagem não encontrados no DOM.');
        return Promise.resolve(false);
    }

    return new Promise((resolve) => {
        messageText.textContent = message;

        messageOkButton.textContent = (type === 'confirm') ? 'Confirmar' : 'OK';
        messageCancelButton.classList.toggle('hidden', type !== 'confirm');

        messageModal.classList.remove('hidden');

        const cleanup = (result) => {
            messageModal.classList.add('hidden');
            messageOkButton.removeEventListener('click', okListener);
            messageCancelButton.removeEventListener('click', cancelListener);
            resolve(result);
        };

        const okListener = () => cleanup(true);
        const cancelListener = () => cleanup(false);

        messageOkButton.addEventListener('click', okListener, { once: true });
        messageCancelButton.addEventListener('click', cancelListener, { once: true });
    });
}