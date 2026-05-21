import random
import os
import json
import re
import uuid
import base64
import google.generativeai as genai
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from database.mock_db import ambulances
from dotenv import load_dotenv

load_dotenv()

# ─── Firebase Admin SDK & Mock Profile Setup ────────────────────────
from firebase_admin import firestore

try:
    db = firestore.client()
except Exception:
    db = None

mock_user_profiles = {
    "default_user": {
        "name": "Abbas",
        "age": 34,
        "weight": "72kg",
        "chronic_illnesses": "Hypertension, Seasonal Allergies",
        "blood_type": "O-positive",
        "localized_sector": "Clifton, Karachi",
        "city": "Karachi"
    },
    "user123": {
        "name": "Ali",
        "age": 45,
        "weight": "80kg",
        "chronic_illnesses": "Type 2 Diabetes",
        "blood_type": "A-positive",
        "localized_sector": "Sector G-11, Islamabad",
        "city": "Islamabad"
    }
}

def get_user_profile(uid: str) -> dict:
    # Only perform live Firestore fetch if on real GCP environment or explicitly requested
    is_gcp = os.environ.get("K_SERVICE") or os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("USE_LIVE_FIREBASE")
    if db and is_gcp:
        try:
            # Add short timeout to avoid blocking
            doc = db.collection("users").document(uid).get(timeout=2.0)
            if doc.exists:
                return doc.to_dict()
        except Exception as e:
            print(f"Firestore query timed out or failed (falling back to mock profiles): {e}")
    return mock_user_profiles.get(uid, mock_user_profiles["default_user"])




# ─── Gemini Configuration ───────────────────────────────────────────
api_key = os.environ.get("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
else:
    pass  # model is created per-call with system_instruction

router = APIRouter(prefix="/emergency", tags=["Emergency"])

# ─── In-Memory Session Store ────────────────────────────────────────
# Key: session_id → Value: list of { "role": "user"|"model", "content": str }
session_histories: dict[str, list[dict]] = {}

# ─── 55 Target Conditions ───────────────────────────────────────────
DISEASE_LIST = [
    "Chickenpox", "COVID-19", "Influenza", "Dengue Fever", "Malaria",
    "Typhoid", "Hepatitis A", "Hepatitis B", "Hepatitis C", "Tuberculosis",
    "Pneumonia", "Bronchitis", "Asthma", "COPD", "Diabetes Type 1",
    "Diabetes Type 2", "Hypertension", "Heart Disease", "Stroke", "Anemia",
    "Kidney Stones", "UTI", "Gastritis", "GERD", "IBS",
    "Appendicitis", "Gallstones", "Migraine", "Epilepsy", "Arthritis",
    "Osteoporosis", "Fractures", "Eczema", "Psoriasis", "Acne",
    "Allergic Rhinitis", "Sinusitis", "Tonsillitis", "Ear Infection",
    "Conjunctivitis", "Cataracts", "Depression", "Anxiety Disorder",
    "Insomnia", "ADHD", "Food Poisoning", "Dehydration", "Sunburn",
    "Heat Stroke", "Bacterial Infection", "Viral Infection",
    "Fungal Infection", "Measles", "Mumps", "Rubella", "Qabz", "Constipation",
]
DISEASE_LIST_STR = ", ".join(DISEASE_LIST)


# ─── System Prompt — Evolved Persona ────────────────────────────────
SYSTEM_PROMPT = f"""You are Dr. Health — a world-class, incredibly friendly, and \
deeply knowledgeable medical AI assistant built into a premium Heal U product.
You must always introduce yourself or represent yourself as Dr. Health from Heal U.

You are warm, relatable, and treat every patient like a close friend while \
maintaining impeccable medical professionalism. You may affectionately address \
casual users as "buddy", "friend", or by name if they share it.

══════════════════════════════════════
YOUR CORE PERSONALITY
══════════════════════════════════════
• Extremely friendly and approachable — like a brilliant doctor who's also your best friend
• Enthusiastic about helping — you genuinely love what you do
• You use clear, rich formatting: paragraphs, bullet lists, and comparison tables
• You never stall with generic phrases like "I want to make sure I understand you"
• You remember EVERYTHING from the conversation history — your memory is perfect

══════════════════════════════════════
COMPREHENSIVE RESPONSE STYLE
══════════════════════════════════════
When discussing medical conditions, be THOROUGH and educational:

1. **Use structured markdown formatting:**
   - Bold **key terms** and condition names
   - Use bullet lists (•) for symptoms, causes, and treatments
   - Use markdown tables when comparing conditions, symptoms, or medications
   - Use clear paragraph breaks between sections

2. **For symptom analysis, structure like this:**
   - 🔍 **What I'm seeing:** Brief clinical assessment
   - 📋 **Possible conditions:** Listed with confidence indicators
   - 💊 **Recommended actions:** Specific, actionable advice
   - ⚠️ **Watch for:** Red-flag symptoms that need immediate attention

3. **For medical reports/images:** When a user uploads a medical report, lab result, \
prescription, or injury photo, analyze it thoroughly:
   - Identify visible findings, abnormal values, or concerning patterns
   - Explain what each finding means in plain language
   - Provide specific next-step recommendations

4. **Keep it conversational but substantive.** Your responses should feel like \
talking to the smartest, kindest doctor in the world.

5. **Information-First Rule:** ALWAYS provide a substantive, detailed clinical \
response based on whatever information you have. The user expects an answer, not \
a question. Even if the description is vague, provide a general clinical \
overview of potential causes first. NEVER ask follow-up questions instead of \
providing an answer. Answer first, then ask for more detail.

══════════════════════════════════════
NON-MEDICAL CONVERSATIONS
══════════════════════════════════════
If the user chats about non-medical topics (sports, weather, jokes, tech, etc.):
- Engage politely and enthusiastically! Be a delightful conversationalist.
- After your response, bridge back naturally to their wellness:
  "By the way, since we're chatting — how have you been feeling lately? Anything health-wise I can help with? 😊"
- NEVER refuse to chat. You're a friend first, doctor second.
- For greetings like "hi", "hello", "hey buddy" — respond warmly and ask how they're doing.
  Set show_doctor_button and show_medicine_button to false for these.

══════════════════════════════════════
CONTEXTUAL ACTION RULES (STRICT)
══════════════════════════════════════
"show_doctor_button" → set true ONLY when you actively detect:
  ✓ A clinical anomaly in described symptoms or uploaded report
  ✓ Abnormal test metrics (high blood sugar, irregular ECG, etc.)
  ✓ An explicit diagnostic request ("I need to see a specialist")
  ✓ A clear injury, accident, or trauma description
  ✓ Symptoms suggesting a condition needing professional evaluation

"show_medicine_button" → set true ONLY when you actively detect:
  ✓ Symptoms matching a treatable condition from: [{DISEASE_LIST_STR}]
  ✓ The condition is mild/moderate enough for OTC treatment
  ✓ The patient asks about medication options

CRITICAL: If the user is just saying hello, chatting casually, or asking general \
knowledge questions — BOTH flags MUST be false. Only trigger them when there is a \
genuine clinical signal in the conversation.

══════════════════════════════════════
SEVERITY CLASSIFICATION
══════════════════════════════════════
"High" → Life-threatening: accidents, severe bleeding, chest pain, stroke signs, \
seizures, anaphylaxis. → Respond with immediate clinical breakdown + first aid.
"Medium" → Needs attention: fractures, high fever, persistent pain, infections.
"Low" → Stable/casual: greetings, mild symptoms, general questions, non-medical chat.

══════════════════════════════════════
OUTPUT FORMAT — Return ONLY this JSON
══════════════════════════════════════
{{
  "message": "Your rich, formatted, comprehensive response here...",
  "show_doctor_button": false,
  "show_medicine_button": false,
  "severity": "Low"
}}

Do NOT wrap the JSON in markdown fences. Return raw JSON only.
The "message" field CAN contain markdown formatting (bold, bullets, tables) — \
the frontend will render it beautifully."""


# ─── Request Model ──────────────────────────────────────────────────
class TriageRequest(BaseModel):
    session_id: str = ""
    user_id: str = "default_user"
    message: str
    location: str = "Karachi"
    image_data: Optional[str] = None  # Base64 encoded image (jpeg/png)
    ambulance_tier: Optional[int] = 0


# ─── Helpers ─────────────────────────────────────────────────────────
def _clean_json(text: str) -> dict:
    """Extract and parse JSON from Gemini output with multiple fallbacks."""
    cleaned = text.strip()
    for fence in ("```json", "```JSON", "```"):
        cleaned = cleaned.replace(fence, "")
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Regex fallback: find the outermost { ... } block
    match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract JSON from Gemini response: {text[:200]}")


def _get_or_create_session(session_id: str) -> tuple[str, list[dict]]:
    """Return (session_id, history). Creates new session if needed."""
    if not session_id:
        session_id = str(uuid.uuid4())
    if session_id not in session_histories:
        session_histories[session_id] = []
    return session_id, session_histories[session_id]


def _detect_mime_type(b64_data: str) -> str:
    """Detect image MIME type from base64 header or raw bytes."""
    if b64_data.startswith("data:"):
        # data:image/png;base64,... format
        mime = b64_data.split(";")[0].split(":")[1]
        return mime
    # Try to detect from raw base64 magic bytes
    try:
        raw = base64.b64decode(b64_data[:16])
        if raw[:3] == b'\xff\xd8\xff':
            return "image/jpeg"
        if raw[:4] == b'\x89PNG':
            return "image/png"
    except Exception:
        pass
    return "image/jpeg"  # Safe default


def _strip_b64_header(b64_data: str) -> str:
    """Strip the data:image/...;base64, prefix if present."""
    if "," in b64_data and b64_data.startswith("data:"):
        return b64_data.split(",", 1)[1]
    return b64_data


def detect_asset_label(user_message: str) -> str:
    """Explicitly categorize and label incoming assets for specialized Gemini structural vision analysis."""
    msg = user_message.lower()
    if "x-ray" in msg or "xray" in msg:
        return "X-ray Image File"
    if "mri" in msg or "scan" in msg or "ct" in msg:
        return "MRI/CT Scan File"
    if "report" in msg or "lab" in msg or "blood" in msg:
        return "Medical Lab Report/Document"
    if "prescription" in msg:
        return "Medical Doctor Prescription"
    return "Medical/Clinical Patient Upload"


def _build_gemini_contents(
    history: list[dict],
    current_image_b64: Optional[str] = None,
    max_turns: int = 30,
) -> list[dict]:
    """Build the Gemini-compatible contents array from session history.

    If current_image_b64 is provided, it's attached as an inline_data part
    to the LAST user message along with explicit clinical type classification labels.
    """
    recent = history[-max_turns:]
    contents = []

    for i, msg in enumerate(recent):
        parts = [{"text": msg["content"]}]

        # Attach image to the last user message only
        is_last_user = (
            i == len(recent) - 1
            and msg["role"] == "user"
            and current_image_b64
        )
        if is_last_user:
            mime = _detect_mime_type(current_image_b64)
            raw_b64 = _strip_b64_header(current_image_b64)
            label = detect_asset_label(msg["content"])
            parts.append({
                "text": f"\n\n[Uploaded Asset Classification: {label}]"
            })
            parts.append({
                "inline_data": {
                    "mime_type": mime,
                    "data": raw_b64,
                }
            })

        contents.append({
            "role": msg["role"],
            "parts": parts,
        })

    return contents



# ─── Multi-Agent Routing Engines ────────────────────────────────────

DOCTORS_DATABASE = [
    {
        "name": "Dr. Kaiser Waheed",
        "specialization": "Cardiologist",
        "experience": "18 Years",
        "qualification": "MBBS, FCPS (Cardiology)",
        "hospital": "Aga Khan University Hospital, Karachi",
        "city": "Karachi",
        "match_symptoms": ["chest pain", "heart", "blood pressure", "hypertension", "breathing"]
    },
    {
        "name": "Dr. Syeda Amna",
        "specialization": "Pulmonologist",
        "experience": "12 Years",
        "qualification": "MBBS, MD (Pulmonary Medicine)",
        "hospital": "Liaquat National Hospital, Karachi",
        "city": "Karachi",
        "match_symptoms": ["cough", "asthma", "breathing", "shortness of breath", "hanta", "pneumonia", "covid"]
    },
    {
        "name": "Dr. Muhammad Bilal",
        "specialization": "Gastroenterologist",
        "experience": "15 Years",
        "qualification": "MBBS, FRCP",
        "hospital": "South City Hospital, Karachi",
        "city": "Karachi",
        "match_symptoms": ["stomach", "gastritis", "constipation", "qabz", "gerd", "acid"]
    },
    {
        "name": "Dr. Ayesha Fatima",
        "specialization": "General Physician",
        "experience": "10 Years",
        "qualification": "MBBS, MCPS",
        "hospital": "Dow University Hospital, Karachi",
        "city": "Karachi",
        "match_symptoms": ["fever", "flu", "weakness", "infection", "headache"]
    },
    {
        "name": "Dr. Tariq Mahmood",
        "specialization": "Trauma Surgeon",
        "experience": "20 Years",
        "qualification": "MBBS, FRCS (Ortho/Trauma)",
        "hospital": "Jinnah Postgraduate Medical Centre, Karachi",
        "city": "Karachi",
        "match_symptoms": ["accident", "injury", "fracture", "bleeding", "cut"]
    }
]

def agent_oladoc_matcher(city: str, query: str) -> list[dict]:
    """Agent 1: Clinical Oladoc Matcher ranks and queries top 5 specialists."""
    clean_city = city.strip().capitalize()
    clean_query = query.lower()
    matched = []
    
    for doc in DOCTORS_DATABASE:
        score = sum(1 for sym in doc["match_symptoms"] if sym in clean_query)
        if doc["city"] == clean_city or clean_city == "":
            matched.append((score, doc))
            
    matched.sort(key=lambda x: x[0], reverse=True)
    return [item[1] for item in matched[:5]]


MEDICINES_DATABASE = {
    "constipation": [
        {"name": "Cremaffin Syrup", "formula": "Liquid Paraffin & Milk of Magnesia", "price": "Rs. 280", "available": True},
        {"name": "Lactulose Sol", "formula": "Lactulose", "price": "Rs. 320", "available": True}
    ],
    "qabz": [
        {"name": "Ispaghol Husk", "formula": "Psyllium Husk", "price": "Rs. 150", "available": True},
        {"name": "Cremaffin Syrup", "formula": "Liquid Paraffin & Milk of Magnesia", "price": "Rs. 280", "available": True}
    ],
    "gastritis": [
        {"name": "Risek 20mg", "formula": "Omeprazole", "price": "Rs. 350", "available": True},
        {"name": "Gaviscon Liquid", "formula": "Sodium Alginate", "price": "Rs. 420", "available": True}
    ],
    "fever": [
        {"name": "Panadol 500mg", "formula": "Paracetamol", "price": "Rs. 80", "available": True},
        {"name": "Caldopol Syrup", "formula": "Ibuprofen", "price": "Rs. 120", "available": True}
    ],
    "infection": [
        {"name": "Augmentin 625mg", "formula": "Co-Amoxiclav", "price": "Rs. 650", "available": True}
    ]
}

def agent_pharma_router(profile: dict, message_history: list[dict]) -> dict:
    """Agent 2: Pakistan Pharma Cart Router verifies conditions/metrics prior to cart authorization."""
    age = profile.get("age")
    target_condition = None
    all_chat_text = " ".join([m["content"].lower() for m in message_history]).lower()
    
    for condition in MEDICINES_DATABASE.keys():
        if condition in all_chat_text:
            target_condition = condition
            break
            
    if not age or not target_condition:
        missing = []
        if not age: missing.append("age")
        if not target_condition: missing.append("target_condition")
        
        return {
            "status": "pending_data",
            "message": "To safely authorize and route OTC formulations, could you please tell me your age and confirm your target health condition?",
            "missing_fields": missing,
            "products": []
        }
        
    products = MEDICINES_DATABASE.get(target_condition, [
        {"name": "Panadol Extra", "formula": "Paracetamol & Caffeine", "price": "Rs. 120", "available": True}
    ])
    
    # Automated payment execution is restricted by direct user confirm steps in UI.
    return {
        "status": "available",
        "message": f"Based on your validated metrics (Age {age}, Condition: {target_condition.capitalize()}), we have matched target formulations available for pharmacy dispatch.",
        "products": products,
        "action_prompt": "Confirm Order & Pay on Delivery"
    }


EMERGENCY_SERVICES = [
    {
        "id": "Rescue1122",
        "name": "Sindh Rescue 1122",
        "location": "Sindh District HQ",
        "phone": "1122",
        "tier": 0
    },
    {
        "id": "Edhi",
        "name": "Edhi Ambulance Service",
        "location": "Karachi Central",
        "phone": "115",
        "tier": 1
    },
    {
        "id": "Chhipa",
        "name": "Chhipa Emergency Service",
        "location": "Karachi East",
        "phone": "1020",
        "tier": 2
    },
    {
        "id": "Aman",
        "name": "Aman Health Care",
        "location": "Karachi South",
        "phone": "9119",
        "tier": 3
    }
]

def agent_rescue_dialer(tier: int) -> dict:
    """Agent 3: Multi-Tier Pakistan Rescue Dialer resolves cyclic district rescue assets."""
    idx = tier % len(EMERGENCY_SERVICES)
    return EMERGENCY_SERVICES[idx]


# ─── Main Triage Endpoint ───────────────────────────────────────────
@router.post("/triage")
async def process_triage(request: TriageRequest):
    session_id, history = _get_or_create_session(request.session_id)

    # Append the new user message directly
    history.append({"role": "user", "content": request.message})

    # Fetch User Onboarding Metrics from Firestore Profile Injection
    profile = get_user_profile(request.user_id)
    profile_str = f"PATIENT PROFILE CONTEXT: Age: {profile.get('age')}, Weight: {profile.get('weight')}, Chronic Illnesses: {profile.get('chronic_illnesses')}, Blood Type: {profile.get('blood_type')}."

    # ── Fallback when no API key ──
    if not api_key:
        fallback_response = {
            "session_id": session_id,
            "message": (
                f"Hey buddy! 👋 I'm Dr. Health from **Heal U**.\n\n"
                f"**Loaded Patient Context**: [Age {profile.get('age')}, Blood Group {profile.get('blood_type')}]\n\n"
                "Please configure the **GEMINI_API_KEY** environment variable to unlock full vision extraction!"
            ),
            "show_doctor_button": False,
            "show_medicine_button": False,
            "severity": "Low",
            "dismissible": True,
            "action_type": None,
            "assigned_ambulance": None,
            "matched_doctors": [],
            "pharma_cart": None,
            "ambulance_tier": request.ambulance_tier or 0,
        }
        history.append({"role": "model", "content": fallback_response["message"]})
        return fallback_response

    # Prepend onboarding metrics to the system prompt context
    system_instruction = f"{SYSTEM_PROMPT}\n\n{profile_str}"

    # Capping history to avoid token exhaustion
    contents = _build_gemini_contents(history, current_image_b64=request.image_data, max_turns=3)
    
    session_model = genai.GenerativeModel(
        "gemini-2.5-flash",
        system_instruction=system_instruction,
    )

    chat_response = None
    show_doctor = False
    show_medicine = False
    severity = "Low"

    for attempt in range(2):
        try:
            response = session_model.generate_content(contents)
            
            if not response.parts:
                continue

            analysis = _clean_json(response.text)
            chat_response = analysis.get("message", "")
            show_doctor = analysis.get("show_doctor_button", False)
            show_medicine = analysis.get("show_medicine_button", False)
            severity = analysis.get("severity", "Low")
            break
        except Exception as e:
            error_msg = f"[Triage Attempt {attempt + 1}] Error: {str(e)}\n"
            with open("gemini_error.log", "a") as f:
                f.write(error_msg)
            if attempt == 1:
                break

    # ── Intelligent Fallback Clinical Knowledge Engine ──
    if not chat_response:
        user_msg = request.message.lower()
        full_context = " ".join([m["content"].lower() for m in history])
        
        knowledge_base = {
            "accident": [
                "🚨 **Accident/Trauma Alert**: Immediate medical evaluation is required. First aid must prioritize cervical spine stabilization and pressure dressings.",
                "⚠️ **Trauma Code Red**: An accident indicates high-acuity risks. Restricting movement and monitoring response levels is strongly recommended."
            ],
            "bleeding": [
                "⚠️ **Severe Bleeding**: Direct pressure must be applied immediately using a clean, sterile cloth. Stay calm and rest.",
                "🩸 **Hemorrhage Protocol**: Do not remove dressings if soaked; instead, add new layers on top and apply continuous firm pressure."
            ],
            "hanta": [
                "🧬 **Hantavirus Pulmonary Syndrome (HPS)**: Caused by contact with rodent excreta. Symptoms manifest as severe shortness of breath, requiring intensive oxygen support.",
                "🦠 **Hantavirus Diagnostics**: Early symptoms are flu-like, rapidly progressing to severe cardiopulmonary failure. Immediate hospitalization is standard."
            ],
            "covid": [
                "🦠 **COVID-19 Symptom Grid**: Affects deep alveolar cells. Primary indicators are high fever, dry hacking cough, and severe anosmia (loss of smell).",
                "🌡️ **COVID-19 Clinical Management**: Keep oxygen monitors active. Standard treatment focuses on supportive hydration and symptomatic antipyretics."
            ],
            "qabz": [
                "💩 **Constipation (Qabz) Resolution**: Chronic fecal stasis is mitigated by daily Psyllium husk (Ispaghol) and high hydration (3L/day).",
                "🚽 **Qabz Care Plan**: Recommend magnesium formulations to pull osmotic fluid into the colon, coupled with mild stimulant activity."
            ],
        }

        match_found = False
        for key, responses in knowledge_base.items():
            if key in full_context:
                chat_response = random.choice(responses)
                if key in ["accident", "bleeding"]:
                    severity = "High"
                elif key in ["hanta", "covid", "qabz"]:
                    severity = "Medium"
                show_doctor = (severity != "Low")
                match_found = True
                break

        if not match_found:
            chat_response = f"I've cataloged your concern. Based on the **{profile_str}**, I recommend monitoring clinical shifts closely. Let's trace your wellness progress!"
            show_doctor = True
            severity = "Low"

    # Append model response to session history
    history.append({"role": "model", "content": chat_response})

    # ── Resolve Multi-Agent Outputs ──
    doctors = []
    pharma = None
    sev = severity.lower()

    if sev == "high":
        # Agent 3: Rescue Dialer cycling on incremented ambulance_tier pointer
        matched_rescue = agent_rescue_dialer(request.ambulance_tier or 0)
        return {
            "session_id": session_id,
            "message": chat_response,
            "show_doctor_button": False,
            "show_medicine_button": False,
            "severity": "High",
            "dismissible": True,
            "action_type": "EMERGENCY_DIAL",
            "assigned_ambulance": matched_rescue,
            "matched_doctors": [],
            "pharma_cart": None,
            "ambulance_tier": request.ambulance_tier or 0
        }

    # Standard clinical flow
    if show_doctor:
        # Agent 1: Oladoc Matcher matches specialties based on symptoms and location
        doctors = agent_oladoc_matcher(request.location, request.message)

    if show_medicine:
        # Agent 2: Pharma Cart Router resolves age and target conditions
        pharma = agent_pharma_router(profile, history)
        if pharma["status"] == "pending_data":
            chat_response = f"{chat_response}\n\n⚠️ **Pharma Cart Verification Required**: {pharma['message']}"
            # Re-update the last model message to include the collection prompt
            history[-1]["content"] = chat_response

    return {
        "session_id": session_id,
        "message": chat_response,
        "show_doctor_button": bool(show_doctor),
        "show_medicine_button": bool(show_medicine),
        "severity": severity,
        "dismissible": True,
        "action_type": None,
        "assigned_ambulance": None,
        "matched_doctors": doctors,
        "pharma_cart": pharma,
        "ambulance_tier": request.ambulance_tier or 0
    }



# ─── Session Management ─────────────────────────────────────────────
@router.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Clear a specific chat session."""
    if session_id in session_histories:
        del session_histories[session_id]
        return {"status": "cleared", "session_id": session_id}
    return {"status": "not_found", "session_id": session_id}


@router.get("/diseases")
async def get_disease_list():
    """Return the supported disease list for frontend reference."""
    return {"diseases": DISEASE_LIST}


@router.get("/user/{user_id}")
async def get_user(user_id: str):
    """Retrieve active user configuration context from live Firestore or mock fallback."""
    profile = get_user_profile(user_id)
    return profile
