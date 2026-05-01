// api/chat.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Только POST запросы' });
    }

    const userMessage = req.body.message;
    const apiKey = 'sk-8ebd4ba18901482d9ac4b2932b3b7077';

    // Системный промпт — тут вся твоя база знаний
    const systemPrompt = `Ты — виртуальный консультант магазина "ЧПУ-Склад". 
Ты опытный инженер с 10-летним стажем. Твоя задача — помогать клиентам 
подбирать станки ЧПУ и настраивать программы, особенно Mach3 и нашу 
программу "Универсал — система ЧПУ". Отвечай простым, понятным языком, 
как опытный мастер.

База знаний:
1. Программа "Универсал": Это наша собственная разработка, замена Mach3. Она проще и дружелюбнее к новичкам.
2. Mach3: Популярная программа для управления станками ЧПУ. Мы помогаем с настройкой.
3. Станки: у нас есть фрезерные, лазерные, 3D-принтеры.
4. Доставка по всей России.
5. Гарантия на оборудование — 1 год.

Если не знаешь точного ответа на вопрос, предложи связаться с живым специалистом.`;

    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();
        res.status(200).json({ reply: data.choices[0].message.content });

    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ reply: 'Извините, произошла ошибка. Попробуйте позже.' });
    }
}
