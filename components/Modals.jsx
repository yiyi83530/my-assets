'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/lib/app-context';
import { getAutomaticTransactionTaxRate, TWSE_COMMISSION_RATE } from '@/lib/trading-fees';

function inferSymbolFromStockText(stockText, market) {
  const firstToken = String(stockText || '').trim().split(/\s+/)[0] || '';
  if (!firstToken) return '';
  if (market === 'US') return /^[A-Za-z][A-Za-z0-9.-]*$/.test(firstToken) ? firstToken.toUpperCase() : '';
  return /^0?\d{4,6}[A-Z]?$/.test(firstToken) ? firstToken.toUpperCase() : '';
}

export function TransactionModal({ isOpen, onClose, onSubmit, initialData, isSaving }) {
  const { stockFeeSettings, openSettingsModal } = useApp();
  const [market, setMarket] = useState('TWSE');
  const [type, setType] = useState('buy');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [stock, setStock] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [manualFee, setManualFee] = useState('');
  const [isFeeManual, setIsFeeManual] = useState(false);
  const [isPriceManual, setIsPriceManual] = useState(false);
  const [note, setNote] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(-1);
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);
  const [marketHighlightedIndex, setMarketHighlightedIndex] = useState(-1);

  const stockInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Get current market's fee settings
  const currentMarketFeeSettings = stockFeeSettings[market] || stockFeeSettings.TWSE;
  const currencySymbol = currentMarketFeeSettings.currency === 'TWD' ? '$' : 'US$';

  // Use useEffect to populate form fields when initialData changes or for new transactions
  useEffect(() => {
    if (!isOpen) return;

    // 每次開啟都清除上一次搜尋與下拉狀態，避免新增下一筆時殘留舊內容。
    setSuggestions([]);
    setIsSearching(false);
    setShowSuggestions(false);
    setHighlightedSuggestionIndex(-1);
    setShowMarketDropdown(false);
    setMarketHighlightedIndex(-1);

    if (initialData) {
      setMarket(initialData.market || 'TWSE');
      setType(initialData.type || 'buy');
      setDate(initialData.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setStock(initialData.stock || '');
      setQty(String(initialData.qty || ''));
      setPrice(String(initialData.price || ''));
      setNote(initialData.note || '');
      setSelectedSymbol(initialData.symbol || '');
      setIsPriceManual(true); // Assume manual price when editing existing data
    } else {
      // Reset form fields when no initialData (i.e., adding a new transaction)
      setMarket('TWSE');
      setType('buy');
      setDate(new Date().toISOString().split('T')[0]);
      setStock('');
      setQty('');
      setPrice('');
      setNote('');
      setSelectedSymbol('');
      setIsFeeManual(false);
      setManualFee('');
      setIsPriceManual(false);
    }
  }, [isOpen, initialData]);

  // useEffect for manual fee check based on current market settings
  useEffect(() => {
    if (initialData) {
      const rawTotal = Number(initialData.qty) * Number(initialData.price);
      const isTwseTransaction = (initialData.market || 'TWSE') === 'TWSE';
      const { totalFee: calculatedFee } = calculateFee(
        rawTotal,
        initialData.type,
        isTwseTransaction ? TWSE_COMMISSION_RATE : currentMarketFeeSettings.feeRate,
        isTwseTransaction ? currentMarketFeeSettings.feeDiscount : 1,
        currentMarketFeeSettings.minFee,
        getAutomaticTransactionTaxRate({
          market: initialData.market || 'TWSE',
          symbol: initialData.symbol,
          stock: initialData.stock,
          tradeDate: initialData.date,
        })
      );

      const savedTotal = Number(initialData.actualAmount);
      const expectedTotal = initialData.type === 'buy' ? rawTotal + calculatedFee : rawTotal - calculatedFee;

      if (Math.abs(savedTotal - expectedTotal) > 1) {
        const savedFee = initialData.type === 'buy' ? savedTotal - rawTotal : rawTotal - savedTotal;
        setIsFeeManual(true);
        setManualFee(String(Math.round(savedFee)));
      } else {
        setIsFeeManual(false);
        setManualFee('');
      }
    } else {
      setIsFeeManual(false);
      setManualFee('');
    }
  }, [initialData, currentMarketFeeSettings]);

  const calculateFee = (baseAmount, type, rate, discount, minFee, taxRate) => {
    if (baseAmount <= 0) return { fee: 0, tax: 0, totalFee: 0 };

    const commission = Math.max(minFee, Math.floor(baseAmount * rate * discount));
    const tax = type === 'sell' ? Math.floor(baseAmount * taxRate) : 0;
    const totalFee = commission + tax;

    return { fee: commission, tax, totalFee };
  };

  const rawTotal = Number(qty) * Number(price) || 0;
  const effectiveFeeRate = market === 'TWSE' ? TWSE_COMMISSION_RATE : currentMarketFeeSettings.feeRate;
  const effectiveFeeDiscount = market === 'TWSE' ? currentMarketFeeSettings.feeDiscount : 1;
  const automaticTaxRate = getAutomaticTransactionTaxRate({
    market,
    symbol: selectedSymbol,
    stock,
    tradeDate: date,
  });
  const { fee: autoFee, tax: autoTax } = calculateFee(
    rawTotal,
    type,
    effectiveFeeRate,
    effectiveFeeDiscount,
    currentMarketFeeSettings.minFee,
    automaticTaxRate
  );

  const finalFee = isFeeManual ? Number(manualFee) || 0 : autoFee;
  const finalTax = type === 'sell' ? (isFeeManual ? 0 : autoTax) : 0;
  const finalTotal = type === 'buy' ? rawTotal + finalFee : rawTotal - finalFee - finalTax;

  const handleSubmit = (e) => {
    e.preventDefault();
    const resolvedSymbol = selectedSymbol || inferSymbolFromStockText(stock, market);
    const totalCost = type === 'buy' ? rawTotal + finalFee : rawTotal - finalFee - finalTax;
    onSubmit({
      id: initialData?.id, // Pass the ID if it's an edit
      type,
      date,
      stock,
      qty: Number(qty),
      price: Number(price),
      note,
      rawTotal,
      actualAmount: totalCost, // Use the final calculated total
      market,
      symbol: resolvedSymbol,
      recordedAt: initialData?.recordedAt || new Date().toISOString(), // Keep original recordedAt for edits
    });
    // Form fields are reset by the useEffect when initialData becomes null (onClose)
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

  // Handle clicks outside the suggestions to close them
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        stockInputRef.current &&
        !stockInputRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    if (isOpen && showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, showSuggestions]);

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
      setIsPriceManual(false); // Price is now auto-filled, so it's not manual
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
      if (stockInputRef.current) stockInputRef.current.blur(); // Blur input on escape
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="flex h-[90vh] max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-xl sm:h-[76vh] sm:max-h-[76vh]">
        <div className="flex shrink-0 items-center justify-between border-b border-rose-100 px-5 py-3.5 sm:px-6 sm:py-4">
          <h3 className="icon-label flex items-center text-sm font-bold text-slate-900">
            <span aria-hidden="true">{initialData ? '✍️' : '➕'}</span><span>{initialData ? '編輯股票交易' : '記錄股票交易'}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:space-y-4 sm:px-6">
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-500">選擇交易類型</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('buy')}
                className={`icon-label flex items-center justify-center rounded-xl border-2 px-4 py-3 text-center text-sm font-bold transition ${
                  type === 'buy'
                    ? 'border-rose-500 bg-rose-50/50 text-rose-700 shadow-sm shadow-rose-100'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-600"></span>
                買進
              </button>
              <button
                type="button"
                onClick={() => setType('sell')}
                className={`icon-label flex items-center justify-center rounded-xl border-2 px-4 py-3 text-center text-sm font-bold transition ${
                  type === 'sell'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 shadow-sm shadow-emerald-100'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-600"></span>
                賣出
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-semibold text-slate-500">市場</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowMarketDropdown(!showMarketDropdown);
                    if (!showMarketDropdown) setMarketHighlightedIndex(market === 'TWSE' ? 0 : 1);
                  }}
                  onKeyDown={handleMarketDropdownKeyDown}
                  className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 transition hover:bg-white focus:border-rose-300 focus:bg-white focus:outline-none"
                >
                  <span className="icon-label inline-flex items-center"><span aria-hidden="true">{market === 'TWSE' ? '📈' : '🇺🇸'}</span><span>{market === 'TWSE' ? '台股' : '美股'}</span></span>
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
                      onMouseDown={(e) => e.preventDefault()}
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
                      className={`icon-label flex w-full items-center px-3 py-2 text-left text-sm font-semibold transition ${
                        marketHighlightedIndex === 0
                          ? 'bg-rose-50 text-rose-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span aria-hidden="true">📈</span><span>台股</span>
                    </button>
                    <button
                      type="button"
                      onMouseEnter={() => setMarketHighlightedIndex(1)}
                      onMouseDown={(e) => e.preventDefault()} // Prevent blur on trigger
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
                      className={`icon-label flex w-full items-center border-t border-slate-100 px-3 py-2 text-left text-sm font-semibold transition ${
                        marketHighlightedIndex === 1
                          ? 'bg-rose-50 text-rose-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span aria-hidden="true">🇺🇸</span><span>美股</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-semibold text-slate-500">交易日期</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="trade-date-input block h-10 w-full min-w-0 max-w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs leading-5 text-slate-800 transition focus:border-rose-300 focus:bg-white focus:outline-none sm:px-3 sm:text-sm"
              />
            </div>
          </div>

          <div className="relative">
            <label className="mb-1 block text-xs font-semibold text-slate-500">股票名稱或代碼</label>
            <input
              ref={stockInputRef}
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
              placeholder={market === 'TWSE' ? '例如：2330 台積電' : '例如：AAPL Apple'}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition focus:border-rose-300 focus:bg-white focus:outline-none"
              required
            />
            {showSuggestions && (stock.trim() || isSearching) && (
              <div ref={suggestionsRef} className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
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
                ? '台股可輸入代碼或名稱，例如「2330」、「台積電」。'
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
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">每股成本</label>
              <input
                type="number"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setIsPriceManual(true); // User manually changed price
                }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition focus:border-rose-300 focus:bg-white focus:outline-none"
                step="0.01"
                min="0.01"
                required
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => openSettingsModal('fromTransactionModal')}
              className="icon-label inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                <path strokeLinecap="round" d="M4 6h12M4 14h12" />
                <circle cx="8" cy="6" r="2" fill="white" />
                <circle cx="12" cy="14" r="2" fill="white" />
              </svg>
              手續費設定
            </button>
          </div>

          {/* New Fee Section */}
          <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5 sm:p-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">成交金額：</span>
                <span className="font-mono font-medium text-slate-800">{currencySymbol}{rawTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">{isFeeManual ? '總費用：' : '手續費：'}</span>
                <span className="font-mono text-slate-600">{currencySymbol}{finalFee.toLocaleString()}</span>
              </div>
              {type === 'sell' && !isFeeManual && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">交易稅 ({(automaticTaxRate * 100).toFixed(2)}%)：</span>
                  <span className="font-mono text-slate-600">{currencySymbol}{finalTax.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-3">
              <label className="icon-label flex items-center text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={isFeeManual}
                  onChange={(e) => setIsFeeManual(e.target.checked)}
                  className="h-4 w-4 rounded text-rose-500 focus:ring-rose-500/50 border-slate-300"
                />
                手動填寫總費用（含手續費與交易稅）
              </label>
              {isFeeManual && (
                <div className="mt-2">
                  <input
                    type="number"
                    value={manualFee}
                    onChange={(e) => setManualFee(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition focus:border-rose-300 focus:bg-white focus:outline-none"
                    placeholder={`請輸入此筆交易的總費用 (${currentMarketFeeSettings.currency})`}
                    inputMode="numeric"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">手動模式不會再另外加計交易稅，適合當沖或券商特殊費率。</p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-3 mt-3 flex justify-between font-bold">
              <span className="text-slate-700">{type === 'buy' ? '實際支出：' : '實際收入：'}</span>
              <span className={`font-mono text-sm ${type === 'buy' ? 'text-rose-600' : 'text-emerald-600'}`}>{currencySymbol}{finalTotal.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">其他備註</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：定期定額、看好財報..."
              rows="2"
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition focus:border-rose-300 focus:bg-white focus:outline-none"
            />
          </div>

          </div>

          <div className="flex shrink-0 gap-3 border-t border-slate-100 bg-white px-5 py-3.5 shadow-[0_-8px_18px_rgba(15,23,42,0.04)] sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 rounded-lg bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="icon-label flex w-1/2 items-center justify-center rounded-lg bg-rose-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-100 transition hover:bg-rose-600 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  儲存中
                </>
              ) : '存檔'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ConfigModal({ isOpen, onClose, onConnect, onDisconnect, initialApiUrl = '', isConnected }) {
  const [apiUrl, setApiUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState('success');
  const [isLoading, setIsLoading] = useState(false);
  const [isSetupStepsExpanded, setIsSetupStepsExpanded] = useState(false);

  // 這個靜態檔會在 build 前由 docs/google-apps-script.gs 自動產生。
  const [scriptCode, setScriptCode] = useState('');
  const [isScriptLoading, setIsScriptLoading] = useState(false);
  const [scriptLoadFailed, setScriptLoadFailed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setApiUrl(initialApiUrl || '');
      setCopied(false);
      setToastMessage('');
      setShowToast(false);
      setToastType('success');
      setIsLoading(false);
      setIsSetupStepsExpanded(false);

      // 加上版本參數，避免瀏覽器或 GitHub Pages 留住舊版檔案。
      setIsScriptLoading(true);
      setScriptLoadFailed(false);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      fetch(`${basePath}/google-apps-script.gs?v=${Date.now()}`, { cache: 'no-store' })
        .then((res) => {
          if (!res.ok) throw new Error(`載入失敗 (${res.status})`);
          return res.text();
        })
        .then((code) => {
          setScriptCode(code);
          setScriptLoadFailed(false);
        })
        .catch(() => {
          setScriptCode('');
          setScriptLoadFailed(true);
        })
        .finally(() => {
          setIsScriptLoading(false);
        });
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, initialApiUrl]);

  const handleCopy = () => {
    if (!scriptCode) return;
    navigator.clipboard.writeText(scriptCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const handleConnect = async () => {
    if (!apiUrl.trim()) {
      setToastMessage('記得輸入網頁應用程式 URL！');
      setToastType('warning');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    setIsLoading(true);
    try {
      await onConnect(apiUrl);
      // Success toast is now handled by the parent component (layout-client.jsx)
    } catch (error) {
      setToastMessage(`連線失敗：${error.message || '請檢查 URL 或網路！'}`);
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      // Add a small delay to make the loading state visible
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  };

  const handleDisconnectClick = async () => {
    setIsLoading(true);
    try {
      await onDisconnect();
    } catch (error) {
      setToastMessage(`斷開連線失敗：${error.message || '請稍後再試！'}`);
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  };

  const buttonText = isConnected
    ? (isLoading ? '斷開中...' : '結束連線')
    : (isLoading ? '連線中...' : '開始連線');
  const buttonClasses = isConnected
    ? 'bg-amber-100 text-amber-700 shadow-md shadow-amber-100 hover:bg-amber-200'
    : 'bg-rose-500 text-white shadow-md shadow-rose-100 hover:bg-rose-600';
  const buttonAction = isConnected ? handleDisconnectClick : handleConnect;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs z-50">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-rose-100 px-6 py-4">
          <h3 className="icon-label flex items-center text-sm font-bold text-slate-900">
            <span aria-hidden="true">☁️</span><span>設置 Google 試算表同步資料</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-6 max-h-[calc(80vh-120px)]">
          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 text-xs leading-relaxed text-slate-700">
            <p className="icon-label flex items-center text-sm font-bold text-rose-950"><span aria-hidden="true">💡</span><span>Google Sheet Apps Script 三分鐘極速架設法：</span></p>
            <div className={`relative mt-2 overflow-hidden transition-all duration-300 ${isSetupStepsExpanded ? 'max-h-[420px]' : 'max-h-[118px]'}`}>
              <ol className="list-inside list-decimal space-y-1.5 text-slate-600">
                <li>登入 Google 試算表，點選上方選單「擴充功能」-&gt;「Apps Script」。</li>
                <li>清除編輯器裡的預設程式碼，貼入下方完整後端 script 代碼。</li>
                <li>點擊「儲存」，或按「command + s」，並幫專案命名。</li>
                <li>點擊右上角「部署」-&gt;「新增部署作業」。</li>
                <li>在「選取類型」旁點齒輪圖示，選擇「網頁應用程式」。</li>
                <li>「說明」可填寫任意名稱，例如「My Assets Web App」。</li>
                <li>「執行身分」選「我」。</li>
                <li>「誰可以存取」選「所有人」。若帳號是公司或學校帳號且沒有此選項，請改用個人 Google 帳號建立。</li>
                <li>點擊「部署」。第一次部署會跳出權限授權，請依序點「授權存取」-&gt; 選擇自己的 Google 帳號 -&gt;「進階」-&gt;「前往專案」-&gt;「允許」。</li>
                <li>部署完成後，複製結尾為「/exec」的「網頁應用程式 URL」，貼到下方欄位後點「開始連線」。</li>
              </ol>
              <p className="mt-2 text-[11px] font-semibold text-amber-700">
                日後若有更新 script 代碼，請到「部署」-&gt;「管理部署作業」-&gt; 點鉛筆圖示，版本選「新增版本」後再按「部署」。
              </p>
              {!isSetupStepsExpanded && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-rose-50/0 to-rose-50" />
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsSetupStepsExpanded((value) => !value)}
              className="mt-2 text-[11px] font-bold text-rose-600 transition hover:text-rose-700"
            >
              {isSetupStepsExpanded ? '收合步驟' : '展開查看完整步驟'}
            </button>
          </div>

          {/* New code block for Google Apps Script */}
          <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-700">Script 代碼</h4>
              <button
                onClick={handleCopy}
                disabled={isScriptLoading || !scriptCode}
                className={`icon-label inline-flex items-center rounded-md px-2 py-1 text-sm font-semibold shadow transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  copied
                    ? 'bg-rose-100 text-rose-500'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {copied ? (
                  <>
                    <span>成功</span><span className="text-base" aria-hidden="true">🎉</span>
                  </>
                ) : (
                  <>
                    <span>複製</span><span className="text-base" aria-hidden="true">📋</span>
                  </>
                )}
              </button>
            </div>

            {isScriptLoading ? (
              <div className="flex h-[100px] items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-400">
                載入最新版程式碼中...
              </div>
            ) : (
              <>
                {scriptLoadFailed && (
                  <p className="mb-2 text-[11px] font-semibold text-amber-600">
                    ⚠️ 無法自動載入最新版本，以下為備援內容，建議直接到 GitHub 查看最新版。
                  </p>
                )}
                <pre className="max-h-[100px] overflow-y-auto rounded-lg border border-slate-300 bg-white p-3 text-slate-800">
                  <code>{scriptCode}</code>
                </pre>
              </>
            )}
          </div>
        </div>

        {/* Sticky footer for Web App URL and button */}
        <div className="sticky bottom-0 bg-white p-6 border-t border-slate-200 z-10">
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

          <div className="flex pt-2">
            <button
              type="button"
              onClick={buttonAction}
              disabled={isLoading}
              className={`icon-label flex w-full items-center justify-center rounded-lg py-2.5 text-sm font-semibold transition ${buttonClasses} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading && (
                <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {!isConnected && !isLoading && <span aria-hidden="true">💾</span>}
              <span>{buttonText}</span>
            </button>
          </div>
        </div>
      </div>
      <Toast message={toastMessage} isVisible={showToast} type={toastType} />
    </div>
  );
}

export function Toast({ message, isVisible, type = 'success' }) {
  let iconEmoji = '✓';
  let bgColorClass = 'bg-emerald-50';
  let textColorClass = 'text-emerald-600';

  if (type === 'error') {
    iconEmoji = '✕';
    bgColorClass = 'bg-red-50';
    textColorClass = 'text-red-600';
  } else if (type === 'warning') {
    iconEmoji = '！';
    bgColorClass = 'bg-amber-50';
    textColorClass = 'text-amber-600';
  }

  return (
    <div
      className={`icon-label fixed bottom-5 right-5 flex items-center rounded-xl border border-rose-100 bg-white px-4 py-3 shadow-xl transition-all duration-300 z-50 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
      }`}
    >
      <div className={`rounded-lg p-1.5 ${bgColorClass} ${textColorClass}`}>
        {iconEmoji}
      </div>
      <div className="text-xs font-semibold text-slate-800">{message}</div>
    </div>
  );
}
