'use client';

import { fmtDate, fmtTime, StockDataLoading } from '@/components/stocks/stock-ui';

export function TransactionRecords(props) {
  const {
    histTab,
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
      <div key={histTab} className="animate-in fade-in duration-500">
          {isTransactionsLoading ? (
            <StockDataLoading />
          ) : activeTx.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">
              目前沒有「{histTab === 'TWSE' ? '台股' : '美股'}」歷史交易紀錄
            </div>
          ) : (
            <div className="">
              <div className="divide-y divide-slate-100 md:hidden">
                {paginatedTx.map((tx) => {
                  const txSymbol = tx.stock.split(' ')[0];
                  const txName = tx.stock.split(' ').slice(1).join(' ');
                  const txTime = fmtTime(tx.recordedAt);
                  return (
                    <article key={tx.id} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tx.type === 'buy' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {tx.type === 'buy' ? '買進' : '賣出'}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-500">{txSymbol}</span>
                          </div>
                          {txName && <h3 className="mt-1 truncate text-sm font-bold text-slate-800">{txName}</h3>}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-mono text-xs font-medium text-slate-600">{fmtDate(tx.date)}</p>
                          {txTime && <p className="mt-0.5 font-mono text-[10px] text-slate-400">{txTime}</p>}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3">
                        <div>
                          <p className="text-[10px] text-slate-400">股數</p>
                          <p className="mt-1 font-mono text-xs font-bold text-slate-700">{Number(tx.qty).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">成交單價</p>
                          <p className="mt-1 font-mono text-xs font-bold text-slate-700">${Number(tx.price).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">實際收支</p>
                          <p className={`mt-1 font-mono text-xs font-black ${tx.type === 'buy' ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {tx.type === 'buy' ? '-' : '+'}${Number(tx.actualAmount).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-[11px] text-slate-400">{tx.note || '無備註'}</p>
                        <button onClick={() => openTransactionModal(tx)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600" aria-label={`編輯 ${tx.stock}`}>編輯</button>
                        <button onClick={() => setDeleteId(tx.id)} className="rounded-lg border border-rose-100 bg-white px-3 py-1.5 text-[11px] font-bold text-rose-500" aria-label={`刪除 ${tx.stock}`}>刪除</button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] text-center border-separate border-spacing-0 relative">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-400 shadow-sm">
                    <tr className="h-12">
                      <th className="px-4 py-3 align-middle text-left">日期 / 時間</th>
                      <th className="px-0 py-3 align-middle text-left">股票</th>
                      <th className="px-4 py-3 align-middle">類型</th>
                      <th className="px-4 py-3 align-middle">股數</th>
                      <th className="px-4 py-3 align-middle">成交單價</th>
                      <th className="px-4 py-3 align-middle">實際收支</th>
                      <th className="px-4 py-3 align-middle">備註</th>
                      <th className="px-4 py-3 align-middle">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTx.map((tx) => {
                      const txSymbol = tx.stock.split(' ')[0];
                      const txName = tx.stock.split(' ').slice(1).join(' ');
                      const txTime = fmtTime(tx.recordedAt);
                      return (
                        <tr key={tx.id} className="h-16 border-t border-slate-100 hover:bg-slate-50/60 transition">
                          {/* 日期 / 時間 */}
                          <td className="px-4 py-3 align-middle text-left">
                            <div className="font-mono text-xs text-slate-700">{fmtDate(tx.date)}</div>
                            {txTime && <div className="font-mono text-xs text-slate-400">{txTime}</div>}
                          </td>
                          {/* 股票 */}
                          <td className="px-0 py-3 align-middle text-left">
                            <div className="text-xs font-bold text-slate-400">{txSymbol}</div>
                            {txName && <div className="text-sm text-slate-800">{txName}</div>}
                          </td>
                          {/* 類型 */}
                          <td className="px-4 py-3 align-middle">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${tx.type === 'buy' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {tx.type === 'buy' ? '買進' : '賣出'}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle font-mono text-sm text-slate-700">
                            {Number(tx.qty).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 align-middle font-mono text-sm text-slate-700">
                            ${Number(tx.price).toLocaleString()}
                          </td>
                          <td className={`px-4 py-3 align-middle font-mono text-sm font-bold ${tx.type === 'buy' ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {tx.type === 'buy' ? '-' : '+'}${Number(tx.actualAmount).toLocaleString()}
                          </td>
                          <td className="max-w-[220px] truncate whitespace-nowrap px-4 py-3 align-middle text-left text-xs text-slate-500">{tx.note || '—'}</td>
                          <td className="px-4 py-3 align-middle">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => openTransactionModal(tx)}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-amber-50 hover:text-amber-500"
                                title="編輯此筆紀錄"
                              >
                                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                  <path d="M5.433 13.917l-1.5 1.5A.75.75 0 003.5 16.03l1.5-1.5zM11.778 4.291a.75.75 0 00-1.06 0L5.918 9.1C5.558 9.46 5.378 9.775 5.258 10.02l-.938 2.062a.75.75 0 00.957.957l2.062-.938c.245-.12.56-.3.92-.66l4.79-4.79a.75.75 0 000-1.06l-.04-.04zM16.125 1.75a.75.75 0 011.06 0l1.25 1.25a.75.75 0 010 1.06L17.06 5.44l-2.31-2.31 1.37-1.38z" />
                                  <path fillRule="evenodd" d="M1.75 1.75a.75.75 0 00-.75.75v14.5c0 .414.336.75.75.75h14.5a.75.75 0 00.75-.75V8.5a.75.75 0 011.5 0v7.75a2.25 2.25 0 01-2.25 2.25H2.5a2.25 2.25 0 01-2.25-2.25V2.5C.25 2.086.586 1.75 1 1.75h-.001z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setDeleteId(tx.id)}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                                title="刪除此筆紀錄"
                              >
                                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                  <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193v-.443A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination UI */}
              {totalTxPages > 1 && (
                <div className="border-t border-slate-100 bg-slate-50/30 px-5 py-4">
                  <div className="flex flex-col items-center justify-center gap-3">
                    {/* 分頁按鈕 */}
                    <div className="flex items-center gap-1">
                      {/* 上一頁 */}
                      <button
                        onClick={() => setCurrentTxPage((p) => Math.max(1, p - 1))}
                        disabled={currentTxPage === 1}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
                        title="上一頁"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                        </svg>
                      </button>

                      {/* 頁碼按鈕 */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalTxPages }, (_, i) => i + 1).map((page) => {
                          // 只顯示前後2頁 + 當前頁，其他用 ... 省略
                          const showPage = page === 1 || page === totalTxPages || Math.abs(page - currentTxPage) <= 1;
                          const showEllipsisBefore = page === currentTxPage - 2 && currentTxPage > 3;
                          const showEllipsisAfter = page === currentTxPage + 2 && currentTxPage < totalTxPages - 2;

                          if (!showPage && !showEllipsisBefore && !showEllipsisAfter) return null;

                          if (showEllipsisBefore || showEllipsisAfter) {
                            return (
                              <span key={`ellipsis-${page}`} className="px-2 text-slate-400">
                                ...
                              </span>
                            );
                          }

                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentTxPage(page)}
                              className={`flex h-8 min-w-[2rem] items-center justify-center rounded-lg border px-2 text-xs font-bold transition ${
                                currentTxPage === page
                                  ? 'border-rose-200 bg-rose-500 text-white shadow-sm'
                                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                      </div>

                      {/* 下一頁 */}
                      <button
                        onClick={() => setCurrentTxPage((p) => Math.min(totalTxPages, p + 1))}
                        disabled={currentTxPage === totalTxPages}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
                        title="下一頁"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>

                    {/* 顯示目前頁數資訊 */}
                    <div className="text-xs text-slate-500">
                      第 <span className="font-bold text-slate-700">{currentTxPage}</span> 頁，共 <span className="font-bold text-slate-700">{totalTxPages}</span> 頁
                      <span className="ml-2 text-slate-400">（共 {activeTx.length} 筆交易）</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
    </>
  );
}
