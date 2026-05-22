# Heal U: Advanced AI Medical Orchestrator

**Submission for AISeekho 2026 Hackathon — Challenge 2: AI Service Orchestrator for Informal Economy (Medical/Health Adaptation)**

Heal U is an autonomous, agentic AI orchestrator designed to transform how users interact with medical services. Instead of static menus or disconnected apps, Heal U uses natural language processing to understand symptoms, triage emergencies, match users with specialists or pharmacies, simulate bookings, and schedule automated follow-ups—all within a unified, dynamic chat interface.

---

## 1. Overall Design of the Solution

The design philosophy of Heal U centers around converting conversational intent into concrete, stateful UI actions. 
When a user describes a health issue (in English, Roman Urdu, or Urdu), the AI doesn't just reply with text; it issues structured commands that dynamically alter the application interface.
- **Dynamic UI Shifts:** The UI seamlessly transitions from a standard chat view into actionable "Smart Cards" (e.g., Doctor Recommendation Cards, Medicine Order Modules) based on the AI's internal decisions.
- **Multimodal Health Records:** Users can upload lab reports (PDF/Images). The AI reads the visual data, stores it in a central Medical Library, and cross-references the findings with the user's reported symptoms to provide an accurate diagnosis.
- **Proactive Follow-ups:** The system moves beyond reactive chat by calculating follow-up timestamps upon service booking. It autonomously initiates check-ins with the user to track their recovery and confirm medication adherence.

---

## 2. Brief Overview of Architecture

Heal U is built on a modern, decoupled architecture designed for speed, fluidity, and cross-platform compatibility.

- **Frontend Application:** Built using **React (Vite) with TypeScript**, optimized for mobile-first rendering. It utilizes **TailwindCSS** for a premium, glassmorphic UI, and **Framer Motion** for fluid, app-like micro-animations (e.g., the Transformers-style mechanical loading screens).
- **Cross-Platform Native Shell:** The web codebase is wrapped using **Capacitor (React Native / Expo equivalent)**, allowing it to be compiled into a standalone native Android application (APK).
- **Backend & State Management:** Powered by **Firebase**.
  - **Firestore:** Used for real-time chat synchronization, medical record storage, and background state persistence.
  - **Firebase Storage:** Handles the secure upload and retrieval of medical documents and imagery.

---

## 3. Agents Developed (Antigravity Orchestration)

The entire logic and reasoning pipeline is orchestrated via **Google Antigravity**. We developed a multi-agent delegation system that handles specific domains:

1. **Emergency Triage Agent:** Scans every message for critical keywords (e.g., "heart attack", "bleeding"). If detected, it bypasses standard flows and triggers an immediate `detectEmergency` payload to dispatch an ambulance.
2. **Medical Diagnosis & Recommendation Agent:** Analyzes non-critical symptoms. It is responsible for mapping vague user descriptions to specific medical fields (e.g., mapping "stomach pain" to a "Gastroenterologist").
3. **Provider Matching Agent:** Uses the user's contextual data (like their city) to filter our mock datasets, ranking doctors and pharmacies by distance and rating, and returning the most optimal match.
4. **Multimodal Analysis Agent:** Specialized in optical character recognition (OCR) and document understanding to extract vital markers from uploaded health reports.

---

## 4. Mock / Real APIs Used

To build a fully functional prototype without access to proprietary live healthcare systems, we engineered robust simulated APIs and datasets:

- **Mock Provider API (Oladoc Simulation):** A comprehensive dataset of doctors categorized by speciality, hospital affiliation, fee, and location. The AI queries this dataset to find the best match for the user.
- **Mock Pharmacy API (Dvago/Dawaai Simulation):** An inventory dataset of medicines (e.g., Panadol, ORS). The AI queries this to find exact chemical formulations and simulate stock availability.
- **Booking Simulation Engine:** A custom-built timing and execution simulation. When a user confirms a booking, this simulated API dynamically generates delivery slots or appointment times and updates the Firebase backend with a "Confirmed" status.

---

## 5. Integrations Implemented

- **Firebase Firestore Integration:** Deep integration for storing `medicalRecords`. Every time a simulation booking is confirmed, it is written to the database, instantly updating the user's "Records" and "Health" dashboards.
- **Antigravity Action-Payload Integration:** The frontend is deeply integrated with the Antigravity output stream. We implemented a parser that intercepts hidden JSON `---ACTION---` payloads from the AI (such as `{"consultDoctor": true}`) and binds them to React state to trigger UI changes.
- **Automated Scheduler Integration:** The follow-up system integrates with the device's clock and Firebase timestamps, creating an automated loop that renders specific check-in notifications exactly when the required time has elapsed.
