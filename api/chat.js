// File: api/chat.js

export default async function handler(request, response) {
  // Add CORS headers to allow API calls from external clients (e.g., Google Sites)
  response.setHeader('Access-Control-Allow-Origin', '*'); // Allow all domains
  response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests (OPTIONS)
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Only allow POST method
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Extract free text input from request body
    const { input_text } = request.body;

    if (!input_text || input_text.trim() === '') {
      return response.status(400).json({
        error: 'input_text is required.',
      });
    }

    // Build strict system prompt
    const systemPrompt = `
You are an interview assistant agent. 
Your role is strictly limited to generating interview questions only. 
You should never provide answers, explanations, or any other text outside of the required JSON format. 
All questions must be usable in a real interview session. 

Task:
- The user will provide any free text input.
- Determine if the text is more likely a Job Description (JD) or a Candidate CV.
- If JD: generate interview questions relevant to the job description.
- If CV: generate interview questions relevant to the candidate's background and experiences.
- If it's ambiguous, assume it is a JD.

Output:
Return a JSON array called "expected_questions".
Each question must follow this structure:
[
  {
    "question_text": "Write the interview question here",
    "category": "TECHNICAL_CORE | TECHNICAL_ADJACENT | BEHAVIORAL | SITUATIONAL | CULTURE_FIT",
    "skill_tags": ["Relevant skills here"]
  }
]

Rules:
- Do not output anything except the JSON structure above.
- Always ensure at least 5 diverse questions are generated.
- Categories must be distributed (not all from the same category).
- If input_text is vague, generate more generic but still relevant questions.
- Remember: you are only generating interview questions for an interview session.

Note for interviewer:
👉 "Bạn muốn list câu hỏi trong lĩnh vực nào?" (Which domain/area do you want the questions to cover?)
    `;

    // Get API Key from environment variable
    const apiKey = process.env.GOOGLE_API_KEY;

    // Prepare request contents
    const contents = [
      { parts: [{ text: systemPrompt }] },
      { parts: [{ text: `User Input:\n${input_text}` }] },
    ];

    // Call Google Gemini API
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey, // Required header for Google Gemini
        },
        body: JSON.stringify({ contents }),
      }
    );

    // Handle Google API errors
    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error('Gemini API returned an error:', errorData);
      return response.status(geminiResponse.status).json({
        error: 'Error from Gemini API',
        details: errorData.error?.message || 'No error details available',
      });
    }

    const data = await geminiResponse.json();

    // Extract AI response (Gemini format)
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
