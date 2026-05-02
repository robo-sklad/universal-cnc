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
        model: "mistral-medium-latest",
        messages: [
          {
            role: "system",
            content: `Ты — эксперт по программе «Универсал — система ЧПУ».
Ты можешь анализировать прикреплённые файлы (G-code, текст, описания).
Отвечай на русском, по делу.`
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1200
      })
    });

    const data = await response.json();

    return res.json({ reply: data.choices[0].message.content });

  } catch (error) {
    console.error(error);
    return res.json({ reply: "Ошибка при обработке. Попробуй ещё раз." });
  }
}