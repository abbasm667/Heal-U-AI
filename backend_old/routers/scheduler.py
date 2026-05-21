import os
import json
import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.mock_db import doctors
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
api_key = os.environ.get("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-flash-latest")
else:
    model = None

router = APIRouter(prefix="/scheduler", tags=["Scheduler"])

class ChatScheduleRequest(BaseModel):
    message: str
    patient_name: str

@router.post("/chat")
async def chat_scheduler(request: ChatScheduleRequest):
    if not model:
        specialty = "General Physician"
        chat_response = f"Hi {request.patient_name}, please configure the Gemini API key to enable intelligent doctor matching."
    else:
        prompt = f"""
        A patient named {request.patient_name} says: "{request.message}".
        Based on their message, identify the medical specialty they likely need from this list: 
        [Cardiologist, Pediatrician, General Physician, Neurologist, Orthopedic, Dermatologist, Psychiatrist].
        
        Respond ONLY in JSON format:
        "specialty": "...",
        "chat_response": "A friendly greeting (e.g., 'Hi Abbas!') and acknowledgment of their symptoms/needs."
        """
        
        try:
            response = model.generate_content(prompt)
            clean_response = response.text.strip().replace("```json", "").replace("```", "").strip()
            analysis = json.loads(clean_response)
            specialty = analysis.get("specialty", "General Physician")
            chat_response = analysis.get("chat_response", f"Hi {request.patient_name}, searching for a {specialty}...")
        except Exception:
            specialty = "General Physician"
            chat_response = f"Hi {request.patient_name}, searching for a general physician near you."

    # Find matching doctors
    matched_doctors = [d for d in doctors if d["specialty"].lower() == specialty.lower()]
    
    return {
        "chat_response": chat_response,
        "recommended_specialty": specialty,
        "doctors": matched_doctors[:3] # Return top 3 matches
    }

class ScheduleRequest(BaseModel):
    doctor_id: str
    patient_name: str
    requested_time: str

@router.post("/schedule")
def schedule_appointment(request: ScheduleRequest):
    doctor = next((d for d in doctors if d["id"] == request.doctor_id), None)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    if request.requested_time in doctor["available_slots"]:
        doctor["available_slots"].remove(request.requested_time)
        doctor["booked_slots"].append(request.requested_time)
        return {
            "status": "Success",
            "message": f"Appointment booked with {doctor['name']} at {request.requested_time}",
            "doctor": doctor["name"]
        }
    else:
        return {
            "status": "Fully Booked",
            "message": "The requested time slot is unavailable.",
            "manual_routing_required": True
        }
