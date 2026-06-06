// api/chat.js
let cachedKnowledge = { context: "", files: [], timestamp: 0 };
const CACHE_TTL = 10 * 60 * 1000; // 10 минут

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Только POST запросы' });
    }

    // Принимаем сообщение и файл от пользователя
    const { message, file, fileType, fileName } = req.body;

    // Проверяем, что есть хотя бы сообщение или файл
    if (!message && !file) {
        return res.status(400).json({ error: 'Сообщение или файл обязательны' });
    }

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API ключ не настроен' });
    }

    // Обработка загруженного файла от пользователя
    let fileContext = "";
    if (file) {
        if (fileType === 'text') {
            // Текстовый файл: добавляем содержимое в контекст
            fileContext = `\n\n=== ПОЛЬЗОВАТЕЛЬСКИЙ ФАЙЛ: ${fileName} ===\n${file}\n`;
        } else if (fileType === 'image') {
            // Изображение: просто упоминаем в промпте
            fileContext = `\n\n[Пользователь прикрепил изображение: ${fileName}]`;
        }
    }

    // Загрузка документов из GitHub (ваш существующий код)
    const now = Date.now();
    if (now - cachedKnowledge.timestamp > CACHE_TTL) {
        try {
            const listUrl = "https://api.github.com/repos/robo-sklad/universal-cnc/contents/knowledge";
            const listResponse = await fetch(listUrl, {
                headers: { 'User-Agent': 'Vibe-Chatbot' }
            });

            if (listResponse.ok) {
                const files = await listResponse.json();
                const txtFiles = files.filter(f => f.type === 'file' && f.name.endsWith('.txt'));

                let newContext = "";
                let newFiles = [];

                for (const file of txtFiles) {
                    const contentRes = await fetch(file.download_url);
                    if (contentRes.ok) {
                        const text = await contentRes.text();
                        newContext += `\n\n=== ДОКУМЕНТ: ${file.name} ===\n\n${text}\n`;
                        newFiles.push(file.name);
                    }
                }

                cachedKnowledge = {
                    context: newContext,
                    files: newFiles,
                    timestamp: now
                };
            }
        } catch (err) {
            console.error("Ошибка загрузки документов:", err);
        }
    }

    // Формируем системный промпт с учетом файла пользователя
    const systemPrompt = `Ты — технический специалист магазина "ЧПУ-Склад".
Загруженные документы: ${cachedKnowledge.files.join(', ') || 'нет документов'}

${cachedKnowledge.context}${fileContext}

ВАЖНОЕ ПРАВИЛО:
Если пользователь спрашивает про любой загруженный документ (например avtor.txt или mach3-instruction.txt) — ВСЕГДА используй информацию из него.
Не говори, что не знаешь файл, если он есть в списке выше.`;

    try {
        // Выбираем модель в зависимости от типа файла
        const model = fileType === 'image' ? "mistral-large-vision" : "mistral-large-latest";

        // Формируем messages в зависимости от типа файла
        const messages = [
            { role: 'system', content: systemPrompt },
            {
                role: 'user',
                content: fileType === 'image'
                    ? [
                        { type: 'text', text: message || "Опиши, что на этом изображении?" },
                        { type: 'image_url', image_url: file }
                      ]
                    : message
            }
        ];

        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: 0.5,
                max_tokens: 2000
            })
        });

        const data = await response.json();
        return res.status(200).json({ reply: data.choices[0].message.content });

    } catch (error) {
        console.error('Ошибка Mistral:', error);
        return res.status(500).json({ reply: 'Ошибка соединения. Попробуйте позже.' });
    }
}
