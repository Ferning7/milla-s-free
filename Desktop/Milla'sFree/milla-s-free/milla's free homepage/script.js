import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, doc, deleteDoc, updateDoc, orderBy, limit, startAfter, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / MS_PER_SECOND);
    const hours = Math.floor(totalSeconds / (SECONDS_PER_MINUTE * MINUTES_PER_HOUR));
    const minutes = Math.floor((totalSeconds % (SECONDS_PER_MINUTE * MINUTES_PER_HOUR)) / SECONDS_PER_MINUTE);
    const seconds = totalSeconds % SECONDS_PER_MINUTE;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
const firebaseConfig = {
    apiKey: "AIzaSyBHBLmdqXHEiNgr6o5ZsUVW9Spevzx6VJo",
    authDomain: "milla-sfree.firebaseapp.com",
    projectId: "milla-sfree",
    storageBucket: "milla-sfree.firebasestorage.app",
    messagingSenderId: "564773137824",
    appId: "1:564773137824:web:2f6ca5efd3768f72a988c5",
    measurementId: "G-E4D4JPS8H2"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

let userId = null;
let chartInstance = null;
let lastAggregatedData = null;
const PAGE_SIZE = 5;
let lastVisibleDoc = null;
let pageHistory = [];
const appId = firebaseConfig.appId;

const themeToggle = document.getElementById('theme-toggle');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const profileToggle = document.getElementById('profile-toggle');
const profileModal = document.getElementById('profile-modal');
const body = document.body;
const startButton = document.getElementById('start-button');
const stopButton = document.getElementById('stop-button');
const resetButton = document.getElementById('reset-button');
const timerDisplay = document.getElementById('timer-display');
const projectInput = document.getElementById('project-input');
const timeEntriesList = document.getElementById('time-entries-list');
const logoutButton = document.getElementById('logout-button');
const editModal = document.getElementById('edit-modal');
const editEntryIdInput = document.getElementById('edit-entry-id');
const editProjectInput = document.getElementById('edit-project-input');
const editDateInput = document.getElementById('edit-date-input');
const editHoursInput = document.getElementById('edit-hours');
const editMinutesInput = document.getElementById('edit-minutes');
const editSecondsInput = document.getElementById('edit-seconds');
const saveEditButton = document.getElementById('save-edit-button');
const cancelEditButton = document.getElementById('cancel-edit-button');
const paginationControls = document.getElementById('pagination-controls');
const prevPageButton = document.getElementById('prev-page-button');
const nextPageButton = document.getElementById('next-page-button');

class Timer {
    constructor({ timerDisplay, startButton, stopButton, resetButton, onStopCallback }) {
        this.timerDisplay = timerDisplay;
        this.startButton = startButton;
        this.stopButton = stopButton;
        this.resetButton = resetButton;
        this.onStopCallback = onStopCallback;

        this.timerInterval = null;
        this.startTime = 0;

        this.setButtonsDisabled(true);
    }

    _updateDisplay(ms) {
        this.timerDisplay.textContent = formatTime(ms);
    }

    start() {
        if (this.timerInterval) return;

        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            this._updateDisplay(elapsed);
        }, 1000);

        this.startButton.disabled = true;
        this.stopButton.disabled = false;
        this.timerDisplay.classList.add('timer-active');
    }

    stop() {
        if (!this.timerInterval) return;

        const elapsed = Date.now() - this.startTime;

        clearInterval(this.timerInterval);
        this.timerInterval = null;

        this._updateDisplay(0);
        this.startButton.disabled = false;
        this.stopButton.disabled = true;
        this.timerDisplay.classList.remove('timer-active');

        if (elapsed > MS_PER_SECOND && this.onStopCallback) {
            this.onStopCallback(elapsed);
        }
    }

    reset() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.startTime = 0;
        this._updateDisplay(0);
        this.timerDisplay.classList.remove('timer-active');

        this.startButton.disabled = !userId;
        this.stopButton.disabled = true;
        this.resetButton.disabled = !userId;
    }

    setButtonsDisabled(disabled) {
        this.reset();
        this.startButton.disabled = disabled;
        this.resetButton.disabled = disabled;
    }
}

const timer = new Timer({
    timerDisplay,
    startButton,
    stopButton,
    resetButton,
    onStopCallback: async (duration) => {
        const projectName = projectInput.value.trim() || "Projeto Sem Nome";
        if (userId) {
            await addTimeEntry(projectName, duration);
            fetchEntries('first');
            projectInput.value = "";
        }
    }
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid;
        const userIdDisplay = document.getElementById('user-id-display');
        if (userIdDisplay) {
            userIdDisplay.textContent = userId;
        }
        setupChartListener();
        fetchEntries('first');
        timer.setButtonsDisabled(false);
    } else {
        userId = null;

        timeEntriesList.innerHTML = '';
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
        paginationControls.classList.add('hidden');
        timer.setButtonsDisabled(true);

        document.getElementById('user-id-display').textContent = 'Autenticando...';
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Firebase Auth Error: ", error);
            document.getElementById('user-id-display').textContent = 'Erro de autenticação.';
        }
    }
});

async function addTimeEntry(projectName, duration) {
    try {
        const collectionPath = `/artifacts/${appId}/users/${userId}/timeEntries`;
        const docRef = await addDoc(collection(db, collectionPath), {
            project: projectName,
            duration: duration,
            createdAt: Date.now()
        });
        console.log("Entrada de tempo salva com sucesso! ID:", docRef.id);
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("Falha ao salvar a entrada de tempo. Verifique o console para detalhes.");
    }
}

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark');
    const isDark = body.classList.contains('dark');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';

    if (chartInstance && lastAggregatedData) {
        renderOrUpdateChart(lastAggregatedData);
    }
});

menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('active');
    menuToggle.classList.toggle('active');
});
profileToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    profileModal.classList.toggle('hidden');
});

async function deleteTimeEntry(id) {
    try {
        const collectionPath = `/artifacts/${appId}/users/${userId}/timeEntries`;
        const docRef = doc(db, collectionPath, id);
        await deleteDoc(docRef);
        console.log("Entrada deletada com sucesso!");
        fetchEntries('first');
    } catch (e) {
        console.error("Erro ao deletar documento: ", e);
        alert("Falha ao deletar a entrada de tempo.");
    }
}

async function updateTimeEntry(id, newProject, newDuration, newCreatedAt) {
    try {
        const collectionPath = `/artifacts/${appId}/users/${userId}/timeEntries`;
        const docRef = doc(db, collectionPath, id);
        await updateDoc(docRef, {
            project: newProject,
            duration: newDuration,
            createdAt: newCreatedAt
        });
        console.log("Entrada atualizada com sucesso!");
        fetchEntries('first');
    } catch (e) {
        console.error("Erro ao atualizar documento: ", e);
        alert("Falha ao atualizar a entrada de tempo.");
    }
}

document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
        sidebar.classList.remove('active');
        menuToggle.classList.remove('active');
    }
    if (!profileModal.contains(e.target) && !profileToggle.contains(e.target)) {
        profileModal.classList.add('hidden');
    }
});

function formatDateHeader(dateString) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const entryDate = new Date(dateString);

    const timezoneOffset = entryDate.getTimezoneOffset() * 60000;
    const adjustedEntryDate = new Date(entryDate.getTime() + timezoneOffset);

    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);

    if (adjustedEntryDate.getTime() === today.getTime()) {
        return 'Hoje';
    }
    if (adjustedEntryDate.getTime() === yesterday.getTime()) {
        return 'Ontem';
    }
    return adjustedEntryDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function renderTimeEntries(entries) {
    timeEntriesList.innerHTML = '';
    if (entries.length === 0 && pageHistory.length === 0) {
        timeEntriesList.innerHTML = '<p class="text-gray-400 text-center">Nenhuma entrada de tempo encontrada.</p>';
        return;
    }

    const groupedEntries = entries.reduce((acc, entry) => {
        const dateKey = new Date(entry.createdAt).toISOString().split('T')[0];
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(entry);
        return acc;
    }, {});

    const sortedDates = Object.keys(groupedEntries).sort((a, b) => new Date(b) - new Date(a));

    sortedDates.forEach(dateKey => {
        const header = document.createElement('h5');
        header.className = 'text-lg font-semibold mt-6 mb-2 text-gray-500 dark:text-gray-400 first:mt-0';
        header.textContent = formatDateHeader(dateKey);
        timeEntriesList.appendChild(header);

        const entriesForDate = groupedEntries[dateKey];
        entriesForDate.forEach(entry => {
            const timeString = formatTime(entry.duration);
            const dateString = new Date(entry.createdAt).toLocaleDateString('pt-BR');
            const timeOnlyString = new Date(entry.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const entryElement = document.createElement('div');
            entryElement.className = 'bg-blue-600 p-4 rounded-lg shadow flex justify-between items-center';
            entryElement.dataset.id = entry.id;
            entryElement.dataset.project = entry.project;
            entryElement.dataset.duration = entry.duration;
            entryElement.dataset.createdat = entry.createdAt;

            const infoDiv = document.createElement('div');
            const projectP = document.createElement('p');
            projectP.className = 'font-bold text-white';
            projectP.textContent = entry.project;
            const detailsP = document.createElement('p');
            detailsP.className = 'text-sm text-gray-200';
            detailsP.textContent = `${timeString} (${dateString}, ${timeOnlyString})`;
            infoDiv.append(projectP, detailsP);

            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'flex items-center space-x-2';
            const editButton = document.createElement('button');
            editButton.className = 'edit-btn p-2 rounded-full hover:bg-blue-500 transition-colors';
            editButton.title = 'Editar';
            editButton.setAttribute('aria-label', 'Editar entrada');
            editButton.innerHTML = `<i class="fas fa-pencil-alt text-white pointer-events-none"></i>`;
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-btn p-2 rounded-full hover:bg-red-500 transition-colors';
            deleteButton.title = 'Deletar';
            deleteButton.setAttribute('aria-label', 'Deletar entrada');
            deleteButton.innerHTML = `<i class="fas fa-trash-alt text-white pointer-events-none"></i>`;
            controlsDiv.append(editButton, deleteButton);

            entryElement.append(infoDiv, controlsDiv);
            timeEntriesList.appendChild(entryElement);
        });
    });
}

function aggregateProjectData(entries) {
    const projectData = entries.reduce((acc, entry) => {
        const projectName = entry.project || "Sem Nome";
        if (!acc[projectName]) {
            acc[projectName] = 0;
        }
        acc[projectName] += entry.duration;
        return acc;
    }, {});

    const labels = Object.keys(projectData);
    const data = Object.values(projectData).map(duration => (duration / (MS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR)).toFixed(2));

    return { labels, data };
}

function renderOrUpdateChart(aggregatedData) {
    const ctx = document.getElementById('project-chart').getContext('2d');
    const isDark = document.body.classList.contains('dark');
    const textColor = isDark ? '#E2E8F0' : '#1A202C';

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: aggregatedData.labels,
            datasets: [{
                label: 'Horas por Projeto',
                data: aggregatedData.data,
                backgroundColor: [
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 159, 64, 0.8)'
                ],
                borderColor: isDark ? '#2D3748' : '#FFFFFF',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top', labels: { color: textColor } },
                title: { display: true, text: 'Distribuição de Tempo por Projeto (em horas)', color: textColor, font: { size: 16 } }
            }
        }
    });
}

function setupChartListener() {
    if (!userId) return;
    const collectionPath = `/artifacts/${appId}/users/${userId}/timeEntries`;
    const q = query(collection(db, collectionPath));

    onSnapshot(q, (querySnapshot) => {
        const allEntries = [];
        querySnapshot.forEach((doc) => {
            allEntries.push({ id: doc.id, ...doc.data() });
        });

        lastAggregatedData = aggregateProjectData(allEntries);
        renderOrUpdateChart(lastAggregatedData);
    }, (error) => {
        console.error("Erro no listener do gráfico (Firestore): ", error);
        alert("Não foi possível carregar os dados para o gráfico.");
    });
}

async function fetchEntries(direction = 'first') {
    if (!userId) return;

    const collectionPath = `/artifacts/${appId}/users/${userId}/timeEntries`;
    const entriesCollection = collection(db, collectionPath);
    let q;

    try {
        if (direction === 'first') {
            pageHistory = [];
            q = query(entriesCollection, orderBy("createdAt", "desc"), limit(PAGE_SIZE));
        } else if (direction === 'next' && lastVisibleDoc) {
            pageHistory.push(lastVisibleDoc);
            q = query(entriesCollection, orderBy("createdAt", "desc"), startAfter(lastVisibleDoc), limit(PAGE_SIZE));
        } else if (direction === 'prev') {
            pageHistory.pop();
            const prevPageStartCursor = pageHistory.length > 0 ? pageHistory[pageHistory.length - 1] : null;
            if (prevPageStartCursor) {
                q = query(entriesCollection, orderBy("createdAt", "desc"), startAfter(prevPageStartCursor), limit(PAGE_SIZE));
            } else {
                q = query(entriesCollection, orderBy("createdAt", "desc"), limit(PAGE_SIZE));
            }
        } else {
            return;
        }

        const documentSnapshots = await getDocs(q);
        const entries = [];
        documentSnapshots.forEach((doc) => {
            entries.push({ id: doc.id, ...doc.data() });
        });

        if (!documentSnapshots.empty) {
            lastVisibleDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
            paginationControls.classList.remove('hidden');

            const nextQuery = query(entriesCollection, orderBy("createdAt", "desc"), startAfter(lastVisibleDoc), limit(1));
            const nextDocs = await getDocs(nextQuery);
            nextPageButton.disabled = nextDocs.empty;
        } else if (direction === 'first') {
            paginationControls.classList.add('hidden');
        } else {
            nextPageButton.disabled = true;
        }
        renderTimeEntries(entries);
        prevPageButton.disabled = pageHistory.length === 0;
    } catch (error) {
        console.error("Erro ao buscar entradas de tempo: ", error);
        alert("Não foi possível carregar as entradas de tempo.");
    }
}

function openEditModal(id, project, duration, createdAt) {
    editEntryIdInput.value = id;
    editProjectInput.value = project;

    const date = new Date(createdAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    editDateInput.value = `${year}-${month}-${day}`;

    const totalSeconds = Math.floor(duration / MS_PER_SECOND);
    const hours = Math.floor(totalSeconds / (SECONDS_PER_MINUTE * MINUTES_PER_HOUR));
    const minutes = Math.floor((totalSeconds % (SECONDS_PER_MINUTE * MINUTES_PER_HOUR)) / SECONDS_PER_MINUTE);
    const seconds = totalSeconds % SECONDS_PER_MINUTE;

    editHoursInput.value = hours;
    editMinutesInput.value = minutes;
    editSecondsInput.value = seconds;

    editModal.classList.remove('hidden');
}

function closeEditModal() {
    editModal.classList.add('hidden');
}

startButton.addEventListener('click', () => timer.start());
stopButton.addEventListener('click', () => timer.stop());
resetButton.addEventListener('click', () => timer.reset());
logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout Error: ", error);
    }
});

prevPageButton.addEventListener('click', () => fetchEntries('prev'));
nextPageButton.addEventListener('click', () => fetchEntries('next'));

timeEntriesList.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-btn');
    const editBtn = e.target.closest('.edit-btn');

    if (deleteBtn) {
        const entryElement = deleteBtn.closest('[data-id]');
        const entryId = entryElement.dataset.id;
        if (confirm('Tem certeza que deseja deletar esta entrada?')) {
            deleteTimeEntry(entryId);
        }
    }

    if (editBtn) {
        const entryElement = editBtn.closest('[data-id]');
        const { id, project, duration, createdat } = entryElement.dataset;
        openEditModal(id, project, parseInt(duration, 10), parseInt(createdat, 10));
    }
});

cancelEditButton.addEventListener('click', closeEditModal);

saveEditButton.addEventListener('click', async () => {
    const id = editEntryIdInput.value;
    const newProject = editProjectInput.value || "Projeto Sem Nome";
    const hours = parseInt(editHoursInput.value, 10) || 0;
    const minutes = parseInt(editMinutesInput.value, 10) || 0;
    const seconds = parseInt(editSecondsInput.value, 10) || 0;
    const newDuration = (hours * SECONDS_PER_MINUTE * MINUTES_PER_HOUR + minutes * SECONDS_PER_MINUTE + seconds) * MS_PER_SECOND;

    const originalEntryElement = timeEntriesList.querySelector(`[data-id="${id}"]`);
    const originalCreatedAt = parseInt(originalEntryElement.dataset.createdat, 10);
    const originalDate = new Date(originalCreatedAt);

    const newDateValue = editDateInput.value;
    const [year, month, day] = newDateValue.split('-').map(Number);

    const newDate = new Date(year, month - 1, day, originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds());
    const newCreatedAt = newDate.getTime();

    if (id && newDuration > 0) {
        await updateTimeEntry(id, newProject, newDuration, newCreatedAt);
        closeEditModal();
    } else {
        alert("A duração deve ser maior que zero.");
    }
});
