'use client';

import { useEffect, useState } from 'react';

const CATEGORIES = ['台幣活存', '外幣活存', '員工持股信託', '負債項目'];

export function ManageAccountsModal({ isOpen, onClose, assets, onSave, onAddNew, onRemove, onUpdate }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [suggestionsByIndex, setSuggestionsByIndex] = useState({});
  const [isSearchingByIndex, setIsSearchingByIndex] = useState({});
  const [highlightedByIndex, setHighlightedByIndex] = useState({});
  const [openCategoryIndex, setOpenCategoryIndex] = useState(null);
  const [highlightedCategoryByIndex, setHighlightedCategoryByIndex] = useState({});
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const pickSuggestion = (index, item) => {
    onUpdate(index, { ...assets[index], name: item });
    setActiveIndex(null);
    setHighlightedByIndex((prev) => ({ ...prev, [index]: -1 }));
  };

  const handleCategoryKeyDown = (event, index) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpenCategoryIndex(index);
      setHighlightedCategoryByIndex((prev) => ({
        ...prev,
        [index]: ((prev[index] ?? -1) + 1) % CATEGORIES.length,
      }));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpenCategoryIndex(index);
      setHighlightedCategoryByIndex((prev) => {
        const cur = prev[index] ?? 0;
        return { ...prev, [index]: cur <= 0 ? CATEGORIES.length - 1 : cur - 1 };
      });
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (openCategoryIndex === index) {
        const hi = highlightedCategoryByIndex[index] ?? -1;
        if (hi >= 0) {
          const cat = CATEGORIES[hi];
          onUpdate(index, { ...assets[index], category: cat, isLiability: cat === '負債項目' });
        }
        setOpenCategoryIndex(null);
      } else {
        setOpenCategoryIndex(index);
        setHighlightedCategoryByIndex((prev) => ({
          ...prev,
          [index]: CATEGORIES.indexOf(assets[index].category),
        }));
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpenCategoryIndex(null);
    }
  };

  const pickCategory = (index, cat) => {
    onUpdate(index, { ...assets[index], category: cat, isLiability: cat === '負債項目' });
    setOpenCategoryIndex(null);
    setHighlightedCategoryByIndex((prev) => ({ ...prev, [index]: -1 }));
  };

  const handleNameKeyDown = (event, index) => {
    const list = suggestionsByIndex[index] || [];
    if (list.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(index);
      setHighlightedByIndex((prev) => ({
        ...prev,
        [index]: ((prev[index] ?? -1) + 1) % list.length,
      }));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(index);
      setHighlightedByIndex((prev) => {
        const current = prev[index] ?? -1;
        return {
          ...prev,
          [index]: current <= 0 ? list.length - 1 : current - 1,
        };
      });
      return;
    }

    if (event.key === 'Enter' && activeIndex === index) {
      const highlighted = highlightedByIndex[index] ?? -1;
      if (highlighted >= 0 && highlighted < list.length) {
        event.preventDefault();
        pickSuggestion(index, list[highlighted]);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setActiveIndex(null);
      setHighlightedByIndex((prev) => ({ ...prev, [index]: -1 }));
    }
  };

  useEffect(() => {
    if (!isOpen || activeIndex === null) return;
    const keyword = (assets[activeIndex]?.name || '').trim();
    if (!keyword) {
      setSuggestionsByIndex((prev) => ({ ...prev, [activeIndex]: [] }));
      setIsSearchingByIndex((prev) => ({ ...prev, [activeIndex]: false }));
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setIsSearchingByIndex((prev) => ({ ...prev, [activeIndex]: true }));
        const res = await fetch(`/api/banks/search?q=${encodeURIComponent(keyword)}&limit=8`, {
          signal: controller.signal,
        });
        const json = await res.json();
        const items = Array.isArray(json.items) ? json.items : [];
        setSuggestionsByIndex((prev) => ({ ...prev, [activeIndex]: items }));
        setHighlightedByIndex((prev) => ({ ...prev, [activeIndex]: items.length > 0 ? 0 : -1 }));
      } catch (error) {
        if (error.name !== 'AbortError') {
          setSuggestionsByIndex((prev) => ({ ...prev, [activeIndex]: [] }));
          setHighlightedByIndex((prev) => ({ ...prev, [activeIndex]: -1 }));
        }
      } finally {
        setIsSearchingByIndex((prev) => ({ ...prev, [activeIndex]: false }));
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, activeIndex, assets]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs z-50">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-rose-100 px-6 py-4 shrink-0">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            ✎ 管理活存與負債餘額
          </h3>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <p className="text-xs text-slate-400">
            手動輸入或更新各大銀行、信託、借貸 or 信用卡的名稱與目前金額。更新後點選「全部儲存」將即時同步至 Google Sheets。
          </p>

          <div className="space-y-3">
            {assets.map((item, index) => (
              <div key={item.id} className="rounded-xl border border-slate-200/60 bg-slate-50 p-3.5">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-3">
                    {/* 第一行：名稱 */}
                    <div>
                      <label className="mb-0.5 block text-[10px] font-bold uppercase text-slate-400">名稱</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            onUpdate(index, { ...item, name: e.target.value });
                            setActiveIndex(index);
                            setHighlightedByIndex((prev) => ({ ...prev, [index]: 0 }));
                          }}
                          onKeyDown={(e) => handleNameKeyDown(e, index)}
                          onFocus={() => {
                            setActiveIndex(index);
                            if ((suggestionsByIndex[index] || []).length > 0) {
                              setHighlightedByIndex((prev) => ({ ...prev, [index]: 0 }));
                            }
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              setActiveIndex((prev) => (prev === index ? null : prev));
                              setHighlightedByIndex((prev) => ({ ...prev, [index]: -1 }));
                            }, 120);
                          }}
                          placeholder="例如：台新、國泰、玉山"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 transition focus:border-rose-300 focus:outline-none"
                        />
                        {activeIndex === index && ((suggestionsByIndex[index] || []).length > 0 || isSearchingByIndex[index]) && (
                          <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                            {isSearchingByIndex[index] && (
                              <div className="px-2 py-1.5 text-[11px] text-slate-400">搜尋中...</div>
                            )}
                            {!isSearchingByIndex[index] &&
                              (suggestionsByIndex[index] || []).map((name, suggestionIndex) => (
                                <button
                                  key={name}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onMouseEnter={() => setHighlightedByIndex((prev) => ({ ...prev, [index]: suggestionIndex }))}
                                  onClick={() => pickSuggestion(index, name)}
                                  className={`block w-full px-2 py-1.5 text-left text-[11px] text-slate-700 transition ${
                                    (highlightedByIndex[index] ?? -1) === suggestionIndex
                                      ? 'bg-rose-50'
                                      : 'hover:bg-rose-50'
                                  }`}
                                >
                                  {name}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 第二行：分類 + 金額 */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* 分類自訂下拉 */}
                      <div>
                        <label className="mb-0.5 block text-[10px] font-bold uppercase text-slate-400">分類</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              if (openCategoryIndex === index) {
                                setOpenCategoryIndex(null);
                              } else {
                                setOpenCategoryIndex(index);
                                setHighlightedCategoryByIndex((prev) => ({
                                  ...prev,
                                  [index]: CATEGORIES.indexOf(item.category),
                                }));
                              }
                            }}
                            onKeyDown={(e) => handleCategoryKeyDown(e, index)}
                            onBlur={() => setTimeout(() => setOpenCategoryIndex((prev) => (prev === index ? null : prev)), 120)}
                            className="w-full flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 focus:border-rose-300 focus:outline-none"
                          >
                            <span>{item.category}</span>
                            <svg viewBox="0 0 20 20" fill="currentColor"
                              className={`h-3.5 w-3.5 text-slate-400 transition-transform ${openCategoryIndex === index ? 'rotate-180' : ''}`}>
                              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.116l3.71-3.886a.75.75 0 111.08 1.04l-4.25 4.454a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                            </svg>
                          </button>
                          {openCategoryIndex === index && (
                            <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                              {CATEGORIES.map((cat, ci) => (
                                <button
                                  key={cat}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onMouseEnter={() => setHighlightedCategoryByIndex((prev) => ({ ...prev, [index]: ci }))}
                                  onClick={() => pickCategory(index, cat)}
                                  className={`w-full px-3 py-2 text-left text-xs font-semibold transition flex items-center gap-2 ${ci > 0 ? 'border-t border-slate-100' : ''} ${
                                    (highlightedCategoryByIndex[index] ?? -1) === ci
                                      ? 'bg-rose-50 text-rose-700'
                                      : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 金額 */}
                      <div>
                        <label className="mb-0.5 block text-[10px] font-bold uppercase text-slate-400">金額 (TWD)</label>
                        <input
                          type="number"
                          value={item.balance}
                          onChange={(e) => onUpdate(index, { ...item, balance: Number(e.target.value) || 0 })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-right font-mono text-xs text-slate-800 transition focus:border-rose-300 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 刪除按鈕 - 垂直置中 */}
                  <button
                    onClick={() => setItemToDelete(index)}
                    className="self-center rounded-lg p-1.5 text-slate-400 transition hover:text-rose-500"
                    title="移除本項"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193v-.443A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onAddNew}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-rose-200 bg-rose-50/50 py-2.5 text-xs font-bold text-rose-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500"
          >
            ＋ 新增帳戶 / 負債項目
          </button>
        </div>

        <div className="border-t border-rose-50 bg-slate-50 px-6 py-4 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            關閉
          </button>
          <button
            type="button"
            onClick={onSave}
            className="w-1/2 rounded-lg bg-rose-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-100 transition hover:bg-rose-600"
          >
            全部儲存同步 🐷
          </button>
        </div>
      </div>

      {/* 刪除確認對話框 */}
      <CustomDialog
        isOpen={itemToDelete !== null}
        onClose={() => !isDeleting && setItemToDelete(null)}
        title="確定要移除嗎？"
        message={`確定要移除「${assets[itemToDelete]?.name || '此項目'}」嗎？\n這將從列表中移除該項，需點擊「全部儲存」才會正式生效。`}
        iconType="warning"
        isConfirmLoading={isDeleting}
        buttons={[
          { label: '取消', onClick: () => setItemToDelete(null) },
          {
            label: '確認移除',
            isPrimary: true,
            onClick: async () => {
              setIsDeleting(true);
              // 模擬一點點延遲讓使用者感覺到有在處理同步
              await new Promise(resolve => setTimeout(resolve, 500));
              onRemove(itemToDelete);
              setItemToDelete(null);
              setIsDeleting(false);
            },
          },
        ]}
      />
    </div>
  );
}

export function CustomDialog({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  buttons = [], 
  iconType = 'info', 
  isConfirmLoading = false, 
  confirmLoadingText = '處理中' 
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
        onClick={() => !isConfirmLoading && onClose()} 
      />

      {/* Modal 內容 */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex flex-col items-center text-center">
          {iconType === 'warning' ? (
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
          ) : (
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-500 text-xl">
              ℹ️
            </div>
          )}
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-500" style={{ wordBreak: 'break-all' }}>
            {message}
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          {buttons.map((btn, idx) => (
            <button
              key={idx}
              disabled={isConfirmLoading}
              onClick={() => !isConfirmLoading && btn.onClick()}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition flex items-center justify-center gap-2 ${
                btn.isPrimary
                  ? 'bg-rose-500 text-white shadow-sm shadow-rose-200 hover:bg-rose-600 disabled:opacity-50'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50'
              } ${isConfirmLoading && btn.isPrimary ? 'cursor-not-allowed' : ''}`}
            >
              {btn.isPrimary && isConfirmLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {confirmLoadingText}
                </>
              ) : btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
