'use client';

import { useEffect, useState } from 'react';

const GOOGLE_APPS_SCRIPT_CODE = `const SHEET_ASSETS = 'assets';
const SHEET_TRANSACTIONS = 'transactions';

const ASSET_HEADERS = ['id', 'category', 'name', 'balance', 'isLiability', 'currency', 'amount'];
const TX_HEADERS = [
  'id',
  'date',
  'recordedAt',
  'market',
  'symbol',
  'stock',
  'type',
  'qty',
  'price',
  'actualAmount',
  'note',
];

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    const mismatch = headers.some((h, i) => String(currentHeaders[i] || '') !== h);
    if (mismatch) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }

  return sheet;
}

function rowsToObjects_(rows, headers) {
  return rows.map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i];
    });
    return obj;
  });
}

function clearAndWriteObjects_(sheet, headers, items) {
  const maxRows = sheet.getMaxRows();
  if (maxRows > 1) {
    sheet.getRange(2, 1, maxRows - 1, headers.length).clearContent();
  }

  if (!items || items.length === 0) return;

  const values = items.map((item) => headers.map((h) => item[h] !== undefined ? item[h] : ''));
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}

function normalizeAsset_(asset) {
  const category = String(asset.category || '台幣活存');
  const isForeign = category === '外幣活存';
  const balance = Number(asset.balance || 0);
  const amount = isForeign ? Number(asset.amount != null ? asset.amount : balance) : '';
  return {
    id: String(asset.id || \`asset_\$\{new Date().getTime()}\`),
    category: category,
    name: String(asset.name || ''),
    balance: isForeign ? amount : balance,
    isLiability: Boolean(asset.isLiability || category === '負債項目'),
    currency: isForeign ? String(asset.currency || 'USD').toUpperCase() : '',
    amount: isForeign ? amount : '',
  };
}

function normalizeTx_(tx) {
  return {
    id: String(tx.id || \`tx_\$\{new Date().getTime()}\`),
    date: String(tx.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')),
    recordedAt: String(tx.recordedAt || new Date().toISOString()),
    market: String((tx.market || 'TWSE')).toUpperCase() === 'US' ? 'US' : 'TWSE',
    symbol: String(tx.symbol || ''),
    stock: String(tx.stock || ''),
    type: String(tx.type || 'buy'),
    qty: Number(tx.qty || 0),
    price: Number(tx.price || 0),
    actualAmount: Number(tx.actualAmount || 0),
    note: String(tx.note || ''),
  };
}

function getAll_() {
  const assetsSheet = getOrCreateSheet_(SHEET_ASSETS, ASSET_HEADERS);
  const txSheet = getOrCreateSheet_(SHEET_TRANSACTIONS, TX_HEADERS);

  const assetLastRow = assetsSheet.getLastRow();
  const txLastRow = txSheet.getLastRow();

  const assetsRows = assetLastRow > 1
    ? assetsSheet.getRange(2, 1, assetLastRow - 1, ASSET_HEADERS.length).getValues()
    : [];
  const txRows = txLastRow > 1
    ? txSheet.getRange(2, 1, txLastRow - 1, TX_HEADERS.length).getValues()
    : [];

  return {
    assets: rowsToObjects_(assetsRows, ASSET_HEADERS),
    transactions: rowsToObjects_(txRows, TX_HEADERS),
  };
}

function upsertAssets_(assets) {
  const assetsSheet = getOrCreateSheet_(SHEET_ASSETS, ASSET_HEADERS);
  const normalized = (assets || []).map(normalizeAsset_);
  clearAndWriteObjects_(assetsSheet, ASSET_HEADERS, normalized);
  return { count: normalized.length };
}

function appendTransaction_(transaction) {
  const txSheet = getOrCreateSheet_(SHEET_TRANSACTIONS, TX_HEADERS);
  const tx = normalizeTx_(transaction || {});
  const row = TX_HEADERS.map((h) => tx[h] !== undefined ? tx[h] : '');
  txSheet.appendRow(row);
  return { id: tx.id };
}

function removeTransaction_(id) {
  const txSheet = getOrCreateSheet_(SHEET_TRANSACTIONS, TX_HEADERS);
  const lastRow = txSheet.getLastRow();
  if (lastRow <= 1) return { removed: 0 };

  const values = txSheet.getRange(2, 1, lastRow - 1, TX_HEADERS.length).getValues();
  const idIndex = TX_HEADERS.indexOf('id');
  let removed = 0;

  for (let i = values.length - 1; i >= 0; i--) {
    if (String(values[i][idIndex]) === String(id || '')) {
      txSheet.deleteRow(i + 2);
      removed += 1;
    }
  }

  return { removed: removed };
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = String(body.action || '').trim();
    const payload = body.payload || {};

    if (action === 'health') {
      return jsonResponse({ ok: true, data: { status: 'ok' } });
    }

    if (action === 'getAll') {
      return jsonResponse({ ok: true, data: getAll_() });
    }

    if (action === 'upsertAssets') {
      return jsonResponse({ ok: true, data: upsertAssets_(payload.assets || []) });
    }

    if (action === 'appendTransaction') {
      return jsonResponse({ ok: true, data: appendTransaction_(payload.transaction || {}) });
    }

    if (action === 'removeTransaction') {
      return jsonResponse({ ok: true, data: removeTransaction_(payload.id) });
    }

    return jsonResponse({ ok: false, message: \`Unknown action: \$\{action}\` });
  } catch (error) {
    return jsonResponse({ ok: false, message: String(error) });
  }
}
`;

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
      <div className="flex h-[78vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-xl max-h-[78vh]">
        <div className="flex shrink-0 items-center justify-between border-b border-rose-100 px-6 py-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            ➕ 記錄股票交易
          </h3>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-6">
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
                買進
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
                賣出
              </button>
            </div>
          </div>

           <div className="grid grid-cols-[minmax(0,1fr)_9.5rem] gap-3 sm:grid-cols-2 sm:gap-4">
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
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-semibold text-slate-500">交易日期</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 transition focus:border-rose-300 focus:bg-white focus:outline-none"
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
            <label className="mb-1 block text-xs font-semibold text-slate-500">其他備註</label>
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

export function ConfigModal({ isOpen, onClose, onConnect, initialApiUrl = '' }) {
  const [apiUrl, setApiUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState('success'); // New state for toast type

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setApiUrl(initialApiUrl || '');
      setCopied(false);
      setToastMessage('');
      setShowToast(false);
      setToastType('success'); // Reset toast type when modal opens
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, initialApiUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const handleConnect = async () => {
    if (!apiUrl.trim()) {
      setToastMessage('記得輸入網頁應用程式 URL！');
      setToastType('warning'); // Set type to warning
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    try {
      await onConnect(apiUrl);
      setApiUrl('');
      setToastMessage('連線成功🎉恭喜你已完成設定！');
      setToastType('success'); // Set type to success
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      setToastMessage(`連線失敗：${error.message || '請檢查 URL 或網路！'}`);
      setToastType('error'); // Set type to error
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs z-50">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-rose-100 px-6 py-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            ☁️ 設置 Google 試算表同步資料
          </h3>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-6 max-h-[80vh]">
          <div className="space-y-2 rounded-xl border border-rose-100 bg-rose-50/50 p-4 text-xs leading-relaxed text-slate-700">
            <p className="text-sm font-bold text-rose-950">💡 Google Sheet Apps Script 二分鐘極速架設法：</p>
            <ol className="list-inside list-decimal space-y-1.5 text-slate-600">
              <li>登入 Google 試算表點選上方選單的 「擴充功能」 -&gt; 「Apps Script」。</li>
              <li>清除所有空白頁面的預設代碼，貼入下方後端 script 代碼。</li>
              <li>點擊 「儲存」，或是按「command + s」再點右上角 「部署」 -&gt; 「新增部署版本」。</li>
              <li>新增完後點擊右上角  -&gt; 「管理部署」。</li>
              <li>複製產生的「網頁應用程式 URL」貼在下方！</li>
            </ol>
          </div>

          {/* New code block for Google Apps Script */}
          <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-700">Script 代碼</h4>
              <button
                onClick={handleCopy}
                className={`rounded-md px-2 py-1 text-sm font-semibold shadow transition ${
                  copied
                    ? 'bg-rose-100 text-rose-500'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {copied ? (
                  <>
                    成功 <span className="text-base">🎉</span>
                  </>
                ) : (
                  <>
                    複製 <span className="text-base">📋</span>
                  </>
                )}
              </button>
            </div>
            <pre className="max-h-40 overflow-y-auto rounded-lg border border-slate-300 bg-white p-3 text-slate-800">
              <code>{GOOGLE_APPS_SCRIPT_CODE}</code>
            </pre>
          </div>
          {/* End new code block */}

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
              💾 開始連線
            </button>
          </div>
        </div>
      </div>
      {/* Pass toastType to Toast component */}
      <Toast message={toastMessage} isVisible={showToast} type={toastType} />
    </div>
  );
}

export function Toast({ message, isVisible, type = 'success' }) { // Accept type prop with default
  let iconEmoji = '✓'; // Default to success
  let bgColorClass = 'bg-emerald-50';
  let textColorClass = 'text-emerald-600';

  if (type === 'error') {
    iconEmoji = '✕';
    bgColorClass = 'bg-red-50';
    textColorClass = 'text-red-600';
  } else if (type === 'warning') {
    iconEmoji = '！'; // Changed from '!' to '！' for better visual
    bgColorClass = 'bg-amber-50';
    textColorClass = 'text-amber-600';
  }

  return (
    <div
      className={`fixed bottom-5 right-5 flex items-center gap-3 rounded-xl border border-rose-100 bg-white px-4 py-3 shadow-xl transition-all duration-300 z-50 ${
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

export function MonthlySnapshotModal({ isOpen, onClose, onSave, currentNetWorth, assets }) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [customNetWorth, setCustomNetWorth] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedYear(currentYear);
      setSelectedMonth(currentMonth);
      setCustomNetWorth('');
      setUseCustom(false);
    }
  }, [isOpen, currentYear, currentMonth]);

  const handleSave = () => {
    const netWorthToSave = useCustom ? Number(customNetWorth) : currentNetWorth;
    if (!netWorthToSave || netWorthToSave <= 0) {
      alert('請輸入有效的淨值數字');
      return;
    }
    onSave(selectedMonth, netWorthToSave);
  };

  if (!isOpen) return null;

  const years = [currentYear - 1, currentYear, currentYear + 1];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 bg-gradient-to-r from-rose-50 to-pink-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-white p-2 text-xl shadow-sm">📊</div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">月結記帳</h2>
                <p className="mt-0.5 text-xs text-slate-500">記錄本月資產負債快照</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-600"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          {/* 選擇月份 */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-bold text-slate-700">選擇月份</label>
            <div className="flex items-center gap-3">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition focus:border-rose-300 focus:outline-none"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year} 年
                  </option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition focus:border-rose-300 focus:outline-none"
              >
                {months.map((month) => (
                  <option key={month} value={month}>
                    {month} 月
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 當前淨值預覽 */}
          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">當前淨值預覽</h3>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                即時計算
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900">
              ${currentNetWorth.toLocaleString()}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              根據目前資產負債自動計算，點擊下方「使用當前淨值」即可儲存
            </p>
          </div>

          {/* 自訂淨值選項 */}
          <div className="mb-5">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useCustom}
                onChange={(e) => setUseCustom(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-rose-500 focus:ring-rose-200"
              />
              <span className="text-sm font-semibold text-slate-700">手動輸入淨值</span>
            </label>
            {useCustom && (
              <input
                type="number"
                value={customNetWorth}
                onChange={(e) => setCustomNetWorth(e.target.value)}
                placeholder="請輸入淨值金額"
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition focus:border-rose-300 focus:outline-none"
              />
            )}
          </div>

          {/* 提示說明 */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <div className="flex gap-2">
              <div className="text-blue-500">💡</div>
              <div className="text-xs text-blue-700">
                <p className="font-semibold">月結記帳小提示</p>
                <p className="mt-1">
                  每月月底記錄一次，建議先在「管理帳戶/餘額」更新所有銀行存款、負債等數字後，再來月結記帳。儲存後會自動更新折線圖。
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 rounded-lg bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-rose-500 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-rose-600"
            >
              <span>💾</span>
              <span>{useCustom ? '儲存自訂淨值' : '使用當前淨值'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
