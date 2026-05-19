// Vercel Serverless Function: /api/gemini
// Proxies requests to OpenRouter, keeping the API key on the server.
// Set OPENROUTER_API_KEY in your Vercel project's Environment Variables.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { prompt, imageData, fast } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    // Free models with good availability
    const model = fast
      ? 'google/gemma-3-4b-it:free'
      : 'google/gemma-3-12b-it:free';

    const userContent = imageData
      ? [
          { type: 'image_url', image_url: { url: `data:${imageData.mime};base64,${imageData.b64}` } },
          { type: 'text', text: prompt }
        ]
      : prompt;

    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://parable-taupe.vercel.app',
        'X-Title': 'Parable'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: userContent }],
        temperature: 0.8,
        max_tokens: 600
      })
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json(data);
    }

    const text = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
}
