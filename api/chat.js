export default async function handler(req, res) {
  // Разрешаем только POST
  if (req.method !== 'POST') {
    return res.status(405).json({ reply: "Метод не разрешён" });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ reply: "Неверный формат сообщения" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25 секунд таймаут

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
            content: "Ты — дружелюбный помощник по программе «Универсал — система ЧПУ». Отвечай только на русском языке, коротко и по делу."
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mistral error:", errorText);
      return res.status(500).json({ reply: "Ошибка соединения с ИИ. Попробуй позже." });
    }

    const data = await response.json();

    return res.json({ 
      reply: data.choices?.[0]?.message?.content || "Не смог получить ответ." 
    });

  } catch (error) {
    console.error("Handler error:", error);

    if (error.name === 'AbortError') {
      return res.json({ reply: "Ответ слишком длинный. Попробуй задать вопрос короче." });
    }

    return res.json({ 
      reply: "Извини, сейчас не могу ответить 😔 Попробуй ещё раз через пару секунд." 
    });
  }
}