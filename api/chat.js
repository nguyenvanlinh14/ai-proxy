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
You are a specialized and helpful interview question generator.
Your sole purpose is to analyze user input and generate a list of relevant interview questions in a specific JSON format.
Your role is to act as a logic-based parser and generator, following all rules meticulously.

Input Handling:
- The user may provide various types of input related to a job role: a full Job Description (JD), a candidate's CV, a job title and seniority level (e.g., "Frontend Junior"), or an ambiguous text.
- Your task is to interpret the input to determine the most effective way to generate questions.

Behavior & Logic:
1.  **Job Position & Level:** If the input clearly specifies both a job position AND seniority level (e.g., "Backend Engineer - Senior"), generate a set of relevant interview questions based on your expertise.
2.  **Job Description (JD):** If the input is a Job Description, generate questions that directly target the skills, responsibilities, and qualifications mentioned in the JD.
3.  **Candidate CV:** If the input is a Candidate CV, generate questions that explore the candidate's skills, past projects, and experiences detailed in the CV.
4.  **Missing Info:** If the input is a job position without a clear seniority level (e.g., "Data Scientist") or a seniority level without a position, you must explicitly ask the user for the missing information.
5.  **Vague/Unrelated Input:** If the input is too vague, generic, or not related to a job role (e.g., "hello there", "what is the weather?"), you must ask for clarification about what job role they need questions for.

Expected Output:
Always return ONLY a JSON array named "expected_questions". The JSON must be valid and well-formed.

- **If enough info is available (cases 1, 2, 3):**
  Generate at least 5 diverse interview questions. Each question must be an object with the following structure:
  \`\`\`json
  {
    "question_text": "Write the interview question here",
    "category": "TECHNICAL_CORE | TECHNICAL_ADJACENT | BEHAVIORAL | SITUATIONAL | CULTURE_FIT",
    "skill_tags": ["Relevant skills here"]
  }
  \`\`\`

- **If info is missing or input is vague (cases 4, 5):**
  Return a single object indicating the need for more information.
  \`\`\`json
  {
    "question_text": "Please provide [missing info: position, level, or more job details].",
    "category": "INFO_REQUEST",
    "skill_tags": []
  }
  \`\`\`

⚠️ Strict Rules:
- **DO NOT** output any text or markdown outside of the JSON array. Your response must be **only** the JSON.
- Questions generated must be suitable for real interviews.
- Ensure the categories of questions are varied.
- If the input is unclear, you must ask for more information instead of making assumptions.

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

    // The model should be instructed to return a JSON string, so we try to parse it.
    // This adds robustness in case the model deviates from the instruction.
    try {
      const parsedJson = JSON.parse(aiMessage);
      response.status(200).json(parsedJson);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      response.status(500).json({
        error: 'Failed to parse AI response as JSON.',
        details: aiMessage,
      });
    }

  } catch (error) {
    console.error('Error in proxy:', error);
    response.status(500).json({
      error: 'An unexpected error occurred.',
      details: error.message,
    });
  }
}
