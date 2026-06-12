'use client';

import { useEffect, useState } from 'react';

export function TransactionModal({ isOpen, onClose, onSubmit }) {
  const [market, setMarket] = useState('TWSE');
  const [type, setType] = useState('buy');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [stock, setStock] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [isPriceManual, setIsPriceManual] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(-1);
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);
  const [marketHighlightedIndex, setMarketHighlightedIndex] = useState(-1);

  const rawTotal = Number(qty) * Number(price) || 0;
  let fee = 0;
  let finalTotal = rawTotal;

  if (type === 'buy') {
    fee = Math.max(20, Math.floor(rawTotal * 0.001425));
    finalTotal = rawTotal + fee;
  } else if (type === 'sell') {
    fee = Math.max(20, Math.floor(rawTotal * 0.001425)) + Math.floor(rawTotal * 0.003);
    finalTotal = rawTotal - fee;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      type,
      date,
      stock,
      qty: Number(qty),
      price: Number(price),
      note,
      rawTotal,
      actualAmount: finalTotal,
      market,
      symbol: selectedSymbol,
    });
    setStock('');
    setQty('');
    setPrice('');
    setNote('');
    setSelectedSymbol('');
    setIsPriceManual(false);
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightedSuggestionIndex(-1);
  };

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

  useEffect(() => {
    if (!isOpen) return;

    const keyword = stock.trim();
    if (!keyword) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(keyword)}&market=${market}&limit=8`, {
          signal: controller.signal,
        });
        const json = await res.json();
        const items = Array.isArray(json.items) ? json.items : [];
        setSuggestions(items);
        setHighlightedSuggestionIndex(items.length > 0 ? 0 : -1);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setSuggestions([]);
          setHighlightedSuggestionIndex(-1);
        }
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [stock, isOpen, market]);

  const handleSelectSuggestion = async (item) => {
    const nextStockText = item.display;
    const isDifferentStock = !!selectedSymbol && selectedSymbol !== item.symbol;
    const shouldKeepManualPrice = isPriceManual && !isDifferentStock;

    setStock(nextStockText);
    setSelectedSymbol(item.symbol);
    setShowSuggestions(false);
    setHighlightedSuggestionIndex(-1);

    if (shouldKeepManualPrice) {
      return;
    }

    let nextPrice = null;
    try {
      const quoteRes = await fetch(
        `/api/stocks/quote?symbol=${encodeURIComponent(item.symbol)}&market=${market}`
      );
      const quoteJson = await quoteRes.json();
      if (quoteJson && quoteJson.price !== null && quoteJson.price !== undefined) {
        nextPrice = quoteJson.price;
      }
    } catch (error) {
      // Ignore network failure and fallback to search payload price.
    }

    if ((nextPrice === null || nextPrice === undefined) && item.closePrice !== null && item.closePrice !== undefined) {
      nextPrice = item.closePrice;
    }

    if (nextPrice !== null && nextPrice !== undefined) {
      setPrice(String(nextPrice));
      setIsPriceManual(false);
    }
  };

  const handleStockInputKeyDown = (event) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedSuggestionIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedSuggestionIndex((prev) => {
        if (prev <= 0) return suggestions.length - 1;
        return prev - 1;
      });
      return;
    }

    if (event.key === 'Enter' && highlightedSuggestionIndex >= 0) {
      event.preventDefault();
      handleSelectSuggestion(suggestions[highlightedSuggestionIndex]);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setShowSuggestions(false);
      setHighlightedSuggestionIndex(-1);
    }
  };

  const handleMarketDropdownKeyDown = (event) => {
    const markets = ['TWSE', 'US'];

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setMarketHighlightedIndex((prev) => (prev + 1) % markets.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setMarketHighlightedIndex((prev) => {
        if (prev <= 0) return markets.length - 1;
        return prev - 1;
      });
      return;
    }

    if (event.key === 'Enter' && marketHighlightedIndex >= 0) {
      event.preventDefault();
      const nextMarket = markets[marketHighlightedIndex];
      setMarket(nextMarket);
      setStock('');
      setSelectedSymbol('');
      setSuggestions([]);
      setShowSuggestions(false);
      setHighlightedSuggestionIndex(-1);
      setShowMarketDropdown(false);
      setMarketHighlightedIndex(-1);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setShowMarketDropdown(false);
      setMarketHighlightedIndex(-1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs z-50">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-rose-100 px-6 py-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            ➕ 記錄股票交易
          </h3>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-500">選擇交易類型</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('buy')}
                className={`rounded-xl border-2 py-3 px-4 text-center text-sm font-bold flex items-center justify-center gap-2 transition ${
                  type === 'buy'
                    ? 'border-rose-500 bg-rose-50/50 text-rose-700 shadow-sm shadow-rose-100'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-600"></span>
                買進 (Buy)
              </button>
              <button
                type="button"
                onClick={() => setType('sell')}
                className={`rounded-xl border-2 py-3 px-4 text-center text-sm font-bold flex items-center justify-center gap-2 transition ${
                  type === 'sell'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 shadow-sm shadow-emerald-100'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-600"></span>
                賣出 (Sell)
              </button>
            </div>
          </div>

           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="mb-1 block text-xs font-semibold text-slate-500">市場</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMarketDropdown(!showMarketDropdown);
                      if (!showMarketDropdown) setMarketHighlightedIndex(market === 'TWSE' ? 0 : 1);
                    }}
                    onKeyDown={handleMarketDropdownKeyDown}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 transition focus:border-rose-300 focus:bg-white focus:outline-none flex items-center justify-between hover:bg-white"
                  >
                    <span>{market === 'TWSE' ? '📈 台股' : '🇺🇸 美股'}</span>
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className={`h-4 w-4 text-slate-400 transition-transform ${showMarketDropdown ? 'rotate-180' : ''}`}
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.116l3.71-3.886a.75.75 0 111.08 1.04l-4.25 4.454a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  {showMarketDropdown && (
                    <div className="absolute z-30 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                      <button
                        type="button"
                        onMouseEnter={() => setMarketHighlightedIndex(0)}
                        onClick={() => {
                          const nextMarket = 'TWSE';
                          setMarket(nextMarket);
                          setStock('');
                          setSelectedSymbol('');
                          setSuggestions([]);
                          setShowSuggestions(false);
                          setHighlightedSuggestionIndex(-1);
                          setShowMarketDropdown(false);
                          setMarketHighlightedIndex(-1);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm font-semibold transition flex items-center gap-2 ${
                          marketHighlightedIndex === 0
                            ? 'bg-rose-50 text-rose-700'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        📈 台股
                      </button>
                      <button
                        type="button"
                        onMouseEnter={() => setMarketHighlightedIndex(1)}
                        onClick={() => {
                          const nextMarket = 'US';
                          setMarket(nextMarket);
                          setStock('');
                          setSelectedSymbol('');
                          setSuggestions([]);
                          setShowSuggestions(false);
                          setHighlightedSuggestionIndex(-1);
                          setShowMarketDropdown(false);
                          setMarketHighlightedIndex(-1);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm font-semibold transition flex items-center gap-2 border-t border-slate-100 ${
                          marketHighlightedIndex === 1
                            ? 'bg-rose-50 text-rose-700'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        🇺🇸 美股
                      </button>
                    </div>
                  )}
                </div>
             </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">交易日期</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition focus:border-rose-300 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="relative">
            <label className="mb-1 block text-xs font-semibold text-slate-500">股票名稱或代碼</label>
            <input
              type="text"
              value={stock}
              onChange={(e) => {
                setStock(e.target.value);
                setSelectedSymbol('');
                setShowSuggestions(true);
                setHighlightedSuggestionIndex(0);
              }}
              onKeyDown={handleStockInputKeyDown}
              onFocus={() => {
                setShowSuggestions(true);
                if (suggestions.length > 0) setHighlightedSuggestionIndex(0);
              }}
              onBlur={() => {
                // Delay closing so click events on suggestion items can fire first.
                setTimeout(() => setShowSuggestions(false), 120);
              }}
              placeholder={market === 'TWSE' ? '2330 台積電' : 'AAPL Apple'}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition focus:border-rose-300 focus:bg-white focus:outline-none"
              required
            />
            {showSuggestions && (stock.trim() || isSearching) && (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {isSearching && (
                  <div className="px-3 py-2 text-xs text-slate-400">搜尋中...</div>
                )}
                {!isSearching && suggestions.length === 0 && (
                  <div className="px-3 py-2 text-xs text-slate-400">找不到符合的股票</div>
                )}
                {!isSearching &&
                  suggestions.map((item, index) => (
                    <button
                      key={`${item.market}_${item.symbol}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setHighlightedSuggestionIndex(index)}
                      onClick={() => handleSelectSuggestion(item)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition ${
                        highlightedSuggestionIndex === index ? 'bg-rose-50' : 'hover:bg-rose-50'
                      }`}
                    >
                      <span className="font-semibold text-slate-700">{item.symbol} {item.name}</span>
                      <span className="text-slate-400">
                        {item.market}
                        {item.closePrice !== null && item.closePrice !== undefined
                          ? ` · ${item.closePrice}`
                          : ''}
                      </span>
                    </button>
                  ))}
              </div>
            )}
            <p className="mt-1 text-[11px] text-slate-400">
              {market === 'TWSE'
                ? '台股可輸入代碼或名稱（含興櫃），例如「2330」、「台積電」或「宏偉 4565」。'
                : '美股可輸入代碼或名稱，例如「AAPL」或「Apple」。'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">交易股數</label>
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition focus:border-rose-300 focus:bg-white focus:outline-none"
                min="1"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">每股單價</label>
              <input
                type="number"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setIsPriceManual(true);
                }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition focus:border-rose-300 focus:bg-white focus:outline-none"
                step="0.01"
                min="0.01"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">成交原始總額：</span>
              <span className="font-mono font-medium text-slate-800">${rawTotal.toLocaleString()}</span>
            </div>
            {type !== 'dividend' && (
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">手續費估算：</span>
                <span className="font-mono text-slate-600">${fee.toLocaleString()}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 mt-1 flex justify-between font-bold">
              <span className="text-slate-700">{type === 'buy' ? '實際支出：' : '實際收入：'}</span>
              <span className="font-mono text-sm text-rose-600">${finalTotal.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">備註原因</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：定期定額、看好財報..."
              rows="2"
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition focus:border-rose-300 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 rounded-lg bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
            >
              取消
            </button>
            <button
              type="submit"
              className="w-1/2 rounded-lg bg-rose-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-100 transition hover:bg-rose-600"
            >
              確定存檔
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ConfigModal({ isOpen, onClose, onConnect }) {
  const [apiUrl, setApiUrl] = useState('');

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

  const handleConnect = () => {
    if (apiUrl.trim()) {
      onConnect(apiUrl);
      setApiUrl('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs z-50">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-rose-100 px-6 py-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            ☁️ 設置 Google 試算表同步後端
          </h3>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-6 max-h-[80vh]">
          <div className="space-y-2 rounded-xl border border-rose-100 bg-rose-50/50 p-4 text-xs leading-relaxed text-slate-700">
            <p className="text-sm font-bold text-rose-950">💡 升級版 Google Apps Script 二分鐘極速架設法：</p>
            <ol className="list-inside list-decimal space-y-1.5 text-slate-600">
              <li>打開您的 Google 試算表。</li>
              <li>點選上方選單的 「擴充功能」 -&gt; 「Apps Script」。</li>
              <li>清除所有舊代碼，貼入後端代碼。</li>
              <li>點擊 「儲存」，再點右上角 「部署」 -&gt; 「新增部署版本」。</li>
              <li>複製產生的「網頁應用程式 URL」貼在下方！</li>
            </ol>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">網頁應用程式 URL (Web App URL)</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 transition focus:border-rose-300 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 rounded-lg bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
            >
              關閉
            </button>
            <button
              type="button"
              onClick={handleConnect}
              className="w-1/2 flex items-center justify-center gap-1.5 rounded-lg bg-rose-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-100 transition hover:bg-rose-600"
            >
              💾 直接儲存連線
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Toast({ message, isVisible }) {
  return (
    <div
      className={`fixed bottom-5 right-5 flex items-center gap-3 rounded-xl border border-rose-100 bg-white px-4 py-3 shadow-xl transition-all duration-300 z-50 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
      }`}
    >
      <div className="rounded-lg bg-rose-50 p-1.5 text-rose-600">
        ✓
      </div>
      <div className="text-xs font-semibold text-slate-800">{message}</div>
    </div>
  );
}

