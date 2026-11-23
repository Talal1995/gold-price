import { useEffect, useState } from 'react';
import { fetchLivePriceBatch } from '../api';
import { formatCurrency } from '../utils/format';

const WATCHLIST_POLL_MS = 20000;

export default function StockWatchlist({ instruments, selectedId, onSelect }) {
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const idsKey = instruments.map((i) => i.id).join(',');

  useEffect(() => {
    if (!idsKey) return undefined;
    let cancelled = false;

    async function poll() {
      try {
        const ids = idsKey.split(',');
        const results = await fetchLivePriceBatch(ids);
        if (cancelled) return;
        setQuotes(Object.fromEntries(results.map((r) => [r.id, r])));
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    poll();
    const intervalId = setInterval(poll, WATCHLIST_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [idsKey]);

  if (error && !Object.keys(quotes).length) {
    return <div className="watchlist watchlist--error">Unable to load quotes. {error}</div>;
  }

  return (
    <div className="watchlist-scroll">
      <table className="watchlist">
        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {instruments.map((instrument) => {
            const quote = quotes[instrument.id];
            const hasChange = quote && typeof quote.changePercent === 'number';
            const changeDirection = hasChange ? (quote.changePercent >= 0 ? 'up' : 'down') : null;

            return (
              <tr
                key={instrument.id}
                className={`watchlist__row${instrument.id === selectedId ? ' selected' : ''}`}
                onClick={() => onSelect(instrument.id)}
              >
                <td>
                  <div className="watchlist__name">{instrument.label}</div>
                  <div className="watchlist__symbol">{instrument.symbolLabel}</div>
                </td>
                <td>
                  {loading && !quote ? '…' : quote?.error ? '—' : formatCurrency(quote?.price, quote?.currency)}
                </td>
                <td className={changeDirection ? `watchlist__change--${changeDirection}` : ''}>
                  {hasChange ? `${quote.changePercent >= 0 ? '▲' : '▼'} ${Math.abs(quote.changePercent).toFixed(2)}%` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
