import { useEffect, useState } from 'react';
import { askMarketAssistant, fetchCryptoList, fetchInstruments } from '../api';
import { formatCurrency } from '../utils/format';
import '../styles/MarketChat.css';

export default function MarketChat() {
  const [open, setOpen] = useState(false);
  const [assetType, setAssetType] = useState('market');
  const [assetId, setAssetId] = useState('gold');
  const [markets, setMarkets] = useState([]);
  const [coins, setCoins] = useState([]);
  const [listError, setListError] = useState('');
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    if (!open || assetType === 'general') return;
    let cancelled = false;
    const fetchList = assetType === 'crypto' ? fetchCryptoList : fetchInstruments;
    fetchList().then((items) => {
      if (cancelled) return;
      if (assetType === 'crypto') setCoins(items);
      else setMarkets(items);
      setListError('');
    }).catch((err) => {
      if (!cancelled) setListError(`Unable to load assets: ${err.message}`);
    });
    return () => { cancelled = true; };
  }, [open, assetType]);

  const changeAsset = (type, id) => {
    setAssetType(type);
    setAssetId(id);
    setListError('');
    setMessages([]);
    setQuote(null);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const text = question.trim();
    if (!text || loading || (assetType !== 'general' && !assetId)) return;
    const nextMessages = [...messages, { role: 'user', content: text }]
      .slice(-6)
      .map((message) => message.role === 'assistant' ? { ...message, content: message.content.slice(0, 3000) } : message);
    setMessages(nextMessages);
    setQuestion('');
    setError('');
    setLoading(true);
    try {
      const result = await askMarketAssistant(assetType, assetId, nextMessages);
      setQuote(result.quote);
      setMessages((current) => [...current, { role: 'assistant', content: result.answer }]);
    } catch (err) {
      setMessages(messages);
      setQuestion(text);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const assets = assetType === 'crypto' ? coins : markets;

  return (
    <section className="market-chat" aria-label="Market assistant">
      <button type="button" className="market-chat__toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Close market assistant' : 'Ask the market assistant'}
      </button>
      {open && (
        <div className="market-chat__panel">
          <h2>Market assistant</h2>
          <p>Ask any question or explore market scenarios. Price estimates are hypothetical, not validated forecasts or financial advice. Questions are sent to Groq; do not include personal or financial information.</p>
          <div className="market-chat__selectors">
            <label>
              Asset type
              <select value={assetType} disabled={loading} onChange={(e) => changeAsset(e.target.value, e.target.value === 'market' ? 'gold' : '')}>
                <option value="general">General questions</option>
                <option value="market">Metals and stocks</option>
                <option value="crypto">Crypto</option>
              </select>
            </label>
            {assetType !== 'general' && (
              <label>
                Asset
                <select value={assetId} disabled={loading || !assets.length} onChange={(e) => changeAsset(assetType, e.target.value)}>
                  <option value="">Select an asset</option>
                  {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.label} ({asset.symbolLabel})</option>)}
                </select>
              </label>
            )}
          </div>
          {listError && <p className="market-chat__error" role="alert">{listError}</p>}
          {quote && <p className="market-chat__quote">Quote: {quote.asset} {formatCurrency(quote.price, quote.currency)} · {quote.source} · {quote.updatedAt === 'unknown' ? 'time unavailable' : new Date(quote.updatedAt).toLocaleString()}</p>}
          {messages.length > 0 && (
            <div className="market-chat__messages" aria-live="polite">
              {messages.map((message, index) => (
                <div key={index} className={`market-chat__message market-chat__message--${message.role}`}>
                  <strong>{message.role === 'user' ? 'You' : 'Assistant'}</strong>
                  <p>{message.content}</p>
                </div>
              ))}
            </div>
          )}
          {error && <p className="market-chat__error" role="alert">{error}</p>}
          <form onSubmit={handleSubmit}>
            <label htmlFor="market-question">Your question</label>
            <textarea id="market-question" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={500} placeholder="What scenarios could affect the price next month?" disabled={loading} required />
            <button type="submit" disabled={loading || (assetType !== 'general' && (!assetId || !!listError))}>{loading ? 'Thinking…' : 'Ask'}</button>
          </form>
        </div>
      )}
    </section>
  );
}
