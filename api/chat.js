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

    // Build combined prompt (accept any input)
    const combinedPrompt = `
You are an interview assistant agent. 
Your role is strictly limited to generating interview questions only. 

Input Handling:
- The user may provide any kind of text: job description, candidate CV, job title only (e.g., "Frontend Junior"), or vague/general text. 
- Always try to interpret the input to determine if it represents:
  (a) Job Description (JD),
  (b) Candidate CV,
  (c) Job position & seniority only,
  (d) Ambiguous text.

Behavior:
1. If job position AND seniority level are clearly mentioned (e.g., "Frontend Engineer - Junior"), generate a set of relevant interview questions.
2. If job position or level is missing, return a JSON asking the user to provide the missing info (e.g., "Please provide the seniority level").
3. If input is a JD → generate questions targeting required skills and responsibilities.
4. If input is a CV → generate questions targeting candidate’s skills and past experiences.
5. If input is too vague or unrelated to jobs, return a JSON asking for clarification.

Expected Output:
Always return ONLY a JSON array named "expected_questions".
- If enough info is available:
  Generate at least 5 diverse interview questions. Each must have:
  {
    "question_text": "Write the interview question here",
    "category": "TECHNICAL_CORE | TECHNICAL_ADJACENT | BEHAVIORAL | SITUATIONAL | CULTURE_FIT",
    "skill_tags": ["Relevant skills here"]
  }
- If missing info:
  Return exactly one object:
  {
    "question_text": "Please provide [missing info: position, level, or more job details]",
    "category": "INFO_REQUEST",
    "skill_tags": []
  }

⚠️ Rules:
- Do not output anything except the JSON array.
- Questions must always be suitable for real interviews.
- Categories must be varied (not all same type).
- If vague input: ask for clarification instead of guessing.

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
