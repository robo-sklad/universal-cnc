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

    // ←←← Здесь вся база знаний про твой магазин
    const systemPrompt = `Ты — дружелюбный и опытный технический консультант магазина "ЧПУ-Склад" (чпу-склад.рф).
Ты отлично знаешь:
- Программу "Универсал — система ЧПУ" (собственная разработка автора Рудакова А.А., замена Mach3)
- Станки ЧПУ моделей 2030, 3040, 4060, 6090 с шпинделем 1.5 кВт (водяное охлаждение, ER11)
- Настройку Mach3 и программы "Универсал"
- Подключение по COM/USB, генерацию G-кода, 3D-визуализацию, симуляцию
- Выбор фрез, безопасность, типичные ошибки и их решение

Отвечай простым, понятным русским языком, как мастер с 10-летним опытом.
Будь максимально полезным, дружелюбным и честным.
Если не знаешь точного ответа — говори об этом и предлагай написать на stepmotoren@yandex.ru или позвонить +7 961 991 01 76.

Магазин занимается продажей станков ЧПУ, расходников и программного обеспечения по всей России.`;

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
                temperature: 0.75,
                max_tokens: 1500
            })
        });

        if (!response.ok) {
            throw new Error(`Mistral API error: ${response.status}`);
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;

        return res.status(200).json({ reply });

    } catch (error) {
        console.error('Ошибка:', error);
        return res.status(500).json({ 
            reply: 'Извините, сейчас небольшая техническая проблема. Попробуйте через минуту или напишите нам напрямую на stepmotoren@yandex.ru' 
        });
    }
}
