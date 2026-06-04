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

    // ============================================
    // БЛОК ЗАГРУЗКИ ЗНАНИЙ ИЗ ПАПКИ knowledge/
    // ============================================
    let knowledgeContext = "";

    // Здесь указывай файлы, которые бот должен использовать
    const knowledgeFiles = [
        "knowledge/mach3-instruction.txt",
        // "knowledge/universal-manual.txt",     // раскомментируй, когда добавишь
        // "knowledge/stanki-3040-4060.txt",     // раскомментируй, когда добавишь
    ];

    for (const filePath of knowledgeFiles) {
        try {
            const rawUrl = `https://raw.githubusercontent.com/robo-sklad/universal-cnc/main/${filePath}`;
            const response = await fetch(rawUrl);

            if (response.ok) {
                const text = await response.text();
                knowledgeContext += `\n\n=== Документ: \( {filePath} ===\n \){text}\n`;
            }
        } catch (err) {
            console.log(`Не удалось загрузить файл: ${filePath}`);
        }
    }

    // ============================================
    // СИСТЕМНЫЙ ПРОМПТ
    // ============================================
    const systemPrompt = `Ты — опытный технический специалист магазина "ЧПУ-Склад" (чпу-склад.рф).
Владелец — Рудаков Александр Александрович.

Ты отлично знаешь:
- Программу "Универсал — система ЧПУ"
- Станки ЧПУ 2030, 3040, 4060, 6090
- Настройку и работу в Mach3
- Подключение оборудования, генерацию G-кода, безопасность работы

${knowledgeContext ? 
`ВАЖНО: Ниже приведена информация из официальных документов и инструкций. 
Используй её в первую очередь при ответах. Если информация есть в документах — опирайся на неё.

${knowledgeContext}` : ''}

Отвечай простым, понятным русским языком, как мастер с большим практическим опытом.
Будь полезным, честным и терпеливым. 
Если не знаешь точного ответа или информации нет в документах — честно говори об этом.`;

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

        if (!response.ok) {
            throw new Error(`Mistral API error: ${response.status}`);
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;

        return res.status(200).json({ reply });

    } catch (error) {
        console.error('Ошибка:', error);
        return res.status(500).json({ 
            reply: 'Извините, произошла техническая ошибка. Попробуйте чуть позже или напишите на stepmotoren@yandex.ru' 
        });
    }
}