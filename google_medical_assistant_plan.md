# Google Medical Assistant Implementation Plan

This document outlines the architectural and technical steps to transform our current medical orchestrator into a premium, "Google-grade" health product.

## 1. Backend: Persistent Session Memory & Intelligence

### 🧠 Session Store (routers/emergency.py)
*   **Data Structure**: Replace `chat_sessions` with `session_histories = {}`.
*   **Format**: Store messages as a rolling array of dictionaries:
    ```python
    session_histories[session_id] = [
        {"role": "user", "content": "..."},
        {"role": "model", "content": "..."}
    ]
    ```
*   **System Prompt Formatting**:
    *   The prompt will transition from viewing messages in isolation to receiving the full `history` array.
    *   We will use Gemini's native chat history format or a structured text representation that clearly demarcates turns.

### 🩺 Conversational Clinician Persona
*   **Tone**: Empathic, professional, and thorough.
*   **Behavior**: Avoid looping on hardcoded questions. Acknowledge previous input (e.g., "I understand you've been feeling that knee pain for three days now...") before asking for more details.
*   **Threshold Logic**:
    *   `show_doctor_button`: Set to `true` only when the user provides specific anatomical location, pain level (1-10), and approximate age/medical background.
    *   `show_medicine_button`: Set to `true` only when a potential condition from the target list is identified with high confidence (>80%) and OTC treatment is safe.
    *   **Context Flags**: Ensure these stay `false` during the discovery phase to prevent premature action.

---

## 2. Frontend: Premium Clean UI (TriageScreen.tsx)

### 🎨 Aesthetic & Design System
*   **Theme**: Google Material Design 3 / Pastel Palette.
    *   **Primary**: Mint Green (#E8F5E9) for health/safety.
    *   **Secondary**: Soft Lavender (#F3E5F5) for calm interactions.
    *   **Background**: Near-white Surface (#FAFAFA).
*   **Components**: 
    *   Curved corners (borderRadius: 24+).
    *   Spacious layouts with generous padding.
    *   Subtle shadows (elevation: 2-4) for depth.

### 💬 Unified Single-Chat Interface
*   **Flow**: No modes or tabs. Everything happens within the chat feed.
*   **Action Panels**:
    *   **Doctor Cards**: A horizontal scrolling list of doctor profiles.
    *   **Medicine Form**: A sleek slider or compact form for condition refinement.
    *   **Trigger**: These panels slide up *inline* directly beneath the latest chat bubble from the assistant.
*   **Control**: A prominent `[ ✕ Hide Options ]` dismiss button to clear action panels and return to pure conversation mode.

---

## 3. Technical Roadmap

### Phase 1: Backend Session & Prompt Refactoring
- [ ] Implement `session_histories` in `emergency.py`.
- [ ] Refactor `process_triage` to pass full history to Gemini.
- [ ] Update System Prompt with strict clinician behavior and trigger thresholds.

### Phase 2: Frontend UI Transformation
- [ ] Update `TriageScreen.tsx` with Material Pastel color palette.
- [ ] Redesign chat bubbles for a more spacious, premium feel.
- [ ] Implement inline sliding animations for Doctor/Medicine panels.
- [ ] Add the "Hide Options" functionality to restore chat focus.

### Phase 3: Integration & Testing
- [ ] Verify multi-turn conversational flow (no loops).
- [ ] Test trigger conditions for Doctor/Medicine buttons.
- [ ] UI/UX polish (micro-animations, smooth transitions).
