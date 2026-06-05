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
    // АВТОМАТИЧЕСКАЯ ЗАГРУЗКА ВСЕХ .txt ФАЙЛОВ ИЗ knowledge/
    // ============================================
    let knowledgeContext = "";

    try {
        // Получаем список файлов в папке knowledge/
        const listUrl = `https://api.github.com/repos/robo-sklad/universal-cnc/contents/knowledge`;
        const listResponse = await fetch(listUrl);
        
        if (listResponse.ok) {
            const files = await listResponse.json();

            // Берём только .txt файлы
            const txtFiles = files.filter(file => 
                file.type === 'file' && file.name.endsWith('.txt')
            );

            // Читаем содержимое каждого .txt файла
            for (const file of txtFiles) {
                try {
                    const rawUrl = file.download_url;
                    const contentResponse = await fetch(rawUrl);
                    
                    if (contentResponse.ok) {
                        const text = await contentResponse.text();
                        knowledgeContext += `\n\n=== Документ: \( {file.name} ===\n \){text}\n`;
                    }
                } catch (e) {
                    console.log(`Не удалось прочитать файл: ${file.name}`);
                }
            }
        }
    } catch (err) {
        console.error("Ошибка при загрузке документов из knowledge/:", err);
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
- Подключение оборудования, генерацию G-кода, безопасность

${knowledgeContext ? 
`ВАЖНО: Ниже приведена информация из официальных документов и инструкций. 
Используй её в первую очередь при ответах:

${knowledgeContext}` : ''}

Отвечай простым, понятным русским языком, как мастер с большим практическим опытом.
Будь честным. Если информации нет в документах — так и говори.`;

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
            reply: 'Извините, произошла техническая ошибка. Попробуйте чуть позже.' 
        });
    }
}
