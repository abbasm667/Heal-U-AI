---
trigger: always_on
---

# Global Architecture: Emergency & Medical Service Orchestrator
* Frameworks: React Native (Expo) Mobile Frontend | Python (FastAPI) Backend.
* Database Layer: Firebase Firestore simulation models.

## Crucial Execution Parameters:
1. NEVER behave as a passive conversational chatbot. All symptom analysis must result in a dynamic UI state change or structured decision payload.
2. Triage logic must classify message inputs into Severity Tiers:
   - High Severity: Route directly to the Ambulance Dispatcher module with fallback multi-call dialing loops.
   - Low/Medium Severity: Display brief, structured summaries paired with explicit, interactive UI control paths ([Doctor] and [Medicine] options).
3. The Pharmaceutical routing engine must favor precise chemical formulation matching over delivery proximity constraints. Cross-regional sourcing options must activate if city-wide local stocks are depleted.
4. Always provide an implementation blueprint or a code block diff for review and wait for explicit manual verification before generating or editing directory files.

## Frontend Architecture Parameters:
1. Framework: React Native using Expo with TypeScript.
2. UI Styling: Use standard React Native StyleSheet components or a clean layout framework for an interactive interface.
3. Behavior: Create a dynamic message component that automatically transitions from a chat field to interactive custom control components whenever `ui_action_required` is received from the `/emergency/triage` API.