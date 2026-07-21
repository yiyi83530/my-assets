'use client';

const MODES = [
  { value: 'market_value', label: '目前市值' },
  { value: 'net_liquidation', label: '預估可取回' },
];

export function ValuationModeControl({ value, onChange, compact = false }) {
  const normalizedValue = value === 'net_liquidation' ? 'net_liquidation' : 'market_value';

  if (compact) {
    const nextValue = normalizedValue === 'market_value' ? 'net_liquidation' : 'market_value';
    return (
      <button
        type="button"
        onClick={() => onChange(nextValue)}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-rose-50 hover:text-rose-700 hover:ring-rose-100"
        title={`目前採用${MODES.find((mode) => mode.value === normalizedValue)?.label}；點擊切換`}
        aria-label={`估值口徑：${MODES.find((mode) => mode.value === normalizedValue)?.label}，點擊切換`}
      >
        <span>估值：{normalizedValue === 'net_liquidation' ? '預估變現' : '目前市值'}</span>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3 w-3" aria-hidden="true">
          <path d="m7 5-3 3 3 3M13 15l3-3-3-3M4 8h9M16 12H7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    );
  }

  return (
    <div className="inline-grid shrink-0 grid-cols-2 rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="資產估值口徑">
      {MODES.map((mode) => (
        <button
          key={mode.value}
          type="button"
          role="radio"
          aria-checked={normalizedValue === mode.value}
          onClick={() => onChange(mode.value)}
          className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition sm:px-3 sm:text-[11px] ${
            normalizedValue === mode.value
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
