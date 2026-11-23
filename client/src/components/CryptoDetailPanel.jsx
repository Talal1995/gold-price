import { useEffect, useState } from 'react';
import { fetchCryptoHistory } from '../api';
import PriceTicker from './PriceTicker';
import RangeSelector from './RangeSelector';
import PriceChart from './PriceChart';

// Unlike InstrumentPanel, this does NOT poll its own live-price endpoint:
// the parent CryptoPage already polls /api/crypto/list once for the whole
// watchlist (which includes live price/change per coin), so we just reuse
// that data here to avoid doubling up on CoinGecko's free-tier rate limit.
export default function CryptoDetailPanel({ coin, defaultRange = '1d' }) {
  const [range, setRange] = useState(defaultRange);
  const [history, setHistory] = useState({ points: [], currency: 'USD' });
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  useEffect(() => {
    if (!coin?.id) return undefined;
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);

    fetchCryptoHistory(coin.id, range)
      .then((data) => {
        if (cancelled) return;
        setHistory({ points: data.points || [], currency: data.currency || 'USD' });
      })
      .catch((err) => {
        if (cancelled) return;
        setHistoryError(err.message);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [coin?.id, range]);

  if (!coin) return null;

  return (
    <section className="chart-card">
      <PriceTicker data={coin} previousPrice={null} loading={false} error={null} />
      <RangeSelector selected={range} onSelect={setRange} disabled={historyLoading} />
      <PriceChart
        points={history.points}
        range={range}
        currency={history.currency}
        loading={historyLoading}
        error={historyError}
      />
    </section>
  );
}
