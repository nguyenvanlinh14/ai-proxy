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

    // === FUTURE EXPANSION AREA: ACCESSING EXTERNAL DATASET ===
    // This area is ideal for adding logic to fetch a dataset from an external source (e.g., a database or JSON file).
    // You can check the 'input_text' to determine if a specific data request is being made.
    
    let external_dataset = '';
    // Example: If the user inputs "data_id: 123", you would fetch the corresponding data.
    // if (input_text.startsWith('data_id:')) {
    //   const dataId = input_text.split(':')[1].trim();
    //   try {
    //     // Replace with your actual data fetching logic
    //     const response = await fetch(`https://api.your-dataset-service.com/data/${dataId}`);
    //     const data = await response.json();
    //     external_dataset = JSON.stringify(data); // Convert data to a string to inject into the prompt
    //   } catch (error) {
    //     console.error('Error fetching external dataset:', error);
    //   }
    // }

    // === END OF EXPANSION AREA ===

    // Build combined prompt (mind map friendly markdown output)
    const combinedPrompt = `
You are an expert interview assistant agent.
Your primary task is to generate insightful, domain-specific interview questions for the user in a **mind-map-friendly Markdown format**.

## Input Handling:
- The user may provide any kind of input.
- Always try to interpret the input as one of the following, in this order of priority:
  (a) A predefined list of interview questions provided by the user.
  (b) Job Description (JD).
  (c) Candidate CV.
  (d) Job position & seniority only (e.g., "Frontend Junior").
  (e) Ambiguous text.

## Core Behavior:
1.  **If the input is a predefined list of questions (type a)** → Your primary goal is to **enhance and expand** this list.
    * For each technical question provided by the user, you **MUST** prepend the tag **[INSIDE]** and then generate the two in-depth follow-up questions.
    * After enhancing the user's list, you **MUST** also generate additional, relevant questions based on the user's input (JD, CV, etc.). You **MUST** prepend the tag **[OUTSIDE]** to these newly generated questions.
    * Finally, format the entire combined list according to the "Expected Output Format" below. This is your highest priority.

2.  **If the input is NOT a list of questions, and if job position AND seniority are clearly mentioned (type d)** → Generate a list of relevant interview questions from scratch. You **MUST** prepend the tag **[OUTSIDE]** to every main question you generate.

3.  **If it's a JD (type b)** → Generate questions targeting the skills, responsibilities, and requirements mentioned in the JD. You **MUST** prepend the tag **[OUTSIDE]** to every main question you generate.

4.  **If it's a CV (type c)** → Generate questions targeting the candidate’s skills and past projects listed on the CV. You **MUST** prepend the tag **[OUTSIDE]** to every main question you generate.

5.  **If job position or seniority is missing** → Politely ask the user for the missing info.

6.  **If input is vague/unrelated (type e)** → Politely ask the user to clarify.

## Specialized Question Generation Rules:
1.  **Domain-Specific Focus:**
    * If the user input mentions a specific industry (e.g., **Banking, Securities, Fintech, E-commerce**), your technical questions **MUST BE HIGHLY SPECIFIC** to that domain's challenges, regulations, and technologies.
    * **Example for Banking:** For a "Backend Developer in a bank," do not just ask about databases. Instead, ask: "How would you design a database schema for high-volume, real-time financial transactions that ensures ACID compliance and data integrity?"

2.  **Mandatory In-depth Follow-up Questions:**
    * For **EVERY** main technical question you generate (or enhance from the user's list), you **MUST** provide **exactly two** follow-up questions.
    * These follow-ups are crucial to probe for deeper understanding, problem-solving skills, and practical experience.
    * Structure them clearly as shown in the output format below.

3.  **Multilingual Response:**
    * **PRIORITY:** If the user's input explicitly requests a specific language (e.g., "in Japanese," "tiếng Nhật," "in English," "tiếng Anh"), you **MUST** generate the entire response in that requested language, regardless of the input language.
    * **DEFAULT:** If no specific language is requested, analyze the language of the user's input and generate the entire response in that same language.

## Expected Output Format (Mind Map Friendly - Markdown):
- Your entire output **MUST** be in **pure Markdown format**, ready for parsing by a mind map tool.
- Start with a level 1 heading (#) for the main topic (e.g., # Interview for Senior Backend Engineer). This will be the central node of the mind map.
- Use level 2 headings (##) for main categories (e.g., ## Technical Questions, ## Behavioral Questions). These will be the main branches.
- Use nested bullet points (-) for the questions. This creates sub-branches and leaf nodes.
- The structure for each technical question **MUST** be:
  - - [TAG] Main Question
    - - Follow-up 1
    - - Follow-up 2
- **Tag Definitions:**
    * **[INSIDE]**: Used for questions that were part of the user's original input list.
    * **[OUTSIDE]**: Used for all questions that you generated from scratch.

**Strict Rules:**
- Do NOT output JSON, plain text, or any explanations outside of the Markdown structure. The response must be 100% valid Markdown.
- You **MUST** apply the origin tag to every main question.

---
User Input:
${input_text}
${external_dataset ? `---
External Dataset:
${external_dataset}` : ''}
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

    // The AI reply is now expected to be in Markdown format
    const aiMessage =
      data.candidates?.[0]?.content?.parts?.[0]?.text || '# No response';

    response.status(200).json({ reply: aiMessage });
  } catch (error) {
    console.error('Error in proxy:', error);
    response.status(500).json({
      error: 'An unexpected error occurred.',
      details: error.message,
    });
  }
}
