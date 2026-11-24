import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchLivePrice, fetchMetalChange, fetchPriceHistory } from '../api';
import PriceTicker from './PriceTicker';
import RangeSelector from './RangeSelector';
import PriceChart from './PriceChart';

const LIVE_PRICE_POLL_MS = 15000;

// Self-contained "card" for one instrument (gold, silver, a selected stock,
// or a selected crypto coin): polls the live price and fetches historical
// data whenever the selected range changes. `fetchLiveFn`/`fetchHistoryFn`
// default to the metals/stocks API but can be swapped out (e.g. for crypto)
// since the response shapes are the same across backends.
export default function InstrumentPanel({
  instrumentId,
  title,
  defaultRange = '1d',
  showMetalChange = false,
  fetchLiveFn = fetchLivePrice,
  fetchHistoryFn = fetchPriceHistory,
}) {
  const [range, setRange] = useState(defaultRange);

  const [liveData, setLiveData] = useState(null);
  const [previousPrice, setPreviousPrice] = useState(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState(null);
  const liveDataRef = useRef(null);
  const [metalChange, setMetalChange] = useState(null);
  const [metalChangeError, setMetalChangeError] = useState(null);

  const [history, setHistory] = useState({ points: [], currency: 'USD' });
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  const loadLivePrice = useCallback(async () => {
    try {
      const data = await fetchLiveFn(instrumentId);
      setPreviousPrice(liveDataRef.current?.price ?? null);
      liveDataRef.current = data;
      setLiveData(data);
      setLiveError(null);
    } catch (err) {
      setLiveError(err.message);
    } finally {
      setLiveLoading(false);
    }
  }, [instrumentId, fetchLiveFn]);

  useEffect(() => {
    // Reset state when switching instruments so stale data isn't shown.
    liveDataRef.current = null;
    setLiveData(null);
    setPreviousPrice(null);
    setLiveLoading(true);
    setLiveError(null);

    loadLivePrice();
    const id = setInterval(loadLivePrice, LIVE_PRICE_POLL_MS);
    return () => clearInterval(id);
  }, [loadLivePrice]);

  useEffect(() => {
    if (!showMetalChange) return undefined;
    let cancelled = false;
    setMetalChange(null);
    setMetalChangeError(null);
    const loadChange = async () => {
      try {
        const data = await fetchMetalChange(instrumentId);
        if (!cancelled) {
          setMetalChange(data);
          setMetalChangeError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setMetalChange(null);
          setMetalChangeError(err.message);
        }
      }
    };
    loadChange();
    const id = setInterval(loadChange, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [instrumentId, showMetalChange]);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);

    fetchHistoryFn(instrumentId, range)
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
  }, [instrumentId, range, fetchHistoryFn]);

  return (
    <section className="chart-card">
      {title && <h2 className="chart-card__title">{title}</h2>}
      <PriceTicker
        data={liveData}
        previousPrice={previousPrice}
        loading={liveLoading}
        error={liveError}
        metalChange={metalChange}
        metalChangeError={metalChangeError}
        showMetalChange={showMetalChange}
      />
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
