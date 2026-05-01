// api/chat.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Только POST запросы' });
    }

    const { message } = req.body;

    if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }

    const apiKey = process.env.MISTRAL_API_KEY;

    const systemPrompt = `Ты — дружелюбный и опытный технический консультант магазина "ЧПУ-Склад".
Ты отлично разбираешься в Mach3, программе "Универсал — система ЧПУ", настройке станков ЧПУ, фрезах и типичных проблемах.
Отвечай простым, понятным русским языком, как мастер с большим опытом.
Если вопрос сложный или ты не уверен — честно говори и предлагай связаться с живым специалистом.`;

    try {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "mistral-large-latest",
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
            console.error('Mistral API error:', errorText);
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;

        return res.status(200).json({ reply });

    } catch (error) {
        console.error('Ошибка Mistral:', error);
        return res.status(500).json({ 
            reply: 'Извините, сейчас возникла техническая проблема. Попробуйте чуть позже или напишите нам напрямую.' 
        });
    }
}
