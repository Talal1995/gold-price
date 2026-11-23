import { TIME_RANGES } from '../api';

export default function RangeSelector({ selected, onSelect, disabled }) {
  return (
    <div className="range-selector" role="group" aria-label="Chart time range">
      {TIME_RANGES.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={`range-button${key === selected ? ' active' : ''}`}
          onClick={() => onSelect(key)}
          disabled={disabled}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
