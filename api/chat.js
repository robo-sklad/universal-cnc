// api/chat.js
let cachedKnowledge = { context: "", files: [], timestamp: 0 };
const CACHE_TTL = 10 * 60 * 1000; // 10 минут
const MAX_CONTEXT_TOKENS = 25000;

const ALLOWED_EXTENSIONS = [
  '.txt', '.xml', '.html', '.md', '.json', '.yaml', '.yml', '.csv', '.cfg', '.ini', '.conf'
];

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Только POST запросы' });
    }

    const { message } = req.body;
    if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API ключ не настроен' });
    }

    const now = Date.now();
    if (now - cachedKnowledge.timestamp > CACHE_TTL) {
        try {
            let allFiles = [];
            let pageUrl = "https://api.github.com/repos/robo-sklad/universal-cnc/contents/knowledge";

            // Пагинация: загружаем ВСЕ файлы
            while (pageUrl) {
                const listResponse = await fetch(pageUrl, {
                    headers: { 'User-Agent': 'Vibe-Chatbot' }
                });

                if (!listResponse.ok) break;

                const files = await listResponse.json();
                allFiles = allFiles.concat(files);

                // Проверяем следующую страницу
                pageUrl = listResponse.headers.get('Link')?.split(',')
                  .find(h => h.includes('rel="next"'))
                  ?.match(/<([^>]+)>/)?.[1] || null;
            }

            // Фильтруем файлы (регистронезависимо)
            const allowedFiles = allFiles.filter(f =>
                f.type === 'file' &&
                ALLOWED_EXTENSIONS.some(ext =>
                    f.name.toLowerCase().endsWith(ext.toLowerCase())
                )
            );

            let newContext = "";
            let newFiles = [];
            let estimatedTokens = 0;

            for (const file of allowedFiles) {
                try {
                    const contentRes = await fetch(file.download_url);
                    if (contentRes.ok) {
                        const text = await contentRes.text();
                        const fileTokens = Math.ceil(text.length / 4);
                        if (estimatedTokens + fileTokens > MAX_CONTEXT_TOKENS) {
                            console.warn(`Файл ${file.name} превышает лимит токенов, пропускаем`);
                            continue;
                        }

                        newContext += `\n\n=== ДОКУМЕНТ: ${file.name} ===\n\n${text}\n`;
                        newFiles.push(file.name);
                        estimatedTokens += fileTokens;
                    }
                } catch (err) {
                    console.error(`Ошибка загрузки файла ${file.name}:`, err);
                }
            }

            cachedKnowledge = { context: newContext, files: newFiles, timestamp: now };
            console.log(`Загружено файлов: ${newFiles.length}`);

        } catch (err) {
            console.error("Ошибка загрузки документов:", err);
        }
    }

    const systemPrompt = `Ты — технический специалист магазина "ЧПУ-Склад".
Загруженные документы: ${cachedKnowledge.files.join(', ') || 'нет документов'}

${cachedKnowledge.context}

ВАЖНОЕ ПРАВИЛО: Если пользователь спрашивает про любой документ, ВСЕГДА используй информацию из него. Не говори, что файла нет, если он загружен.`;

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
                temperature: 0.5,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка API Mistral');
        }

        const data = await response.json();
        return res.status(200).json({ reply: data.choices[0].message.content });

    } catch (error) {
        console.error('Ошибка:', error);
        return res.status(500).json({ reply: 'Ошибка соединения. Попробуйте позже.' });
    }
}
