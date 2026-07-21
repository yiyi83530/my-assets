'use client';

import { normalizeStockSymbol } from '@/lib/stock-symbol';

export function HoldingSnapshotModal(props) {
  const {
    showHoldingSnapshotModal,
    isSavingHoldingSnapshot,
    setShowHoldingSnapshotModal,
    holdingSnapshotMonth,
    setHoldingSnapshotMonth,
    buildHoldingDraftsForMonth,
    setHoldingDrafts,
    createEmptyHoldingDraft,
    getLocalMonthKey,
    holdingDrafts,
    updateHoldingDraft,
    saveHoldingSnapshotDrafts
  } = props;

  return (
    <>
      {showHoldingSnapshotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="flex h-[82vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-4 py-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">持股快照</h3>
                <p className="mt-0.5 text-[11px] text-slate-500">用券商帳戶的實際股數與平均成本校正；快照後的交易會繼續自動累加。</p>
              </div>
              <button
                type="button"
                onClick={() => !isSavingHoldingSnapshot && setShowHoldingSnapshotModal(false)}
                className="rounded-lg px-2 py-1 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                aria-label="關閉持股快照"
              >
                ✕
              </button>
            </div>

            <div className="shrink-0 border-b border-slate-100 px-4 py-2">
              <label className="flex max-w-[180px] flex-col gap-1 text-[11px] font-bold text-slate-500">
                快照月份
                <input
                  type="month"
                  value={holdingSnapshotMonth}
                  onChange={(event) => {
                    const monthKey = event.target.value;
                    const rows = buildHoldingDraftsForMonth(monthKey);
                    setHoldingSnapshotMonth(monthKey);
                    setHoldingDrafts(rows.length > 0 ? rows : [createEmptyHoldingDraft()]);
                  }}
                  max={getLocalMonthKey()}
                  className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-rose-200 focus:bg-white focus:ring-2 focus:ring-rose-100"
                />
              </label>
              <p className="mt-1.5 text-[10px] leading-4 text-slate-400">
                {holdingSnapshotMonth === getLocalMonthKey()
                  ? '本月快照從儲存當下生效；今天之後新增的交易仍會接續計算。'
                  : '補登過去月份時，快照視為該月月底狀態；較晚月份的交易仍會接續計算。'}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
              <div className="min-w-[482px]">
                <div className="grid grid-cols-[54px_70px_minmax(100px,1fr)_70px_88px_30px] gap-1.5 border-b border-slate-100 pb-1.5 text-[10px] font-bold text-slate-400">
                  <span>市場</span>
                  <span>代碼</span>
                  <span>股票名稱</span>
                  <span>快照股數</span>
                  <span>平均成本</span>
                  <span />
                </div>
                <div className="divide-y divide-slate-100">
                  {holdingDrafts.map((row, index) => (
                    <div key={row.id || index} className="grid grid-cols-[54px_70px_minmax(100px,1fr)_70px_88px_30px] gap-1.5 py-1.5">
                      <select
                        value={row.market}
                        onChange={(event) => updateHoldingDraft(index, { market: event.target.value })}
                        className="h-8 rounded-md border border-slate-200 bg-white px-1 text-[11px] font-bold text-slate-700 outline-none focus:border-rose-200 focus:ring-2 focus:ring-rose-100"
                      >
                        <option value="TWSE">台股</option>
                        <option value="US">美股</option>
                      </select>
                      <input
                        value={row.symbol}
                        onChange={(event) => updateHoldingDraft(index, { symbol: event.target.value })}
                        placeholder="2330"
                        className="h-8 rounded-md border border-slate-200 bg-slate-50 px-1.5 font-mono text-xs text-slate-800 outline-none focus:border-rose-200 focus:bg-white focus:ring-2 focus:ring-rose-100"
                      />
                      <input
                        value={row.stock}
                        onChange={(event) => {
                          const stock = event.target.value;
                          updateHoldingDraft(index, {
                            stock,
                            symbol: row.symbol || normalizeStockSymbol(stock.split(' ')[0], stock, row.market),
                          });
                        }}
                        placeholder={row.market === 'US' ? 'AAPL Apple Inc.' : '2330 台積電'}
                        className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 outline-none focus:border-rose-200 focus:bg-white focus:ring-2 focus:ring-rose-100"
                      />
                      <input
                        type="number"
                        value={row.holdingQty}
                        onChange={(event) => updateHoldingDraft(index, { holdingQty: event.target.value })}
                        min="0"
                        step="1"
                        inputMode="numeric"
                        className="h-8 rounded-md border border-slate-200 bg-slate-50 px-1.5 text-right font-mono text-xs text-slate-800 outline-none focus:border-rose-200 focus:bg-white focus:ring-2 focus:ring-rose-100"
                      />
                      <input
                        type="number"
                        value={row.avgCost}
                        onChange={(event) => updateHoldingDraft(index, { avgCost: event.target.value })}
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        className="h-8 rounded-md border border-slate-200 bg-slate-50 px-1.5 text-right font-mono text-xs text-slate-800 outline-none focus:border-rose-200 focus:bg-white focus:ring-2 focus:ring-rose-100"
                      />
                      <button
                        type="button"
                        onClick={() => setHoldingDrafts((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}
                        className="flex h-8 items-center justify-center rounded-md text-xs text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                        aria-label="刪除此持股快照列"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHoldingDrafts((rows) => [...rows, createEmptyHoldingDraft()])}
                className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                新增股票列
              </button>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                disabled={isSavingHoldingSnapshot}
                onClick={() => setShowHoldingSnapshotModal(false)}
                className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isSavingHoldingSnapshot}
                onClick={saveHoldingSnapshotDrafts}
                className="icon-label flex items-center justify-center rounded-lg bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-rose-200 transition hover:bg-rose-600 disabled:opacity-50"
              >
                {isSavingHoldingSnapshot && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                {isSavingHoldingSnapshot ? '儲存中' : '儲存快照'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
