import { GoogleGenAI } from '@google/genai';
import { isWeb } from '../../lib/environment';
import { API_BASE } from '../../lib/api';

const GEMINI_MODEL = 'gemini-2.5-flash';

const buildFallbackReport = (userData?: any) => ({
  healthScore: 65,
  highRiskAlerts: [] as string[],
  areasOfConcern: ['Insufficient medical data to perform a complete analysis. Please add records via the consultation chat.'],
  positiveIndicators: [
    'You are taking a proactive approach to managing your health.',
    ...(userData?.chronicDiseases?.length > 0 ? ['Known chronic conditions are being tracked.'] : []),
  ],
  recommendations: [
    'Schedule a routine checkup with your general physician.',
    'Stay hydrated and aim for 8 glasses of water daily.',
    'Ensure 7–8 hours of sleep each night.',
    'Start a consultation chat to log symptoms and get AI analysis.',
    'Upload any existing medical documents to your Medical Library.',
  ],
  summary: userData?.displayName
    ? `We currently have limited health data for ${userData.displayName}. Please use the Medical Consultation chat to describe your symptoms, and your reports will become more comprehensive over time.`
    : 'Limited health data is available. Start a consultation chat to get personalized analysis.',
});

export async function generateHealthReport(params: {
  userData?: any;
  medicalRecords?: any[];
  documents?: any[];
  chatSummaries?: string[];
  period?: string;
}) {
  if (isWeb()) {
    const response = await fetch(`${API_BASE}/api/health-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error('Failed to communicate with health report backend');
    }
    return await response.json();
  }

  const { userData, medicalRecords, documents, chatSummaries, period } = params;

  const hasRecords = Array.isArray(medicalRecords) && medicalRecords.length > 0;
  const hasDocs = Array.isArray(documents) && documents.length > 0;
  const hasChats = Array.isArray(chatSummaries) && chatSummaries.length > 0;
  const hasProfile = userData && (userData.age || userData.chronicDiseases?.length > 0 || userData.bloodGroup);

  if (!hasProfile && !hasRecords && !hasDocs && !hasChats) {
    console.log('[Health Report] No data available. Returning fallback report.');
    return buildFallbackReport(userData);
  }

  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  const prompt = `Generate a comprehensive AI Health Report for this patient based on the following data.

Patient Profile:
- Name: ${userData?.displayName || 'Unknown'}
- Age: ${userData?.age || 'Unknown'}
- Gender: ${userData?.gender || 'Unknown'}
- Blood Group: ${userData?.bloodGroup || 'Not provided'}
- Chronic Diseases: ${Array.isArray(userData?.chronicDiseases) && userData.chronicDiseases.length > 0 ? userData.chronicDiseases.join(', ') : 'None reported'}
- Allergies: ${userData?.allergies || 'None reported'}
- Current Medications: ${userData?.currentMedications || 'None reported'}
- Previous Surgeries: ${userData?.previousSurgeries || 'None reported'}
- Family History: ${userData?.familyHistory || 'None reported'}
- City: ${userData?.city || 'Unknown'}

Medical Records (period: ${period || 'All time'}):
${hasRecords
  ? medicalRecords!.map((r: any) => `- [${r.type}] ${r.targetName}: ${r.details} (Status: ${r.status}, Date: ${r.createdAt})`).join('\n')
  : 'No medical records in this period.'}

Medical Documents on File:
${hasDocs
  ? documents!.map((d: any) => `- ${d.caseName}: ${d.details}`).join('\n')
  : 'No documents on file.'}

Recent Health Discussions from Consultation Chats:
${hasChats
  ? chatSummaries!.slice(0, 15).map((s: string) => `- "${s.substring(0, 200)}"`).join('\n')
  : 'No recent consultation chats.'}

IMPORTANT INSTRUCTIONS:
- Even if data is minimal or empty, always generate a meaningful report based on whatever IS available (profile data, city, age, gender, etc.)
- Never return an error. If data is scarce, base the report on general health best practices for the patient's demographic.
- healthScore should be 65 (neutral) when data is insufficient — not higher or lower without evidence.
- Always include at least 1 positiveIndicator and 3 recommendations.

Generate the report with these EXACT sections:
1. HEALTH SCORE: A score out of 100.
2. HIGH RISK ALERTS: Major problems requiring immediate attention. Empty array [] if none.
3. AREAS OF CONCERN: Issues to monitor. Empty array [] if none.
4. POSITIVE INDICATORS: Good health signs. Include at least one.
5. RECOMMENDATIONS: 3–5 specific actionable suggestions.
6. SUMMARY: A concise 2–3 sentence overall summary.

Respond ONLY with valid JSON in this exact format, no markdown fences, no extra text:
{
  "healthScore": 72,
  "highRiskAlerts": [],
  "areasOfConcern": ["..."],
  "positiveIndicators": ["..."],
  "recommendations": ["..."],
  "summary": "Brief 2–3 sentence overall summary."
}`;

  let reportData: any;
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.4 },
    });

    let rawText = (response.text ?? '').trim();
    console.log('[Health Report] Gemini raw (first 300):', rawText.substring(0, 300));

    rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    reportData = JSON.parse(rawText);
  } catch (geminiOrParseErr: any) {
    console.error('[Health Report] Gemini/parse error — using fallback:', geminiOrParseErr?.message);
    reportData = buildFallbackReport(userData);
  }

  if (typeof reportData.healthScore !== 'number' || isNaN(reportData.healthScore)) reportData.healthScore = 65;
  reportData.healthScore = Math.max(0, Math.min(100, reportData.healthScore));
  if (!Array.isArray(reportData.highRiskAlerts)) reportData.highRiskAlerts = [];
  if (!Array.isArray(reportData.areasOfConcern)) reportData.areasOfConcern = [];
  if (!Array.isArray(reportData.positiveIndicators) || reportData.positiveIndicators.length === 0) {
    reportData.positiveIndicators = ['You are actively monitoring your health with Heal U.'];
  }
  if (!Array.isArray(reportData.recommendations) || reportData.recommendations.length === 0) {
    reportData.recommendations = ['Schedule a routine checkup with your general physician.'];
  }
  if (typeof reportData.summary !== 'string' || reportData.summary.trim() === '') {
    reportData.summary = 'Health report generated based on available data.';
  }

  return reportData;
}
