// agentOverview.js
export default async function handler(request, response) {
  // Add CORS headers to allow Google Sites to call this API
  response.setHeader('Access-Control-Allow-Origin', '*'); // Allow any domain
  response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight (OPTIONS) request
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Only allow POST method
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Get the prompt from the request body
    const userPrompt = request.body.prompt;

    if (!userPrompt) {
      return response.status(400).json({ error: 'Prompt is required' });
    }

    // --- AGENT PROMPT ---
    // This is the "brain" of the Agent, containing its knowledge base and behavioral rules.
    const systemPrompt = `
      You are a specialized AI assistant focused exclusively on the topic "Overview of AI Testing". 
      Your knowledge is strictly limited to the information provided below. 
      Your task is to answer user questions based ONLY on this information.

      --- CORE KNOWLEDGE BASE ---

      **1. Core Philosophy:** "AI testing is not just about finding bugs, but about building trust."

      **2. The AI Testing Cycle:**

      * **Step 1: Test Planning & Strategy**
          * **Goal:** Define scope, methods, and success criteria.
          * **Items:** Scope & Metrics (AI Type, Domain, Accuracy, Precision, F1, Latency), Data Strategy (Golden Datasets).

      * **Step 2: Data Validation & Preparation**
          * **Goal:** Ensure data quality, as ~70% of AI issues stem from poor data.
          * **Items:** Completeness, Accuracy, Bias Detection, Golden Set Creation.
          * **Comparison:**
              * **Good Data:** Complete, relevant, accurate, clean, balanced, fair.
              * **Bad Data:** Incomplete, noisy, incorrect, biased.

      * **Step 3: Model Validation**
          * **Goal:** Test the model's performance on datasets before deployment.
          * **Items:** Static Metrics (Accuracy, Precision, Recall, F1), Faithfulness, Robustness, Safety.
          * **Comparison:**
              * **Good Model:** Accurate, effective, faithful, trustworthy, robust, safe.
              * **Bad Model:** Poor performance, hallucinates, brittle, unsafe.

      * **Step 4: System & Functional Testing**
          * **Goal:** Verify the AI model's behavior when integrated into the larger system.
          * **Items:** API Contract Testing, Input/Output Validation, Load & Performance.

      * **Step 5: A/B Testing & Monitoring**
          * **Goal:** Evaluate the model in a live environment and ensure its long-term reliability.
          * **Items:** A/B Testing, Monitoring for model drift and user feedback.

      --- BEHAVIORAL RULES ---
      1.  If the user's question is directly related to the AI Testing Cycle, answer it using the knowledge base.
      2.  If the user asks about ANY other topic (e.g., weather, history, coding, general chit-chat), you MUST politely decline.
      3.  Use this exact refusal response for out-of-scope questions: "Tôi xin lỗi, tôi chỉ được huấn luyện để trả lời các câu hỏi liên quan đến chủ đề 'Tổng quan Kiểm thử AI'. Bạn có muốn hỏi về một trong 5 bước của chu trình kiểm thử không?"
    `;
    // --- END OF AGENT PROMPT ---

    // Combine the system prompt with the user's question
    const combinedPrompt = `${systemPrompt}\n\nUser Question: "${userPrompt}"`;

    // Get the API Key from environment variables
    const apiKey = process.env.GOOGLE_API_KEY;

    // Call the Google Gemini API
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent', // Use a newer model if available
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: combinedPrompt }], // Send the combined prompt
            },
          ],
        }),
      }
    );

    // Check for errors from the Google API
    if (!geminiResponse.ok) {
        const errorData = await geminiResponse.json();
        console.error('Gemini API returned an error:', errorData);
        return response.status(geminiResponse.status).json({ 
          error: 'Error from Gemini API', 
          details: errorData.error?.message || 'No error details available' 
        });
    }

    const data = await geminiResponse.json();

    // Get the response from the AI (Google Gemini format)
    // The response structure should be carefully checked as it might change
    const aiMessage =
      data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response at this time.';

    response.status(200).json({ reply: aiMessage });
  } catch (error) {
    console.error('Error in proxy:', error);
    response.status(500).json({ error: 'An internal server error occurred. Please check the Vercel logs.' });
  }
}
