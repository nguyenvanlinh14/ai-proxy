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
    // Extract input fields from request body
    const { job_description, candidate_cv } = request.body;

    if (!job_description) {
      return response.status(400).json({ 
        error: 'job_description is required.' 
      });
    }

    // Build strict prompt to limit chatbot response
    const systemPrompt = `
You are an interview assistant agent. 
Your role is strictly limited to generating interview questions only. 
You should never provide answers, explanations, or any other text outside of the required JSON format. 
All questions must be usable in a real interview session. 

Inputs:
- job_description (JD): A text describing the job. It can be detailed or very vague.
- candidate_cv (optional): Extracted text content from the candidate's CV. If missing, base questions only on the JD.

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
- If job_description is vague, generate more generic but still relevant questions.
- If candidate_cv is missing or null, skip it and rely solely on job_description.
- Remember: you are only generating interview questions for an interview session.

Note for interviewer:
👉 "Bạn muốn list câu hỏi trong lĩnh vực nào?" (Which domain/area do you want the questions to cover?)
    `;

    // Get API Key from environment variable
    const apiKey = process.env.GOOGLE_API_KEY;

    // Prepare request contents for Gemini
    const contents = [
      { parts: [{ text: systemPrompt }] },
      { parts: [{ text: `Job Description:\n${job_description}` }] }
    ];

    if (candidate_cv && candidate_cv.trim() !== '') {
      contents.push({ parts: [{ text: `Candidate CV:\n${candidate_cv}` }] });
    }

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
    response.status(500).json({ error: 'An unexpected error occurred. Check server logs.' });
  }
}
