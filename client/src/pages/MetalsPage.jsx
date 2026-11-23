import InstrumentPanel from '../components/InstrumentPanel';

export default function MetalsPage() {
  return (
    <div className="metals-grid">
      <InstrumentPanel instrumentId="gold" title="Gold" defaultRange="1d" />
      <InstrumentPanel instrumentId="silver" title="Silver" defaultRange="1d" />
    </div>
  );
}
