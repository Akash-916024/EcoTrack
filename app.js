// --- Initial State Definition ---
const defaultState = {
    baseFootprint: 0,
    currentFootprint: 0,
    hasCalculated: false,
    streak: 0,
    streakIncrementedToday: false,
    unlockedBadges: [],
    cumulativeReduction: 0,
    lastLoginDate: new Date().toDateString(), // e.g. "Sun Oct 22 2023"
    footprintBreakdown: { transport: 0, diet: 0, energy: 0 },
    actions: [
        { id: 1, text: "Use reusable shopping bags", impact: "Low Impact", reduction: 0.005, completed: false },
        { id: 2, text: "Turn off lights when leaving room", impact: "Low Impact", reduction: 0.005, completed: false },
        { id: 3, text: "Use public transport or carpool", impact: "High Impact", reduction: 0.020, completed: false },
        { id: 4, text: "Eat a meatless meal today", impact: "Medium Impact", reduction: 0.010, completed: false },
        { id: 5, text: "Unplug electronics not in use", impact: "Low Impact", reduction: 0.005, completed: false },
        { id: 6, text: "Wash clothes in cold water", impact: "Medium Impact", reduction: 0.005, completed: false }
    ],
    userProfile: {
        transport: null,
        diet: null,
        energy: null
    }
};

// --- State Management ---
let state = JSON.parse(JSON.stringify(defaultState));
let myChart = null; // Chart instance

function saveState() {
    localStorage.setItem('ecoTrackState', JSON.stringify(state));
    updateDashboardUI();
}

function loadState() {
    const saved = localStorage.getItem('ecoTrackState');
    if (saved) {
        let parsed = JSON.parse(saved);
        
        // Ensure new properties exist
        if (!parsed.unlockedBadges) parsed.unlockedBadges = [];
        if (parsed.cumulativeReduction === undefined) parsed.cumulativeReduction = 0;
        
        // Force update reduction values from defaultState in case of old cached data
        parsed.actions.forEach((savedAction, index) => {
            savedAction.reduction = defaultState.actions[index].reduction;
        });
        
        state = parsed;
        checkDailyRefresh();
    }
    
    // Initial Render
    if (state.hasCalculated) {
        document.getElementById('result-value').textContent = state.baseFootprint;
        document.getElementById('calc-result').classList.remove('hidden');
        triggerAssistantAnalysis(true); // silent load
    }
    renderTracker();
    updateDashboardUI();
}

function checkDailyRefresh() {
    const today = new Date().toDateString();
    if (state.lastLoginDate !== today) {
        
        if (state.hasCalculated) {
            // Apply penalty for uncompleted tasks from yesterday
            let penalty = 0;
            state.actions.forEach(a => {
                if (!a.completed) {
                    penalty += a.reduction;
                }
            });
            state.cumulativeReduction -= penalty;
        }

        // Evaluate yesterday's performance for streak
        if (!state.streakIncrementedToday && state.streak > 0) {
            state.streak = 0; // Broke the streak yesterday
        }

        // Reset tasks
        state.actions.forEach(a => a.completed = false);
        state.streakIncrementedToday = false;
        state.lastLoginDate = today;
        
        // Recalculate current footprint
        calculateCurrentFootprint();
        saveState();
    }
}

// --- DOM Elements ---
const navLinks = document.querySelectorAll('.nav-links li');
const sections = document.querySelectorAll('.content-section');
const calcForm = document.getElementById('calculator-form');
const resultBox = document.getElementById('calc-result');
const resultValue = document.getElementById('result-value');
const totalFootprint = document.getElementById('total-footprint');
const footprintStatus = document.getElementById('footprint-status');
const actionsCompleted = document.getElementById('actions-completed');
const actionsTotal = document.getElementById('actions-total');
const actionProgress = document.getElementById('action-progress');
const streakCount = document.getElementById('streak-count');
const trackerList = document.getElementById('tracker-list');
const chatHistory = document.getElementById('chat-history');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send');

// --- Navigation Logic ---
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        const targetId = link.getAttribute('data-target');
        const targetSection = document.getElementById(targetId);

        // Remove active class from all links and sections
        navLinks.forEach(l => l.classList.remove('active'));
        sections.forEach(s => {
            s.classList.remove('active');
            if (s.id !== targetId) {
                setTimeout(() => {
                    if (!s.classList.contains('active')) {
                        s.style.display = 'none';
                    }
                }, 400); 
            }
        });

        // Add active class to clicked link
        link.classList.add('active');

        // Show target section
        targetSection.style.display = 'block';
        setTimeout(() => {
            targetSection.classList.add('active');
        }, 10);
    });
});

// --- Calculator Logic ---
const footprintValues = {
    transport: { car_petrol: 4.6, car_diesel: 5.1, car_ev: 1.5, public_taxi: 3.5, public: 1.0, bike_walk: 0 },
    diet: { meat_heavy: 3.3, average: 2.5, vegetarian: 1.7, vegan: 1.5 },
    energy: { high: 5.0, average: 3.0, low: 1.5, renewable: 0.5 }
};

calcForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const t = document.getElementById('transport').value;
    const d = document.getElementById('diet').value;
    const en = document.getElementById('energy').value;

    state.userProfile = { transport: t, diet: d, energy: en };
    
    const tVal = footprintValues.transport[t];
    const dVal = footprintValues.diet[d];
    const enVal = footprintValues.energy[en];

    state.footprintBreakdown = { transport: tVal, diet: dVal, energy: enVal };
    
    const total = tVal + dVal + enVal;
    state.baseFootprint = parseFloat(total.toFixed(2));
    state.hasCalculated = true;
    
    // Reset cumulative reduction when recalculating baseline
    state.cumulativeReduction = 0;
    state.actions.forEach(a => a.completed = false);

    calculateCurrentFootprint(); // This will saveState internally

    // Update Form UI
    resultValue.textContent = state.baseFootprint;
    resultBox.classList.remove('hidden');

    triggerAssistantAnalysis();
});

function calculateCurrentFootprint() {
    let allCompleted = state.actions.every(a => a.completed);
    
    // Dynamic Streak Logic
    if (allCompleted && !state.streakIncrementedToday) {
        state.streak++;
        state.streakIncrementedToday = true;
        showStreakAnimation();
    } else if (!allCompleted && state.streakIncrementedToday) {
        state.streak--;
        state.streakIncrementedToday = false;
    }

    // Calculate permanent reduction
    let current = state.baseFootprint - state.cumulativeReduction;
    state.currentFootprint = current > 0 ? parseFloat(current.toFixed(3)) : 0;
    
    saveState();
}

function showStreakAnimation() {
    const icon = document.querySelector('.streak-icon');
    if (icon) {
        // Remove and re-add class with reflow to ensure animation restarts
        icon.classList.remove('pop-animation');
        void icon.offsetWidth; 
        icon.classList.add('pop-animation');
    }
}

// --- Dashboard & Gamification UI ---
function updateDashboardUI() {
    if (!state.hasCalculated) return;

    totalFootprint.textContent = state.currentFootprint;
    streakCount.textContent = state.streak;

    if (state.currentFootprint > 10) {
        footprintStatus.textContent = "Higher than average. Complete tasks to reduce it!";
        footprintStatus.style.color = "#d32f2f";
    } else if (state.currentFootprint > 5) {
        footprintStatus.textContent = "Average footprint. Good start!";
        footprintStatus.style.color = "#f57c00";
    } else {
        footprintStatus.textContent = "Excellent! You have a low footprint.";
        footprintStatus.style.color = "#388e3c";
    }

    // Evaluate Badges
    const badges = [
        { id: 'badge-streak-bronze', condition: state.streak >= 3, name: 'Bronze (3 Days)', icon: 'fa-solid fa-fire', color: 'bronze' },
        { id: 'badge-streak-silver', condition: state.streak >= 7, name: 'Silver (7 Days)', icon: 'fa-solid fa-fire-flame-curved', color: 'silver' },
        { id: 'badge-streak-gold', condition: state.streak >= 30, name: 'Gold (30 Days)', icon: 'fa-solid fa-crown', color: 'gold' },
        { id: 'badge-footprint-bronze', condition: state.currentFootprint > 0 && state.currentFootprint <= 4.0, name: 'Footprint < 4', icon: 'fa-solid fa-leaf', color: 'bronze' },
        { id: 'badge-footprint-silver', condition: state.currentFootprint > 0 && state.currentFootprint <= 2.5, name: 'Footprint < 2.5', icon: 'fa-brands fa-envira', color: 'silver' },
        { id: 'badge-footprint-gold', condition: state.currentFootprint > 0 && state.currentFootprint <= 1.5, name: 'Footprint < 1.5', icon: 'fa-solid fa-tree', color: 'gold' },
    ];

    badges.forEach(b => {
        const el = document.getElementById(b.id);
        el.classList.toggle('unlocked', b.condition);

        if (b.condition && !state.unlockedBadges.includes(b.id)) {
            state.unlockedBadges.push(b.id);
            if (state.hasCalculated) {
                showToast("Achievement Unlocked!", b.name, b.icon, b.color);
            }
            saveState();
        } else if (!b.condition && state.unlockedBadges.includes(b.id)) {
            state.unlockedBadges = state.unlockedBadges.filter(id => id !== b.id);
            saveState();
        }
    });

    renderChart();
}

// --- Toast Notification Logic ---
function showToast(title, message, iconClass, colorVar) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <div class="toast-icon" style="color: var(--${colorVar})"><i class="${iconClass}"></i></div>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;
    container.appendChild(toast);
    
    // Trigger slide-in
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Slide-out and remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// --- Tracker Logic ---
function renderTracker() {
    trackerList.innerHTML = '';
    let completedCount = 0;

    state.actions.forEach(action => {
        if (action.completed) completedCount++;

        const item = document.createElement('div');
        item.className = `tracker-item ${action.completed ? 'completed' : ''}`;
        item.innerHTML = `
            <div class="checkbox"></div>
            <div class="item-text">${action.text} <span class="item-reduction">(-${action.reduction} tons)</span></div>
            <div class="item-impact">${action.impact}</div>
        `;

        item.addEventListener('click', () => {
            if(!state.hasCalculated) {
                alert("Please calculate your baseline footprint in the Calculator first!");
                return;
            }
            if (!action.completed) {
                action.completed = true;
                state.cumulativeReduction += action.reduction;
            } else {
                action.completed = false;
                state.cumulativeReduction -= action.reduction;
            }
            
            calculateCurrentFootprint(); // Saves state and updates UI
            renderTracker();
        });

        trackerList.appendChild(item);
    });

    // Update Dashboard Stats for Tracker
    actionsCompleted.textContent = completedCount;
    actionsTotal.textContent = state.actions.length;
    actionProgress.style.width = `${(completedCount / state.actions.length) * 100}%`;
}

// --- Chart.js Visualization ---
function renderChart() {
    const ctx = document.getElementById('footprintChart').getContext('2d');
    
    if (myChart) {
        myChart.destroy();
    }

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Transport', 'Diet', 'Energy'],
            datasets: [{
                data: [state.footprintBreakdown.transport, state.footprintBreakdown.diet, state.footprintBreakdown.energy],
                backgroundColor: ['#4CAF50', '#81C784', '#C8E6C9'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}


// --- AI Assistant Logic (Simulated) ---
function addMessage(text, sender = 'assistant') {
    const msg = document.createElement('div');
    msg.className = `message ${sender}`;
    let avatarIcon = sender === 'assistant' ? 'fa-robot' : 'fa-user';
    msg.innerHTML = `
        <div class="avatar"><i class="fa-solid ${avatarIcon}"></i></div>
        <div class="bubble">${text}</div>
    `;
    chatHistory.appendChild(msg);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function triggerAssistantAnalysis(silent = false) {
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
    
    if (silent) return; // Don't spam messages on reload

    setTimeout(() => {
        let msg = `I've analyzed your profile. Your baseline footprint is **${state.baseFootprint} tons CO₂/yr**. `;
        
        if (state.userProfile.transport === 'car_petrol' || state.userProfile.transport === 'car_diesel') {
            msg += "Since you drive a petrol/diesel car daily, consider carpooling or switching to public transit (like bus or metro) a few days a week to make a massive impact. ";
        } else if (state.userProfile.transport === 'public_taxi') {
            msg += "Using taxis or auto-rickshaws frequently still adds up. Try using the metro or bus for routine commutes if possible! ";
        }

        if (state.userProfile.diet === 'meat_heavy') {
            msg += "A meat-heavy diet contributes significantly to emissions. Trying 'Meatless Mondays' is an easy way to lower your impact! ";
        }
        
        msg += "Head to the Action Tracker to complete daily tasks and lower your footprint to unlock badges!";
        addMessage(msg, 'assistant');
    }, 1000);
}

// Handle Chat
chatSendBtn.addEventListener('click', handleUserMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleUserMessage();
});

function handleUserMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    chatInput.value = '';

    setTimeout(() => {
        let response = "That's a great question! Reducing carbon footprint is an ongoing journey.";
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('diet') || lowerText.includes('food')) {
            response = "For food, try buying local and seasonal produce. It reduces transportation emissions and supports local farmers!";
        } else if (lowerText.includes('car') || lowerText.includes('transport')) {
            response = "Transportation is a major emission source. Even proper tire inflation can improve gas mileage by up to 3%, saving fuel!";
        } else if (lowerText.includes('energy') || lowerText.includes('electricity')) {
            response = "Switching to LED bulbs uses at least 75% less energy and lasts 25 times longer than incandescent lighting.";
        } else {
            response = "I'm still learning! But I recommend checking your Action Tracker and completing tasks to keep your streak going.";
        }

        addMessage(response, 'assistant');
    }, 1000);
}

// --- Report Export (html2canvas) ---
document.getElementById('btn-export').addEventListener('click', () => {
    const target = document.getElementById('export-target');
    
    html2canvas(target, { backgroundColor: '#f1f8e9' }).then(canvas => {
        const link = document.createElement('a');
        link.download = `EcoTrack-Report-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
});

// --- Dev Tools (Testing only) ---
document.getElementById('dev-next-day').addEventListener('click', () => {
    // Manually set last login to yesterday
    let yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    state.lastLoginDate = yesterday.toDateString();
    saveState();
    
    // Reload state which triggers checkDailyRefresh()
    loadState();
    alert("Simulated next day! Notice how the tasks have reset and your streak was evaluated.");
});

document.getElementById('dev-clear').addEventListener('click', () => {
    localStorage.removeItem('ecoTrackState');
    location.reload();
});

// Boot app
loadState();
