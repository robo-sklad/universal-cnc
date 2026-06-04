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

    // === НОВЫЙ КОД ДЛЯ ЧТЕНИЯ ДОКУМЕНТОВ ===
    let knowledgeContext = "";

    try {
        // Список файлов из папки knowledge (можно расширять)
        const knowledgeFiles = [
            'knowledge/mach3-instruction.txt',
            'knowledge/universal-manual.txt',
            // Добавляй сюда новые файлы по мере загрузки
        ];

        for (const file of knowledgeFiles) {
            try {
                const rawUrl = `https://raw.githubusercontent.com/robo-sklad/universal-cnc/main/${file}`;
                const response = await fetch(rawUrl);
                if (response.ok) {
                    const text = await response.text();
                    knowledgeContext += `\n\n=== Из файла \( {file} ===\n \){text}\n`;
                }
            } catch (e) {
                console.log(`Не удалось загрузить ${file}`);
            }
        }
    } catch (err) {
        console.error("Ошибка загрузки knowledge:", err);
    }

    const systemPrompt = `Ты — дружелюбный и очень опытный технический консультант магазина "ЧПУ-Склад".

\( {knowledgeContext ? `Вот важная информация из моих документов:\n \){knowledgeContext}\n` : ''}

Отвечай простым русским языком, как мастер с большим опытом. 
Будь полезным, честным и терпеливым.
Если не знаешь точного ответа — говори прямо и предлагай написать на stepmotoren@yandex.ru или позвонить +7 961 991 01 76.`;

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
                max_tokens: 2000
            })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const reply = data.choices[0].message.content;

        return res.status(200).json({ reply });

    } catch (error) {
        console.error('Ошибка Mistral:', error);
        return res.status(500).json({ 
            reply: 'Извините, сейчас небольшая техническая проблема. Попробуйте чуть позже.' 
        });
    }
}