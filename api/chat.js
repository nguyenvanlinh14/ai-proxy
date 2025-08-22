// File: api/chat.js

export default async function handler(request, response) {
  // Thêm các headers CORS để cho phép Google Sites gọi API này
  response.setHeader('Access-Control-Allow-Origin', '*'); // Cho phép mọi domain
  response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Xử lý yêu cầu preflight (OPTIONS)
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

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

    // Kiểm tra lỗi từ API của Google
    if (!geminiResponse.ok) {
        const errorData = await geminiResponse.json();
        console.error('Gemini API returned an error:', errorData);
        return response.status(geminiResponse.status).json({ 
          error: 'Lỗi từ Gemini API', 
          details: errorData.error?.message || 'Không có chi tiết lỗi' 
        });
    }

    const data = await geminiResponse.json();

    // Lấy câu trả lời từ AI (Google Gemini format)
    const aiMessage =
      data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

    response.status(200).json({ reply: aiMessage });
  } catch (error) {
    console.error('Error in proxy:', error);
    response.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng kiểm tra log trên Vercel.' });
  }
}
