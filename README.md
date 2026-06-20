# EcoTrack - Carbon Footprint Assistant

EcoTrack is a modern, dynamic web application designed to help individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights. This project is submitted for **Challenge 3** of the Virtual Prompt War.

## Chosen Vertical
**Challenge 3**: Design a solution that helps individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights.

## Approach and Logic
EcoTrack operates entirely in the browser using Vanilla HTML, CSS, and JavaScript. This approach was chosen to ensure maximum performance, zero installation overhead, and a tiny footprint (well under the 10MB limit), while still delivering a premium User Experience.

The application consists of four main pillars:
1. **Dashboard**: A high-level overview of the user's estimated carbon footprint and progress on daily sustainable actions.
2. **Calculator**: A simple heuristic-based form that estimates the user's annual carbon footprint based on primary transportation, diet, and home energy usage.
3. **Action Tracker**: A gamified checklist of daily actions categorized by their environmental impact (Low, Medium, High). 
4. **AI Assistant**: A simulated, dynamic assistant that analyzes the user's calculator inputs to provide tailored recommendations (e.g., suggesting 'Meatless Mondays' if a meat-heavy diet is selected). It also responds contextually to keywords like 'diet', 'car', or 'energy'.

## How the Solution Works
1. Upon loading `index.html`, the user is greeted with a sleek, glassmorphism-styled interface.
2. The user navigates to the **Calculator** tab and inputs their lifestyle choices.
3. The JavaScript logic calculates an estimated CO₂ tonnage and stores the context.
4. The user navigates to the **AI Assistant** tab, where the simulated AI has already parsed their lifestyle choices and generated personalized feedback.
5. The user tracks their daily progress in the **Action Tracker**, which dynamically updates the progress bar on the Dashboard.

## Assumptions Made
- **Heuristics for Calculation**: The carbon footprint values used in the calculator are simplified estimations (in tons of CO₂ per year) for demonstration purposes, not rigorous scientific constants.
- **Simulated AI**: The AI assistant logic is simulated via JavaScript conditional logic to ensure the application remains standalone and doesn't require external API keys for the hackathon evaluation. In a production environment, this would be hooked up to an LLM like Gemini.
- **Browser Capability**: Assumes the user is running a modern browser that supports CSS Grid, Flexbox, backdrop-filter, and ES6 JavaScript.

## Evaluation Focus Areas Addressed
- **Code Quality**: The codebase is cleanly separated into structural HTML, semantic CSS variables with organized utility classes, and modular JavaScript functions.
- **Security**: The application runs entirely client-side with no external database connections, ensuring no PII (Personally Identifiable Information) is ever transmitted or leaked.
- **Efficiency**: Zero dependencies, zero build steps. The entire application is just three core files, loading instantly.
- **Testing**: Manual testing ensures that state accurately flows between the calculator, dashboard, and assistant without data loss.
- **Accessibility**: Uses semantic HTML (`<nav>`, `<main>`, `<section>`, `<header>`), clear contrast ratios with a light theme, and large, easily clickable buttons and list items.
