'use client';

import { useEffect, useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useApp } from '@/lib/app-context';
import { INDUSTRY_COLORS, INDUSTRY_MAP } from '@/components/common/constants';
import { demoInitialPrices } from '@/lib/demo-stock-data';
import { normalizeStockSymbol } from '@/lib/stock-symbol';

function getIndustry(symbol, stockName = '') {
  const name = String(stockName);

  // Google Sheets 可能把 ETF 代號的前導零移除，因此用名稱辨識 ETF，
  // 避免把 006208（富邦台50）與真正的個股代號 6208 混在一起。
  if (name.includes('元大台灣50')) return '大盤型 ETF';
  if (name.includes('富邦台50')) return '大盤型 ETF';
  if (name.includes('國泰臺韓科技') || name.includes('國泰台韓科技')) return '科技主題 ETF';
  if (name.includes('主動統一台股增長')) return '主動式 ETF';

  return INDUSTRY_MAP[symbol] || '其他';
}

function buildBasePositions(txList, costBasisAdjustments = []) {
  const map = {};
  const sorted = [
    ...(txList || []).map((tx) => ({
      kind: 'transaction',
      timestamp: new Date(String(tx.recordedAt || '').startsWith(String(tx.date || '')) ? tx.recordedAt : `${tx.date}T12:00:00`).getTime(),
      data: tx,
    })),
    ...(costBasisAdjustments || []).map((adjustment) => ({
      kind: 'cost_adjustment',
      timestamp: new Date(adjustment.effectiveAt).getTime(),
      data: adjustment,
    })),
  ].sort((a, b) => a.timestamp - b.timestamp || (a.kind === 'transaction' ? -1 : 1));

  sorted.forEach((event) => {
    if (event.kind === 'cost_adjustment') {
      const adjustment = event.data;
      const pos = map[adjustment.stock];
      const avgCost = Number(adjustment.avgCost);
      if (pos?.holdingQty > 0 && Number.isFinite(avgCost) && avgCost >= 0) {
        pos.totalBuyCost = avgCost * pos.holdingQty;
      }
      return;
    }
    const tx = event.data;
    const key = tx.stock;
    if (!map[key]) {
      map[key] = {
        name: tx.stock,
        symbol: normalizeStockSymbol(tx.symbol || tx.stock.split(' ')[0], tx.stock, tx.market),
        market: tx.market || 'TWSE',
        holdingQty: 0,
        totalBuyCost: 0,
      };
    }
    const pos = map[key];
    if (tx.type === 'buy') {
      pos.holdingQty += Number(tx.qty);
      pos.totalBuyCost += Number(tx.actualAmount);
    } else if (tx.type === 'sell' && pos.holdingQty > 0) {
      const sold = Math.min(Number(tx.qty), pos.holdingQty);
      const ratio = sold / pos.holdingQty;
      pos.holdingQty -= sold;
      pos.totalBuyCost *= 1 - ratio;
    }
  });

  return Object.values(map)
    .filter((p) => p.holdingQty > 0)
    .map((p) => ({
      ...p,
      avgCost: p.holdingQty > 0 ? p.totalBuyCost / p.holdingQty : 0,
    }));
}

function tabBtnClass(active) {
  return `px-3 py-1.5 rounded-lg text-xs font-bold transition ${
    active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
  }`;
}

function fmt(num) {
  return Math.round(num).toLocaleString('zh-TW');
}

function fmtCurrency(num, currency = 'TWD', showSign = false, decimalPlaces = 0) {
  const val = Number(num) || 0;
  const options = {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  };
  const formattedNum = val.toLocaleString('zh-TW', options);
  if (currency === 'TWD') {
    const absoluteNum = Math.abs(val).toLocaleString('zh-TW', options);
    return `${showSign ? (val >= 0 ? '+' : '-') : ''}${showSign ? absoluteNum : formattedNum}`;
  }
  if (showSign) {
    return `${val >= 0 ? '+' : '-'}$${Math.abs(val).toLocaleString('zh-TW', options)}`;
  }
  return `$${formattedNum}`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}/${month}/${day}`;
}

// ISO string → "13:02"（local time, 24h）
function fmtTime(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function quoteStatusLabel(status) {
  if (status === 'realtime') return '即時股價';
  if (status === 'previous_close') return '昨日收盤價';
  if (status === 'daily_close') return '最新收盤價';
  if (status === 'esb_quote') return '興櫃參考價';
  if (status === 'manual') return '手動設定價格';
  if (status === 'unavailable') return '目前無報價';
  return null;
}

export function StocksContent() {
  const {
    transactions: realTransactions,
    removeTransaction: realRemoveTransaction,
    openTransactionModal,
    isAppInitializing,
    isSheetsConnected,
    stockMarketPrices,
    stockQuoteMeta: quoteMeta,
    isStockPricesLoading: isFetchingPrices,
    refreshStockPrices,
    usdToTwdRate,
    costBasisAdjustments,
    addCostBasisAdjustment,
    displayToast,
  } = useApp();

  const [displayCurrency, setDisplayCurrency] = useState('TWD');

  const transactions = useMemo(() => {
    const txs = realTransactions || [];
    return txs.map((tx) => ({
      ...tx,
      stock: tx.stock || tx.name || '',
      qty: Number(tx.qty ?? tx.shares ?? 0),
      actualAmount: Number(tx.actualAmount ?? tx.amount ?? 0),
      price: Number(tx.price ?? 0),
    }));
  }, [realTransactions]);

  const removeTransaction = realRemoveTransaction;

  const priceMap = isSheetsConnected ? stockMarketPrices : demoInitialPrices;
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [editingCostName, setEditingCostName] = useState(null);
  const [costDraft, setCostDraft] = useState('');
  const [originalCostDraft, setOriginalCostDraft] = useState(null);
  const [pendingCostChange, setPendingCostChange] = useState(null);
  const [isSavingCost, setIsSavingCost] = useState(false);

  const [posTab, setPosTab] = useState('TWSE');
  const [histTab, setHistTab] = useState('TWSE');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [yearHighlightedIndex, setYearHighlightedIndex] = useState(-1);
  const [monthHighlightedIndex, setMonthHighlightedIndex] = useState(-1);
  const [currentTxPage, setCurrentTxPage] = useState(1); // 交易紀錄分頁

  useEffect(() => {
    if (posTab === 'US') setDisplayCurrency('TWD');
  }, [posTab]);

  const availableYears = [...new Set(
    transactions
      .map((tx) => Number(String(tx.date || '').slice(0, 4)))
      .filter((year) => Number.isFinite(year) && year > 0)
  )].sort((a, b) => b - a);

  const now = new Date();
  const currentFilterYear = String(now.getFullYear());
  const currentFilterMonth = String(now.getMonth() + 1).padStart(2, '0');
  const yearOptions = ['ALL', ...new Set([currentFilterYear, ...availableYears.map((year) => String(year))])];
  const yearLabel = selectedYear === 'ALL' ? '全部年份' : `${selectedYear} 年`;

  const transactionsInSelectedYear = selectedYear === 'ALL'
    ? transactions
    : transactions.filter((tx) => String(tx.date || '').slice(0, 4) === selectedYear);
  const availableMonths = [...new Set(
    transactionsInSelectedYear
      .map((tx) => Number(String(tx.date || '').slice(5, 7)))
      .filter((month) => Number.isFinite(month) && month >= 1 && month <= 12)
  )].sort((a, b) => a - b);
  const monthOptions = [
    'ALL',
    ...[...new Set([
      ...(selectedYear === currentFilterYear ? [currentFilterMonth] : []),
      ...availableMonths.map((month) => String(month).padStart(2, '0')),
    ])].sort((a, b) => Number(a) - Number(b)),
  ];
  const monthLabel = selectedMonth === 'ALL' ? '全部月份' : `${Number(selectedMonth)} 月`;

  useEffect(() => {
    if (selectedYear !== 'ALL' && !yearOptions.includes(selectedYear)) {
      setSelectedYear('ALL');
    }
  }, [selectedYear, yearOptions]);

  useEffect(() => {
    if (selectedMonth !== 'ALL' && !monthOptions.includes(selectedMonth)) {
      setSelectedMonth('ALL');
    }
  }, [selectedMonth, monthOptions]);

  const filteredTransactions = transactionsInSelectedYear.filter((tx) => (
    selectedMonth === 'ALL' || String(tx.date || '').slice(5, 7) === selectedMonth
  ));

  // ── derive positions (必須在報價抓取邏輯之前，因為報價邏輯依賴這些數據) ──────────────────────────────────────────────────────
  const basePositions = useMemo(
    () => buildBasePositions(transactions, costBasisAdjustments),
    [transactions, costBasisAdjustments]
  );
  const positionKeys = basePositions.map((p) => p.name).join('|');

  // 自動抓取新持股的報價
  useEffect(() => {
    if (isSheetsConnected) refreshStockPrices(basePositions);
  }, [basePositions, isSheetsConnected, positionKeys, refreshStockPrices]);

  // 官方來源暫時無回應時持續低頻重試；成功前不納入損益計算。
  const failedQuoteRevision = Object.entries(quoteMeta)
    .filter(([, meta]) => meta.status === 'unavailable')
    .map(([name, meta]) => `${name}:${meta.fetchedAt}`)
    .join('|');
  useEffect(() => {
    if (!isSheetsConnected || !failedQuoteRevision) return undefined;
    const timer = setTimeout(() => {
      const failedPositions = basePositions.filter(
        (pos) => quoteMeta[pos.name]?.status === 'unavailable'
      );
      if (failedPositions.length > 0 && !isFetchingPrices) {
        refreshStockPrices(failedPositions, { force: true });
      }
    }, 30000);
    return () => clearTimeout(timer);
  }, [basePositions, failedQuoteRevision, isSheetsConnected, isFetchingPrices, quoteMeta, refreshStockPrices]);

  // 手動重新整理目前分頁的報價
  const handleManualRefresh = () => {
    if (isFetchingPrices) return;
    const currentTabPositions = posTab === 'TWSE' ? twsePositions : usPositions;
    refreshStockPrices(currentTabPositions, { force: true });
  };

  const startEditingCost = (pos, displayedCost) => {
    const roundedCost = Number(Number(displayedCost).toFixed(2));
    setEditingCostName(pos.name);
    setCostDraft(roundedCost.toFixed(2));
    setOriginalCostDraft(roundedCost);
  };

  const saveEditedCost = async ({ pos, rate, displayedValue }) => {
    if (!Number.isFinite(displayedValue) || displayedValue < 0) return;
    const nativeValue = pos.market === 'US' && displayCurrency === 'TWD'
      ? displayedValue / rate
      : displayedValue;
    setIsSavingCost(true);
    try {
      await addCostBasisAdjustment({
        stock: pos.name,
        market: pos.market,
        avgCost: nativeValue,
        holdingQty: pos.holdingQty,
      });
      setEditingCostName(null);
      setCostDraft('');
      setOriginalCostDraft(null);
      setPendingCostChange(null);
    } catch (error) {
      displayToast(`成本基準儲存失敗：${error.message || '請稍後再試'}`, 'error');
    } finally {
      setIsSavingCost(false);
    }
  };

  const cancelEditingCost = () => {
    setEditingCostName(null);
    setCostDraft('');
    setOriginalCostDraft(null);
    setPendingCostChange(null);
  };

  const requestCostSave = (pos, rate, currency, displayName) => {
    const displayedValue = Number(costDraft);
    if (!Number.isFinite(displayedValue) || displayedValue < 0) return;
    setPendingCostChange({ pos, rate, currency, displayName, displayedValue });
  };

  const hasCostChanged = editingCostName !== null
    && Number.isFinite(Number(costDraft))
    && Math.abs(Number(costDraft) - Number(originalCostDraft)) > 0.000001;

  useEffect(() => {
    if (!editingCostName || pendingCostChange) return undefined;
    const handlePointerDown = (event) => {
      if (!event.target.closest('[data-cost-editor]')) cancelEditingCost();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [editingCostName, pendingCostChange]);

  const allPositions = basePositions.map((p) => {
    const marketPrice = priceMap[p.name] ?? null;
    const hasQuote = marketPrice !== null;
    const marketValue = hasQuote ? p.holdingQty * marketPrice : 0;
    const unrealizedProfit = hasQuote ? marketValue - p.totalBuyCost : null;
    const profitPercent =
      hasQuote && p.totalBuyCost > 0 ? (unrealizedProfit / p.totalBuyCost) * 100 : null;
    return { ...p, marketPrice, hasQuote, marketValue, unrealizedProfit, profitPercent };
  });

  const twsePositions = allPositions.filter((p) => p.market === 'TWSE');
  const usPositions = allPositions.filter((p) => p.market === 'US');
  const activePositions = [...(posTab === 'TWSE' ? twsePositions : usPositions)].sort((a, b) => {
    if (a.hasQuote !== b.hasQuote) return a.hasQuote ? -1 : 1;
    return b.marketValue - a.marketValue;
  });

  // 台股 + 美股（美股轉換成 TWD）的總和
  const totalOverallValue = useMemo(() => {
    return allPositions.reduce((sum, pos) => {
      const isUSStock = pos.market === 'US';
      const rate = isUSStock ? (usdToTwdRate || 1) : 1;
      return sum + (pos.marketValue * rate);
    }, 0);
  }, [allPositions, usdToTwdRate]);

  const totalOverallCost = useMemo(() => {
    return allPositions.reduce((sum, pos) => {
      const isUSStock = pos.market === 'US';
      const rate = isUSStock ? (usdToTwdRate || 1) : 1;
      return sum + (pos.hasQuote ? pos.totalBuyCost * rate : 0);
    }, 0);
  }, [allPositions, usdToTwdRate]);

  const totalOverallUnrealized = totalOverallValue - totalOverallCost;
  const totalOverallReturnRate = totalOverallCost > 0 ? (totalOverallUnrealized / totalOverallCost) * 100 : 0;

  // ✅ 修正：当前 tab 的总计（用于表格显示）
  // 当在美股 tab 且选择 TWD 时，美股数据转换成 TWD
  const summaryPositions = activePositions.map(pos => {
    const isUSStock = pos.market === 'US';
    const rate = isUSStock ? (usdToTwdRate || 1) : 1;

    if (isUSStock && displayCurrency === 'TWD') {
      return {
        ...pos,
        marketValue: pos.marketValue * rate,
        totalBuyCost: pos.totalBuyCost * rate,
        unrealizedProfit: pos.unrealizedProfit == null ? null : pos.unrealizedProfit * rate,
      };
    }
    return pos;
  });

  const currentTabTotalValue = summaryPositions.reduce((s, p) => s + p.marketValue, 0);
  // 占比固定使用原始市值計算，幣別切換只影響金額顯示。
  const currentTabRawTotalValue = activePositions.reduce((sum, pos) => sum + pos.marketValue, 0);
  const currentTabTotalCost = summaryPositions.reduce((s, p) => s + (p.hasQuote ? p.totalBuyCost : 0), 0);
  const currentTabTotalUnrealized = currentTabTotalValue - currentTabTotalCost;
  const lastQuoteUpdatedAt = Object.values(quoteMeta).reduce(
    (latest, meta) => Math.max(latest, Number(meta?.fetchedAt) || 0),
    0
  );

  // 顯示限制：一開始最多顯示 20 筆（第 21 筆起透過滾動查看）
  const MAX_VISIBLE = 20;
  // 固定表頭/列高，讓可視高度精準對齊到 20 筆
  const POS_HEADER_HEIGHT = 48;
  const POS_ROW_HEIGHT = 56;
  const posContainerMaxHeight = POS_HEADER_HEIGHT + POS_ROW_HEIGHT * MAX_VISIBLE;
  // 交易紀錄容器的高度計算（初始顯示上限一樣為 20 筆）
  // (txContainerMaxHeight 會在 activeTx 宣告之後計算)

  // ── 按產業聚合 ────────────────────────────────────────────────────────
  const industryData = (() => {
    const industryMap = {};
    activePositions.forEach((pos) => {
      const industry = getIndustry(pos.symbol, pos.name);
      if (!industryMap[industry]) {
        industryMap[industry] = { value: 0, holdings: [] };
      }
      let marketValue = pos.marketValue;
      if (posTab === 'US' && displayCurrency === 'TWD' && usdToTwdRate) {
        marketValue *= usdToTwdRate;
      }
      industryMap[industry].value += marketValue;
      industryMap[industry].holdings.push({
        name: pos.name,
        symbol: pos.symbol,
        marketValue,
      });
    });

    const finalIndustryData = Object.entries(industryMap)
      .filter(([, data]) => data.value > 0)
      .map(([name, data]) => {
        const holdings = data.holdings
          .filter((holding) => holding.marketValue > 0)
          .map((holding) => ({
            ...holding,
            industryPercent: data.value > 0 ? (holding.marketValue / data.value) * 100 : 0,
          }))
          .sort((a, b) => b.marketValue - a.marketValue);
        return { name, value: Math.round(data.value), holdings };
      })
      .sort((a, b) => b.value - a.value);

    return finalIndustryData;
  })();

  useEffect(() => {
    if (selectedIndustry && !industryData.some((item) => item.name === selectedIndustry)) {
      setSelectedIndustry(null);
    }
  }, [industryData, selectedIndustry]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await removeTransaction(deleteId); // 呼叫 API 並同步 Google Sheets
      setDeleteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── transaction history ───────────────────────────────────────────────────

  const twseTx = filteredTransactions.filter((tx) => (tx.market || 'TWSE') === 'TWSE');
  const usTx = filteredTransactions.filter((tx) => tx.market === 'US');
  const activeTx = [...(histTab === 'TWSE' ? twseTx : usTx)].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // 交易紀錄分頁設定（每頁 10 筆）
  const TX_PER_PAGE = 10;
  const totalTxPages = Math.max(1, Math.ceil(activeTx.length / TX_PER_PAGE));
  const paginatedTx = activeTx.slice((currentTxPage - 1) * TX_PER_PAGE, currentTxPage * TX_PER_PAGE);

  // 當切換 tab 或年份時，重置到第 1 頁
  useEffect(() => {
    setCurrentTxPage(1);
  }, [histTab, selectedYear, selectedMonth]);

  // ─────────────────────────────────────────────────────────────────────────

  const hasRequiredPrices = basePositions.every((position) => (
    priceMap?.[position.name] != null || quoteMeta?.[position.name]?.status === 'unavailable'
  ));

  if (isAppInitializing || (isSheetsConnected && !hasRequiredPrices)) {
    return (
      <div className="flex min-h-[55vh] w-full flex-col items-center justify-center rounded-2xl border border-rose-100 bg-white/70 px-6 text-center shadow-sm">
        <div className="relative flex items-center justify-center">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-rose-100 border-t-rose-500" />
          <span className="absolute text-xl" aria-hidden="true">🐷</span>
        </div>
        <p className="mt-4 animate-pulse text-sm font-bold text-slate-600">正在搬運您的資產...</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Summary Stats（台股+美股總和） ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <div className="card p-3 md:p-5">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-slate-400">持股現值總計 (TWD)</p>
          <p className="mt-1 md:mt-2 text-lg md:text-2xl font-black text-slate-900">
            {fmtCurrency(totalOverallValue, 'TWD')}
          </p>
        </div>
        <div className="card p-3 md:p-5">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-slate-400">總投資成本 (TWD)</p>
          <p className="mt-1 md:mt-2 text-lg md:text-2xl font-black text-slate-900">
            {fmtCurrency(totalOverallCost, 'TWD')}
          </p>
        </div>
        <div className="card p-3 md:p-5">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-slate-400">未實現損益 (TWD)</p>
          <p className={`mt-1 md:mt-2 text-lg md:text-2xl font-black ${totalOverallUnrealized >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {fmtCurrency(totalOverallUnrealized, 'TWD', true)}
          </p>
        </div>
        <div className="card p-3 md:p-5">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-slate-400">總報酬率</p>
          <p className={`mt-1 md:mt-2 text-lg md:text-2xl font-black ${totalOverallReturnRate >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {totalOverallReturnRate >= 0 ? '+' : ''}{totalOverallReturnRate.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* ── Positions Section ── */}
      <section className="card overflow-hidden ring-1 ring-rose-100/70" aria-labelledby="positions-heading">
        <div className="border-b border-slate-200 bg-gradient-to-r from-rose-50/80 via-white to-white px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-sm shadow-rose-200 sm:h-11 sm:w-11 sm:rounded-2xl" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V9m5 10V5m5 14v-7m5 7V3" />
                </svg>
              </span>
              <h2 id="positions-heading" className="whitespace-nowrap text-xl font-black tracking-tight text-slate-900 sm:text-2xl">持股明細</h2>
            </div>
            <div className="grid w-full shrink-0 grid-cols-2 rounded-xl bg-slate-200/60 p-1 sm:w-auto" role="group" aria-label="選擇股票市場">
              <button
                onClick={() => setPosTab('TWSE')}
                aria-pressed={posTab === 'TWSE'}
                className={`flex min-w-[68px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                  posTab === 'TWSE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="text-sm leading-none" aria-hidden="true">🇹🇼</span>
                台股
              </button>
              <button
                onClick={() => setPosTab('US')}
                aria-pressed={posTab === 'US'}
                className={`flex min-w-[68px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                  posTab === 'US' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="text-sm leading-none" aria-hidden="true">🇺🇸</span>
                美股
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-3">
            <button
              onClick={handleManualRefresh}
              disabled={isFetchingPrices}
              className="group order-1 inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-md bg-transparent px-1 text-[11px] font-bold text-rose-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-wait disabled:opacity-50"
            >
                {isFetchingPrices ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-rose-600" />
                ) : (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 transition-transform duration-500 group-hover:rotate-180">
                    <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.45a.75.75 0 000-1.5H4.147a.75.75 0 00-.75.75v4.103a.75.75 0 001.5 0v-2.151l.33.33a7 7 0 0011.778-3.391.75.75 0 00-1.693-.44zM4.688 8.576a5.5 5.5 0 019.201-2.466l.312.311h-2.45a.75.75 0 000-1.5h4.103a.75.75 0 00.75-.75V3.068a.75.75 0 00-1.5 0v2.151l-.33-.33a7 7 0 00-11.778 3.391.75.75 0 001.693.44z" clipRule="evenodd" />
                  </svg>
                )}
                更新現價
            </button>
            <button
              onClick={() => setShowChart(!showChart)}
              aria-expanded={showChart}
              className={`order-3 ml-auto inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-md border px-2 text-[10px] font-semibold transition ${
                showChart
                  ? 'border-rose-200 bg-rose-50 text-rose-600'
                  : 'border-rose-100 bg-white text-rose-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
              }`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden="true">
                <path d="M10 2.5a.75.75 0 01.75.75v6.25H17a.75.75 0 01.75.75A8.75 8.75 0 1110 1.25a.75.75 0 010 1.5z" />
                <path d="M12.5 2.08a8.02 8.02 0 014.92 4.92h-4.17a.75.75 0 01-.75-.75V2.08z" />
              </svg>
              {showChart ? '隱藏' : '顯示'}產業分佈
            </button>
            <div className="order-2 flex min-h-7 min-w-0 flex-1 items-center gap-2">
              {lastQuoteUpdatedAt > 0 && (
                <span className="whitespace-nowrap text-[9px] font-normal text-slate-400">
                  已更新・{fmtTime(new Date(lastQuoteUpdatedAt).toISOString())}
                </span>
              )}

              {posTab === 'US' && (
                <div className="ml-auto grid shrink-0 grid-cols-2 rounded-lg bg-slate-200/60 p-0.5" role="group" aria-label="選擇顯示幣別">
                  <button
                    onClick={() => setDisplayCurrency('TWD')}
                    disabled={!usdToTwdRate}
                    aria-pressed={displayCurrency === 'TWD'}
                    className={`min-w-[54px] rounded-md px-2.5 py-1.5 text-[11px] font-bold transition ${
                      displayCurrency === 'TWD' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    } ${!usdToTwdRate ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    TWD
                  </button>
                  <button
                    onClick={() => setDisplayCurrency('USD')}
                    aria-pressed={displayCurrency === 'USD'}
                    className={`min-w-[54px] rounded-md px-2.5 py-1.5 text-[11px] font-bold transition ${
                      displayCurrency === 'USD' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    USD
                  </button>
                </div>
              )}
            </div>
          </div>
          {posTab === 'US' && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3.5 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white font-mono text-[10px] font-black tracking-tight text-blue-500 shadow-sm ring-1 ring-blue-100" aria-hidden="true">
                  US$
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-600">美股總資產</p>
                  <p className="mt-0.5 text-[9px] text-slate-400">依目前可用報價加總</p>
                </div>
              </div>
              <p className="shrink-0 text-right font-mono text-base font-black text-slate-800">
                {displayCurrency === 'TWD'
                  ? `${fmtCurrency(currentTabTotalValue, 'TWD')} TWD`
                  : `${fmtCurrency(currentTabTotalValue, 'USD', false, 2)} USD`}
              </p>
            </div>
          )}
        </div>

        {showChart && industryData.length > 0 && (
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-5 md:px-5">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">持股產業分佈</h3>
                <p className="mt-1 text-[11px] text-slate-400">點選產業，查看你的持股成分</p>
              </div>
              <span className="shrink-0 text-[11px] font-medium text-slate-400">共 {industryData.length} 個產業</span>
            </div>
            <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.9fr)_minmax(340px,1.1fr)] lg:items-start">
              <div className="rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                <Pie
                  data={industryData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ cx, cy, midAngle, outerRadius, percent, name }) => {
                    if (percent * 100 < 0.5) return null;
                    const radius = outerRadius + 12;
                    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                    return (
                      <text
                        x={x}
                        y={y}
                        fill="#64748b"
                        textAnchor={x > cx ? "start" : "end"}
                        dominantBaseline="central"
                        className="text-[10px] font-bold"
                      >
                        {`${name} ${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={(entry) => setSelectedIndustry(entry.name)}
                  className="cursor-pointer outline-none"
                >
                  {industryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={INDUSTRY_COLORS[entry.name] || INDUSTRY_COLORS.default}
                      opacity={!selectedIndustry || selectedIndustry === entry.name ? 1 : 0.35}
                      stroke={selectedIndustry === entry.name ? '#fff' : 'transparent'}
                      strokeWidth={selectedIndustry === entry.name ? 3 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => fmtCurrency(value, posTab === 'US' ? displayCurrency : 'TWD')}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  }}
                />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {industryData.map((entry) => {
                  const isOpen = selectedIndustry === entry.name;
                  const industryPercent = currentTabTotalValue > 0
                    ? (entry.value / currentTabTotalValue) * 100
                    : 0;
                  return (
                    <div key={entry.name} className={`overflow-hidden rounded-xl border bg-white transition ${isOpen ? 'border-rose-200 shadow-sm' : 'border-slate-100'}`}>
                      <button
                        type="button"
                        onClick={() => setSelectedIndustry(isOpen ? null : entry.name)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-slate-50"
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: INDUSTRY_COLORS[entry.name] || INDUSTRY_COLORS.default }} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-bold text-slate-700">{entry.name}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{entry.holdings.length} 檔</span>
                          </span>
                          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <span className="block h-full rounded-full" style={{ width: `${Math.min(industryPercent, 100)}%`, backgroundColor: INDUSTRY_COLORS[entry.name] || INDUSTRY_COLORS.default }} />
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-xs font-black text-slate-700">{industryPercent.toFixed(1)}%</span>
                          <span className="block text-[10px] text-slate-400">{fmtCurrency(entry.value, posTab === 'US' ? displayCurrency : 'TWD')}</span>
                        </span>
                        <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="border-t border-slate-100 bg-slate-50/60 px-3.5 py-2">
                          {entry.holdings.map((holding) => {
                            const displayName = holding.name.split(' ').slice(1).join(' ') || holding.name;
                            return (
                              <div key={`${entry.name}-${holding.symbol}-${holding.name}`} className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-black text-slate-500 shadow-sm">{holding.symbol}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-bold text-slate-700">{displayName}</span>
                                  <span className="text-[10px] text-slate-400">產業內占比 {holding.industryPercent.toFixed(1)}%</span>
                                </span>
                                <span className="text-xs font-bold text-slate-600">{fmtCurrency(holding.marketValue, posTab === 'US' ? displayCurrency : 'TWD')}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div key={posTab} className="animate-in fade-in duration-500">
          {activePositions.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">
              目前沒有「{posTab === 'TWSE' ? '台股' : '美股'}」持股明細
            </div>
          ) : (
            <>
            <div className="divide-y divide-slate-100 md:hidden">
              {activePositions.map((pos, positionIndex) => {
                const sharePercent = currentTabRawTotalValue > 0 ? (pos.marketValue / currentTabRawTotalValue) * 100 : 0;
                const displayName = pos.name.split(' ').slice(1).join(' ') || pos.name;
                const isUSStock = pos.market === 'US';
                const rate = isUSStock ? (usdToTwdRate || 1) : 1;
                const currency = isUSStock ? displayCurrency : 'TWD';
                const avgCost = isUSStock && displayCurrency === 'TWD' ? pos.avgCost * rate : pos.avgCost;
                const marketPrice = pos.marketPrice == null ? null : (isUSStock && displayCurrency === 'TWD' ? pos.marketPrice * rate : pos.marketPrice);
                const totalCost = isUSStock && displayCurrency === 'TWD' ? pos.totalBuyCost * rate : pos.totalBuyCost;
                const marketValue = isUSStock && displayCurrency === 'TWD' ? pos.marketValue * rate : pos.marketValue;
                const profit = pos.unrealizedProfit == null ? null : (isUSStock && displayCurrency === 'TWD' ? pos.unrealizedProfit * rate : pos.unrealizedProfit);
                const meta = quoteMeta[pos.name];
                const statusLabel = quoteStatusLabel(meta?.status);

                return (
                  <article key={pos.name} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] font-bold text-slate-500">{pos.symbol}</span>
                          <h3 className="truncate text-sm font-bold text-slate-800">{displayName}</h3>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-slate-400">
                          <span>持有 {pos.holdingQty.toLocaleString()} 股</span>
                          <span aria-hidden="true">・</span>
                          <span className="inline-flex items-center gap-1">
                            市值占比 {pos.hasQuote ? `${sharePercent.toFixed(1)}%` : '—'}
                            {positionIndex === 0 && pos.hasQuote && <span className="text-xs" title="市值占比第一名" aria-label="市值占比第一名">👑</span>}
                          </span>
                          <span className="relative ml-0.5 h-1.5 w-12 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                            <span
                              className="absolute inset-y-0 left-0 rounded-full bg-rose-400 transition-all duration-300"
                              style={{ width: `${pos.hasQuote ? Math.min(sharePercent, 100) : 0}%` }}
                            />
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-medium text-slate-400">帳面現值 ({currency})</p>
                        <p className="mt-0.5 font-mono text-sm font-black text-slate-800">{pos.hasQuote ? fmtCurrency(marketValue, currency) : '—'}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 rounded-xl bg-slate-50 p-3">
                      <div>
                        <p className="text-[10px] font-medium text-slate-400">未實現損益 ({currency})</p>
                        <p className={`mt-1 font-mono text-sm font-black ${profit == null ? 'text-slate-400' : profit >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {profit == null ? '—' : fmtCurrency(profit, currency, true)}
                          {pos.profitPercent != null && <span className="ml-1 text-[10px]">({pos.profitPercent >= 0 ? '+' : ''}{pos.profitPercent.toFixed(2)}%)</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-slate-400">投資成本 ({currency})</p>
                        <p className="mt-1 font-mono text-sm font-bold text-slate-700">{fmtCurrency(totalCost, currency)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-slate-400">平均成本 ({currency})</p>
                        {editingCostName === pos.name ? (
                          <div className="mt-1 flex items-center gap-1" data-cost-editor>
                            <input
                              type="number"
                              value={costDraft}
                              onChange={(event) => setCostDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' && hasCostChanged) requestCostSave(pos, rate, currency, displayName);
                                if (event.key === 'Escape') cancelEditingCost();
                              }}
                              className="min-w-0 flex-1 rounded-md border border-rose-200 bg-white px-2 py-1 font-mono text-xs text-slate-700 outline-none focus:ring-2 focus:ring-rose-100"
                              min="0"
                              step="0.01"
                              autoFocus
                              aria-label={`${displayName}平均成本`}
                            />
                            {hasCostChanged && (
                              <button
                                type="button"
                                disabled={isSavingCost}
                                onClick={() => requestCostSave(pos, rate, currency, displayName)}
                                className="shrink-0 px-1 py-1 text-[10px] font-bold text-rose-500 transition hover:text-rose-600 disabled:opacity-50"
                              >
                                儲存
                              </button>
                            )}
                          </div>
                        ) : (
                          <button type="button" onClick={() => startEditingCost(pos, avgCost)} className="mt-1 inline-flex items-center gap-1 font-mono text-xs font-bold text-slate-700" aria-label={`修改 ${displayName} 平均成本`}>
                            {fmtCurrency(avgCost, currency, false, 2)}
                            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-slate-400" aria-hidden="true"><path d="M13.586 3.586a2 2 0 112.828 2.828l-8.5 8.5-3.75.922.922-3.75 8.5-8.5z" /></svg>
                          </button>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-slate-400">
                          {statusLabel || '目前股價'}
                        </p>
                        <p className="mt-1 font-mono text-xs font-bold text-slate-700">
                          {marketPrice == null ? '—' : fmtCurrency(marketPrice, currency, false, 2)}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto md:block" style={{ maxHeight: `${posContainerMaxHeight}px`, overflowY: 'auto' }}>
              <table className="w-full min-w-[960px] text-center">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-400 sticky top-0 z-10 shadow-sm">
                  <tr className="h-12">
                    <th className="px-4 py-3 align-middle text-left whitespace-nowrap">股票</th>
                    <th className="px-4 py-3 align-middle whitespace-nowrap">持有股數</th>
                    <th className="px-4 py-3 align-middle whitespace-nowrap">成本價 {posTab === 'US' && `(${displayCurrency})`}</th>
                    <th className="px-4 py-3 align-middle whitespace-nowrap">現價 {posTab === 'US' && `(${displayCurrency})`}</th>
                    <th className="px-4 py-3 align-middle whitespace-nowrap">投資成本 {posTab === 'US' && `(${displayCurrency})`}</th>
                    <th className="px-4 py-3 align-middle whitespace-nowrap">帳面現值 {posTab === 'US' && `(${displayCurrency})`}</th>
                    <th className="px-4 py-3 align-middle whitespace-nowrap">未實現損益 {posTab === 'US' && `(${displayCurrency})`}</th>
                    <th className="px-4 py-3 align-middle whitespace-nowrap">損益率</th>
                    <th className="px-4 py-3 align-middle whitespace-nowrap">市值佔比</th>
                  </tr>
                </thead>
                <tbody>
                  {activePositions.map((pos) => {
                    const sharePercent =
                      currentTabRawTotalValue > 0 ? (pos.marketValue / currentTabRawTotalValue) * 100 : 0;
                    const nameParts = pos.name.split(' ');
                    const displayName = nameParts.slice(1).join(' ') || nameParts[0];

                    const isUSStock = pos.market === 'US';
                    const rate = isUSStock ? (usdToTwdRate || 1) : 1;
                    const currentDisplayCurrency = isUSStock ? displayCurrency : 'TWD';

                    const convertedAvgCost = isUSStock && displayCurrency === 'TWD' ? pos.avgCost * rate : pos.avgCost;
                    const convertedMarketPrice = pos.marketPrice == null
                      ? null
                      : (isUSStock && displayCurrency === 'TWD' ? pos.marketPrice * rate : pos.marketPrice);
                    const convertedTotalBuyCost = isUSStock && displayCurrency === 'TWD' ? pos.totalBuyCost * rate : pos.totalBuyCost;
                    const convertedMarketValue = isUSStock && displayCurrency === 'TWD' ? pos.marketValue * rate : pos.marketValue;
                    const convertedUnrealizedProfit = pos.unrealizedProfit == null
                      ? null
                      : (isUSStock && displayCurrency === 'TWD' ? pos.unrealizedProfit * rate : pos.unrealizedProfit);

                    const profitPercent = pos.profitPercent;
                    const meta = quoteMeta[pos.name];
                    const statusLabel = quoteStatusLabel(meta?.status);

                    return (
                      <tr key={pos.name} className="h-14 border-t border-slate-100 hover:bg-slate-50/60 transition">
                        {/* 股票 */}
                        <td className="px-4 py-3 align-middle text-left">
                          <div className="text-xs font-bold text-slate-400">{pos.symbol}</div>
                          <div className="max-w-[180px] truncate text-sm text-slate-800">{displayName}</div>
                        </td>

                        {/* 持有股數 */}
                        <td className="px-4 py-3 align-middle font-mono text-sm text-slate-700">
                          {pos.holdingQty.toLocaleString()}
                        </td>

                        {/* 成本價 */}
                        <td className="px-4 py-3 align-middle font-mono text-sm text-slate-700">
                          {editingCostName === pos.name ? (
                            <div className="flex items-center justify-center gap-1" data-cost-editor>
                              <input
                                type="number"
                                value={costDraft}
                                onChange={(event) => setCostDraft(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' && hasCostChanged) requestCostSave(pos, rate, currentDisplayCurrency, displayName);
                                  if (event.key === 'Escape') cancelEditingCost();
                                }}
                                className="w-24 rounded-lg border border-rose-200 bg-white px-2 py-1 text-center font-mono text-sm outline-none focus:ring-2 focus:ring-rose-100"
                                min="0"
                                step="0.01"
                                autoFocus
                              />
                              {hasCostChanged && (
                                <button
                                  type="button"
                                  disabled={isSavingCost}
                                  onClick={() => requestCostSave(pos, rate, currentDisplayCurrency, displayName)}
                                  className="shrink-0 px-1 py-1 text-[10px] font-bold text-rose-500 transition hover:text-rose-600 disabled:opacity-50"
                                >
                                  儲存
                                </button>
                              )}
                            </div>
                          ) : (
                            <button type="button" onClick={() => startEditingCost(pos, convertedAvgCost)} className="inline-flex items-center gap-1 font-mono text-sm text-slate-700" aria-label={`修改 ${displayName} 平均成本`}>
                              {fmtCurrency(convertedAvgCost, currentDisplayCurrency, false, 2)}
                              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-slate-400" aria-hidden="true"><path d="M13.586 3.586a2 2 0 112.828 2.828l-8.5 8.5-3.75.922.922-3.75 8.5-8.5z" /></svg>
                            </button>
                          )}
                        </td>

                        {/* 現價（唯讀） */}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className="font-mono text-sm font-bold text-slate-700">
                              {convertedMarketPrice == null ? '—' : fmtCurrency(convertedMarketPrice, currentDisplayCurrency, false, 2)}
                            </span>
                            {statusLabel && (
                              <span
                                title={meta?.source ? `來源：${meta.source}` : '官方行情暫無回應，系統會自動重試'}
                                className="text-[9px] font-bold text-slate-400"
                              >
                                {statusLabel}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 投資成本 */}
                        <td className="px-4 py-3 align-middle font-mono text-sm text-slate-700">
                          {fmtCurrency(convertedTotalBuyCost, currentDisplayCurrency)}
                        </td>

                        {/* 帳面現值 */}
                        <td className="px-4 py-3 align-middle font-mono text-sm text-slate-700">
                          {pos.hasQuote ? fmtCurrency(convertedMarketValue, currentDisplayCurrency) : '—'}
                        </td>

                        {/* 未實現損益 */}
                        <td className={`px-4 py-3 align-middle font-mono text-sm font-bold ${convertedUnrealizedProfit == null ? 'text-slate-400' : convertedUnrealizedProfit >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {convertedUnrealizedProfit == null ? '—' : fmtCurrency(convertedUnrealizedProfit, currentDisplayCurrency, true)}
                        </td>

                        {/* 損益率 */}
                        <td className={`px-4 py-3 align-middle font-mono text-sm font-bold ${profitPercent == null ? 'text-slate-400' : profitPercent >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {profitPercent == null ? '—' : `${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%`}
                        </td>

                        {/* 市值佔比 + bar */}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center justify-center gap-2">
                            <span className="w-10 text-right font-mono text-xs text-slate-600">
                              {pos.hasQuote ? `${sharePercent.toFixed(1)}%` : '—'}
                            </span>
                            <div className="relative h-1 w-12 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="absolute left-0 top-0 h-full rounded-full bg-rose-400 transition-all duration-300"
                                style={{ width: `${pos.hasQuote ? Math.min(sharePercent, 100) : 0}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      </section>

      {/* ── Transaction History ── */}
      <section className="card overflow-hidden ring-1 ring-blue-100/70" aria-labelledby="transactions-heading">
        <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50/80 via-white to-white px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200 sm:h-11 sm:w-11 sm:rounded-2xl" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h10a2 2 0 012 2v16l-3.5-2-3.5 2-3.5-2L5 21V5a2 2 0 012-2zM9 8h6m-6 4h6" />
                </svg>
              </span>
              <h2 id="transactions-heading" className="whitespace-nowrap text-xl font-black tracking-tight text-slate-900 sm:text-2xl">歷史交易明細</h2>
            </div>
            <div className="grid w-full grid-cols-2 items-center gap-1 rounded-xl bg-slate-100 p-0.5 sm:flex sm:w-auto">
              <button onClick={() => setHistTab('TWSE')} className={tabBtnClass(histTab === 'TWSE')}>
                📈 台股
              </button>
              <button onClick={() => setHistTab('US')} className={tabBtnClass(histTab === 'US')}>
                🇺🇸 美股
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

        <div key={histTab} className="animate-in fade-in duration-500">
          {activeTx.length === 0 ? (
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
      </section>

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
              <p className="mt-2 text-xs leading-5 text-slate-400">儲存後會重新計算所有月份的投資成本與未實現損益，後續交易將接續新成本計算。</p>
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
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white shadow-sm shadow-rose-200 transition hover:bg-rose-600 disabled:opacity-50"
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
                className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white transition hover:bg-rose-600 shadow-sm shadow-rose-200 disabled:opacity-50 flex items-center justify-center gap-2"
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
