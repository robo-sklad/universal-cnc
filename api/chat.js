// api/chat.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Только POST запросы разрешены' });
    }

    const { message } = req.body;

    if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API ключ не настроен' });
    }

    const systemPrompt = `Ты — дружелюбный и опытный технический консультант магазина "ЧПУ-Склад".
Ты хорошо разбираешься в Mach3 и в нашей программе "Универсал — система ЧПУ".
Отвечай простым, понятным русским языком, как мастер с большим опытом.
Если вопрос сложный или ты не уверен — честно говори и предлагай написать живому специалисту.

Основные темы:
- Настройка Mach3 (порты, постпроцессоры, ошибки)
- Работа с программой "Универсал — система ЧПУ"
- Выбор и настройка станков ЧПУ (2030, 3040, 4060, 6090)
- Фрезы, цанги, охлаждение, комплектующие
- Типичные проблемы и их решения`;

    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ],
                temperature: 0.7,
                max_tokens: 1200
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('DeepSeek error:', errorText);
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;

        return res.status(200).json({ reply });

    } catch (error) {
        console.error('Ошибка DeepSeek:', error);
        return res.status(500).json({ 
            reply: 'Извините, сейчас возникла техническая проблема. Попробуйте отправить сообщение ещё раз или напишите нам напрямую по телефону.' 
        });
    }
}