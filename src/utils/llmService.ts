import type { ExtractedNote, Patient } from '../types';
import { localSmartParser } from './rules';

const SYSTEM_PROMPT = `You are an expert medical data extractor. 
Extract patient information from ASHA worker's raw visit note. The note may be in English, Hinglish, or contain typos.
Analyze the note and identify if a danger sign is present: swelling, bleeding, high fever, severe pain, convulsions, dizziness, breathless, etc.

Return a strict JSON object with:
{
  "name": "Patient name",
  "condition": "Brief description of condition (e.g. 7 months pregnant, diabetes refill, MMR vaccine)",
  "visit_type": "Must be exactly one of: 'pregnancy', 'immunization', 'ncd_refill'",
  "weeks_pregnant": number (weeks pregnant if pregnancy case and mentioned, otherwise null),
  "danger_flag": boolean (true if any danger signs/symptoms are mentioned)
}`;

function cleanJsonResponse(text: string): string {
  let clean = text.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?/, '');
  }
  if (clean.endsWith('```')) {
    clean = clean.replace(/```$/, '');
  }
  return clean.trim();
}

export async function extractVisitNote(
  noteText: string,
  existingPatients: Patient[],
  apiKey: string | null,
  provider: 'openai' | 'gemini' | 'local'
): Promise<Partial<ExtractedNote>> {
  if (provider === 'local' || !apiKey) {
    // Fall back to local parser
    return localSmartParser(noteText, existingPatients);
  }

  const promptText = `System Prompt: ${SYSTEM_PROMPT}\n\nASHA Worker's Note: "${noteText}"`;

  try {
    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: promptText,
            }],
          }],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No content returned from Gemini API');

      const parsed = JSON.parse(cleanJsonResponse(text));
      return {
        ...parsed,
        confidence: 0.94,
      };
    } else if (provider === 'openai') {
      const url = 'https://api.openai.com/v1/chat/completions';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: promptText,
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('No content returned from OpenAI API');

      const parsed = JSON.parse(cleanJsonResponse(text));
      return {
        ...parsed,
        confidence: 0.95,
      };
    }
  } catch (error) {
    console.error('LLM extraction failed, falling back to local parser:', error);
  }

  // Final fallback
  return localSmartParser(noteText, existingPatients);
}
