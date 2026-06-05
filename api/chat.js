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

    let knowledgeContext = "";
    let loadedFiles = [];

    try {
        const listUrl = `https://api.github.com/repos/robo-sklad/universal-cnc/contents/knowledge`;
        const listResponse = await fetch(listUrl, { 
            headers: { 'User-Agent': 'Vercel-Chatbot' } 
        });

        if (listResponse.ok) {
            const files = await listResponse.json();
            const txtFiles = files.filter(f => f.type === 'file' && f.name.endsWith('.txt'));

            for (const file of txtFiles) {
                const contentRes = await fetch(file.download_url);
                if (contentRes.ok) {
                    const text = await contentRes.text();
                    knowledgeContext += `\n\n=== ДОКУМЕНТ: \( {file.name} ===\n \){text}\n`;
                    loadedFiles.push(file.name);
                }
            }
        }
    } catch (err) {
        console.error("Ошибка загрузки документов:", err);
    }

    const systemPrompt = `Ты — технический специалист магазина "ЧПУ-Склад".

Загруженные документы: ${loadedFiles.join(', ') || 'нет'}

${knowledgeContext}

ПРАВИЛО: Если вопрос касается любого из загруженных документов — ВСЕГДА используй информацию из них. 
Не говори, что не знаешь файл, если он есть в списке выше.`;

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

        const data = await response.json();
        return res.status(200).json({ reply: data.choices[0].message.content });

    } catch (error) {
        console.error('Ошибка:', error);
        return res.status(500).json({ reply: 'Ошибка соединения. Попробуй позже.' });
    }
}
