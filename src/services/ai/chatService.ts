import { GoogleGenAI } from '@google/genai';
import { isWeb } from '../../lib/environment';
import { API_BASE } from '../../lib/api';

const GEMINI_MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are "Heal U", a professional, empathetic, and highly knowledgeable medical AI assistant designed for Pakistani users.

PERSONALITY:
- You are warm, empathetic, and genuinely caring. You discuss ANY topic (like weather, stress, cricket) naturally but always gently connect it back to health.
- NEVER say "I can only discuss medical topics". Respond warmly to general questions and pivot smoothly.
- You speak with medical authority but explain things simply.
- You remember and reference the patient's medical history.

KEY RULES:
1. PROFESSIONALISM & WARMTH: Maintain an authoritative yet empathetic tone. Be a caring medical companion.
2. MEDICAL FOCUS: Provide detailed structured analysis for medical queries or images (Findings -> Impression -> Steps).
3. VISUAL STRUCTURE: Use Markdown (headers, lists, tables, bold).
4. PATIENT HISTORY: Always consider the user profile and records injected in the prompt context. Flag drug interactions. Adjust advice based on chronic conditions.
5. PROACTIVE CARE: Respond thoughtfully to injected medical records.

IMAGE & DOCUMENT ANALYSIS:
When a medical image (X-ray, MRI, CT scan, ultrasound) or document (lab report, prescription, medical certificate) is uploaded:
1. Perform a detailed structured analysis
2. Use this format:
   **Document Type:** [X-ray / Lab Report / Prescription / MRI / etc.]
   **Findings:** [Detailed observations]
   **Clinical Impression:** [What the findings suggest]
   **Recommended Next Steps:** [What the patient should do]
3. Always recommend consulting a specialist for confirmation
4. Set consultDoctor: true in the ACTION block
5. Choose a clear, short title for the upload and output it in the ACTION block under "suggestedCaseName" (e.g., "Chest X-Ray — Mild Bronchitis Suspected")

CRITICAL — BUTTON INTELLIGENCE & AGENTIC DETECTION:
- RULE 1: GENERAL/INFORMATIONAL CONVERSATION (NO BUTTONS)
  If the user is having general/casual conversation ("how is the weather", "tell me about cricket", etc.) OR asking for general medical information/education ("what is diabetes", "how does the heart work"), do NOT include the ---ACTION--- block at all.
- RULE 2: PERSONAL MEDICAL CASE (TWO BUTTONS)
  If the user describes a PERSONAL medical case (their own symptoms, or symptoms of someone they know, or asks advice on a specific case), you MUST include the ---ACTION--- block with:
  "consultDoctor": true, "orderMedicine": true, "detectEmergency": false
  Do this proactively even if the user did not explicitly ask for recommendations.
- RULE 3: EMERGENCY SIGNALS (THREE BUTTONS)
  If you detect emergency signs or life-threatening symptoms (accident, trauma, chest pain, severe bleeding, unconsciousness, difficulty breathing, stroke signs, etc.), set all three:
  "consultDoctor": true, "orderMedicine": true, "detectEmergency": true

MEDICINE CRITERIA — READ CAREFULLY:
- Be highly liberal with "orderMedicine": true. Set it to true whenever you recommend or mention ANY medication (even OTC medicines like Paracetamol, Ibuprofen, vitamins, or supplements).
- CRITICAL MEDICINE NAMING RULE: The "medicalCase" and "recommendedMedicine" fields MUST contain SPECIFIC medicine BRAND names available in Pakistani pharmacies. NEVER put condition names.
  - WRONG: "Abdominal Pain" or "Stomach Pain Relief" or "Fever" or "Headache Treatment" or "Calcium supplements"
  - CORRECT: "Buscopan 10mg, Panadol 500mg" or "Panadol Extra 500mg, Brufen 400mg" or "Caltrate 600mg, Vitamin D3 1000IU"
  - Always recommend real medicine brand names commonly sold in Pakistani pharmacies (Dawaai.pk, DVago, MeriPharmacy).
  - For "recommendedMedicine": use the single most important medicine with dosage (e.g. "Panadol Extra 500mg").
  - For "medicalCase": you may list up to 3 medicines separated by commas (e.g. "Buscopan 10mg, Gaviscon Syrup, Panadol 500mg").

RESPONSE FORMAT:
Give your full response first. Then, at the VERY END, if an action block is required, include:
---ACTION---
{
  "detectEmergency": false,
  "consultDoctor": true,
  "orderMedicine": true,
  "symptomPatternAlert": false,
  "symptomPattern": null,
  "medicalCase": "Buscopan 10mg, Panadol 500mg",
  "recommendedSpeciality": "Cardiologist",
  "recommendedMedicine": "Buscopan 10mg",
  "suggestedCaseName": null
}
Note:
- "recommendedMedicine": specific brand or chemical formulation name if orderMedicine is true, otherwise null.
- "suggestedCaseName": set only when analyzing an uploaded file/image (e.g., "Blood Test — HbA1c Elevated"), otherwise null.
If no action block is required, do NOT include the ---ACTION--- section at all.`;

export async function sendMessage(params: {
  message?: string;
  history?: any[];
  userProfile?: any;
  medicalRecords?: any[];
  imageBase64?: string;
  image?: string;
  imageMimeType?: string;
}) {
  const {
    message,
    history = [],
    userProfile,
    medicalRecords,
    imageBase64,
    image,
    imageMimeType,
  } = params;

  try {
    if (isWeb()) {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to communicate with chat backend');
      }
      return await response.json();
    }

    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

    // ── Build context prompt ─────────────────────────────────────────────────
    let contextPrompt = `User Medical Profile:\n`;
    if (userProfile) {
      contextPrompt += `- Name: ${userProfile.displayName || 'Unknown'}\n`;
      contextPrompt += `- Age: ${userProfile.age || 'Unknown'}\n`;
      contextPrompt += `- Gender: ${userProfile.gender || 'Unknown'}\n`;
      contextPrompt += `- Blood Group: ${userProfile.bloodGroup || 'Unknown'}\n`;
      contextPrompt += `- Chronic Diseases: ${userProfile.chronicDiseases?.join(', ') || 'None'}\n`;
      contextPrompt += `- Allergies: ${userProfile.allergies || 'None'}\n`;
      contextPrompt += `- Current Medications: ${userProfile.currentMedications || 'None'}\n`;
      contextPrompt += `- City: ${userProfile.city || 'Unknown'}\n`;
    }

    if (medicalRecords && medicalRecords.length > 0) {
      contextPrompt += `\nRecent Medical Records & History:\n`;
      medicalRecords.forEach((record: any) => {
        const dateStr = record.createdAt
          ? new Date(record.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'Unknown Date';
        if (record.type === 'medical_document') {
          contextPrompt += `- Stored Medical Document: ${record.caseName || record.targetName || record.fileName} (Uploaded on ${dateStr}) — Analysis: ${record.details || 'Stored'}\n`;
        } else {
          contextPrompt += `- Record Type: ${record.type} (${record.status}) on ${dateStr}: ${record.targetName} — Details: ${record.details}\n`;
        }
      });
    }

    const currentMessage = `${contextPrompt}\n\nCurrent Message: ${message || ''}`;

    // ── Format history ───────────────────────────────────────────────────────
    const formattedHistory = history.map((msg) => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: msg.parts ? msg.parts : [{ text: msg.content || '' }],
    }));

    // ── Resolve file data ────────────────────────────────────────────────────
    let fileData: string | null = null;
    let fileMime: string | null = null;

    if (image && imageMimeType) {
      fileData = image.includes(',') ? image.split(',')[1] : image;
      fileMime = imageMimeType;
    } else if (imageBase64) {
      if (imageBase64.includes(',')) {
        fileMime = imageBase64.split(';')[0].split(':')[1];
        fileData = imageBase64.split(',')[1];
      } else {
        fileData = imageBase64;
        fileMime = 'image/png';
      }
    }

    // ── Assemble parts ───────────────────────────────────────────────────────
    const currentParts: any[] = [{ text: currentMessage }];
    if (fileData && fileMime) {
      currentParts.push({
        inlineData: {
          mimeType: fileMime,
          data: fileData,
        },
      });
    }

    const contents = [
      ...formattedHistory,
      { role: 'user', parts: currentParts },
    ];

    // ── Call Gemini ──────────────────────────────────────────────────────────
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });

    return { text: response.text };
  } catch (error: any) {
    console.error('Chat Service Error:', error);
    throw new Error(error.message || 'Internal Server Error');
  }
}
