import express from 'express';
import fetch from 'node-fetch';

const SYSTEM_PROMPT = `You are a market education assistant. Discuss only the selected asset and relevant general market factors. Use the supplied quote as the only current market data; do not claim access to news, historical trends, or other live data. Describe plausible bullish, bearish, and neutral scenarios and their uncertainty. Do not invent price targets, probabilities, news, or facts. Do not provide personalized financial advice. Explain that scenarios are not validated forecasts and prices can move unpredictably. Keep answers concise.`;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

export function createChatRouter({ getQuote, apiKey = process.env.GROQ_API_KEY, request = fetch }) {
  const router = express.Router();
  let windowStart = 0;
  let requests = 0;

  router.post('/api/chat', async (req, res) => {
    if (!apiKey) {
      return res.status(503).json({ error: 'The market assistant is not configured yet.' });
    }

    const { assetType, assetId, messages } = req.body || {};
    if (!['market', 'crypto'].includes(assetType) ||
        typeof assetId !== 'string' || !/^[a-z0-9-]{1,80}$/.test(assetId) ||
        !Array.isArray(messages) || messages.length < 1 || messages.length > 6 ||
        messages.some((message) =>
          !message || !['user', 'assistant'].includes(message.role) ||
          typeof message.content !== 'string' || !message.content.trim() ||
          message.content.length > (message.role === 'user' ? 500 : 3000)
        ) || messages[messages.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'Please select an asset and enter a valid question.' });
    }

    const now = Date.now();
    if (now - windowStart >= WINDOW_MS) {
      windowStart = now;
      requests = 0;
    }
    if (requests >= MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({ error: 'The assistant is busy. Please try again in a minute.' });
    }
    requests += 1;

    try {
      const quote = await getQuote(assetType, assetId);
      if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) {
        return res.status(502).json({ error: 'A current quote is unavailable for this asset.' });
      }

      const marketContext = {
        asset: quote.label,
        symbol: quote.symbolLabel,
        price: quote.price,
        currency: quote.currency,
        updatedAt: quote.updatedAt || 'unknown',
        source: assetType === 'crypto' ? 'CoinGecko' : quote.type === 'metal' ? 'gold-api.com spot' : 'Yahoo Finance',
      };
      const response = await request('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          reasoning_effort: 'low',
          reasoning_format: 'hidden',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'system', content: `Current market quote (not a forecast): ${JSON.stringify(marketContext)}` },
            ...messages,
          ],
          max_completion_tokens: 1024,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        if (response.status === 429) {
          return res.status(429).json({ error: 'The AI provider quota is exhausted. Please try again later.' });
        }
        console.error('AI provider request failed:', response.status);
        return res.status(502).json({ error: 'The AI provider could not answer right now.' });
      }
      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content;
      if (typeof answer !== 'string' || !answer.trim()) {
        throw new Error('AI provider returned an empty answer');
      }
      res.json({ answer, quote: marketContext });
    } catch (err) {
      console.error('Market assistant failed:', err.message);
      res.status(502).json({ error: 'Unable to retrieve market data or an AI response. Please try again.' });
    }
  });

  return router;
}
