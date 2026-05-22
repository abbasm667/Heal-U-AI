# Goal Description

The goal is to implement an in-app fake booking simulation for Doctor Appointments and Pharmacy Orders, replacing the current behavior of opening external links. Additionally, we will generate a comprehensive `README.md` for the "AISeekho 2026 - Challenge 2" submission, detailing the system architecture, UI/UX (worth 20 marks), agentic workflows (worth 25 marks), and action simulations.

## User Review Required

> [!IMPORTANT]
> **Booking Simulation Flow**
> Instead of redirecting to Oladoc or Dvago, clicking a doctor or medicine will now trigger a beautiful in-app overlay.
> 1. **Confirmation Prompt**: Shows the selected item with randomly generated timings (e.g., "Tomorrow at 10:00 AM" for a doctor, or "Expected Delivery: Today, 5:00 PM" for medicine).
> 2. **Success Animation**: A visually appealing success card with a checkmark animation upon confirming.
> 3. **Medical Records**: The successful booking will be instantly added to your Firebase `medicalRecords` collection with a "Confirmed" status, allowing you to track it seamlessly inside the app.
> 
> Please review this flow and approve if it matches your vision for the hackathon's "action simulation" requirements.

## Proposed Changes

### Booking Simulation Components

#### [MODIFY] `src/pages/ConsultationPage.tsx`
- Remove the `window.open(url)` logic from `handleExternalLink`.
- Add a new state variable to manage the active booking simulation (e.g., `activeBooking: { type: 'doctor' | 'medicine', data: any } | null`).
- Implement the "Confirmation Overlay" UI component that renders over the chat when `activeBooking` is set.
- Generate mock timings dynamically (e.g., using `new Date()` + offset).
- Implement a `confirmBooking` function that pushes the confirmed record to Firebase `medicalRecords` and shows the success animation state before closing the overlay.

#### [NEW] `src/components/agents/BookingSimulationOverlay.tsx` (Optional abstraction)
- We can extract the overlay into its own component to keep `ConsultationPage` clean. It will handle Framer Motion animations for the pop-up, the "Are you sure?" prompt, the random timing generation, and the "Success" checkmark animation.

### README Documentation

#### [NEW] `README.md`
After the simulation code is implemented, I will write the complete `README.md` tailored for your competition submission. It will include:
- **Project Overview**: Highlighting Heal U as an Advanced Emergency & Medical Orchestrator.
- **Agentic Workflows (25 Marks focus)**: Detailed explanation of the triage logic, background proactive care system, multi-agent simulation (Doctor, Pharmacy, Health Report analyzers), and the dynamic structured UI payloads.
- **UI & Aesthetics (20 Marks focus)**: Explanation of the React Native/Expo architecture translated to the modern web, emphasizing the custom Framer Motion animations, Gemini-inspired smooth gradients, and mechanical transformer loaders.
- **Mock APIs & Simulation**: Documentation of the newly added fake booking flows and simulated agentic actions that fulfill the hackathon requirements.

## Verification Plan

### Automated Tests
- Ensure TypeScript compilation passes with the new booking state types.

### Manual Verification
1. User clicks "Consult Specialist" and selects a doctor card.
2. The UI smoothly overlays the confirmation prompt with a mock appointment time.
3. User clicks "Yes, Book Appointment".
4. The success animation plays, and the overlay closes.
5. User navigates to the "Records" tab and verifies the confirmed appointment is present.
6. The same flow is verified for Medicine orders.
