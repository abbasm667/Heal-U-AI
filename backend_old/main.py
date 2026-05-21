from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import firebase_admin
from firebase_admin import credentials, firestore

# Load environment variables
load_dotenv()

# Initialize Firebase Admin SDK for Production Cloud
try:
    # Uses default service credentials or GCP active instance
    firebase_admin.initialize_app()
    print("Firebase Admin SDK initialized successfully.")
except Exception as e:
    print(f"Firebase Admin SDK initialization skipped (using mock local context): {e}")

from routers import emergency, scheduler, pharmacy

app = FastAPI(title="Medical Orchestrator API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers for local uvicorn development
app.include_router(emergency.router)
app.include_router(scheduler.router)
app.include_router(pharmacy.router)

@app.get("/")
def read_root():
    return {"message": "Emergency & Medical Service Orchestrator API is running"}


# ─── Google Cloud Function Entry Point ──────────────────────────────
def healu_triage(request):
    """Google Cloud Function HTTP entry point.
    Delegates routing to low-coupling async router handlers synchronously.
    """
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        }
        return ("", 204, headers)

    headers = {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
    }

    # Clean path components
    path = request.path.strip("/")
    import asyncio

    def run_sync(coro):
        return asyncio.run(coro)

    try:
        if path in ("emergency/triage", "triage"):
            if request.method != "POST":
                return ({"error": "Method Not Allowed"}, 405, headers)
            body = request.get_json(silent=True) or {}
            req_model = emergency.TriageRequest(**body)
            result = run_sync(emergency.process_triage(req_model))
            return (result, 200, headers)

        elif path.startswith("emergency/session/") or path.startswith("session/"):
            if request.method != "DELETE":
                return ({"error": "Method Not Allowed"}, 405, headers)
            session_id = path.split("/")[-1]
            result = run_sync(emergency.clear_session(session_id))
            return (result, 200, headers)

        elif path in ("emergency/diseases", "diseases"):
            if request.method != "GET":
                return ({"error": "Method Not Allowed"}, 405, headers)
            result = run_sync(emergency.get_disease_list())
            return (result, 200, headers)

        else:
            return ({"error": f"Path not found: {path}"}, 404, headers)

    except Exception as e:
        return ({"error": f"Server Error: {str(e)}"}, 500, headers)

