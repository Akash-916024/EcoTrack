// --- Initial State Definition ---
let geminiApiKey = localStorage.getItem('geminiApiKey') || '';

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
        { id: 1, type: "daily", text: "Use a bucket bath instead of a shower", impact: "High Impact", reduction: 0.020, completed: false },
        { id: 2, type: "daily", text: "Turn off fans/AC when leaving room", impact: "Medium Impact", reduction: 0.010, completed: false },
        { id: 3, type: "daily", text: "Carry a cloth bag for shopping", impact: "Low Impact", reduction: 0.005, completed: false },
        { id: 4, type: "bonus", text: "Take a train instead of personal vehicle", impact: "High Impact", reduction: 0.030, completed: false },
        { id: 5, type: "bonus", text: "Eat a completely plant-based meal", impact: "Medium Impact", reduction: 0.015, completed: false },
        { id: 6, type: "bonus", text: "Avoid food delivery apps (cook at home)", impact: "Low Impact", reduction: 0.010, completed: false }
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
        
        // Force migration for new schema (daily vs bonus)
        if (parsed.actions.length > 0 && !parsed.actions[0].type) {
            localStorage.removeItem('ecoTrackState');
            state = JSON.parse(JSON.stringify(defaultState));
            saveState();
            loadState(); // Recursively reload
            return;
        }

        // Ensure new properties exist
        if (!parsed.unlockedBadges) parsed.unlockedBadges = [];
        if (parsed.cumulativeReduction === undefined) parsed.cumulativeReduction = 0;
        
        // Force update reduction values from defaultState in case of old cached data
        parsed.actions.forEach((savedAction, index) => {
            if (defaultState.actions[index]) {
                savedAction.reduction = defaultState.actions[index].reduction;
            }
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
            // Apply penalty for uncompleted DAILY tasks from yesterday
            let penalty = 0;
            state.actions.forEach(a => {
                if (a.type === 'daily' && !a.completed) {
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
    let anyDailyCompleted = state.actions.some(a => a.completed && a.type === 'daily');
    
    // Dynamic Streak Logic (Requires at least 1 daily task)
    if (anyDailyCompleted && !state.streakIncrementedToday) {
        state.streak++;
        state.streakIncrementedToday = true;
        showStreakAnimation();
    } else if (!anyDailyCompleted && state.streakIncrementedToday) {
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
        if (el) el.classList.toggle('unlocked', b.condition);

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
    const dailyList = document.getElementById('daily-tracker-list');
    const bonusList = document.getElementById('bonus-tracker-list');
    
    if (!dailyList || !bonusList) return;
    dailyList.innerHTML = '';
    bonusList.innerHTML = '';
    let completedCount = 0;

    state.actions.forEach(action => {
        if (action.completed) completedCount++;
        const item = document.createElement('div');
        item.className = `tracker-item ${action.completed ? 'completed' : ''}`;
        
        item.innerHTML = `
            <div class="checkbox ${action.completed ? 'checked' : ''}" aria-label="Toggle task completion">
                <i class="fa-solid fa-check"></i>
            </div>
            <div class="tracker-info">
                <h4>${action.text}</h4>
                <p>${action.impact} (-${action.reduction} tons)</p>
            </div>
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

        if (action.type === 'daily') {
            dailyList.appendChild(item);
        } else {
            bonusList.appendChild(item);
        }
    });

    // Update Dashboard Stats for Tracker
    actionsCompleted.textContent = completedCount;
    actionsTotal.textContent = state.actions.length;
    if (actionProgress) actionProgress.style.width = `${(completedCount / state.actions.length) * 100}%`;
}

// --- Chart.js Visualization ---
function renderChart() {
    const canvas = document.getElementById('footprintChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
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


// --- AI Assistant Logic ---
function triggerAssistantAnalysis(silent = false) {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    if (input && sendBtn) {
        input.disabled = false;
        sendBtn.disabled = false;
    }

    if (!silent) {
        const history = document.getElementById('chat-history');
        history.innerHTML += `
            <div class="message assistant">
                <div class="avatar"><i class="fa-solid fa-robot"></i></div>
                <div class="bubble">I see you've updated your profile! You have a footprint of ${state.currentFootprint} tons. How can I help you reduce it today?</div>
            </div>
        `;
    }
}

// Smarter Simulated AI
function generateSimulatedResponse(msg) {
    let uncompletedDaily = state.actions.filter(a => a.type === 'daily' && !a.completed).map(a => a.text).join(", ");
    let uncompletedBonus = state.actions.filter(a => a.type === 'bonus' && !a.completed).map(a => a.text).join(", ");
    
    let advice = "<strong>Based on your profile:</strong><br>";
    if (state.userProfile.transport === 'petrol' || state.userProfile.transport === 'diesel') {
        advice += "🚂 Switching from a fossil-fuel vehicle to a train or EV can massively reduce your footprint.<br>";
    }
    if (state.userProfile.diet === 'meat') {
        advice += "🥗 Adding just one more completely plant-based meal a week has a huge impact.<br>";
    }
    
    if (uncompletedDaily) {
        advice += `<br><strong>⚠️ Don't forget your daily tasks:</strong><br>- ${uncompletedDaily.replace(/, /g, "<br>- ")}<br><em>Missing these will increase your footprint tomorrow!</em>`;
    }
    if (uncompletedBonus) {
        advice += `<br><br><strong>🌟 Looking for extra reductions? Try:</strong><br>- ${uncompletedBonus.replace(/, /g, "<br>- ")}`;
    }
    
    return advice;
}

// Gemini Fetch call
async function fetchGeminiResponse(userMsg) {
    if (!geminiApiKey) return generateSimulatedResponse(userMsg);
    
    const context = `You are an EcoTrack AI Assistant. The user's base footprint is ${state.baseFootprint} tons CO2/yr and current footprint is ${state.currentFootprint} tons. Their profile: Transport=${state.userProfile.transport}, Diet=${state.userProfile.diet}, Energy=${state.userProfile.energy}. They have these uncompleted tasks: ${state.actions.filter(a => !a.completed).map(a => a.text).join(", ")}. If you recommend a new actionable task for them to track, append exactly this string to the very end of your response: [ADD_ACTION] <Task Name>. E.g., [ADD_ACTION] Plant a tree in the neighborhood. Keep answers concise, actionable, and formatted with emojis.`;
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { role: "user", parts: [{ text: context + "\n\nUser Message: " + userMsg }] }
                ]
            })
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        
        let text = data.candidates[0].content.parts[0].text;
        
        // Check for Add Action command
        const actionMatch = text.match(/\[ADD_ACTION\]\s*(.+)$/im);
        if (actionMatch) {
            const newAction = actionMatch[1].trim();
            text = text.replace(/\[ADD_ACTION\]\s*(.+)$/im, `<br><br><button class="btn btn-outline btn-sm action-add-btn" data-action="${newAction}">Add "${newAction}" to Bonus Actions</button>`);
        }
        
        // Basic Markdown to HTML parsing for bolding
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        return text;
    } catch (e) {
        console.error(e);
        return `<em>(Error connecting to Gemini. Falling back to simulated AI)</em><br><br>` + generateSimulatedResponse(userMsg);
    }
}

async function handleChatSubmit() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    const chatHistory = document.getElementById('chat-history');
    
    // User message
    chatHistory.innerHTML += `
        <div class="message user">
            <div class="bubble">${msg}</div>
            <div class="avatar"><i class="fa-solid fa-user"></i></div>
        </div>
    `;
    
    input.value = '';
    
    // Typing indicator
    chatHistory.innerHTML += `
        <div class="message assistant typing-indicator">
            <div class="avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="bubble">...</div>
        </div>
    `;
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Fetch Response
    const responseHTML = await fetchGeminiResponse(msg);
    
    // Remove typing indicator
    document.querySelector('.typing-indicator').remove();
    
    // Add Assistant message
    chatHistory.innerHTML += `
        <div class="message assistant">
            <div class="avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="bubble">${responseHTML}</div>
        </div>
    `;
    
    // Add event listeners to dynamically added buttons
    document.querySelectorAll('.action-add-btn').forEach(btn => {
        // Clone to remove previous listeners if re-binding
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', (e) => {
            const actionText = e.target.getAttribute('data-action');
            state.actions.push({
                id: Date.now(),
                type: 'bonus',
                text: actionText,
                impact: "AI Custom",
                reduction: 0.015,
                completed: false
            });
            saveState();
            renderTracker();
            showToast("Action Added!", `"${actionText}" added to Bonus Actions.`, "fa-solid fa-plus", "silver");
            e.target.disabled = true;
            e.target.textContent = "Added to Tracker!";
        });
    });

    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Handle Chat
chatSendBtn.addEventListener('click', handleChatSubmit);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChatSubmit();
});

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
document.getElementById('demo-next-day').addEventListener('click', () => {
    // Manually set last login to yesterday
    let yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    state.lastLoginDate = yesterday.toDateString();
    saveState();
    
    // Reload state which triggers checkDailyRefresh()
    loadState();
    alert("Simulated next day! Notice how the tasks have reset and your streak was evaluated.");
});

document.getElementById('demo-reset').addEventListener('click', () => {
    if(confirm("Are you sure you want to reset all data?")) {
        localStorage.removeItem('ecoTrackState');
        localStorage.removeItem('geminiApiKey');
        location.reload();
    }
});

// API Key Event Listener
const apiKeyInput = document.getElementById('gemini-api-key');
const saveKeyBtn = document.getElementById('save-api-key');
if (apiKeyInput && saveKeyBtn) {
    apiKeyInput.value = geminiApiKey;
    saveKeyBtn.addEventListener('click', () => {
        geminiApiKey = apiKeyInput.value.trim();
        localStorage.setItem('geminiApiKey', geminiApiKey);
        showToast("Success", "Gemini API Key Saved!", "fa-solid fa-key", "gold");
    });
}

// Boot app
loadState();
