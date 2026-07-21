'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useApp } from '@/lib/app-context';
import { calculateStockPortfolio } from '@/lib/calculations';
import { INDUSTRY_MAP } from '@/components/common/constants';
import { demoInitialPrices } from '@/lib/demo-stock-data';
import { normalizeStockSymbol } from '@/lib/stock-symbol';
import { calculateEstimatedSellFees } from '@/lib/trading-fees';
import { StockSummary } from '@/components/stocks/StockSummary';
import { MobileStockSectionNav } from '@/components/stocks/MobileStockSectionNav';
import { PositionsSection } from '@/components/stocks/PositionsSection';
import { TransactionsSection } from '@/components/stocks/TransactionsSection';
import { StockModals } from '@/components/stocks/StockModals';
import { POSITION_SORT_OPTIONS } from '@/components/stocks/stock-ui';

const LEGACY_INDUSTRY_SETTINGS_STORAGE_KEY = 'my-assets-industry-categories-v1';

function getLocalMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getSnapshotEffectiveAt(monthKey, now = new Date()) {
  if (monthKey === getLocalMonthKey(now)) return now.toISOString();
  const [year, month] = String(monthKey || '').split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return now.toISOString();
  return new Date(year, month, 0, 23, 59, 59, 999).toISOString();
}

function getMonthEndDateString(monthKey) {
  const [year, month] = String(monthKey || '').split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return '';
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

function normalizeIndustrySymbol(symbol) {
  return String(symbol || '').trim().toUpperCase();
}

function createDefaultIndustryCategories() {
  const groups = new Map();
  Object.entries(INDUSTRY_MAP).forEach(([symbol, industry]) => {
    if (!groups.has(industry)) groups.set(industry, []);
    groups.get(industry).push(normalizeIndustrySymbol(symbol));
  });
  return [...groups.entries()].map(([name, symbols]) => ({ name, symbols }));
}

function sanitizeIndustryCategories(categories) {
  if (!Array.isArray(categories)) return null;
  return categories.map((category) => ({
    name: String(category?.name || '').trim(),
    symbols: [...new Set((Array.isArray(category?.symbols) ? category.symbols : [])
      .map(normalizeIndustrySymbol)
      .filter(Boolean))],
  })).filter((category) => category.name);
}

function buildIndustryLookup(categories) {
  return (categories || []).reduce((lookup, category) => {
    category.symbols.forEach((symbol) => {
      lookup[normalizeIndustrySymbol(symbol)] = category.name;
    });
    return lookup;
  }, {});
}

function parseIndustrySymbols(value) {
  return [...new Set(String(value || '')
    .split(/[\s,，、;；]+/)
    .map(normalizeIndustrySymbol)
    .filter(Boolean))];
}

function buildBasePositions(txList, costBasisAdjustments = [], holdingSnapshots = []) {
  return calculateStockPortfolio(
    txList,
    {},
    costBasisAdjustments,
    {},
    holdingSnapshots
  ).positions;
}

const TW_LIVE_RETRY_STATUSES = new Set(['opening_price', 'previous_close', 'unavailable']);
const LIVE_QUOTE_FALLBACK_GRACE_MS = 10000;

function getPositionSortValue(position, sortKey) {
  if (sortKey === 'unrealizedProfit' || sortKey === 'profitPercent') {
    return position.hasQuote ? position[sortKey] : null;
  }
  return position[sortKey];
}

function isTwMarketRefreshWindow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type)?.value;
  const weekday = value('weekday');
  if (weekday === 'Sat' || weekday === 'Sun') return false;
  const hour = Number(value('hour')) % 24;
  const minute = Number(value('minute'));
  const minutes = hour * 60 + minute;
  return minutes >= 8 * 60 + 55 && minutes <= 13 * 60 + 35;
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
    stockHoldingSnapshots,
    saveStockHoldingSnapshots,
    industryCategories: savedIndustryCategories,
    saveIndustryCategories: saveIndustryCategoriesToSheet,
    displayToast,
    stockFeeSettings,
    setStockValuationMode,
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
  const [showIndustryEditor, setShowIndustryEditor] = useState(false);
  const [industryDrafts, setIndustryDrafts] = useState([]);
  const [expandedIndustryDraftId, setExpandedIndustryDraftId] = useState(null);
  const [industryEditorError, setIndustryEditorError] = useState('');
  const [isSavingIndustryCategories, setIsSavingIndustryCategories] = useState(false);
  const [isCompactIndustryChart, setIsCompactIndustryChart] = useState(false);
  const [editingCostName, setEditingCostName] = useState(null);
  const [costDraft, setCostDraft] = useState('');
  const [originalCostDraft, setOriginalCostDraft] = useState(null);
  const [pendingCostChange, setPendingCostChange] = useState(null);
  const [isSavingCost, setIsSavingCost] = useState(false);
  const [showHoldingSnapshotModal, setShowHoldingSnapshotModal] = useState(false);
  const [holdingSnapshotMonth, setHoldingSnapshotMonth] = useState(() => getLocalMonthKey());
  const [holdingDrafts, setHoldingDrafts] = useState([]);
  const [isSavingHoldingSnapshot, setIsSavingHoldingSnapshot] = useState(false);
  const [liveQuoteClock, setLiveQuoteClock] = useState(() => Date.now());
  const [fallbackQuoteFirstSeenAt, setFallbackQuoteFirstSeenAt] = useState({});

  const [posTab, setPosTab] = useState('TWSE');
  const [positionSortKey, setPositionSortKey] = useState('marketValue');
  const [positionSortDirection, setPositionSortDirection] = useState('desc');
  const [histTab, setHistTab] = useState('TWSE');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [yearHighlightedIndex, setYearHighlightedIndex] = useState(-1);
  const [monthHighlightedIndex, setMonthHighlightedIndex] = useState(-1);
  const [currentTxPage, setCurrentTxPage] = useState(1); // 交易紀錄分頁
  const [mobileSection, setMobileSection] = useState('positions');
  const mobileSectionScrollerRef = useRef(null);
  const mobileSectionCardRefs = useRef({});
  const mobileSectionScrollTimerRef = useRef(null);
  const mobileHintTimersRef = useRef([]);

  const industryCategories = useMemo(
    () => sanitizeIndustryCategories(savedIndustryCategories) || createDefaultIndustryCategories(),
    [savedIndustryCategories]
  );

  useEffect(() => {
    try {
      window.localStorage.removeItem(LEGACY_INDUSTRY_SETTINGS_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to remove legacy industry settings from localStorage', error);
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const updateChartMode = () => setIsCompactIndustryChart(mediaQuery.matches);
    updateChartMode();
    mediaQuery.addEventListener('change', updateChartMode);
    return () => mediaQuery.removeEventListener('change', updateChartMode);
  }, []);

  const openIndustryCategoryEditor = () => {
    setIndustryDrafts(industryCategories.map((category, index) => ({
      id: `industry_${Date.now()}_${index}`,
      name: category.name,
      symbolsText: category.symbols.join(', '),
    })));
    setExpandedIndustryDraftId(null);
    setIndustryEditorError('');
    setShowIndustryEditor(true);
  };

  const updateIndustryDraft = (index, patch) => {
    setIndustryDrafts((drafts) => drafts.map((draft, draftIndex) => (
      draftIndex === index ? { ...draft, ...patch } : draft
    )));
    setIndustryEditorError('');
  };

  const saveIndustryCategories = async () => {
    const normalizedDrafts = industryDrafts.map((draft) => ({
      name: String(draft.name || '').trim(),
      symbols: parseIndustrySymbols(draft.symbolsText),
    }));
    if (normalizedDrafts.some((category) => !category.name)) {
      setIndustryEditorError('每個類別都需要填寫名稱。');
      return;
    }
    if (normalizedDrafts.length === 0) {
      setIndustryEditorError('至少需要保留一個產業類別。');
      return;
    }

    const categoryNames = new Set();
    const assignedSymbols = new Map();
    for (const category of normalizedDrafts) {
      const comparableName = category.name.toLocaleLowerCase('zh-Hant');
      if (categoryNames.has(comparableName)) {
        setIndustryEditorError(`類別「${category.name}」重複，請合併或重新命名。`);
        return;
      }
      categoryNames.add(comparableName);
      for (const symbol of category.symbols) {
        if (assignedSymbols.has(symbol)) {
          setIndustryEditorError(`股票代號 ${symbol} 同時出現在「${assignedSymbols.get(symbol)}」與「${category.name}」。`);
          return;
        }
        assignedSymbols.set(symbol, category.name);
      }
    }

    setIsSavingIndustryCategories(true);
    try {
      await saveIndustryCategoriesToSheet(normalizedDrafts);
      setSelectedIndustry(null);
      setShowIndustryEditor(false);
    } catch (error) {
      setIndustryEditorError(error.message || '產業分類保存失敗，請稍後再試。');
    } finally {
      setIsSavingIndustryCategories(false);
    }
  };

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
    () => buildBasePositions(transactions, costBasisAdjustments, stockHoldingSnapshots),
    [transactions, costBasisAdjustments, stockHoldingSnapshots]
  );
  const positionKeys = basePositions.map((p) => p.name).join('|');

  // 自動抓取新持股的報價
  useEffect(() => {
    if (isSheetsConnected) refreshStockPrices(basePositions);
  }, [basePositions, isSheetsConnected, positionKeys, refreshStockPrices]);

  useEffect(() => {
    if (Object.values(quoteMeta).some((meta) => TW_LIVE_RETRY_STATUSES.has(meta?.status))) {
      setLiveQuoteClock(Date.now());
    }
    setFallbackQuoteFirstSeenAt((prev) => {
      const next = { ...prev };
      let changed = false;
      Object.entries(quoteMeta).forEach(([name, meta]) => {
        if (TW_LIVE_RETRY_STATUSES.has(meta?.status)) {
          if (!next[name]) {
            next[name] = Number(meta?.fetchedAt) || Date.now();
            changed = true;
          }
        } else if (next[name]) {
          delete next[name];
          changed = true;
        }
      });
      Object.keys(next).forEach((name) => {
        if (!quoteMeta[name]) {
          delete next[name];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [quoteMeta]);

  useEffect(() => {
    const pendingFallbacks = Object.entries(fallbackQuoteFirstSeenAt)
      .map(([, firstSeenAt]) => LIVE_QUOTE_FALLBACK_GRACE_MS - (liveQuoteClock - firstSeenAt))
      .filter((remainingMs) => remainingMs > 0);
    if (pendingFallbacks.length === 0) return undefined;
    const timer = setTimeout(() => setLiveQuoteClock(Date.now()), Math.min(...pendingFallbacks));
    return () => clearTimeout(timer);
  }, [fallbackQuoteFirstSeenAt, liveQuoteClock]);

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

  const createEmptyHoldingDraft = () => ({
    id: `holding_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    market: posTab === 'US' ? 'US' : 'TWSE',
    symbol: '',
    stock: '',
    holdingQty: '',
    avgCost: '',
    note: '',
  });

  const buildHoldingDraftsForMonth = (monthKey) => {
    const positions = monthKey === getLocalMonthKey()
      ? basePositions
      : calculateStockPortfolio(
        transactions,
        {},
        costBasisAdjustments,
        {},
        stockHoldingSnapshots,
        { cutoffDate: getMonthEndDateString(monthKey), cutoffMonth: monthKey }
      ).positions;
    return positions.map((position) => ({
      id: `holding_${monthKey}_${position.symbol || position.name}`,
      market: position.market || 'TWSE',
      symbol: position.symbol || normalizeStockSymbol(position.name.split(' ')[0], position.name, position.market),
      stock: position.name,
      holdingQty: String(position.holdingQty ?? ''),
      avgCost: String(position.avgCost ?? ''),
      note: position.note || '',
    }));
  };

  const openHoldingSnapshotEditor = () => {
    const currentMonthKey = getLocalMonthKey();
    // 每次都以「目前計算出的完整持股」開啟，確保同月快照後新增的交易也出現在下一次校正中。
    const sourceRows = buildHoldingDraftsForMonth(currentMonthKey);

    setHoldingSnapshotMonth(currentMonthKey);
    setHoldingDrafts(sourceRows.length > 0 ? sourceRows : [createEmptyHoldingDraft()]);
    setShowHoldingSnapshotModal(true);
  };

  const updateHoldingDraft = (index, patch) => {
    setHoldingDrafts((rows) => rows.map((row, rowIndex) => (
      rowIndex === index ? { ...row, ...patch } : row
    )));
  };

  const saveHoldingSnapshotDrafts = async () => {
    const effectiveAt = getSnapshotEffectiveAt(holdingSnapshotMonth);
    const enteredRows = holdingDrafts
      .map((row) => {
        const stock = String(row.stock || '').trim();
        const market = row.market === 'US' ? 'US' : 'TWSE';
        return {
          ...row,
          id: row.id || `holding_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          monthKey: holdingSnapshotMonth,
          market,
          symbol: normalizeStockSymbol(row.symbol || stock.split(' ')[0], stock, market),
          stock,
          holdingQty: Number(row.holdingQty) || 0,
          avgCost: Number(row.avgCost) || 0,
          note: String(row.note || ''),
          effectiveAt,
        };
      })
      .filter((row) => row.stock && row.holdingQty >= 0);
    const enteredStocks = new Set(enteredRows.map((row) => row.stock));
    const knownStocks = [...(transactions || []), ...(stockHoldingSnapshots || [])].reduce((map, item) => {
      const stock = String(item?.stock || '').trim();
      if (stock && !map.has(stock)) map.set(stock, item);
      return map;
    }, new Map());
    const closedRows = [...knownStocks.entries()]
      .filter(([stock]) => !enteredStocks.has(stock))
      .map(([stock, item]) => ({
        id: `holding_${holdingSnapshotMonth}_${item.symbol || stock}_closed`,
        monthKey: holdingSnapshotMonth,
        market: item.market === 'US' ? 'US' : 'TWSE',
        symbol: normalizeStockSymbol(item.symbol || stock.split(' ')[0], stock, item.market),
        stock,
        holdingQty: 0,
        avgCost: 0,
        note: '快照時已無持股',
        effectiveAt,
      }));
    const rows = [...enteredRows, ...closedRows];

    setIsSavingHoldingSnapshot(true);
    try {
      await saveStockHoldingSnapshots(holdingSnapshotMonth, rows);
      setShowHoldingSnapshotModal(false);
    } catch (error) {
      displayToast(`持股快照儲存失敗：${error.message || '請稍後再試'}`, 'error');
    } finally {
      setIsSavingHoldingSnapshot(false);
    }
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

  const usesNetLiquidationValue = stockFeeSettings?.valuationMode === 'net_liquidation';
  const valuationLabel = usesNetLiquidationValue ? '預估可取回' : '帳面現值';
  const valuationShareLabel = usesNetLiquidationValue ? '淨值占比' : '市值占比';

  const allPositions = basePositions.map((p) => {
    const marketPrice = priceMap[p.name] ?? null;
    const hasQuote = marketPrice !== null;
    const meta = quoteMeta[p.name];
    const fallbackFirstSeenAt = fallbackQuoteFirstSeenAt[p.name] || Number(meta?.fetchedAt) || 0;
    const isWaitingForRealtime = isSheetsConnected
      && p.market === 'TWSE'
      && hasQuote
      && TW_LIVE_RETRY_STATUSES.has(meta?.status)
      && liveQuoteClock - fallbackFirstSeenAt < LIVE_QUOTE_FALLBACK_GRACE_MS;
    const grossMarketValue = hasQuote ? p.holdingQty * marketPrice : 0;
    const estimatedSellFees = usesNetLiquidationValue
      ? calculateEstimatedSellFees({
          market: p.market,
          symbol: p.symbol,
          stock: p.name,
          marketValue: grossMarketValue,
          settings: stockFeeSettings?.[p.market] || {},
        }).total
      : 0;
    const marketValue = Math.max(0, grossMarketValue - estimatedSellFees);
    const unrealizedProfit = hasQuote ? marketValue - p.totalBuyCost : null;
    const profitPercent =
      hasQuote && p.totalBuyCost > 0 ? (unrealizedProfit / p.totalBuyCost) * 100 : null;
    const previousClose = Number(meta?.previousClose);
    const hasPreviousClose = Number.isFinite(previousClose) && previousClose > 0;
    const previousGrossMarketValue = hasPreviousClose ? previousClose * p.holdingQty : 0;
    const previousEstimatedSellFees = usesNetLiquidationValue && hasPreviousClose
      ? calculateEstimatedSellFees({
          market: p.market,
          symbol: p.symbol,
          stock: p.name,
          marketValue: previousGrossMarketValue,
          settings: stockFeeSettings?.[p.market] || {},
        }).total
      : 0;
    const previousValuation = Math.max(0, previousGrossMarketValue - previousEstimatedSellFees);
    const dailyProfit = hasQuote && hasPreviousClose ? marketValue - previousValuation : null;
    const dailyProfitPercent = hasQuote && hasPreviousClose && previousValuation > 0
      ? (dailyProfit / previousValuation) * 100
      : null;
    return {
      ...p,
      marketPrice,
      hasQuote,
      isWaitingForRealtime,
      grossMarketValue,
      estimatedSellFees,
      marketValue,
      unrealizedProfit,
      profitPercent,
      dailyProfit,
      dailyProfitPercent,
    };
  });

  const twsePositions = allPositions.filter((p) => p.market === 'TWSE');
  const usPositions = allPositions.filter((p) => p.market === 'US');
  const activePositions = [...(posTab === 'TWSE' ? twsePositions : usPositions)].sort((a, b) => {
    if (a.hasQuote !== b.hasQuote) return a.hasQuote ? -1 : 1;
    const aValue = getPositionSortValue(a, positionSortKey);
    const bValue = getPositionSortValue(b, positionSortKey);
    const aHasValue = Number.isFinite(aValue);
    const bHasValue = Number.isFinite(bValue);
    if (aHasValue !== bHasValue) return aHasValue ? -1 : 1;
    if (aHasValue && bHasValue && aValue !== bValue) {
      return positionSortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    return a.symbol.localeCompare(b.symbol, 'zh-Hant');
  });
  const selectedPositionSortOption = POSITION_SORT_OPTIONS.find((option) => option.value === positionSortKey);
  const activePositionSortOption = selectedPositionSortOption?.value === 'marketValue'
    ? { ...selectedPositionSortOption, label: valuationShareLabel }
    : selectedPositionSortOption;

  const retryableTwQuoteRevision = activePositions
    .filter((pos) => pos.market === 'TWSE' && TW_LIVE_RETRY_STATUSES.has(quoteMeta[pos.name]?.status))
    .map((pos) => `${pos.name}:${quoteMeta[pos.name]?.status}:${quoteMeta[pos.name]?.fetchedAt}`)
    .join('|');

  useEffect(() => {
    if (!isSheetsConnected || posTab !== 'TWSE' || !retryableTwQuoteRevision || !isTwMarketRefreshWindow()) {
      return undefined;
    }
    const timer = setTimeout(() => {
      const retryablePositions = activePositions.filter(
        (pos) => pos.market === 'TWSE' && TW_LIVE_RETRY_STATUSES.has(quoteMeta[pos.name]?.status)
      );
      if (retryablePositions.length > 0 && !isFetchingPrices) {
        refreshStockPrices(retryablePositions, { force: true });
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [activePositions, isFetchingPrices, isSheetsConnected, posTab, quoteMeta, refreshStockPrices, retryableTwQuoteRevision]);

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

  const totalEstimatedSellFees = useMemo(() => {
    return allPositions.reduce((sum, pos) => {
      const rate = pos.market === 'US' ? (usdToTwdRate || 1) : 1;
      return sum + pos.estimatedSellFees * rate;
    }, 0);
  }, [allPositions, usdToTwdRate]);

  const totalOverallUnrealized = totalOverallValue - totalOverallCost;
  const totalOverallReturnRate = totalOverallCost > 0 ? (totalOverallUnrealized / totalOverallCost) * 100 : 0;
  const hasCompleteDailyProfit = allPositions.length > 0 && allPositions.every((pos) => pos.dailyProfit != null);
  const totalOverallDailyProfit = hasCompleteDailyProfit
    ? allPositions.reduce((sum, pos) => {
      const rate = pos.market === 'US' ? (usdToTwdRate || 1) : 1;
      return sum + pos.dailyProfit * rate;
    }, 0)
    : null;
  const previousOverallValue = totalOverallDailyProfit == null ? null : totalOverallValue - totalOverallDailyProfit;
  const totalOverallDailyProfitPercent = previousOverallValue > 0
    ? (totalOverallDailyProfit / previousOverallValue) * 100
    : null;

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
  const industryLookup = useMemo(() => buildIndustryLookup(industryCategories), [industryCategories]);
  const industryData = useMemo(() => {
    const industryMap = {};
    activePositions.forEach((pos) => {
      const industry = industryLookup[normalizeIndustrySymbol(pos.symbol)] || '其他';
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
  }, [activePositions, displayCurrency, industryLookup, posTab, usdToTwdRate]);

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

  const scrollToMobileSection = (section, behavior = 'smooth') => {
    const scroller = mobileSectionScrollerRef.current;
    const card = mobileSectionCardRefs.current[section];
    if (!scroller || !card) return;
    setMobileSection(section);
    scroller.scrollTo({
      left: section === 'positions' ? 0 : scroller.scrollWidth - scroller.clientWidth,
      behavior,
    });
  };

  const handleMobileSectionScroll = () => {
    if (mobileSectionScrollTimerRef.current) {
      clearTimeout(mobileSectionScrollTimerRef.current);
    }
    mobileSectionScrollTimerRef.current = setTimeout(() => {
      const scroller = mobileSectionScrollerRef.current;
      if (!scroller) return;
      const viewportCenter = scroller.scrollLeft + scroller.clientWidth / 2;
      const sections = ['positions', 'transactions'];
      const closestSection = sections.reduce((closest, section) => {
        const card = mobileSectionCardRefs.current[section];
        const closestCard = mobileSectionCardRefs.current[closest];
        if (!card) return closest;
        if (!closestCard) return section;
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const closestCenter = closestCard.offsetLeft + closestCard.offsetWidth / 2;
        return Math.abs(cardCenter - viewportCenter) < Math.abs(closestCenter - viewportCenter)
          ? section
          : closest;
      }, 'positions');
      setMobileSection(closestSection);
    }, 100);
  };

  useEffect(() => {
    const isReady = !isAppInitializing && (!isSheetsConnected || hasRequiredPrices);
    if (!isReady || typeof window === 'undefined' || window.innerWidth >= 768) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const hintKey = 'stock_mobile_section_swipe_hint_seen';
    try {
      if (window.sessionStorage.getItem(hintKey)) return undefined;
      window.sessionStorage.setItem(hintKey, '1');
    } catch {
      // sessionStorage 不可用時仍可顯示一次提示動畫。
    }

    const scroller = mobileSectionScrollerRef.current;
    if (!scroller) return undefined;
    const moveTimer = setTimeout(() => {
      scroller.scrollTo({ left: 24, behavior: 'smooth' });
      const returnTimer = setTimeout(() => {
        scroller.scrollTo({ left: 0, behavior: 'smooth' });
      }, 650);
      mobileHintTimersRef.current.push(returnTimer);
    }, 550);
    mobileHintTimersRef.current.push(moveTimer);

    return () => {
      mobileHintTimersRef.current.forEach((timer) => clearTimeout(timer));
      mobileHintTimersRef.current = [];
    };
  }, [hasRequiredPrices, isAppInitializing, isSheetsConnected]);

  useEffect(() => () => {
    if (mobileSectionScrollTimerRef.current) clearTimeout(mobileSectionScrollTimerRef.current);
  }, []);

  const isPortfolioLoading = isAppInitializing
    || (isSheetsConnected && isFetchingPrices && !hasRequiredPrices);
  const isTransactionsLoading = isAppInitializing;

  return (
    <>
      <StockSummary {...{
        isPortfolioLoading, totalOverallValue, totalOverallCost, totalOverallUnrealized,
        totalOverallReturnRate, totalEstimatedSellFees, usesNetLiquidationValue,
        valuationMode: stockFeeSettings?.valuationMode, setStockValuationMode,
      }} />

      <MobileStockSectionNav {...{
        mobileSectionScrollerRef, handleMobileSectionScroll, mobileSectionCardRefs, mobileSection,
        scrollToMobileSection, isAppInitializing, allPositions,
      }} />

      <PositionsSection {...{
        mobileSection, isPortfolioLoading, totalOverallDailyProfit, totalOverallDailyProfitPercent,
        openHoldingSnapshotEditor, posTab, setPosTab, handleManualRefresh,
        isFetchingPrices, lastQuoteUpdatedAt, showChart, setShowChart, usdToTwdRate,
        displayCurrency, setDisplayCurrency, positionSortKey, setPositionSortKey,
        positionSortDirection, setPositionSortDirection,
        activePositionSortOption, currentTabTotalValue, industryData, isCompactIndustryChart,
        openIndustryCategoryEditor, selectedIndustry, setSelectedIndustry,
        activePositions, currentTabRawTotalValue, quoteMeta,
        editingCostName, costDraft, setCostDraft, hasCostChanged, requestCostSave,
        cancelEditingCost, isSavingCost, startEditingCost, posContainerMaxHeight,
        valuationLabel, valuationShareLabel, usesNetLiquidationValue,
      }} />

      <TransactionsSection {...{
        mobileSection, histTab, setHistTab, currentFilterYear,
        currentFilterMonth, selectedYear, setSelectedYear, selectedMonth, setSelectedMonth,
        showYearDropdown, setShowYearDropdown, showMonthDropdown, setShowMonthDropdown,
        yearHighlightedIndex, setYearHighlightedIndex, monthHighlightedIndex,
        setMonthHighlightedIndex, yearOptions, yearLabel, monthOptions, monthLabel,
        isTransactionsLoading, activeTx, paginatedTx,
        openTransactionModal, setDeleteId, totalTxPages, currentTxPage, setCurrentTxPage,
      }} />

      <StockModals {...{
        showIndustryEditor, isSavingIndustryCategories, setShowIndustryEditor, isSheetsConnected,
        industryDrafts, parseIndustrySymbols, expandedIndustryDraftId, setExpandedIndustryDraftId,
        updateIndustryDraft, setIndustryDrafts, setIndustryEditorError,
        createDefaultIndustryCategories, activePositions, industryEditorError,
        saveIndustryCategories, showHoldingSnapshotModal, isSavingHoldingSnapshot,
        setShowHoldingSnapshotModal, holdingSnapshotMonth, setHoldingSnapshotMonth,
        buildHoldingDraftsForMonth, setHoldingDrafts, createEmptyHoldingDraft, getLocalMonthKey,
        holdingDrafts, updateHoldingDraft, saveHoldingSnapshotDrafts,
        pendingCostChange, isSavingCost, setPendingCostChange, saveEditedCost, deleteId,
        isDeleting, setDeleteId, confirmDelete,
      }} />
    </>
  );
}
