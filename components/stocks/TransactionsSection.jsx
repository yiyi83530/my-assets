'use client';

import { MarketFlag, tabBtnClass } from '@/components/stocks/stock-ui';
import { TransactionRecords } from '@/components/stocks/TransactionRecords';

export function TransactionsSection(props) {
  const {
    mobileSection,
    histTab,
    setHistTab,
    currentFilterYear,
    currentFilterMonth,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    showYearDropdown,
    setShowYearDropdown,
    showMonthDropdown,
    setShowMonthDropdown,
    yearHighlightedIndex,
    setYearHighlightedIndex,
    monthHighlightedIndex,
    setMonthHighlightedIndex,
    yearOptions,
    yearLabel,
    monthOptions,
    monthLabel,
    isTransactionsLoading,
    activeTx,
    paginatedTx,
    openTransactionModal,
    setDeleteId,
    totalTxPages,
    currentTxPage,
    setCurrentTxPage
  } = props;

  return (
    <>
{/* ── Transaction History ── */}
      <section
        id="transactions-panel"
        role="tabpanel"
        className={`${mobileSection === 'transactions' ? 'mobile-panel-enter-right block' : 'hidden'} card overflow-hidden ring-1 ring-blue-100/70 md:block`}
        aria-labelledby="transactions-heading"
      >
        <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50/80 via-white to-white px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200 md:flex md:h-11 md:w-11 md:rounded-2xl" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h10a2 2 0 012 2v16l-3.5-2-3.5 2-3.5-2L5 21V5a2 2 0 012-2zM9 8h6m-6 4h6" />
                </svg>
              </span>
              <h2 id="transactions-heading" className="whitespace-nowrap text-xl font-black tracking-tight text-slate-900 sm:text-2xl">歷史交易明細</h2>
            </div>
            <div className="grid w-full grid-cols-2 items-center gap-1 rounded-xl bg-slate-100 p-0.5 sm:flex sm:w-auto">
              <button onClick={() => setHistTab('TWSE')} className={tabBtnClass(histTab === 'TWSE')}>
                <span className="inline-flex items-center justify-center gap-1.5"><MarketFlag market="TWSE" />台股</span>
              </button>
              <button onClick={() => setHistTab('US')} className={tabBtnClass(histTab === 'US')}>
                <span className="inline-flex items-center justify-center gap-1.5"><MarketFlag market="US" />美股</span>
              </button>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-200/70 pt-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-500">篩選期間</span>
              <div className="flex items-center gap-1.5" aria-label="交易期間快速篩選">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYear(currentFilterYear);
                    setSelectedMonth(currentFilterMonth);
                    setShowYearDropdown(false);
                    setShowMonthDropdown(false);
                  }}
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-bold transition sm:rounded-lg sm:px-2.5 sm:py-1 sm:text-[11px] ${
                    selectedYear === currentFilterYear && selectedMonth === currentFilterMonth
                      ? 'border-rose-200 bg-rose-100 text-rose-700 sm:bg-rose-500 sm:text-white sm:shadow-sm sm:shadow-rose-100'
                      : 'border-rose-200 bg-white text-rose-600 hover:bg-rose-50'
                  }`}
                >
                  顯示本月
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYear('ALL');
                    setSelectedMonth('ALL');
                    setShowYearDropdown(false);
                    setShowMonthDropdown(false);
                  }}
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-bold transition sm:rounded-lg sm:px-2.5 sm:py-1 sm:text-[11px] ${
                    selectedYear === 'ALL' && selectedMonth === 'ALL'
                      ? 'border-slate-200 bg-slate-100 text-slate-700 sm:border-slate-700 sm:bg-slate-700 sm:text-white sm:shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  查看全部
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowYearDropdown((prev) => !prev);
                  setShowMonthDropdown(false);
                  if (!showYearDropdown) {
                    setYearHighlightedIndex(Math.max(yearOptions.indexOf(selectedYear), 0));
                  }
                }}
                onBlur={() => setTimeout(() => setShowYearDropdown(false), 120)}
                className="flex w-full min-w-0 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none sm:min-w-[126px]"
                aria-label="選擇交易年份"
              >
                <span>{yearLabel}</span>
                <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 text-slate-400 transition-transform ${showYearDropdown ? 'rotate-180' : ''}`}>
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.116l3.71-3.886a.75.75 0 111.08 1.04l-4.25 4.454a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              {showYearDropdown && (
                <div className="absolute left-0 z-30 mt-1 w-full min-w-[126px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  {yearOptions.map((year, index) => {
                    const active = selectedYear === year;
                    const highlighted = yearHighlightedIndex === index;
                    return (
                      <button
                        key={year}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setYearHighlightedIndex(index)}
                        onClick={() => {
                          setSelectedYear(year);
                          setShowYearDropdown(false);
                        }}
                        className={`block w-full px-3 py-2 text-left text-xs font-semibold transition ${
                          active || highlighted
                            ? 'bg-rose-50 text-rose-700'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {year === 'ALL' ? '全部年份' : `${year} 年`}
                      </button>
                    );
                  })}
                </div>
              )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowMonthDropdown((prev) => !prev);
                    setShowYearDropdown(false);
                    if (!showMonthDropdown) {
                      setMonthHighlightedIndex(Math.max(monthOptions.indexOf(selectedMonth), 0));
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowMonthDropdown(false), 120)}
                  className="flex w-full min-w-0 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none sm:min-w-[126px]"
                  aria-label="選擇交易月份"
                >
                  <span>{monthLabel}</span>
                  <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 text-slate-400 transition-transform ${showMonthDropdown ? 'rotate-180' : ''}`}>
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.116l3.71-3.886a.75.75 0 111.08 1.04l-4.25 4.454a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
                {showMonthDropdown && (
                  <div className="absolute right-0 z-30 mt-1 max-h-64 w-full min-w-[126px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {monthOptions.map((month, index) => {
                      const active = selectedMonth === month;
                      const highlighted = monthHighlightedIndex === index;
                      return (
                        <button
                          key={month}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onMouseEnter={() => setMonthHighlightedIndex(index)}
                          onClick={() => {
                            setSelectedMonth(month);
                            setShowMonthDropdown(false);
                          }}
                          className={`block w-full px-3 py-2 text-left text-xs font-semibold transition ${
                            active || highlighted
                              ? 'bg-rose-50 text-rose-700'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {month === 'ALL' ? '全部月份' : `${Number(month)} 月`}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <TransactionRecords {...{
          histTab, isTransactionsLoading, activeTx, paginatedTx, openTransactionModal,
          setDeleteId, totalTxPages, currentTxPage, setCurrentTxPage,
        }} />
      </section>
    </>
  );
}
