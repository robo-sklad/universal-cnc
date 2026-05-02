// api/advanced-chat.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Только POST запросы' });
    }

    const { message, context = "" } = req.body;

    if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }

    const apiKey = process.env.MISTRAL_API_KEY;

    const systemPrompt = `Ты — очень опытный мастер ЧПУ с 12-летним стажем, работаешь в магазине "ЧПУ-Склад" (чпу-склад.рф).
Твоё имя в чате — Александр (Саша). Говоришь просто, по-человечески, как старший товарищ в мастерской.

Ты отлично знаешь:
• Программу "Универсал — система ЧПУ" (полная замена Mach3, разработка Рудакова А.А.)
• Mach3 (настройка, порты, калибровка, ошибки, homing, soft/hard limits)
• Станки ЧПУ 2030, 3040, 4060, 6090 с водяным шпинделем 1.5 кВт ER11
• CNCV4 (Grbl Overseer) — основная программа для станков
• Подключение, драйвер CH340, COM-порты, калибровка шагов/мм
• Выбор фрез, режимы обработки (дерево, акрил, алюминий и т.д.)
• Все типичные ошибки и их решение (Alarm, потеря шагов, перегрев шпинделя и т.д.)

Отвечай всегда на русском, дружелюбно, подробно и по делу.
Если человек новичок — объясняй простыми словами.
Если вопрос сложный — предлагай варианты решения и говори "если не получится — пиши мне лично".

Ты можешь принимать файлы (PDF, G-code, фото станка) и анализировать их.

Твой стиль: мастерской, уверенный, с примерами, без лишней воды.`;

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
                    { role: 'user', content: context ? `Контекст из файла:\n${context}\n\nВопрос: ${message}` : message }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        const data = await response.json();
        const reply = data.choices[0].message.content;

        return res.status(200).json({ reply });

    } catch (error) {
        console.error('Ошибка:', error);
        return res.status(500).json({ 
            reply: 'Извини, сейчас небольшая техническая проблема. Попробуй через минуту или напиши мне напрямую.' 
        });
    }
}
