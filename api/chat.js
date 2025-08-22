// File: api/chat.js

export default async function handler(request, response) {
  // Add CORS headers
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Flexible input parsing
    const input_text =
      request.body?.input_text ||
      request.body?.text ||
      request.body?.message ||
      '';

    if (!input_text.trim()) {
      return response.status(400).json({
        error: 'Missing input. Please provide input_text, text, or message.',
      });
    }

    // Build combined prompt
    const combinedPrompt = `
You are an interview assistant agent. 
Your task is to generate interview questions for a given job.

Rules:
1. The user may input any free text related to a job.
2. If the input includes both job position and seniority level (e.g., "Frontend Engineer - Junior"), 
   generate a list of interview questions relevant to that role.
3. If either job position or seniority is missing, do not generate questions. 
   Instead, return a JSON response asking the user to clarify what is missing.

Expected Output:
Always return a JSON array called "expected_questions".
- If you have enough info: generate at least 5 interview questions, each with:
  {
    "question_text": "Write the interview question here",
    "category": "TECHNICAL_CORE | TECHNICAL_ADJACENT | BEHAVIORAL | SITUATIONAL | CULTURE_FIT",
    "skill_tags": ["Relevant skills here"]
  }
- If missing info: return a JSON array with a single object:
  {
    "question_text": "Please provide [missing info: position or level]",
    "category": "INFO_REQUEST",
    "skill_tags": []
  }

Remember:
- Do not output anything except the JSON array.
- Questions must be diverse (not all same category).
- This is for an interview session only.

User Input:
${input_text}
    `;

    const apiKey = process.env.GOOGLE_API_KEY;

    // Call Gemini API with combinedPrompt
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: combinedPrompt }],
            },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error('Gemini API returned an error:', errorData);
      return response.status(geminiResponse.status).json({
        error: 'Error from Gemini API',
        details: errorData.error?.message || 'No error details available',
      });
    }

    const data = await geminiResponse.json();

    const aiMessage =
      data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

    response.status(200).json({ reply: aiMessage });
  } catch (error) {
    console.error('Error in proxy:', error);
    response.status(500).json({
      error: 'An unexpected error occurred.',
      details: error.message,
    });
  }
}
