import { auth, db } from './firebase-services.js';
import { initThemeManager } from './theme-manager.js';
import { showMessageModal, formatDuration } from './ui-helpers.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, query, where, onSnapshot, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Chart instances
let hoursByProjectChart, hoursByMemberChart, hoursTrendChart;
let allTimeEntries = [];
let membersMap = new Map();

// --- CHART RENDERING FUNCTIONS ---

function renderHoursByProjectChart(data) {
    const ctx = document.getElementById('hours-by-project-chart').getContext('2d');
    if (hoursByProjectChart) hoursByProjectChart.destroy();

    const isDarkMode = document.body.classList.contains('dark');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? '#c5c5c5' : '#1f2937';

    hoursByProjectChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Horas',
                data: Object.values(data).map(seconds => (seconds / 3600).toFixed(2)),
                backgroundColor: '#8a5cf6',
                borderRadius: 5,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } },
                x: { grid: { display: false }, ticks: { color: textColor } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function renderHoursByMemberChart(data) {
    const ctx = document.getElementById('hours-by-member-chart').getContext('2d');
    if (hoursByMemberChart) hoursByMemberChart.destroy();

    const isDarkMode = document.body.classList.contains('dark');
    const textColor = isDarkMode ? '#c5c5c5' : '#1f2937';
    const backgroundColors = ['#8a5cf6', '#60519b', '#a78bfa', '#c4b5fd', '#ddd6fe'];

    hoursByMemberChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Horas por Membro',
                data: Object.values(data).map(seconds => (seconds / 3600).toFixed(2)),
                backgroundColor: backgroundColors,
                borderColor: isDarkMode ? '#2a223d' : '#ffffff',
                borderWidth: 4,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor, boxWidth: 15, padding: 20 }
                }
            }
        }
    });
}

function renderHoursTrendChart(data) {
    const ctx = document.getElementById('hours-trend-chart').getContext('2d');
    if (hoursTrendChart) hoursTrendChart.destroy();

    const isDarkMode = document.body.classList.contains('dark');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? '#c5c5c5' : '#1f2937';

    hoursTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Horas Trabalhadas por Dia',
                data: Object.values(data).map(seconds => (seconds / 3600).toFixed(2)),
                fill: true,
                borderColor: '#8a5cf6',
                backgroundColor: 'rgba(138, 92, 246, 0.2)',
                tension: 0.4,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } },
                x: { grid: { color: gridColor }, ticks: { color: textColor } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// --- DATA PROCESSING ---

function processDataForCharts(entries) {
    const projectData = {};
    const memberData = {};
    const trendData = {};

    // Initialize last 30 days for trend chart
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        trendData[key] = 0;
    }

    entries.forEach(entry => {
        // Project Data
        projectData[entry.projectName] = (projectData[entry.projectName] || 0) + entry.duration;

        // Member Data
        const memberName = membersMap.get(entry.memberId) || 'Empresa';
        memberData[memberName] = (memberData[memberName] || 0) + entry.duration;

        // Trend Data
        const entryDate = new Date(entry.timestamp.seconds * 1000);
        const key = entryDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (key in trendData) {
            trendData[key] += entry.duration;
        }
    });

    renderHoursByProjectChart(projectData);
    renderHoursByMemberChart(memberData);
    renderHoursTrendChart(trendData);
}

async function fetchData(startDate, endDate) {
    if (!db || !userId) return;

    let timeEntriesQuery = query(
        collection(db, "timeEntries"),
        where("companyId", "==", userId),
        orderBy("timestamp", "desc")
    );

    // Add date filters if they exist
    if (startDate) {
        timeEntriesQuery = query(timeEntriesQuery, where("timestamp", ">=", startDate));
    }
    if (endDate) {
        // Adjust end date to include the whole day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        timeEntriesQuery = query(timeEntriesQuery, where("timestamp", "<=", endOfDay));
    }

    try {
        const snapshot = await getDocs(timeEntriesQuery);
        allTimeEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        processDataForCharts(allTimeEntries);
    } catch (error) {
        console.error("Erro ao buscar dados para relatórios:", error);
        showMessageModal("Não foi possível carregar os dados dos relatórios.");
    }
}

// --- INITIALIZATION ---

export function initReportsPage() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;
            // First, fetch members to map IDs to names
            const membersQuery = query(collection(db, "members"), where("companyId", "==", userId));
            const membersSnapshot = await getDocs(membersQuery);
            membersSnapshot.forEach(doc => membersMap.set(doc.id, doc.data().name));

            // Then, fetch data for the charts
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            fetchData(thirtyDaysAgo, new Date()); // Load last 30 days by default
        } else {
            window.location.href = 'index.html';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Profile modal logic
    const profileToggle = document.getElementById('profile-toggle');
    const profileModal = document.getElementById('profile-modal');
    const userEmailDisplay = document.getElementById('user-email-display');
    const logoutButton = document.getElementById('logout-button');

    if (profileToggle) {
        profileToggle.addEventListener('click', (e) => {
            const pageOverlay = document.getElementById('page-overlay');
            e.stopPropagation();
            if (auth.currentUser) {
                userEmailDisplay.textContent = auth.currentUser.email;
            }
            profileModal.classList.toggle('hidden');
            if (pageOverlay) pageOverlay.classList.toggle('hidden');
        });
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', () => signOut(auth));
    }
    document.addEventListener('click', (e) => {
        const pageOverlay = document.getElementById('page-overlay');
        if (profileModal && !profileModal.classList.contains('hidden') && !profileModal.contains(e.target) && !profileToggle.contains(e.target)) {
            profileModal.classList.add('hidden');
            if (pageOverlay) pageOverlay.classList.add('hidden');
        }
    });
    
    // Date picker
    flatpickr("#date-range-picker", {
        mode: "range",
        dateFormat: "d/m/Y",
        locale: {
            firstDayOfWeek: 1,
            weekdays: {
              shorthand: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
              longhand: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
            },
            months: {
              shorthand: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
              longhand: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
            },
        },
        onChange: function(selectedDates) {
            if (selectedDates.length === 2) {
                fetchData(selectedDates[0], selectedDates[1]);
            }
        }
    });
});