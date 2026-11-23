import { useState, useEffect } from 'react';
import '../styles/Portfolio.css';

const GOLD_HOLDINGS = [
  { weight: 172, purity: '24K', symbol: 'XAU' },
  { weight: 102, purity: '18K', symbol: 'XAU' },
  { weight: 77.97, purity: '21K', symbol: 'XAU' },
];

const CRYPTO_HOLDINGS = [
  { id: 'cookie', symbol: 'COOKIE', amount: 130000, label: 'Cookie Coin' },
];

export default function Portfolio() {
  const [goldPrice, setGoldPrice] = useState(null);
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hideNumbers, setHideNumbers] = useState(false);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true);
        
        const goldResponse = await fetch('/api/price/live?id=gold');
        if (!goldResponse.ok) throw new Error('Failed to fetch gold price');
        const goldData = await goldResponse.json();
        setGoldPrice(goldData);

        const cryptoData = {};
        for (const holding of CRYPTO_HOLDINGS) {
          try {
            const cryptoResponse = await fetch(`/api/crypto/live?id=${holding.id}`);
            if (cryptoResponse.ok) {
              const data = await cryptoResponse.json();
              cryptoData[holding.id] = data;
            }
          } catch (err) {
            console.error(`Failed to fetch ${holding.id} price:`, err);
          }
        }
        setCryptoPrices(cryptoData);
        setError('');
      } catch (err) {
        setError(err.message);
        console.error('Price fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  const calculatePurity = (weight, purity) => {
    const purityMap = { '24K': 1, '21K': 0.875, '18K': 0.75, '14K': 0.583 };
    return weight * (purityMap[purity] || 1);
  };

  const calculateGoldValue = (weight, purity, pricePerOz) => {
    const pureWeight = calculatePurity(weight, purity);
    const weightInOz = pureWeight / 31.1035;
    return weightInOz * pricePerOz;
  };

  const totalGoldValue = GOLD_HOLDINGS.reduce((sum, holding) => {
    const price = goldPrice?.price || 0;
    return sum + calculateGoldValue(holding.weight, holding.purity, price);
  }, 0);

  const totalCryptoValue = CRYPTO_HOLDINGS.reduce((sum, holding) => {
    const cryptoData = cryptoPrices[holding.id];
    const price = cryptoData?.price || 0;
    return sum + (holding.amount * price);
  }, 0);

  const totalPortfolioValue = totalGoldValue + totalCryptoValue;
  const lastUpdated = goldPrice?.updatedAt ? new Date(goldPrice.updatedAt).toLocaleTimeString() : 'N/A';

  const formatNumber = (value) => hideNumbers ? '****' : value;
  const formatSmallNumber = (value) => hideNumbers ? '**' : value;

  return (
    <div className="portfolio-container">
      {/* HEADER */}
      <div className="portfolio-header">
        <div className="header-top">
          <h2>💼 My Portfolio</h2>
          <button 
            className={`hide-toggle-btn ${hideNumbers ? 'hidden' : 'visible'}`}
            onClick={() => setHideNumbers(!hideNumbers)}
            title={hideNumbers ? "Show numbers" : "Hide numbers"}
          >
            {hideNumbers ? (
              <>👁️ Show</>
            ) : (
              <>👁️‍🗨️ Hide</>
            )}
          </button>
        </div>

        <div className="header-stats">
          <div className="stat-card total-value">
            <span className="stat-label">Total Portfolio Value</span>
            <span className="stat-amount">
              {hideNumbers ? '****' : `$${loading ? '...' : totalPortfolioValue.toFixed(2)}`}
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">🥇 Gold Value</span>
            <span className="stat-amount gold-color">
              {hideNumbers ? '****' : `$${totalGoldValue.toFixed(2)}`}
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">🪙 Crypto Value</span>
            <span className="stat-amount crypto-color">
              {hideNumbers ? '****' : `$${totalCryptoValue.toFixed(2)}`}
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Last Update</span>
            <span className="stat-time">{lastUpdated}</span>
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* GOLD SECTION */}
      <div className="asset-section gold-section">
        <div className="section-header">
          <h3>🥇 Gold Holdings</h3>
          <span className="section-price">
            {hideNumbers ? '****' : `$${goldPrice?.price?.toFixed(2) || 'N/A'}`}/oz
          </span>
        </div>

        <div className="holdings-grid">
          {GOLD_HOLDINGS.map((holding, idx) => {
            const value = calculateGoldValue(holding.weight, holding.purity, goldPrice?.price || 0);
            const pure = calculatePurity(holding.weight, holding.purity);
            return (
              <div key={idx} className="holding-card gold-card">
                <div className="holding-header">
                  <span className="holding-weight">{holding.weight}g</span>
                  <span className="holding-purity">{holding.purity}</span>
                </div>
                <div className="holding-body">
                  <p className="holding-label">Pure Weight</p>
                  <p className="holding-data">
                    {hideNumbers ? '****' : `${pure.toFixed(2)}g`}
                  </p>
                </div>
                <div className="holding-footer">
                  <p className="holding-label">Value</p>
                  <p className="holding-value">
                    {hideNumbers ? '****' : `$${value.toFixed(2)}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="stats-grid">
          <div className="stat-box">
            <span className="label">Total Weight</span>
            <span className="value">{hideNumbers ? '****' : `${(172 + 102 + 77.97).toFixed(2)}g`}</span>
          </div>
          <div className="stat-box">
            <span className="label">Pure Weight</span>
            <span className="value">
              {hideNumbers ? '****' : `${(calculatePurity(172, '24K') + calculatePurity(102, '18K') + calculatePurity(77.97, '21K')).toFixed(2)}g`}
            </span>
          </div>
          <div className="stat-box">
            <span className="label">Avg Purity</span>
            <span className="value">
              {hideNumbers ? '****' : `${(((calculatePurity(172, '24K') + calculatePurity(102, '18K') + calculatePurity(77.97, '21K')) / (172 + 102 + 77.97)) * 100).toFixed(2)}%`}
            </span>
          </div>
        </div>
      </div>

      {/* CRYPTO SECTION */}
      <div className="asset-section crypto-section">
        <div className="section-header">
          <h3>🪙 Crypto Holdings</h3>
        </div>

        <div className="holdings-grid">
          {CRYPTO_HOLDINGS.map((holding, idx) => {
            const cryptoData = cryptoPrices[holding.id];
            const price = cryptoData?.price || 0;
            const value = holding.amount * price;
            const changePercent = cryptoData?.changePercent || 0;
            
            return (
              <div key={idx} className="holding-card crypto-card">
                <div className="holding-header">
                  <span className="holding-amount">
                    {hideNumbers ? '***' : `${holding.amount.toLocaleString()}`}
                  </span>
                  <span className="holding-symbol">{holding.symbol}</span>
                </div>
                <div className="holding-body">
                  <p className="holding-label">{holding.label}</p>
                  <p className={`change-indicator ${changePercent >= 0 ? 'positive' : 'negative'}`}>
                    {changePercent >= 0 ? '📈' : '📉'} {hideNumbers ? '**' : Math.abs(changePercent).toFixed(2)}%
                  </p>
                </div>
                <div className="holding-footer">
                  <p className="holding-label">Price</p>
                  <p className="holding-price">
                    {hideNumbers ? '****' : `$${price.toFixed(8)}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="stats-grid">
          <div className="stat-box">
            <span className="label">Total Coins</span>
            <span className="value">
              {hideNumbers ? '***' : CRYPTO_HOLDINGS.reduce((sum, h) => sum + h.amount, 0).toLocaleString()}
            </span>
          </div>
          <div className="stat-box">
            <span className="label">Price Per Coin</span>
            <span className="value">
              {hideNumbers ? '****' : `$${(cryptoPrices['cookie']?.price || 0).toFixed(8)}`}
            </span>
          </div>
          <div className="stat-box">
            <span className="label">Crypto Value</span>
            <span className="value">
              {hideNumbers ? '****' : `$${totalCryptoValue.toFixed(2)}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
