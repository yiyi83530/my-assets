'use client';

export function MobileStockSectionNav(props) {
  const {
    mobileSectionScrollerRef,
    handleMobileSectionScroll,
    mobileSectionCardRefs,
    mobileSection,
    scrollToMobileSection,
    isAppInitializing,
    allPositions
  } = props;

  return (
    <>
{/* 手機版：滑動精簡入口卡，下方只顯示選中的完整內容。 */}
      <div className="-mx-4 md:hidden">
        <div
          ref={mobileSectionScrollerRef}
          onScroll={handleMobileSectionScroll}
          className="flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="選擇股票內容"
        >
          <button
            ref={(node) => { mobileSectionCardRefs.current.positions = node; }}
            type="button"
            role="tab"
            aria-selected={mobileSection === 'positions'}
            aria-controls="positions-panel"
            onClick={() => scrollToMobileSection('positions')}
            className={`w-[74%] shrink-0 snap-start rounded-2xl border p-4 text-left transition ${
              mobileSection === 'positions'
                ? 'border-rose-200 bg-gradient-to-br from-rose-50 to-white shadow-sm ring-1 ring-rose-100'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-sm" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V9m5 10V5m5 14v-7m5 7V3" />
                </svg>
              </span>
              <h2 className="text-base font-black text-slate-900">持股明細</h2>
              <span className="ml-auto rounded-full bg-white px-2 py-1 text-[10px] font-bold text-rose-500 shadow-sm">
                {isAppInitializing ? '—' : `${allPositions.length} 檔`}
              </span>
            </div>
          </button>

          <button
            ref={(node) => { mobileSectionCardRefs.current.transactions = node; }}
            type="button"
            role="tab"
            aria-selected={mobileSection === 'transactions'}
            aria-controls="transactions-panel"
            onClick={() => scrollToMobileSection('transactions')}
            className={`w-[74%] shrink-0 snap-start rounded-2xl border p-4 text-left transition ${
              mobileSection === 'transactions'
                ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-sm ring-1 ring-blue-100'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h10a2 2 0 012 2v16l-3.5-2-3.5 2-3.5-2L5 21V5a2 2 0 012-2zM9 8h6m-6 4h6" />
                </svg>
              </span>
              <h2 className="text-base font-black text-slate-900">歷史交易紀錄</h2>
            </div>
          </button>
        </div>

        <div className="mt-1 flex items-center justify-center gap-2" aria-label="目前顯示區域">
          <button
            type="button"
            onClick={() => scrollToMobileSection('positions')}
            className={`h-1.5 rounded-full transition-all ${mobileSection === 'positions' ? 'w-5 bg-rose-400' : 'w-1.5 bg-slate-300'}`}
            aria-label="顯示持股明細"
            aria-current={mobileSection === 'positions' ? 'true' : undefined}
          />
          <button
            type="button"
            onClick={() => scrollToMobileSection('transactions')}
            className={`h-1.5 rounded-full transition-all ${mobileSection === 'transactions' ? 'w-5 bg-blue-500' : 'w-1.5 bg-slate-300'}`}
            aria-label="顯示歷史交易紀錄"
            aria-current={mobileSection === 'transactions' ? 'true' : undefined}
          />
          <span className="ml-1 text-[9px] font-medium text-slate-400">左右滑動切換</span>
        </div>
      </div>
    </>
  );
}
