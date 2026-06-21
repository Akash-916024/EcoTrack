# EcoTrack - Carbon Footprint Assistant

EcoTrack is a modern, dynamic web application designed to help individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights. This project is submitted for **Challenge 3** of the Virtual Prompt War.

## Chosen Vertical
**Challenge 3**: Design a solution that helps individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights.

## Approach and Logic
EcoTrack operates entirely in the browser using Vanilla HTML, CSS, and JavaScript. This approach was chosen to ensure maximum performance, zero installation overhead, and a tiny footprint (well under the 10MB limit), while still delivering a premium User Experience.

The application consists of four main pillars:
1. **Dashboard**: A high-level overview of the user's estimated carbon footprint, daily streak, a footprint breakdown chart (via Chart.js), and unlocked gamification badges. Users can also export a shareable Eco Report.
2. **Calculator**: A heuristic-based form that estimates the user's baseline annual carbon footprint based on primary transportation, diet, and home energy usage, tailored to standard and Indian-specific transport options (Petrol, Diesel, EV, Taxi, Metro).
3. **Action Tracker**: A gamified checklist of daily actions categorized by their environmental impact. Completing actions physically reduces the user's calculated footprint and contributes to their Daily Streak.
4. **AI Assistant**: A simulated, dynamic assistant that analyzes the user's calculator inputs to provide tailored recommendations.

## Advanced Features & Gamification
- **State Persistence**: The application uses `localStorage` to save the user's footprint, completed actions, and streak.
- **Daily Refresh**: The app automatically checks the date upon loading. If it is a new day, tasks are refreshed. If the user completed all tasks the previous day, their streak increases.
- **Badge System**: Users unlock Fire/Flame badges for maintaining daily streaks (Bronze, Silver, Gold), and Leaf badges for actively reducing their footprint below certain thresholds.
- **Data Visualization**: A beautiful donut chart automatically renders to show the ratio of emissions from Transport vs. Diet vs. Energy.

## How the Solution Works
1. Upon loading `index.html`, the user is greeted with a sleek, glassmorphism-styled interface.
2. The user navigates to the **Calculator** tab and inputs their lifestyle choices.
3. The JavaScript logic calculates a baseline CO₂ tonnage and stores the context.
4. The user tracks their daily progress in the **Action Tracker**. Checking items lowers their current footprint.
5. Badges unlock on the Dashboard in real-time as footprint drops or streaks increase.
6. The user clicks "Share Report" on the Dashboard to export an image of their progress to share on social media.

## Assumptions Made
- **Heuristics for Calculation**: The carbon footprint values used in the calculator are simplified estimations for demonstration purposes, not rigorous scientific constants.
- **Simulated AI**: The AI assistant logic is simulated via JavaScript conditional logic to ensure the application remains standalone for the hackathon evaluation. 

## Evaluation Focus Areas Addressed
- **Code Quality**: The codebase is cleanly separated into structural HTML, semantic CSS variables, and modular JavaScript functions.
- **Security**: The application runs entirely client-side with no external database connections. LocalStorage is used securely with no PII.
- **Efficiency**: Only two extremely lightweight CDN scripts (Chart.js and html2canvas) are used. The app is zero-install and loads instantly.
- **Testing**: A hidden "Dev Tools" panel is included to simulate the passage of time ("Next Day") to easily verify the streak and refresh logic without waiting 24 hours.
- **Accessibility**: Uses semantic HTML, high contrast UI, and descriptive tags.
