'use client';


export function StockConfirmationModals(props) {
  const {
    pendingCostChange,
    isSavingCost,
    setPendingCostChange,
    saveEditedCost,
    deleteId,
    isDeleting,
    setDeleteId,
    confirmDelete
  } = props;

  return (
    <>
      {/* ── 平均成本修改確認 ── */}
      {pendingCostChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isSavingCost && setPendingCostChange(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">確定修改平均成本？</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                確定要將「{pendingCostChange.pos.market === 'US' ? '美股' : '台股'}・{pendingCostChange.displayName}」的平均成本修改為
                <span className="mx-1 whitespace-nowrap font-mono font-bold text-slate-800">
                  {pendingCostChange.displayedValue.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {pendingCostChange.currency}
                </span>
                嗎？
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">儲存後會從這次校正時間往後接續計算；已有月底快照的月份仍以快照成本為準。</p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={isSavingCost}
                onClick={() => setPendingCostChange(null)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
              >
                返回修改
              </button>
              <button
                type="button"
                disabled={isSavingCost}
                onClick={() => saveEditedCost(pendingCostChange)}
                className="icon-label flex flex-1 items-center justify-center rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white shadow-sm shadow-rose-200 transition hover:bg-rose-600 disabled:opacity-50"
              >
                {isSavingCost && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                {isSavingCost ? '儲存中' : '確認儲存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 刪除確認 Modal ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 背景遮罩 */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteId(null)} />

          {/* Modal 內容 */}
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">確定要刪除嗎？</h3>
              <p className="mt-2 text-sm text-slate-500">
                此動作將永久刪除這筆交易紀錄，並同步更新您的庫存與 Google 表格數據。
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
              >
                取消
              </button>
              <button
                disabled={isDeleting}
                onClick={confirmDelete}
                className="icon-label flex flex-1 items-center justify-center rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white shadow-sm shadow-rose-200 transition hover:bg-rose-600 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    處理中
                  </>
                ) : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
