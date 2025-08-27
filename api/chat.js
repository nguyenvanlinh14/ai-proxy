// File: api/chat.js

import { getPrompt } from './prompt-template.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Sets CORS headers for the response.
 * @param {object} response - The Vercel response object.
 */
function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(request, response) {
  setCorsHeaders(response);

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_API_KEY is not set.');
      return response.status(500).json({ error: 'Server configuration error.' });
    }

    const { input_text, text, message, external_dataset = '' } = request.body;
    const userInput = input_text || text || message;

    if (!userInput || !userInput.trim()) {
      return response.status(400).json({
        error: 'Missing input. Please provide `input_text`, `text`, or `message`.',
      });
    }

    const combinedPrompt = getPrompt(userInput, external_dataset);

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: combinedPrompt }] }],
        // Optional: Add safety settings or generation config here
        // generationConfig: {
        //   temperature: 0.7,
        //   maxOutputTokens: 2048,
        // },
      }),
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error('Gemini API Error:', errorData);
      return response.status(geminiResponse.status).json({
        error: 'Error from generative AI service.',
        details: errorData.error?.message || 'No details provided.',
      });
    }

    const data = await geminiResponse.json();
    const aiMessage = data.candidates?.[0]?.content?.parts?.[0]?.text || '# No valid response from AI.';

    response.status(200).json({ reply: aiMessage });
    
  } catch (error) {
    console.error('Server-side error:', error);
    response.status(500).json({
      error: 'An unexpected error occurred on the server.',
      details: error.message,
    });
  }
}
