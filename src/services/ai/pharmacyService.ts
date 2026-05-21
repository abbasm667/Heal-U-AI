import { GoogleGenAI } from '@google/genai';

const GEMINI_MODEL = 'gemini-2.5-flash';

export async function searchMedicine(medicine: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

    // Use just first 2 words for a cleaner search (e.g. "Buscopan" not "Buscopan Plus Tablets 10mg/500mg")
    const shortName = medicine.split(/\s+/).slice(0, 2).join(' ');

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{
        role: "user",
        parts: [{
          text: `Search for "${shortName}" medicine on Pakistani pharmacy websites. Go to dvago.pk, dawaai.pk, and meripharmacy.pk and search for this medicine. Find the actual product pages where this medicine can be purchased. Also suggest 2-3 alternative medicines that treat the same condition even if they are not available online. Return ONLY valid JSON with no markdown backticks: {"available":[{"name":"Medicine Name with dosage","genericName":"Generic name","purpose":"What it treats","price":"PKR xxx if found","store":"DVago or Dawaai.pk or MeriPharmacy","url":"exact product page URL you found","inStock":true}],"alternatives":[{"name":"Alternative Medicine Name","genericName":"Generic name","purpose":"What it treats","note":"Why this is a good alternative"}]}`
        }]
      }],
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text || "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(cleaned);
    return { source: "Pakistan Pharmacy Network", ...data };

  } catch (error) {
    console.error("Pharmacy search error:", error);
    const term = encodeURIComponent(medicine.split(/\s+/).slice(0, 2).join(' '));
    return {
      source: "Pakistan Pharmacy Network",
      available: [
        { name: medicine, genericName: "", purpose: "Search for this medicine", price: "Check site", store: "DVago",      url: `https://www.dvago.pk/catalogsearch/result/?q=${term}`, inStock: true },
        { name: medicine, genericName: "", purpose: "Search for this medicine", price: "Check site", store: "Dawaai.pk",  url: `https://dawaai.pk/search?search=${term}`,              inStock: true },
        { name: medicine, genericName: "", purpose: "Search for this medicine", price: "Check site", store: "MeriPharmacy", url: `https://meripharmacy.pk/search?q=${term}`,           inStock: true },
      ],
      alternatives: []
    };
  }
}
