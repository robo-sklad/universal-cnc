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
  content: `Ты — эксперт по ЧПУ "Универсал". 

Пользователь может прикреплять файлы (G-code, текст, PDF и т.д.).
**Всегда** сначала анализируй содержимое прикреплённого файла, если он есть.
Не игнорируй файл и не придумывай общие фразы.

Структура ответа:
1. Кратко скажи, что за файл и что в нём.
2. Выдели ключевые моменты / ошибки / рекомендации.
3. Задай уточняющие вопросы, если нужно.

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