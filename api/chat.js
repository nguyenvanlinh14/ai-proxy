// File: api/chat.js

export default async function handler(request, response) {
  // Chỉ cho phép phương thức POST
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Lấy câu hỏi từ request
    const userPrompt = request.body.prompt;

    if (!userPrompt) {
      return response.status(400).json({ error: 'Prompt is required' });
    }

    // Lấy API Key từ biến môi trường
    const apiKey = process.env.GOOGLE_API_KEY;

    // Gọi đến Google Gemini API
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey, // Google yêu cầu header này
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: userPrompt }],
            },
          ],
        }),
      }
    );

    const data = await geminiResponse.json();

    // Lấy câu trả lời từ AI (Google Gemini format)
    const aiMessage =
      data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

    response.status(200).json({ reply: aiMessage });
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    response.status(500).json({ error: 'Something went wrong' });
  }
}
