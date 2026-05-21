import express from 'express';
import { GoogleGenAI } from '@google/genai';

const router = express.Router();
const GEMINI_MODEL = 'gemini-2.5-flash';

router.post('/search', async (req, res) => {
  const { city, speciality } = req.body;
  console.log(`[Doctors] Searching for ${speciality} in ${city}`);

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const searchPrompt = `Search oladoc.com for ${speciality} doctors in ${city} Pakistan. Find 3 to 5 real doctors. For each doctor, give me their full name, speciality, qualification, hospital, experience, fee, and most importantly their REAL profile page URL that you found from oladoc.com. Do not construct or guess any URL. Only return URLs that you actually found from search results. Return ONLY a valid JSON array with no markdown backticks: [{"name":"Dr. Full Name","speciality":"...","qualification":"...","hospital":"...","experience":"...","fee":2000,"oladocUrl":"the real URL you found"}]`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: searchPrompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
      },
    });

    const text = response.text || "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const doctors = JSON.parse(cleaned);

    // Validate and clean each doctor entry
    const validated = doctors.map((d: any, i: number) => {
      let url = d.oladocUrl || '';
      
      // Validation check: if it doesn't look like a real Oladoc profile page, use the fallback listing page
      const hasCorrectFormat = url.includes('oladoc.com') && url.includes('/dr/') && /\/\d+$/.test(url);
      if (!hasCorrectFormat) {
        console.log(`[Doctors] URL "${url}" failed validation format check — replacing with listing fallback`);
        const formattedCity = (city || 'karachi').toLowerCase().replace(/\s+/g, '-');
        const slug = (speciality || 'general-physician').toLowerCase().replace(/\s+/g, '-');
        url = `https://oladoc.com/pakistan/${formattedCity}/${slug}`;
      }

      return {
        id: `doc_${i + 1}`,
        name: d.name || `Dr. Specialist`,
        speciality: d.speciality || speciality,
        qualification: d.qualification || 'MBBS',
        hospital: d.hospital || city,
        experience: d.experience || 'Experienced',
        fee: typeof d.fee === 'number' ? d.fee : parseInt(d.fee) || 2000,
        city: city || 'Karachi',
        oladocUrl: url,
      };
    });

    console.log(`[Doctors] Found ${validated.length} doctors`);
    res.json({ source: 'Oladoc Network', doctors: validated });
  } catch (error: any) {
    console.error("Doctor search error:", error);
    const formattedCity = (city || 'karachi').toLowerCase().replace(/\s+/g, '-');
    const slug = (speciality || 'general-physician').toLowerCase().replace(/\s+/g, '-');
    res.json({ 
      source: "Oladoc Network",
      doctors: [{
        id: "doc_fallback",
        name: `Search ${speciality} in ${city}`,
        speciality: speciality || 'General Physician',
        qualification: "View all available doctors",
        hospital: city || 'Pakistan',
        experience: "Various",
        fee: "Varies",
        city: city || 'Karachi',
        oladocUrl: `https://oladoc.com/pakistan/${formattedCity}/${slug}`
      }]
    });
  }
});

export default router;
