'use client';

import { IndustryDistribution } from '@/components/stocks/IndustryDistribution';
import { PositionHoldings } from '@/components/stocks/PositionHoldings';
import { fmtCurrency, fmtTime, MarketFlag, POSITION_SORT_OPTIONS } from '@/components/stocks/stock-ui';

export function PositionsSection(props) {
  const {
    mobileSection,
    isPortfolioLoading,
    totalOverallDailyProfit,
    totalOverallDailyProfitPercent,
    openHoldingSnapshotEditor,
    posTab,
    setPosTab,
    handleManualRefresh,
    isFetchingPrices,
    lastQuoteUpdatedAt,
    showChart,
    setShowChart,
    usdToTwdRate,
    displayCurrency,
    setDisplayCurrency,
    positionSortKey,
    setPositionSortKey,
    positionSortDirection,
    setPositionSortDirection,
    activePositionSortOption,
    currentTabTotalValue,
    industryData,
    isCompactIndustryChart,
    openIndustryCategoryEditor,
    selectedIndustry,
    setSelectedIndustry,
    activePositions,
    currentTabRawTotalValue,
    quoteMeta,
    editingCostName,
    costDraft,
    setCostDraft,
    hasCostChanged,
    requestCostSave,
    cancelEditingCost,
    isSavingCost,
    startEditingCost,
    posContainerMaxHeight,
    valuationLabel,
    valuationShareLabel,
    usesNetLiquidationValue,
  } = props;

  return (
    <>
{/* ── Positions Section ── */}
      <section
        id="positions-panel"
        role="tabpanel"
        className={`${mobileSection === 'positions' ? 'mobile-panel-enter-left block' : 'hidden'} card overflow-hidden ring-1 ring-rose-100/70 md:block`}
        aria-labelledby="positions-heading"
      >
        <div className="border-b border-slate-200 bg-gradient-to-r from-rose-50/80 via-white to-white px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-sm shadow-rose-200 md:flex md:h-11 md:w-11 md:rounded-2xl" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V9m5 10V5m5 14v-7m5 7V3" />
                </svg>
              </span>
              <h2 id="positions-heading" className="whitespace-nowrap text-xl font-black tracking-tight text-slate-900 sm:text-2xl">持股明細</h2>
              <div className="min-w-0 border-l border-rose-200/80 pl-3">
                <p className="text-[9px] font-bold tracking-wide text-slate-400 sm:text-[10px]">總體今日損益</p>
                {isPortfolioLoading ? (
                  <span className="mt-1 block h-4 w-20 animate-pulse rounded bg-slate-200/80" aria-label="資料載入中" />
                ) : (
                  <p className={`mt-0.5 truncate font-mono text-xs font-black sm:text-sm ${totalOverallDailyProfit == null ? 'text-slate-400' : totalOverallDailyProfit >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {totalOverallDailyProfit == null ? '—' : fmtCurrency(totalOverallDailyProfit, 'TWD', true)}
                    {totalOverallDailyProfitPercent != null && <span className="ml-1 text-[9px] sm:text-[10px]">({totalOverallDailyProfitPercent >= 0 ? '+' : ''}{totalOverallDailyProfitPercent.toFixed(2)}%)</span>}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={openHoldingSnapshotEditor}
              disabled={isPortfolioLoading}
              className="icon-label inline-flex h-6 shrink-0 items-center justify-center rounded-full bg-rose-50 px-2 text-[9px] font-black text-rose-700 shadow-sm shadow-rose-100/60 ring-1 ring-white/70 transition hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 disabled:cursor-wait disabled:opacity-50 sm:h-7 sm:px-2.5 sm:text-[10px]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8a2 2 0 012-2h2l1.2-1.6A1 1 0 0110 4h4a1 1 0 01.8.4L16 6h2a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
                <circle cx="12" cy="13" r="3.25" />
              </svg>
              持股快照
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-3">
            <div className="relative grid w-full shrink-0 grid-cols-2 rounded-xl bg-slate-200/60 p-1 sm:w-auto" role="radiogroup" aria-label="選擇股票市場">
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%_-_4px)] rounded-lg bg-white shadow-sm transition-transform duration-200 ease-out ${
                  posTab === 'US' ? 'translate-x-full' : 'translate-x-0'
                }`}
              />
              <button
                type="button"
                onClick={() => setPosTab('TWSE')}
                role="radio"
                aria-checked={posTab === 'TWSE'}
                className={`relative z-10 flex min-w-[68px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors md:gap-2 ${
                  posTab === 'TWSE' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <MarketFlag market="TWSE" />
                台股
              </button>
              <button
                type="button"
                onClick={() => setPosTab('US')}
                role="radio"
                aria-checked={posTab === 'US'}
                className={`relative z-10 flex min-w-[68px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors md:gap-2 ${
                  posTab === 'US' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <MarketFlag market="US" />
                美股
              </button>
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={isFetchingPrices || isPortfolioLoading}
              className="icon-label group order-1 inline-flex h-7 shrink-0 items-center justify-center rounded-md bg-transparent px-1 text-[11px] font-bold text-rose-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-wait disabled:opacity-50"
            >
              {isFetchingPrices || isPortfolioLoading ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-rose-600" />
              ) : (
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 transition-transform duration-500 group-hover:rotate-180" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 8.5a5.5 5.5 0 10-1.6 4.4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 4.5v4h-4" />
                </svg>
              )}
              更新現價
            </button>
            {lastQuoteUpdatedAt > 0 && (
              <span className="order-1 whitespace-nowrap text-[9px] font-normal text-slate-400">
                已更新・{fmtTime(new Date(lastQuoteUpdatedAt).toISOString())}
              </span>
            )}
            <button
              onClick={() => setShowChart(!showChart)}
              aria-expanded={showChart}
              disabled={isPortfolioLoading}
              className={`icon-label order-2 ml-auto inline-flex h-6 shrink-0 items-center justify-center rounded-md px-1 text-[10px] font-semibold transition disabled:cursor-wait disabled:opacity-50 sm:order-3 sm:h-7 sm:text-[11px] sm:font-bold ${
                showChart
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true">
                <path d="M10 2.5a.75.75 0 01.75.75v6.25H17a.75.75 0 01.75.75A8.75 8.75 0 1110 1.25a.75.75 0 010 1.5z" />
                <path d="M12.5 2.08a8.02 8.02 0 014.92 4.92h-4.17a.75.75 0 01-.75-.75V2.08z" />
              </svg>
              {showChart ? '隱藏' : '顯示'}產業分佈
            </button>
            {posTab === 'US' && (
              <div className="order-3 flex min-h-7 w-full min-w-0 items-center gap-2 sm:order-2 sm:w-auto sm:flex-1">
                <div className="relative z-10 ml-auto grid shrink-0 grid-cols-2 rounded-lg bg-slate-200/60 p-0.5" role="radiogroup" aria-label="選擇顯示幣別">
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%_-_2px)] rounded-md bg-white shadow-sm transition-transform duration-200 ease-out ${
                      displayCurrency === 'USD' ? 'translate-x-full' : 'translate-x-0'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setDisplayCurrency('TWD')}
                    disabled={!usdToTwdRate}
                    role="radio"
                    aria-checked={displayCurrency === 'TWD'}
                    className={`relative z-10 min-w-[54px] rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                      displayCurrency === 'TWD' ? 'text-slate-800' : 'text-slate-500 hover:text-slate-700'
                    } ${!usdToTwdRate ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    TWD
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayCurrency('USD')}
                    role="radio"
                    aria-checked={displayCurrency === 'USD'}
                    className={`relative z-10 min-w-[54px] rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                      displayCurrency === 'USD' ? 'text-slate-800' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    USD
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-3">
            <label htmlFor="position-sort" className="text-[10px] font-bold text-slate-400">
              排序
            </label>
            <div className="relative">
              <select
                id="position-sort"
                value={positionSortKey}
                onChange={(event) => setPositionSortKey(event.target.value)}
                disabled={isPortfolioLoading}
                className="h-8 min-w-[120px] appearance-none rounded-lg border border-slate-200 bg-white pl-2.5 pr-9 text-xs font-bold text-slate-700 outline-none transition focus:border-rose-200 focus:ring-2 focus:ring-rose-100 disabled:cursor-wait disabled:opacity-50"
                aria-label="選擇持股排序基準"
              >
                {POSITION_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value === 'marketValue' ? valuationShareLabel : option.label}
                  </option>
                ))}
              </select>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-700" aria-hidden="true">
                <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <button
              type="button"
              onClick={() => setPositionSortDirection((direction) => (direction === 'desc' ? 'asc' : 'desc'))}
              disabled={isPortfolioLoading}
              className="icon-label inline-flex h-8 items-center justify-center px-1 text-[10px] font-bold text-slate-400 transition hover:text-slate-500 disabled:cursor-wait disabled:opacity-50"
              aria-label={`目前依${activePositionSortOption?.label || '選定欄位'}${positionSortDirection === 'desc' ? '由高到低' : '由低到高'}排序，點擊切換`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className={`h-3.5 w-3.5 transition-transform ${positionSortDirection === 'asc' ? 'rotate-180' : ''}`} aria-hidden="true">
                <path fillRule="evenodd" d="M10 3.25a.75.75 0 01.75.75v10.19l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V4a.75.75 0 01.75-.75z" clipRule="evenodd" />
              </svg>
              {positionSortDirection === 'desc' ? '由高到低' : '由低到高'}
            </button>
          </div>
          {posTab === 'US' && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3.5 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white font-mono text-[10px] font-black tracking-tight text-blue-500 shadow-sm ring-1 ring-blue-100" aria-hidden="true">
                  US$
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-600">美股總資產</p>
                  <p className="mt-0.5 text-[9px] text-slate-400">{usesNetLiquidationValue ? '已扣預估賣出費用' : '依目前可用報價加總'}</p>
                </div>
              </div>
              {isPortfolioLoading ? (
                <span className="h-5 w-24 animate-pulse rounded-md bg-blue-100" aria-label="美股資產載入中" />
              ) : (
                <p className="shrink-0 text-right font-mono text-base font-black text-slate-800">
                  {displayCurrency === 'TWD'
                    ? `${fmtCurrency(currentTabTotalValue, 'TWD')} TWD`
                    : `${fmtCurrency(currentTabTotalValue, 'USD', false, 2)} USD`}
                </p>
              )}
            </div>
          )}
        </div>

        <IndustryDistribution {...{
          isPortfolioLoading, showChart, industryData, isCompactIndustryChart,
          openIndustryCategoryEditor, selectedIndustry, setSelectedIndustry,
          currentTabTotalValue, posTab, displayCurrency,
        }} />

        <PositionHoldings {...{
          posTab, isPortfolioLoading, activePositions, currentTabRawTotalValue,
          usdToTwdRate, displayCurrency, quoteMeta, editingCostName, costDraft,
          setCostDraft, hasCostChanged, requestCostSave, cancelEditingCost,
          isSavingCost, startEditingCost, posContainerMaxHeight,
          valuationLabel, valuationShareLabel, usesNetLiquidationValue,
        }} />
      </section>
    </>
  );
}
