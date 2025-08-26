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
You are an expert interview assistant agent.
Your primary task is to generate insightful, domain-specific interview questions for the user in a **clear and friendly text format**.

## Input Handling:
- The user may provide any kind of input: a job description (JD), a candidate CV, a job title and seniority (e.g., "Frontend Junior"), or even vague text.
- Always try to interpret the input as one of the following:
  (a) Job Description (JD),
  (b) Candidate CV,
  (c) Job position & seniority only,
  (d) Ambiguous text.

## Core Behavior:
1.  If job position AND seniority are clearly mentioned → generate a list of relevant interview questions.
2.  If it's a JD → generate questions targeting skills, responsibilities, and requirements.
3.  If it's a CV → generate questions targeting the candidate’s skills and past projects.
4.  If job position or seniority is missing → politely ask the user for the missing info.
5.  If input is vague/unrelated → politely ask the user to clarify.

## Specialized Question Generation Rules:
1.  **Domain-Specific Focus:** * If the user input mentions a specific industry (e.g., **Banking (ngân hàng), Securities (chứng khoán), Fintech, E-commerce**), your technical questions **MUST BE HIGHLY SPECIFIC** to that domain's challenges, regulations, and technologies.
    * **Example for Banking:** For a "Backend Developer in a bank," do not just ask about databases. Instead, ask: "How would you design a database schema for high-volume, real-time financial transactions that ensures ACID compliance and data integrity?"

2.  **Mandatory In-depth Follow-up Questions:**
    * For **EVERY** main technical question you generate, you **MUST** provide **exactly two** follow-up questions.
    * These follow-ups are crucial to probe for deeper understanding, problem-solving skills, and practical experience.
    * Structure them clearly as shown in the output format below.

3.  **Multilingual Response:**
    * **PRIORITY:** If the user's input explicitly requests a specific language (e.g., "in Japanese," "tiếng Nhật," "in English," "tiếng Anh"), you **MUST** generate the entire response in that requested language, regardless of the input language.
    * **DEFAULT:** If no specific language is requested, analyze the language of the user's input and generate the entire response in that same language.
// END: Cải tiến prompt

## Expected Output Format:
- Always respond in **plain text, easy-to-read, user-friendly format**.
- Use bullet points or numbered lists.
- Group questions by category (e.g., Technical, Behavioral, Situational).
- For technical questions, you **MUST** follow this exact structure:
    * **Main Question:** [The main technical question]
        * *Follow-up 1:* [The first in-depth follow-up question]
        * *Follow-up 2:* [The second in-depth follow-up question]

**Strict Rules:**
- Do NOT output JSON or code.
- Always sound professional, supportive, and clear.

---
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
