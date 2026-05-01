// api/chat.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Только POST запросы' });
    }

    const userMessage = req.body.message;
    const apiKey = 'ТВОЙ_КЛЮЧ_MISTRAL'; // <-- Вставь сюда свой Mistral API ключ

    const systemPrompt = `Ты — виртуальный консультант магазина "ЧПУ-Склад". 
Ты опытный инженер с 10-летним стажем. Твоя задача — помогать клиентам 
подбирать станки ЧПУ и настраивать программы, особенно Mach3 и нашу 
программу "Универсал — система ЧПУ". Отвечай простым, понятным языком, 
как опытный мастер.

База знаний:
[ВСТАВЬ СЮДА СВОЙ ТЕКСТ ИЗ baza-znaniy.txt]

Если не знаешь точного ответа на вопрос, предложи связаться с живым специалистом.`;

    try {
        // Адрес API у Mistral другой!
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'mistral-small-latest', // или 'mistral-medium-latest' для более умных ответов
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();
        // Ответ Mistral приходит в том же формате, что и у DeepSeek
        res.status(200).json({ reply: data.choices[0].message.content });

    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ reply: 'Извините, произошла ошибка. Попробуйте позже.' });
    }
}
