import { INDUSTRY_COLORS } from '@/components/common/constants';

const CUSTOM_INDUSTRY_COLORS = ['#a855f7', '#f43f5e', '#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6'];

export const POSITION_SORT_OPTIONS = [
  { value: 'marketValue', label: '市值佔比' },
  { value: 'unrealizedProfit', label: '未實現損益' },
  { value: 'profitPercent', label: '損益率' },
  { value: 'totalBuyCost', label: '投資成本' },
  { value: 'avgCost', label: '平均成本' },
  { value: 'holdingQty', label: '持有股數' },
];

export function getIndustryColor(industry) {
  if (INDUSTRY_COLORS[industry]) return INDUSTRY_COLORS[industry];
  const hash = [...String(industry)].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 0);
  return CUSTOM_INDUSTRY_COLORS[hash % CUSTOM_INDUSTRY_COLORS.length];
}

export function tabBtnClass(active) {
  return `relative z-10 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
    active ? 'text-slate-800' : 'text-slate-500 hover:text-slate-700'
  }`;
}

export function fmtCurrency(num, currency = 'TWD', showSign = false, decimalPlaces = 0) {
  const val = Number(num) || 0;
  const options = {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  };
  const formattedNum = val.toLocaleString('zh-TW', options);
  if (currency === 'TWD') {
    const absoluteNum = Math.abs(val).toLocaleString('zh-TW', options);
    return `${showSign ? (val >= 0 ? '+' : '-') : ''}${showSign ? absoluteNum : formattedNum}`;
  }
  if (showSign) {
    return `${val >= 0 ? '+' : '-'}$${Math.abs(val).toLocaleString('zh-TW', options)}`;
  }
  return `$${formattedNum}`;
}

export function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}/${month}/${day}`;
}

export function fmtTime(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function quoteStatusLabel(status) {
  if (status === 'realtime') return '即時股價';
  if (status === 'latest_price') return '最新參考價';
  if (status === 'opening_price') return '開盤參考價';
  if (status === 'previous_close') return '昨日收盤價';
  if (status === 'daily_close') return '最新收盤價';
  if (status === 'esb_quote') return '興櫃參考價';
  if (status === 'manual') return '手動設定價格';
  if (status === 'unavailable') return '目前無報價';
  return null;
}

export function LimitStatusBadge({ status }) {
  if (status === 'limit_up') {
    return <span className="ml-1.5 shrink-0 whitespace-nowrap rounded-md bg-rose-50 p-1 text-[9px] font-black leading-none text-rose-600 ring-1 ring-rose-100">漲停</span>;
  }
  if (status === 'limit_down') {
    return <span className="ml-1.5 shrink-0 whitespace-nowrap rounded-md bg-emerald-50 p-1 text-[9px] font-black leading-none text-emerald-600 ring-1 ring-emerald-100">跌停</span>;
  }
  return null;
}

export function SummaryValueSkeleton() {
  return <span className="mt-2 block h-7 w-24 animate-pulse rounded-lg bg-slate-200/80 md:h-8 md:w-28" aria-label="資料載入中" />;
}

export function InlineValueSkeleton({ className = '' }) {
  return <span className={`inline-block h-4 w-16 animate-pulse rounded-md bg-slate-200/80 align-middle ${className}`} aria-label="資料載入中" />;
}

export function MarketFlag({ market, className = 'h-3 w-4' }) {
  if (market === 'US') {
    return (
      <svg viewBox="0 0 24 16" className={`${className} overflow-hidden rounded-[2px] shadow-sm ring-1 ring-slate-900/10`} aria-hidden="true">
        <rect width="24" height="16" fill="#fff" />
        {[0, 4, 8, 12].map((y) => <rect key={y} y={y} width="24" height="2" fill="#dc2626" />)}
        <rect width="10" height="8" fill="#1e3a8a" />
        {[2, 5, 8].map((x) => [2, 4, 6].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.55" fill="#fff" />))}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 16" className={`${className} overflow-hidden rounded-[2px] shadow-sm ring-1 ring-slate-900/10`} aria-hidden="true">
      <rect width="24" height="16" fill="#e11d48" />
      <rect width="12" height="8" fill="#1e3a8a" />
      <circle cx="6" cy="4" r="2" fill="#fff" />
      <g stroke="#fff" strokeWidth="0.65">
        <path d="M6 .7v1M6 6.3v1M2.7 4h1M8.3 4h1M3.7 1.7l.7.7M7.6 5.6l.7.7M8.3 1.7l-.7.7M4.4 5.6l-.7.7" />
      </g>
    </svg>
  );
}

export function CrownIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="m3 6 3.6 3L10 4l3.4 5L17 6l-1.2 8H4.2L3 6Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M4.4 14.3h11.2" stroke="#d97706" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function StockDataLoading() {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-5 py-10 text-center">
      <div className="relative flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-rose-100 border-t-rose-500" />
        <span className="absolute text-sm" aria-hidden="true">🐷</span>
      </div>
      <p className="mt-3 animate-pulse text-xs font-bold text-slate-500">正在搬運您的資產...</p>
    </div>
  );
}
