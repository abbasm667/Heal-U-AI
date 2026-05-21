import os
import json
import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.mock_db import pharmacy_inventory
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
api_key = os.environ.get("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-flash-latest")
else:
    model = None

router = APIRouter(prefix="/pharmacy", tags=["Pharmacy"])

class MedicineFormRequest(BaseModel):
    age: int
    location: str
    symptoms: str

@router.post("/sourcing")
async def source_medicine(request: MedicineFormRequest):
    if not model:
        required_formulation = "Paracetamol 500mg"
    else:
        prompt = f"""
        Map these symptoms: "{request.symptoms}" for a {request.age} year old to a common chemical formulation.
        Example: 'headache' -> 'Paracetamol 500mg'.
        Respond ONLY with the chemical formulation name (e.g., 'Paracetamol 500mg').
        """
        try:
            response = model.generate_content(prompt)
            required_formulation = response.text.strip()
        except Exception:
            required_formulation = "Paracetamol 500mg"

    # Search the 250+ entries
    exact_matches = [item for item in pharmacy_inventory if item["chemical_formulation"].lower() == required_formulation.lower()]
    
    # Fallback to fuzzy match if no exact match
    if not exact_matches:
        search_term = required_formulation.split()[0].lower()
        exact_matches = [item for item in pharmacy_inventory if search_term in item["chemical_formulation"].lower()]

    if not exact_matches:
        raise HTTPException(status_code=404, detail=f"No medicine found for formulation: {required_formulation}")
        
    sourcing_plan = []
    fulfilled_by = None
    
    # Priority 1: Neighborhood Hub (Local)
    for item in exact_matches:
        if item["hub"] == "Neighborhood" and item["location"].lower().startswith(request.location.lower()):
            sourcing_plan.append(f"Checking Neighborhood Hub: {item['location']}")
            if item["stock"] > 0:
                fulfilled_by = item
                break
                
    # Priority 2: Central City Hub
    if not fulfilled_by:
        for item in exact_matches:
            if item["hub"] == "Central":
                sourcing_plan.append(f"Checking Central City Hub: {item['location']}")
                if item["stock"] > 0:
                    fulfilled_by = item
                    break
                    
    # Priority 3: Cross-Regional Tracking
    if not fulfilled_by:
        for item in exact_matches:
            if item["hub"] == "Cross-Regional":
                sourcing_plan.append(f"Activating Cross-Regional Tracking: {item['location']} ({item['region']})")
                if item["stock"] > 0:
                    fulfilled_by = item
                    break
                    
    if fulfilled_by:
        fulfilled_by["stock"] -= 1 
        return {
            "status": "Order Fulfilled",
            "required_formulation": required_formulation,
            "sourcing_log": sourcing_plan,
            "fulfillment_details": {
                "medicine_name": fulfilled_by["name"],
                "source_location": fulfilled_by["location"],
                "hub_type": fulfilled_by["hub"],
                "region": fulfilled_by["region"]
            }
        }
    else:
        return {
            "status": "Out of Stock",
            "required_formulation": required_formulation,
            "sourcing_log": sourcing_plan,
            "message": "The requested formulation is currently depleted across all tracked hubs."
        }
