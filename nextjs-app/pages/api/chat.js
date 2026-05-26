// pages/api/chat.js

const { applyRegexGuardrail } = require('../../lib/piiGuardrail');
const { GoogleGenAI } = require('@google/genai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const NER_SERVICE_URL = process.env.NER_SERVICE_URL || 'http://localhost:5000';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // --- STEP 1: Regex Guardrail ---
  const { redactedText: afterRegex, found: regexFound } = applyRegexGuardrail(message);

  // --- STEP 2: NER Guardrail (HTTP call ke NER Service) ---
  let afterNer = afterRegex;
  let nerEntities = [];

  try {
    const nerResponse = await fetch(`${NER_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: afterRegex }),
    });
    const nerData = await nerResponse.json();
    nerEntities = nerData.entities || [];

    // Redaksi entitas PERSON dan ADDRESS dari hasil NER
    for (const entity of nerEntities) {
      if (entity.label === 'PERSON') {
        // Gunakan replaceAll untuk mengganti semua instansi
        afterNer = afterNer.replaceAll(entity.text, '[REDACT_NAMA]');
      } else if (entity.label === 'ADDRESS') {
        afterNer = afterNer.replaceAll(entity.text, '[REDACT_ADDRESS]');
      }
    }
  } catch (err) {
    console.warn('NER service tidak tersedia, skip NER guardrail:', err.message);
  }

  // --- STEP 3: Kirim ke Gemini API menggunakan Google Gen AI SDK (Google ADK) ---
  const safePrompt = afterNer;

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: safePrompt,
      config: {
        systemInstruction: 'Kamu adalah agen customer support yang ramah dan membantu. Jawab pertanyaan pengguna dengan sopan dan informatif dalam bahasa Indonesia.',
      }
    });

    const reply = response.text || 'Maaf, tidak ada respons dari AI.';

    return res.status(200).json({
      reply,
      debug: {
        originalMessage: message,
        afterRegex,
        afterNer,
        regexFound,
        nerEntities,
      },
    });
  } catch (err) {
    console.error('Gemini API error via SDK:', err);
    return res.status(500).json({
      error: `Gagal menghubungi Gemini API: ${err.message}`,
      debug: {
        originalMessage: message,
        afterRegex,
        afterNer,
        regexFound,
        nerEntities,
      }
    });
  }
}
