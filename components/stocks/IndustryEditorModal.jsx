'use client';

import { getIndustryColor } from '@/components/stocks/stock-ui';

export function IndustryEditorModal(props) {
  const {
    showIndustryEditor,
    isSavingIndustryCategories,
    setShowIndustryEditor,
    isSheetsConnected,
    industryDrafts,
    parseIndustrySymbols,
    expandedIndustryDraftId,
    setExpandedIndustryDraftId,
    updateIndustryDraft,
    setIndustryDrafts,
    setIndustryEditorError,
    createDefaultIndustryCategories,
    activePositions,
    industryEditorError,
    saveIndustryCategories
  } = props;

  return (
    <>
      {showIndustryEditor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="industry-editor-heading" className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] border border-slate-200 bg-white shadow-2xl sm:max-h-[86vh] sm:rounded-2xl">
            <div className="flex justify-center py-2 sm:hidden" aria-hidden="true">
              <span className="h-1 w-10 rounded-full bg-slate-200" />
            </div>
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-4 pb-4 pt-1 sm:px-5 sm:py-4">
              <div className="icon-label flex min-w-0 items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500" aria-hidden="true">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5h12M6.5 10h7M8.5 14.5h3" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h3 id="industry-editor-heading" className="text-base font-black text-slate-900">產業分類設定</h3>
                  <p className="mt-0.5 truncate text-[11px] text-slate-400">保存後同步至 Google Sheets</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSavingIndustryCategories && setShowIndustryEditor(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                aria-label="關閉產業分類管理"
              >
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-4 py-4 sm:px-5">
              {!isSheetsConnected && (
                <p role="alert" className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] font-bold leading-5 text-amber-700">
                  尚未連接 Google Sheets，請先完成連線再保存。
                </p>
              )}

              <div className="mb-3 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-3.5 py-3 shadow-sm shadow-slate-100">
                <div>
                  <p className="text-xs font-black text-slate-700">你的分類</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">點選類別即可展開編輯</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                  <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-600">{industryDrafts.length} 類</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">{industryDrafts.reduce((total, draft) => total + parseIndustrySymbols(draft.symbolsText).length, 0)} 檔</span>
                </div>
              </div>

              {industryDrafts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
                  <p className="text-sm font-bold text-slate-500">還沒有分類</p>
                  <p className="mt-1 text-[11px] text-slate-400">新增一個類別開始整理持股</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {industryDrafts.map((draft, index) => {
                    const isExpanded = expandedIndustryDraftId === draft.id;
                    const symbolCount = parseIndustrySymbols(draft.symbolsText).length;
                    return (
                      <div key={draft.id} className={`overflow-hidden rounded-2xl border bg-white transition ${isExpanded ? 'border-rose-200 shadow-md shadow-rose-100/50' : 'border-slate-200/80 shadow-sm shadow-slate-100'}`}>
                        <button
                          type="button"
                          onClick={() => setExpandedIndustryDraftId(isExpanded ? null : draft.id)}
                          className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
                          aria-expanded={isExpanded}
                        >
                          <span className="h-3 w-3 shrink-0 rounded-full ring-4 ring-slate-50" style={{ backgroundColor: getIndustryColor(draft.name || '其他') }} />
                          <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-700">{draft.name || '未命名類別'}</span>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{symbolCount} 檔</span>
                          <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 shrink-0 text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                          </svg>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50/60 px-3.5 pb-3.5 pt-3">
                            <div className="grid gap-3 sm:grid-cols-[minmax(150px,0.35fr)_minmax(260px,1fr)]">
                              <label className="block">
                                <span className="mb-1.5 block text-[10px] font-bold text-slate-500">類別名稱</span>
                                <input
                                  value={draft.name}
                                  onChange={(event) => updateIndustryDraft(index, { name: event.target.value })}
                                  placeholder="例如：半導體"
                                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1.5 block text-[10px] font-bold text-slate-500">股票代號</span>
                                <textarea
                                  value={draft.symbolsText}
                                  onChange={(event) => updateIndustryDraft(index, { symbolsText: event.target.value })}
                                  placeholder="2330, 2454, NVDA"
                                  rows={2}
                                  className="min-h-11 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm text-slate-700 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                                />
                                <span className="mt-1 block text-[9px] text-slate-400">使用逗號、空格或換行分隔代號</span>
                              </label>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setIndustryDrafts((drafts) => drafts.filter((_, draftIndex) => draftIndex !== index));
                                setExpandedIndustryDraftId(null);
                                setIndustryEditorError('');
                              }}
                              className="icon-label mt-3 inline-flex items-center rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                              aria-label={`刪除${draft.name || '此'}類別`}
                            >
                              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-3.5 w-3.5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6h11M8 6V4.5h4V6m-6 0 .7 9h6.6l.7-9" /></svg>
                              刪除此類別
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const id = `industry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
                    setIndustryDrafts((drafts) => [...drafts, { id, name: '', symbolsText: '' }]);
                    setExpandedIndustryDraftId(id);
                    setIndustryEditorError('');
                  }}
                  className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-black text-rose-600 transition hover:bg-rose-100"
                >
                  ＋ 新增類別
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIndustryDrafts(createDefaultIndustryCategories().map((category, index) => ({
                      id: `industry_default_${Date.now()}_${index}`,
                      name: category.name,
                      symbolsText: category.symbols.join(', '),
                    })));
                    setExpandedIndustryDraftId(null);
                    setIndustryEditorError('');
                  }}
                  className="rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                  恢復預設
                </button>
              </div>

              {activePositions.length > 0 && (
                <details className="mt-4 rounded-2xl border border-slate-200/80 bg-white px-3.5 py-3">
                  <summary className="cursor-pointer list-none text-[11px] font-bold text-slate-500">查看目前持股代號（{activePositions.length}）</summary>
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                    {activePositions.map((position) => (
                      <span key={`${position.market}-${position.symbol}`} className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[10px] font-bold text-slate-600">{position.symbol}</span>
                    ))}
                  </div>
                </details>
              )}

              {industryEditorError && (
                <p role="alert" className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-600">{industryEditorError}</p>
              )}
            </div>

            <div className="grid shrink-0 grid-cols-[0.7fr_1.3fr] gap-2 border-t border-slate-100 bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:flex sm:justify-end sm:px-5 sm:pb-3">
              <button
                type="button"
                disabled={isSavingIndustryCategories}
                onClick={() => setShowIndustryEditor(false)}
                className="h-11 rounded-xl bg-slate-100 px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50 sm:h-9"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!isSheetsConnected || isSavingIndustryCategories}
                onClick={saveIndustryCategories}
                className="icon-label inline-flex h-11 items-center justify-center rounded-xl bg-rose-500 px-4 text-xs font-black text-white shadow-md shadow-rose-200 transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9"
              >
                {isSavingIndustryCategories && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                {isSavingIndustryCategories ? '保存中' : '保存分類'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
