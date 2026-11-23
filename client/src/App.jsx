import { useState } from 'react';
import './App.css';
import Tabs from './components/Tabs';
import MetalsPage from './pages/MetalsPage';
import StocksPage from './pages/StocksPage';
import CryptoPage from './pages/CryptoPage';

const TABS = [
  { key: 'metals', label: 'Metals' },
  { key: 'stocks', label: 'Stocks' },
  { key: 'crypto', label: 'Crypto' },
];

const PAGES = {
  metals: MetalsPage,
  stocks: StocksPage,
  crypto: CryptoPage,
};

function App() {
  const [activeTab, setActiveTab] = useState('metals');
  const ActivePage = PAGES[activeTab];

  return (
    <div className="app">
      <header className="app__header">
        <h1>Markets Tracker</h1>
        <p className="app__subtitle">Live prices &amp; historical charts</p>
      </header>

      <Tabs tabs={TABS} active={activeTab} onSelect={setActiveTab} />

      <ActivePage />

      <footer className="app__footer">
        Precious metals: live spot price via{' '}
        <a href="https://www.gold-api.com" target="_blank" rel="noreferrer">gold-api.com</a>, history
        via Yahoo Finance futures (GC=F / SI=F). Stocks &amp; indices: live quotes and history via
        Yahoo Finance. Crypto: live quotes and history via{' '}
        <a href="https://www.coingecko.com" target="_blank" rel="noreferrer">CoinGecko</a>.
      </footer>
    </div>
  );
}

export default App;
