export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ reply: "Метод не разрешён" });
  }

  try {
    const { messages } = req.body;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

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
            content: "Ты — дружелюбный помощник по программе «Универсал — система ЧПУ». Отвечай на русском, коротко и по делу. Помни предыдущий контекст разговора."
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) throw new Error(`Mistral error: ${response.status}`);

    const data = await response.json();

    return res.json({ 
      reply: data.choices[0].message.content 
    });

  } catch (error) {
    console.error(error);
    return res.json({ 
      reply: error.name === 'AbortError' 
        ? "Ответ слишком длинный. Попробуй вопрос короче." 
        : "Извини, сейчас не могу ответить. Попробуй ещё раз." 
    });
  }
}