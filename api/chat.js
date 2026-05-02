// api/chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;
    const apiKey = process.env.MISTRAL_API_KEY;

    const response = await fetch('https://api.mistral.ai/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-tiny',
        messages: messages
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Server error');
    }

    const data = await response.json();
    res.status(200).json({ reply: data.choices[0].message.content });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}