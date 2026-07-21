'use client';

import { fmtCurrency, SummaryValueSkeleton } from '@/components/stocks/stock-ui';

export function StockSummary(props) {
  const {
    isPortfolioLoading,
    totalOverallValue,
    totalOverallCost,
    totalOverallUnrealized,
    totalOverallReturnRate
  } = props;

  return (
    <>
{/* ── Summary Stats（台股+美股總和） ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <div className="card p-3 md:p-5">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-slate-400">持股現值總計 (TWD)</p>
          {isPortfolioLoading ? <SummaryValueSkeleton /> : (
            <p className="mt-1 text-lg font-black text-slate-900 md:mt-2 md:text-2xl">{fmtCurrency(totalOverallValue, 'TWD')}</p>
          )}
        </div>
        <div className="card p-3 md:p-5">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-slate-400">總投資成本 (TWD)</p>
          {isPortfolioLoading ? <SummaryValueSkeleton /> : (
            <p className="mt-1 text-lg font-black text-slate-900 md:mt-2 md:text-2xl">{fmtCurrency(totalOverallCost, 'TWD')}</p>
          )}
        </div>
        <div className="card p-3 md:p-5">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-slate-400">未實現損益 (TWD)</p>
          {isPortfolioLoading ? <SummaryValueSkeleton /> : (
            <p className={`mt-1 text-lg font-black md:mt-2 md:text-2xl ${totalOverallUnrealized >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {fmtCurrency(totalOverallUnrealized, 'TWD', true)}
            </p>
          )}
        </div>
        <div className="card p-3 md:p-5">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-slate-400">總報酬率</p>
          {isPortfolioLoading ? <SummaryValueSkeleton /> : (
            <p className={`mt-1 text-lg font-black md:mt-2 md:text-2xl ${totalOverallReturnRate >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {totalOverallReturnRate >= 0 ? '+' : ''}{totalOverallReturnRate.toFixed(2)}%
            </p>
          )}
        </div>
      </div>
    </>
  );
}
