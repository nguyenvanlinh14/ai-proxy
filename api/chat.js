// File: api/chat.js

export default async function handler(request, response) {
  // Chỉ cho phép phương thức POST
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Lấy câu hỏi của người dùng từ request gửi đến
    const userPrompt = request.body.prompt;

    if (!userPrompt) {
      return response.status(400).json({ error: 'Prompt is required' });
    }

    // Lấy API Key từ biến môi trường một cách AN TOÀN
    const apiKey = process.env.OPENAI_API_KEY;

    // Gọi đến API của OpenAI
    const openaiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}` // Sử dụng API Key ở đây
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // Hoặc một model khác
        messages: [{ role: "user", content: userPrompt }],
        temperature: 0.7,
      }),
    });

    const data = await openaiResponse.json();

    // Lấy câu trả lời từ AI và gửi về cho Google Sites
    const aiMessage = data.choices[0].message.content;
    response.status(200).json({ reply: aiMessage });

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    response.status(500).json({ error: 'Something went wrong' });
  }
}
