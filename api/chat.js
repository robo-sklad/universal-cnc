// api/chat.js
let cachedKnowledge = { context: "", files: [], timestamp: 0 };
const CACHE_TTL = 10 * 60 * 1000; // 10 минут
const MAX_CONTEXT_TOKENS = 25000; // Ограничение Mistral API

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

    // Кэширование: проверяем актуальность
    const now = Date.now();
    if (now - cachedKnowledge.timestamp > CACHE_TTL) {
        try {
            const listUrl = "https://api.github.com/repos/robo-sklad/universal-cnc/contents/knowledge";
            const listResponse = await fetch(listUrl, {
                headers: { 'User-Agent': 'Vibe-Chatbot' }
            });

            if (listResponse.ok) {
                const files = await listResponse.json();
                const txtFiles = files.filter(f => f.type === 'file' && (f.name.endsWith('.txt') || f.name.endsWith('.html') || f.name.endsWith('.pdf')));

                let newContext = "";
                let newFiles = [];
                let estimatedTokens = 0;

                for (const file of txtFiles) {
                    const contentRes = await fetch(file.download_url);
                    if (contentRes.ok) {
                        const text = await contentRes.text();
                        const fileTokens = Math.ceil(text.length / 4); // Примерная оценка
                        if (estimatedTokens + fileTokens > MAX_CONTEXT_TOKENS) break;

                        newContext += `\n\n=== ДОКУМЕНТ: ${file.name} ===\n\n${text}\n`;
                        newFiles.push(file.name);
                        estimatedTokens += fileTokens;
                    }
                }

                cachedKnowledge = { context: newContext, files: newFiles, timestamp: now };
            }
        } catch (err) {
            console.error("Ошибка загрузки документов:", err);
        }
    }

    const systemPrompt = `Ты — технический специалист магазина "ЧПУ-Склад".
Загруженные документы: ${cachedKnowledge.files.join(', ') || 'нет документов'}

${cachedKnowledge.context}

ВАЖНОЕ ПРАВИЛО: Если пользователь спрашивает про любой документ (например avtor.txt), ВСЕГДА используй информацию из него. Не говори, что файла нет, если он загружен.`;

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
