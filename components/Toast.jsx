'use client';

export function Toast({ message, isVisible, type = 'success' }) {
  let iconEmoji = '✓';
  let bgColorClass = 'bg-emerald-50';
  let textColorClass = 'text-emerald-600';

  if (type === 'error') {
    iconEmoji = '✕';
    bgColorClass = 'bg-red-50';
    textColorClass = 'text-red-600';
  } else if (type === 'warning') {
    iconEmoji = '！';
    bgColorClass = 'bg-amber-50';
    textColorClass = 'text-amber-600';
  }

  return (
    <div
      className={`icon-label fixed bottom-5 right-5 z-50 flex items-center rounded-xl border border-rose-100 bg-white px-4 py-3 shadow-xl transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
      }`}
    >
      <div className={`rounded-lg p-1.5 ${bgColorClass} ${textColorClass}`}>
        {iconEmoji}
      </div>
      <div className="text-xs font-semibold text-slate-800">{message}</div>
    </div>
  );
}
