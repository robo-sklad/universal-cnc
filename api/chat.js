export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ reply: "Метод не разрешён" });
  }

  try {
    const { messages } = req.body;

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [
          {
            role: "system",
            content: "Ты — дружелюбный помощник по программе «Универсал — система ЧПУ». Отвечай только на русском, коротко и по делу."
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    const data = await response.json();
    return res.json({ reply: data.choices[0].message.content });

  } catch (error) {
    console.error(error);
    return res.json({ reply: "Извини, сейчас не могу ответить 😔" });
  }
}