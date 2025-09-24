import { initThemeManager } from './theme-manager.js';
import { showMessageModal, toggleButtonLoading } from './ui-helpers.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import firebaseConfig from './FireBase.js';

let app, auth, db, userId;

// Function to handle data export
async function exportDataToCSV() {
    if (!db || !userId) {
        showMessageModal("Não foi possível exportar os dados. Tente novamente.");
        return;
    }

    // 1. Export Members
    const membersQuery = query(collection(db, "members"), where("companyId", "==", userId));
    const membersSnapshot = await getDocs(membersQuery);
    let membersCSV = "Nome,Email,Token\n";
    membersSnapshot.forEach(doc => {
        const member = doc.data();
        membersCSV += `"${member.name}","${member.email}","${member.loginToken}"\n`;
    });
    downloadCSV(membersCSV, 'membros.csv');

    // 2. Export Time Entries
    const timeEntriesQuery = query(collection(db, "timeEntries"), where("companyId", "==", userId));
    const timeEntriesSnapshot = await getDocs(timeEntriesQuery);
    let timeEntriesCSV = "Projeto,Membro ID,Data,Duração (segundos),Status\n";
    timeEntriesSnapshot.forEach(doc => {
        const entry = doc.data();
        const date = new Date(entry.timestamp.seconds * 1000).toISOString();
        timeEntriesCSV += `"${entry.projectName}","${entry.memberId || 'Empresa'}","${date}",${entry.duration},${entry.status}\n`;
    });
    downloadCSV(timeEntriesCSV, 'entradas_de_tempo.csv');

    showMessageModal("Exportação de dados concluída.");
}

function downloadCSV(csvContent, fileName) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Function to handle account deletion
async function deleteAccount() {
    if (!db || !auth.currentUser) return;

    const firstConfirm = await showMessageModal("Tem certeza que deseja excluir sua conta? Esta ação é irreversível.", 'confirm');
    if (!firstConfirm) return;

    const secondConfirm = await showMessageModal("Esta é sua última chance. Todos os seus dados (membros, tarefas, registros) serão permanentemente apagados. Confirma a exclusão?", 'confirm');
    if (!secondConfirm) return;

    try {
        // Delete all associated data
        const collectionsToDelete = ['members', 'tasks', 'timeEntries'];
        for (const coll of collectionsToDelete) {
            const q = query(collection(db, coll), where("companyId", "==", userId));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        // Delete company profile
        await deleteDoc(doc(db, "companies", userId));

        // Delete user
        await deleteUser(auth.currentUser);
        
        showMessageModal("Sua conta foi excluída com sucesso.");
        window.location.href = 'landing.html';

    } catch (error) {
        console.error("Erro ao excluir conta:", error);
        showMessageModal("Erro ao excluir a conta. Pode ser necessário fazer login novamente por segurança. Se o erro persistir, contate o suporte.");
    }
}


document.addEventListener('DOMContentLoaded', () => {
    initThemeManager('theme-toggle');
    initThemeManager('theme-toggle-settings');

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    const profileForm = document.getElementById('profile-form');
    const companyNameInput = document.getElementById('company-name');
    const companyEmailInput = document.getElementById('company-email');
    const saveProfileButton = document.getElementById('save-profile-button');

    const passwordForm = document.getElementById('password-form');
    const changePasswordButton = document.getElementById('change-password-button');

    const exportDataButton = document.getElementById('export-data-button');
    const deleteAccountButton = document.getElementById('delete-account-button');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;
            companyEmailInput.value = user.email;

            // Load company profile
            const companyDocRef = doc(db, "companies", userId);
            const companyDocSnap = await getDoc(companyDocRef);
            if (companyDocSnap.exists()) {
                companyNameInput.value = companyDocSnap.data().name;
            }
        } else {
            window.location.href = 'index.html';
        }
    });

    // Handle Profile Form Submission
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        toggleButtonLoading(saveProfileButton, true);
        const newName = companyNameInput.value.trim();
        const companyDocRef = doc(db, "companies", userId);

        try {
            await setDoc(companyDocRef, { name: newName, email: auth.currentUser.email }, { merge: true });
            showMessageModal("Perfil atualizado com sucesso!");
        } catch (error) {
            console.error("Erro ao atualizar perfil:", error);
            showMessageModal("Não foi possível atualizar o perfil.");
        } finally {
            toggleButtonLoading(saveProfileButton, false);
        }
    });

    // Handle Password Form Submission
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        toggleButtonLoading(changePasswordButton, true);

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            showMessageModal("A nova senha e a confirmação não correspondem.");
            toggleButtonLoading(changePasswordButton, false);
            return;
        }
        if (newPassword.length < 6) {
            showMessageModal("A nova senha deve ter pelo menos 6 caracteres.");
            toggleButtonLoading(changePasswordButton, false);
            return;
        }

        try {
            const user = auth.currentUser;
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            
            // Re-authenticate user
            await reauthenticateWithCredential(user, credential);
            
            // Update password
            await updatePassword(user, newPassword);
            
            showMessageModal("Senha alterada com sucesso!");
            passwordForm.reset();
        } catch (error) {
            console.error("Erro ao alterar senha:", error);
            if (error.code === 'auth/wrong-password') {
                showMessageModal("A senha atual está incorreta.");
            } else {
                showMessageModal("Erro ao alterar a senha. Tente novamente.");
            }
        } finally {
            toggleButtonLoading(changePasswordButton, false);
        }
    });

    // Handle Data Export
    if (exportDataButton) {
        exportDataButton.addEventListener('click', exportDataToCSV);
    }

    // Handle Account Deletion
    if (deleteAccountButton) {
        deleteAccountButton.addEventListener('click', deleteAccount);
    }
});