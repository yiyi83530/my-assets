'use client';

import {
  CrownIcon,
  fmtCurrency,
  InlineValueSkeleton,
  LimitStatusBadge,
  quoteStatusLabel,
  StockDataLoading,
} from '@/components/stocks/stock-ui';

export function PositionHoldings(props) {
  const {
    posTab,
    isPortfolioLoading,
    activePositions,
    currentTabRawTotalValue,
    usdToTwdRate,
    displayCurrency,
    quoteMeta,
    editingCostName,
    costDraft,
    setCostDraft,
    hasCostChanged,
    requestCostSave,
    cancelEditingCost,
    isSavingCost,
    startEditingCost,
    posContainerMaxHeight
  } = props;

  return (
    <>
      <div key={posTab} className="animate-in fade-in duration-500">
          {isPortfolioLoading ? (
            <StockDataLoading />
          ) : activePositions.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">
              目前沒有「{posTab === 'TWSE' ? '台股' : '美股'}」持股明細
            </div>
          ) : (
            <>
            <div className="divide-y divide-slate-100 md:hidden">
              {activePositions.map((pos, positionIndex) => {
                const sharePercent = currentTabRawTotalValue > 0 ? (pos.marketValue / currentTabRawTotalValue) * 100 : 0;
                const displayName = pos.name.split(' ').slice(1).join(' ') || pos.name;
                const isUSStock = pos.market === 'US';
                const rate = isUSStock ? (usdToTwdRate || 1) : 1;
                const currency = isUSStock ? displayCurrency : 'TWD';
                const avgCost = isUSStock && displayCurrency === 'TWD' ? pos.avgCost * rate : pos.avgCost;
                const marketPrice = pos.marketPrice == null ? null : (isUSStock && displayCurrency === 'TWD' ? pos.marketPrice * rate : pos.marketPrice);
                const totalCost = isUSStock && displayCurrency === 'TWD' ? pos.totalBuyCost * rate : pos.totalBuyCost;
                const marketValue = isUSStock && displayCurrency === 'TWD' ? pos.marketValue * rate : pos.marketValue;
                const profit = pos.unrealizedProfit == null ? null : (isUSStock && displayCurrency === 'TWD' ? pos.unrealizedProfit * rate : pos.unrealizedProfit);
                const dailyProfit = pos.dailyProfit == null ? null : (isUSStock && displayCurrency === 'TWD' ? pos.dailyProfit * rate : pos.dailyProfit);
                const meta = quoteMeta[pos.name];
                const statusLabel = quoteStatusLabel(meta?.status);
                const isQuoteValueLoading = pos.isWaitingForRealtime;

                return (
                  <article key={pos.name} className="px-3.5 py-3">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-rose-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-rose-600 ring-1 ring-rose-100">{pos.symbol}</span>
                          <h3 className="min-w-0 truncate text-[13px] font-bold text-slate-800">{displayName}</h3>
                          {positionIndex === 0 && <span className="shrink-0" title="目前排序第一名" aria-label="目前排序第一名"><CrownIcon /></span>}
                        </div>
                        <div className="mt-1.5 text-[10px] text-slate-400">
                          <div>持有 {pos.holdingQty.toLocaleString()} 股</div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1">
                              市值占比 {isQuoteValueLoading ? <InlineValueSkeleton className="h-3 w-8" /> : pos.hasQuote ? `${sharePercent.toFixed(1)}%` : '—'}
                            </span>
                            <span className="relative h-1.5 w-12 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                              <span
                                className="absolute inset-y-0 left-0 rounded-full bg-rose-400 transition-all duration-300"
                                style={{ width: `${pos.hasQuote && !isQuoteValueLoading ? Math.min(sharePercent, 100) : 0}%` }}
                              />
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-medium text-slate-400">帳面現值 ({currency})</p>
                        <p className="mt-0.5 font-mono text-[13px] font-black text-slate-800">
                          {isQuoteValueLoading ? <InlineValueSkeleton className="h-4 w-20" /> : pos.hasQuote ? fmtCurrency(marketValue, currency) : '—'}
                        </p>
                        <p className={`mt-0.5 font-mono text-[9px] font-bold ${dailyProfit == null ? 'text-slate-400' : dailyProfit >= 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                          今日 {isQuoteValueLoading || dailyProfit == null ? '—' : fmtCurrency(dailyProfit, currency, true)}
                          {!isQuoteValueLoading && pos.dailyProfitPercent != null && ` (${pos.dailyProfitPercent >= 0 ? '+' : ''}${pos.dailyProfitPercent.toFixed(2)}%)`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-slate-50 px-3 py-2.5">
                      <div>
                        <p className="text-[10px] font-medium text-slate-400">未實現損益 ({currency})</p>
                        <p className={`mt-0.5 font-mono text-[13px] font-black ${profit == null ? 'text-slate-400' : profit >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {isQuoteValueLoading ? <InlineValueSkeleton className="h-4 w-24" /> : profit == null ? '—' : fmtCurrency(profit, currency, true)}
                          {!isQuoteValueLoading && pos.profitPercent != null && <span className="ml-1 text-[10px]">({pos.profitPercent >= 0 ? '+' : ''}{pos.profitPercent.toFixed(2)}%)</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-slate-400">投資成本 ({currency})</p>
                        <p className="mt-0.5 font-mono text-[13px] font-bold text-slate-700">{fmtCurrency(totalCost, currency)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-slate-400">平均成本 ({currency})</p>
                        {editingCostName === pos.name ? (
                          <div className="mt-1 flex items-center gap-1" data-cost-editor>
                            <input
                              type="number"
                              value={costDraft}
                              onChange={(event) => setCostDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' && hasCostChanged) requestCostSave(pos, rate, currency, displayName);
                                if (event.key === 'Escape') cancelEditingCost();
                              }}
                              className="min-w-0 flex-1 rounded-md border border-rose-200 bg-white px-2 py-1 font-mono text-xs text-slate-700 outline-none focus:ring-2 focus:ring-rose-100"
                              min="0"
                              step="0.01"
                              autoFocus
                              aria-label={`${displayName}平均成本`}
                            />
                            {hasCostChanged && (
                              <button
                                type="button"
                                disabled={isSavingCost}
                                onClick={() => requestCostSave(pos, rate, currency, displayName)}
                                className="shrink-0 px-1 py-1 text-[10px] font-bold text-rose-500 transition hover:text-rose-600 disabled:opacity-50"
                              >
                                儲存
                              </button>
                            )}
                          </div>
                        ) : (
                          <button type="button" onClick={() => startEditingCost(pos, avgCost)} className="icon-label mt-0.5 inline-flex items-center font-mono text-xs font-bold text-slate-700" aria-label={`修改 ${displayName} 平均成本`}>
                            {fmtCurrency(avgCost, currency, false, 2)}
                            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-slate-400" aria-hidden="true"><path d="M13.586 3.586a2 2 0 112.828 2.828l-8.5 8.5-3.75.922.922-3.75 8.5-8.5z" /></svg>
                          </button>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-slate-400">
                          {isQuoteValueLoading ? '取得即時股價' : statusLabel || '目前股價'}
                        </p>
                        <p className="icon-label mt-0.5 inline-flex items-center font-mono text-xs font-bold text-slate-700">
                          <span>{isQuoteValueLoading ? <InlineValueSkeleton className="h-4 w-16" /> : marketPrice == null ? '—' : fmtCurrency(marketPrice, currency, false, 2)}</span>
                          {!isQuoteValueLoading && <LimitStatusBadge status={meta?.limitStatus} />}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto md:block" style={{ maxHeight: `${posContainerMaxHeight}px`, overflowY: 'auto' }}>
              <table className="w-full min-w-[1080px] text-center">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-400 sticky top-0 z-10 shadow-sm">
                  <tr className="h-12">
                    <th className="px-4 py-3 align-middle text-left whitespace-nowrap">股票</th>
                    <th className="px-4 py-3 align-middle whitespace-nowrap">持有股數</th>
                    <th className="px-4 py-3 align-middle whitespace-nowrap">成本價 {posTab === 'US' && `(${displayCurrency})`}</th>
                    <th className="px-4 py-3 align-middle whitespace-nowrap">現價 {posTab === 'US' && `(${displayCurrency})`}</th>
                    <th className="px-4 py-3 align-middle whitespace-nowrap">今日損益 {posTab === 'US' && `(${displayCurrency})`}</th>
                    <th className="px-4 py-3 align-middle whitespace-nowrap">投資成本 {posTab === 'US' && `(${displayCurrency})`}</th>
                    <th className="px-4 py-3 align-middle whitespace-nowrap">帳面現值 {posTab === 'US' && `(${displayCurrency})`}</th>
                    <th className="px-4 py-3 align-middle whitespace-nowrap">未實現損益 {posTab === 'US' && `(${displayCurrency})`}</th>
                    <th className="px-4 py-3 align-middle whitespace-nowrap">損益率</th>
                    <th className="px-4 py-3 align-middle whitespace-nowrap">市值佔比</th>
                  </tr>
                </thead>
                <tbody>
                  {activePositions.map((pos, positionIndex) => {
                    const sharePercent =
                      currentTabRawTotalValue > 0 ? (pos.marketValue / currentTabRawTotalValue) * 100 : 0;
                    const nameParts = pos.name.split(' ');
                    const displayName = nameParts.slice(1).join(' ') || nameParts[0];

                    const isUSStock = pos.market === 'US';
                    const rate = isUSStock ? (usdToTwdRate || 1) : 1;
                    const currentDisplayCurrency = isUSStock ? displayCurrency : 'TWD';

                    const convertedAvgCost = isUSStock && displayCurrency === 'TWD' ? pos.avgCost * rate : pos.avgCost;
                    const convertedMarketPrice = pos.marketPrice == null
                      ? null
                      : (isUSStock && displayCurrency === 'TWD' ? pos.marketPrice * rate : pos.marketPrice);
                    const convertedTotalBuyCost = isUSStock && displayCurrency === 'TWD' ? pos.totalBuyCost * rate : pos.totalBuyCost;
                    const convertedMarketValue = isUSStock && displayCurrency === 'TWD' ? pos.marketValue * rate : pos.marketValue;
                    const convertedUnrealizedProfit = pos.unrealizedProfit == null
                      ? null
                      : (isUSStock && displayCurrency === 'TWD' ? pos.unrealizedProfit * rate : pos.unrealizedProfit);
                    const convertedDailyProfit = pos.dailyProfit == null
                      ? null
                      : (isUSStock && displayCurrency === 'TWD' ? pos.dailyProfit * rate : pos.dailyProfit);

                    const profitPercent = pos.profitPercent;
                    const meta = quoteMeta[pos.name];
                    const statusLabel = quoteStatusLabel(meta?.status);
                    const isQuoteValueLoading = pos.isWaitingForRealtime;

                    return (
                      <tr key={pos.name} className="h-14 border-t border-slate-100 hover:bg-slate-50/60 transition">
                        {/* 股票 */}
                        <td className="px-4 py-3 align-middle text-left">
                          <div className="flex items-center gap-2.5 whitespace-nowrap">
                            <span className="inline-flex shrink-0 rounded-md bg-rose-50 px-2 py-0.5 font-mono text-xs font-bold text-rose-600 ring-1 ring-rose-100">{pos.symbol}</span>
                            <span className="max-w-[180px] truncate text-sm text-slate-800">{displayName}</span>
                            {positionIndex === 0 && <span className="shrink-0" title="目前排序第一名" aria-label="目前排序第一名"><CrownIcon /></span>}
                          </div>
                        </td>

                        {/* 持有股數 */}
                        <td className="px-4 py-3 align-middle font-mono text-sm text-slate-700">
                          {pos.holdingQty.toLocaleString()}
                        </td>

                        {/* 成本價 */}
                        <td className="px-4 py-3 align-middle font-mono text-sm text-slate-700">
                          {editingCostName === pos.name ? (
                            <div className="flex items-center justify-center gap-1" data-cost-editor>
                              <input
                                type="number"
                                value={costDraft}
                                onChange={(event) => setCostDraft(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' && hasCostChanged) requestCostSave(pos, rate, currentDisplayCurrency, displayName);
                                  if (event.key === 'Escape') cancelEditingCost();
                                }}
                                className="w-24 rounded-lg border border-rose-200 bg-white px-2 py-1 text-center font-mono text-sm outline-none focus:ring-2 focus:ring-rose-100"
                                min="0"
                                step="0.01"
                                autoFocus
                              />
                              {hasCostChanged && (
                                <button
                                  type="button"
                                  disabled={isSavingCost}
                                  onClick={() => requestCostSave(pos, rate, currentDisplayCurrency, displayName)}
                                  className="shrink-0 px-1 py-1 text-[10px] font-bold text-rose-500 transition hover:text-rose-600 disabled:opacity-50"
                                >
                                  儲存
                                </button>
                              )}
                            </div>
                          ) : (
                            <button type="button" onClick={() => startEditingCost(pos, convertedAvgCost)} className="icon-label inline-flex items-center font-mono text-sm text-slate-700" aria-label={`修改 ${displayName} 平均成本`}>
                              {fmtCurrency(convertedAvgCost, currentDisplayCurrency, false, 2)}
                              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-slate-400" aria-hidden="true"><path d="M13.586 3.586a2 2 0 112.828 2.828l-8.5 8.5-3.75.922.922-3.75 8.5-8.5z" /></svg>
                            </button>
                          )}
                        </td>

                        {/* 現價（唯讀） */}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className="icon-label inline-flex items-center font-mono text-sm font-bold text-slate-700">
                              <span>{isQuoteValueLoading ? <InlineValueSkeleton /> : convertedMarketPrice == null ? '—' : fmtCurrency(convertedMarketPrice, currentDisplayCurrency, false, 2)}</span>
                              {!isQuoteValueLoading && <LimitStatusBadge status={meta?.limitStatus} />}
                            </span>
                            {(statusLabel || isQuoteValueLoading) && (
                              <span
                                title={meta?.source ? `來源：${meta.source}` : '官方行情暫無回應，系統會自動重試'}
                                className="text-[9px] font-bold text-slate-400"
                              >
                                {isQuoteValueLoading ? '取得即時股價' : statusLabel}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 今日損益（相較昨收） */}
                        <td className="px-4 py-3 align-middle">
                          <div className={`font-mono text-sm font-bold ${convertedDailyProfit == null ? 'text-slate-400' : convertedDailyProfit >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {isQuoteValueLoading ? <InlineValueSkeleton className="h-4 w-20" /> : convertedDailyProfit == null ? '—' : fmtCurrency(convertedDailyProfit, currentDisplayCurrency, true)}
                          </div>
                          {!isQuoteValueLoading && pos.dailyProfitPercent != null && (
                            <div className={`mt-0.5 font-mono text-[10px] font-bold ${pos.dailyProfitPercent >= 0 ? 'text-rose-400' : 'text-emerald-500'}`}>
                              {pos.dailyProfitPercent >= 0 ? '+' : ''}{pos.dailyProfitPercent.toFixed(2)}%
                            </div>
                          )}
                        </td>

                        {/* 投資成本 */}
                        <td className="px-4 py-3 align-middle font-mono text-sm text-slate-700">
                          {fmtCurrency(convertedTotalBuyCost, currentDisplayCurrency)}
                        </td>

                        {/* 帳面現值 */}
                        <td className="px-4 py-3 align-middle font-mono text-sm text-slate-700">
                          {isQuoteValueLoading ? <InlineValueSkeleton className="h-4 w-20" /> : pos.hasQuote ? fmtCurrency(convertedMarketValue, currentDisplayCurrency) : '—'}
                        </td>

                        {/* 未實現損益 */}
                        <td className={`px-4 py-3 align-middle font-mono text-sm font-bold ${convertedUnrealizedProfit == null ? 'text-slate-400' : convertedUnrealizedProfit >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {isQuoteValueLoading ? <InlineValueSkeleton className="h-4 w-24" /> : convertedUnrealizedProfit == null ? '—' : fmtCurrency(convertedUnrealizedProfit, currentDisplayCurrency, true)}
                        </td>

                        {/* 損益率 */}
                        <td className={`px-4 py-3 align-middle font-mono text-sm font-bold ${profitPercent == null ? 'text-slate-400' : profitPercent >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {isQuoteValueLoading ? <InlineValueSkeleton className="h-4 w-14" /> : profitPercent == null ? '—' : `${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%`}
                        </td>

                        {/* 市值佔比 + bar */}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center justify-center gap-2">
                            <span className="w-10 text-right font-mono text-xs text-slate-600">
                              {isQuoteValueLoading ? <InlineValueSkeleton className="h-3 w-8" /> : pos.hasQuote ? `${sharePercent.toFixed(1)}%` : '—'}
                            </span>
                            <div className="relative h-1 w-12 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="absolute left-0 top-0 h-full rounded-full bg-rose-400 transition-all duration-300"
                                style={{ width: `${pos.hasQuote && !isQuoteValueLoading ? Math.min(sharePercent, 100) : 0}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
    </>
  );
}
