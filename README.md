# Heal U: Advanced AI Medical Orchestrator
**Submission for AISeekho 2026 Hackathon — Challenge 2: AI Service Orchestrator for Informal Economy (Medical/Health Adaptation)**

Heal U is an end-to-end agentic AI system designed to automate the lifecycle of medical service requests. From understanding natural language symptom descriptions to triaging, recommending nearby specialists, simulating medical bookings, and scheduling follow-up care, Heal U acts as a fully autonomous health orchestrator.

---

## 1. System Architecture

Heal U is built with a modern, decoupled architecture:
- **Frontend / Client**: React Native (via Expo) translated to the web using Vite & React. Built with fluid Framer Motion animations and an elegant, Gemini-inspired UI to ensure a premium user experience.
- **Agentic Core**: Powered entirely by **Google Antigravity** orchestration, utilizing a dynamic Python/Node.js simulation environment.
- **Database / State**: Firebase Firestore is used for real-time chat sync, medical record storage, and state persistence for background follow-ups.
- **Storage**: Firebase Storage manages uploaded medical reports (PDFs, images) for multimodal AI analysis.

---

## 2. Core Orchestration via Google Antigravity (25%)

The entire reasoning, decision-making, and execution pipeline is governed by Google Antigravity. 
- **Multi-Agent Delegation**: Antigravity orchestrates a central `Emergency Triage Agent` that dynamically routes requests to specialized sub-agents (`DoctorMatchingAgent`, `PharmacyAgent`, `HealthReportAnalyzer`).
- **Tool Integration**: Antigravity seamlessly integrates with simulated Google Maps/Places data to fetch geolocated doctors and pharmacies based on the user's city profile.
- **Stateful Execution**: Antigravity triggers dynamic UI state changes (e.g., rendering specific control modules like Doctor Cards or Emergency Overlays) by returning structured `---ACTION---` payloads alongside conversational responses.

---

## 3. Agentic Reasoning & Workflow (20%)

Heal U demonstrates advanced multi-step reasoning and autonomy:
1. **Intent Understanding**: The system parses Roman Urdu, Urdu, or English (e.g., *"Mujhe kal se shadeed sir dard hai"*).
2. **Triage Logic**: It evaluates the severity. If high severity (e.g., chest pain), it bypasses normal flow and triggers an immediate **Emergency Protocol** with ambulance dispatch simulations. If low/medium, it proceeds to standard diagnostic analysis.
3. **Multimodal Analysis**: Users can attach lab reports. The agent reads the document, reasons about the medical markers, and cross-references them with the reported symptoms.
4. **Structured Decision**: Instead of just chatting, the agent formulates a concrete plan, deciding whether to recommend a specialist, order medicine, or both.

---

## 4. Matching Quality & Decision Logic (20%)

Provider discovery and matching are not hardcoded; they rely on intelligent ranking criteria:
- **Service Category Match**: The agent maps vague symptoms ("stomach hurts") to precise medical specialities ("Gastroenterologist").
- **Proximity & Availability Ranking**: Using simulated location context (e.g., the user's profile city), the agent filters and ranks real-world mock datasets (e.g., Oladoc provider data, Dvago pharmacy inventory) by distance and simulated rating.
- **Clear Reasoning**: Every recommendation is accompanied by a transparent explanation (e.g., *"I recommend Dr. Sarah because she specializes in neurology and is the closest top-rated doctor in your area."*).

---

## 5. Action Simulation & Execution (15%)

We have built a robust, end-to-end simulated execution environment that clearly demonstrates system state changes:
- **In-App Booking Confirmation**: Clicking on a recommended doctor or medicine intercepts the action and triggers an in-app simulated overlay.
- **Dynamic Scheduling**: The system automatically generates a mock booking slot (e.g., "Tomorrow at 10:00 AM") or delivery estimate.
- **Database State Change**: Upon confirmation, the booking is executed and written to the Firebase `medicalRecords` database with a "Confirmed" status, updating the user's central health dashboard in real-time.
- **Follow-Up Automation**: The system calculates a follow-up timestamp. A background proactive-care loop continually monitors the database and, when the time arrives, autonomously injects a personalized follow-up message into the chat asking how the user is feeling post-appointment.

---

## 6. Innovation & UX (10%)

- **Premium Aesthetics**: The app features a stunning "Transformers-style" mechanical loading screen, smooth deep-space gradients, and micro-animations that rival top-tier consumer apps (scoring high on UI/UX).
- **Dynamic UI Payloads**: The interface breaks out of the "chatbot box." It automatically transitions from chat bubbles to interactive, actionable UI cards based on the AI's hidden JSON commands.

---

## APIs, Tools & Datasets Used
- **Google Antigravity**: Core agentic orchestration and reasoning.
- **Firebase**: Firestore (DB), Storage (Media), Auth (Session).
- **Mock Provider Datasets**: Simulated APIs containing real-world data structures based on platforms like Oladoc and Dvago for authentic provider matching.
- **Framer Motion & TailwindCSS**: For advanced, fluid UI state transitions.

## Assumptions & Limitations
- **Simulated Provider APIs**: Actual real-time booking APIs for local doctors are proprietary; therefore, realistic mock datasets and simulated timing engines are used to demonstrate the logic.
- **Location Mapping**: Broad city-level context is used for matching rather than exact GPS coordinates to protect privacy during the demo.
