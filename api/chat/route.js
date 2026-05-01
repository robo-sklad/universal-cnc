import { Mistral } from '@mistralai/mistralai';

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

export async function POST(request) {
  try {
    const { messages } = await request.json();

    const result = await mistral.chat.complete({
      model: "mistral-small-latest",
      messages: [
        { 
          role: "system", 
          content: "Ты — дружелюбный помощник по программе «Универсал — система ЧПУ». Отвечай только на русском языке, коротко и по делу." 
        },
        ...messages
      ],
      temperature: 0.7,
      maxTokens: 800,
    });

    return Response.json({ 
      reply: result.choices[0].message.content 
    });

  } catch (err) {
    console.error(err);
    return Response.json({ reply: "Извини, сейчас не могу ответить 😔 Попробуй ещё раз." });
  }
}
