import { useEffect, useState } from 'react';
import { fetchCryptoList } from '../api';
import CryptoWatchlist from '../components/CryptoWatchlist';
import CryptoDetailPanel from '../components/CryptoDetailPanel';

// The list endpoint already returns live quotes alongside the coin catalog
// (see server/crypto.js), so one poll serves both the watchlist and keeps
// prices fresh - no separate batch-quote request needed.
const LIST_POLL_MS = 30000;

export default function CryptoPage() {
  const [coins, setCoins] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await fetchCryptoList();
        if (cancelled) return;
        setCoins(data);
        setSelectedId((current) => current ?? data[0]?.id ?? null);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    poll();
    const intervalId = setInterval(poll, LIST_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="stocks-layout">
      <aside className="stocks-layout__watchlist">
        <h2 className="chart-card__title">Top 20 by market cap + Cookie, Trump &amp; WLFI</h2>
        <CryptoWatchlist
          coins={coins}
          selectedId={selectedId}
          onSelect={setSelectedId}
          loading={loading}
          error={error}
        />
        <p className="watchlist__note">
          Historical charts for crypto are limited to the last 365 days by CoinGecko's free public
          API, so "5Y" shows the same 1-year window as "1Y".
        </p>
      </aside>
      {selectedId && (
        <div className="stocks-layout__chart">
          <CryptoDetailPanel coin={coins.find((c) => c.id === selectedId)} defaultRange="1d" />
        </div>
      )}
    </div>
  );
}
