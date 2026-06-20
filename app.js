// --- State Management ---
let state = {
    footprint: 0,
    hasCalculated: false,
    actions: [
        { id: 1, text: "Use reusable shopping bags", impact: "Low Impact", completed: false },
        { id: 2, text: "Turn off lights when leaving room", impact: "Low Impact", completed: false },
        { id: 3, text: "Use public transport or carpool", impact: "High Impact", completed: false },
        { id: 4, text: "Eat a meatless meal today", impact: "Medium Impact", completed: false },
        { id: 5, text: "Unplug electronics not in use", impact: "Low Impact", completed: false },
        { id: 6, text: "Wash clothes in cold water", impact: "Medium Impact", completed: false }
    ],
    userProfile: {
        transport: null,
        diet: null,
        energy: null
    }
};

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
const trackerList = document.getElementById('tracker-list');
const chatHistory = document.getElementById('chat-history');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send');

// --- Navigation Logic ---
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        // Remove active class from all links and sections
        navLinks.forEach(l => l.classList.remove('active'));
        sections.forEach(s => {
            s.classList.remove('active');
            setTimeout(() => s.style.display = 'none', 400); // Wait for transition
        });

        // Add active class to clicked link
        link.classList.add('active');

        // Show target section
        const targetId = link.getAttribute('data-target');
        const targetSection = document.getElementById(targetId);
        targetSection.style.display = 'block';
        
        // Small delay to ensure display:block applies before animating opacity
        setTimeout(() => {
            targetSection.classList.add('active');
        }, 10);
    });
});

// --- Calculator Logic ---
const footprintValues = {
    transport: { car_gas: 4.6, car_ev: 1.5, public: 1.0, bike_walk: 0 },
    diet: { meat_heavy: 3.3, average: 2.5, vegetarian: 1.7, vegan: 1.5 },
    energy: { high: 5.0, average: 3.0, low: 1.5, renewable: 0.5 }
};

calcForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const t = document.getElementById('transport').value;
    const d = document.getElementById('diet').value;
    const en = document.getElementById('energy').value;

    state.userProfile = { transport: t, diet: d, energy: en };

    const total = footprintValues.transport[t] + footprintValues.diet[d] + footprintValues.energy[en];
    state.footprint = parseFloat(total.toFixed(2));
    state.hasCalculated = true;

    // Update UI
    resultValue.textContent = state.footprint;
    resultBox.classList.remove('hidden');
    totalFootprint.textContent = state.footprint;

    if (state.footprint > 10) {
        footprintStatus.textContent = "Higher than average. Let's work on reducing it!";
        footprintStatus.style.color = "#d32f2f";
    } else if (state.footprint > 5) {
        footprintStatus.textContent = "Average footprint. Good start!";
        footprintStatus.style.color = "#f57c00";
    } else {
        footprintStatus.textContent = "Excellent! You have a low footprint.";
        footprintStatus.style.color = "#388e3c";
    }

    // Trigger Assistant Welcome based on results
    triggerAssistantAnalysis();
});

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
            <div class="item-text">${action.text}</div>
            <div class="item-impact">${action.impact}</div>
        `;

        item.addEventListener('click', () => {
            action.completed = !action.completed;
            renderTracker();
        });

        trackerList.appendChild(item);
    });

    // Update Dashboard Stats
    actionsCompleted.textContent = completedCount;
    actionsTotal.textContent = state.actions.length;
    actionProgress.style.width = `${(completedCount / state.actions.length) * 100}%`;
}

// Initial Render
renderTracker();

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

function triggerAssistantAnalysis() {
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
    
    setTimeout(() => {
        let msg = `I've analyzed your profile. Your estimated footprint is **${state.footprint} tons CO₂/yr**. `;
        
        if (state.userProfile.transport === 'car_gas') {
            msg += "Since you drive a gas car daily, consider carpooling or switching to public transit a few days a week to make a massive impact. ";
        }
        if (state.userProfile.diet === 'meat_heavy') {
            msg += "A meat-heavy diet contributes significantly to emissions. Trying 'Meatless Mondays' is an easy way to lower your impact! ";
        }
        
        msg += "How can I help you achieve your goals today?";
        
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

    // Simulated Thinking
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
            response = "I'm still learning! But I recommend checking your Action Tracker and completing at least one task today to make a difference.";
        }

        addMessage(response, 'assistant');
    }, 1000);
}
