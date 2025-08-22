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

    // Build combined prompt (friendly text output)
    const combinedPrompt = `
You are a helpful interview assistant agent. 
Your only task is to generate interview questions for the user in a **clear and friendly text format**.

Input Handling:
- The user may provide any kind of input: a job description (JD), a candidate CV, a job title and seniority (e.g., "Frontend Junior"), or even vague/general text.
- Always try to interpret the input:
  (a) Job Description (JD),
  (b) Candidate CV,
  (c) Job position & seniority only,
  (d) Ambiguous text.

Behavior:
1. If job position AND seniority are clearly mentioned → generate a list of relevant interview questions.
2. If it's a JD → generate questions targeting skills, responsibilities, and requirements.
3. If it's a CV → generate questions targeting candidate’s skills and past projects.
4. If job position or seniority is missing → politely ask the user for the missing info.
5. If input is vague/unrelated → politely ask the user to clarify.

Expected Output:
- Always respond in **plain text, easy-to-read, user-friendly format**.
- Use bullet points or numbered lists for questions.
- Group questions by category if possible (Technical, Behavioral, Situational, Culture Fit).
- If missing info → ask in a friendly way what info is needed.

⚠️ Rules:
- Do NOT output JSON or code.
- Always sound professional, supportive, and clear.

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

    // Friendly AI reply (plain text)
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
