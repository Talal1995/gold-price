import { useEffect, useState } from 'react';
import { fetchInstruments } from '../api';
import StockWatchlist from '../components/StockWatchlist';
import InstrumentPanel from '../components/InstrumentPanel';

export default function StocksPage() {
  const [instruments, setInstruments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInstruments()
      .then((data) => {
        const stocks = data.filter((i) => i.type !== 'metal');
        setInstruments(stocks);
        setSelectedId((current) => current ?? stocks[0]?.id ?? null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return <div className="chart-status chart-status--error">Unable to load the stock list. {error}</div>;
  }

  if (loading) {
    return <div className="chart-status">Loading stocks…</div>;
  }

  return (
    <div className="stocks-layout">
      <aside className="stocks-layout__watchlist">
        <h2 className="chart-card__title">NASDAQ, Mag 7 &amp; top 20 by market cap*</h2>
        <StockWatchlist instruments={instruments} selectedId={selectedId} onSelect={setSelectedId} />
        <p className="watchlist__note">
          * Curated static list of large, liquid US-listed companies (includes NVIDIA, Apple, Tesla
          and Amazon as requested) — not a live market-cap ranking. Anthropic and SpaceX are private
          companies with no public ticker, so they aren't included.
        </p>
      </aside>
      {selectedId && (
        <div className="stocks-layout__chart">
          <InstrumentPanel instrumentId={selectedId} defaultRange="1d" />
        </div>
      )}
    </div>
  );
}
