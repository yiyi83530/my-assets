'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { TransactionModal, ConfigModal, Toast } from '@/components/Modals';
import { SettingsModal } from '@/components/SettingsModal';
import { ManageAccountsModal, CustomDialog } from '@/components/ManageModal';
import { assetBalances as initialAssets, transactions as initialTransactions, monthlyNetWorthData as initialMonthlyData, monthlyAssetsSnapshots as initialMonthlyAssets, stockHoldingSnapshots as initialStockHoldingSnapshots } from '@/lib/data';
import { demoMonthlyAssets } from '@/lib/demo-data';
import { demoTransactions } from '@/lib/demo-stock-data';
import { AppProvider } from '@/lib/app-context';
import { fetchForeignExchangeRates } from '@/lib/calculations';
import { TWSE_COMMISSION_RATE, TWSE_STOCK_TAX_RATE } from '@/lib/trading-fees';
import {
  appendTransactionToSheets,
  fetchMonthlyAssetsFromSheets,
  fetchSheetsData,
  removeTransactionFromSheets,
  saveIndustryCategoriesToSheets,
  saveMonthlyAssetsToSheets,
  saveStockHoldingSnapshotsToSheets,
  updateTransactionInSheets,
  upsertCostBasisAdjustmentInSheets,
  upsertAssetsToSheets,
} from '@/lib/sheets-client';

const SHEETS_URL_STORAGE_KEY = 'my_assets_google_sheets_api_url';
const STOCK_FEE_SETTINGS_KEY = 'my_assets_stock_fee_settings';
const COST_BASIS_ADJUSTMENTS_KEY = 'my_assets_cost_basis_adjustments';
const LIVE_DATA_CACHE_MS = 5 * 60 * 1000;
const STOCK_QUOTE_TIMEOUT_MS = 8000;

function hasAssetContent(asset) {
  const name = String(asset?.name || '').trim();
  const rawAmount = asset?.category === '外幣活存'
    ? (asset?.amount ?? asset?.balance)
    : asset?.balance;
  const amount = Number(rawAmount);

  return Boolean(name) || (Number.isFinite(amount) && amount !== 0);
}

function getAssetDedupKey(asset) {
  const id = String(asset?.id || '').trim();
  if (id) return `id:${id}`;

  const category = String(asset?.category || '台幣活存').trim();
  const name = String(asset?.name || '').trim();
  const currency = String(asset?.currency || '').trim().toUpperCase();
  const isLiability = category === '負債項目' || asset?.isLiability === true || String(asset?.isLiability).toLowerCase() === 'true';
  const balance = Number(asset?.balance) || 0;
  const amount = Number(asset?.amount ?? asset?.balance) || 0;
  return `content:${category}|${name}|${currency}|${isLiability}|${balance}|${amount}`;
}

function dedupeAssets(assets = []) {
  return [...assets.reduce((itemsByKey, asset) => {
    itemsByKey.set(getAssetDedupKey(asset), asset);
    return itemsByKey;
  }, new Map()).values()];
}

async function fetchJsonWithTimeout(url, timeoutMs = STOCK_QUOTE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

const DEFAULT_STOCK_FEE_SETTINGS = {
  valuationMode: 'market_value',
  TWSE: {
    feeRate: TWSE_COMMISSION_RATE,
    feeDiscount: 0.6,
    minFee: 20,
    taxRate: TWSE_STOCK_TAX_RATE,
    currency: 'TWD',
  },
  US: {
    feeRate: 0, // Many US brokers have zero commission for stocks
    feeDiscount: 1, // Full discount if feeRate is 0
    minFee: 0,
    taxRate: 0, // No transaction tax for selling US stocks (federal level)
    currency: 'USD',
  },
};

export default function RootLayoutClient({ children }) {
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsModalSource, setSettingsModalSource] = useState(null); // 'fromTransactionModal' or null
  const [manageModalContext, setManageModalContext] = useState({ year: null, month: null });
  const [showDialog, setShowDialog] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isSaveLoading, setIsSaveLoading] = useState(false); // For ManageAccountsModal
  const [isTransactionSaving, setIsTransactionSaving] = useState(false); // For TransactionModal
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [isAppInitializing, setIsAppInitializing] = useState(true);

  const [dialog, setDialog] = useState({ title: '', message: '', buttons: [] });
  const [assets, setAssets] = useState(initialAssets);
  const [transactions, setTransactions] = useState(() => demoTransactions.map((tx) => ({ ...tx })));
  const [monthlyNetWorth, setMonthlyNetWorth] = useState(initialMonthlyData);
  const [sheetsApiUrl, setSheetsApiUrl] = useState('');
  const [isSheetsConnected, setIsSheetsConnected] = useState(false);
  const [stockMarketPrices, setStockMarketPrices] = useState({});
  const [stockMonthlyClosePrices, setStockMonthlyClosePrices] = useState({});
  const [realStockHoldingSnapshots, setRealStockHoldingSnapshots] = useState(initialStockHoldingSnapshots);
  const [localDemoStockHoldingSnapshots, setLocalDemoStockHoldingSnapshots] = useState([]);
  const [stockQuoteMeta, setStockQuoteMeta] = useState({});
  const [isStockPricesLoading, setIsStockPricesLoading] = useState(false);
  const [exchangeRates, setExchangeRates] = useState({});
  const quoteFetchedAtRef = useRef(new Map());
  const quotePendingRef = useRef(new Set());
  const monthlyQuoteFetchedRef = useRef(new Set());
  const monthlyQuotePendingRef = useRef(new Set());
  const exchangeRateFetchedAtRef = useRef(new Map());
  const exchangeRatePendingRef = useRef(new Set());
  const saveAssetsInProgressRef = useRef(false);
  const [costBasisAdjustments, setCostBasisAdjustments] = useState([]);
  const [industryCategories, setIndustryCategories] = useState(null);
  const [lastMonthNetWorth, setLastMonthNetWorth] = useState(0);
  const [stockFeeSettings, setStockFeeSettings] = useState(DEFAULT_STOCK_FEE_SETTINGS);
  const [usdToTwdRate, setUsdToTwdRate] = useState(null);

  // 真實月度資產（連線 Google Sheets 後才會有內容；未連線時維持空物件）
  const [realMonthlyAssets, setRealMonthlyAssets] = useState(initialMonthlyAssets);
  // demo 模式下的「本機模擬」月度資產，初始值＝demo 假資料，使用者編輯只會改到這份，不會動到 realMonthlyAssets
  const [localDemoMonthlyAssets, setLocalDemoMonthlyAssets] = useState(demoMonthlyAssets);

  // 依目前連線狀態決定「管理帳戶」實際讀寫的是哪一份資料
  const monthlyAssets = isSheetsConnected ? realMonthlyAssets : localDemoMonthlyAssets;
  const setMonthlyAssets = isSheetsConnected ? setRealMonthlyAssets : setLocalDemoMonthlyAssets;
  const stockHoldingSnapshots = isSheetsConnected ? realStockHoldingSnapshots : localDemoStockHoldingSnapshots;
  const setStockHoldingSnapshots = isSheetsConnected ? setRealStockHoldingSnapshots : setLocalDemoStockHoldingSnapshots;

  const displayToast = useCallback((msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);

  const displayDialog = useCallback((title, message, buttons) => {
    setDialog({ title, message, buttons });
    setShowDialog(true);
  }, []);

  const fetchUsdToTwdRate = useCallback(async () => {
    try {
      const data = await fetchJsonWithTimeout('/api/exchange-rate');
      setUsdToTwdRate(data.usdToTwd);
      if (Number(data.usdToTwd) > 0) {
        setExchangeRates((prev) => ({ ...prev, USD: Number(data.usdToTwd) }));
        exchangeRateFetchedAtRef.current.set('USD', Date.now());
      }
    } catch (error) {
      console.error('Error fetching USD to TWD exchange rate:', error);
      setUsdToTwdRate(null);
    }
  }, []);

  const refreshExchangeRates = useCallback(async (currencies = [], { force = false } = {}) => {
    const now = Date.now();
    const normalized = [...new Set(currencies.map((currency) => String(currency || '').trim().toUpperCase()).filter(Boolean))];
    const toFetch = normalized.filter((currency) => {
      if (exchangeRatePendingRef.current.has(currency)) return false;
      const fetchedAt = exchangeRateFetchedAtRef.current.get(currency) || 0;
      return force || now - fetchedAt >= LIVE_DATA_CACHE_MS;
    });
    if (toFetch.length === 0) return;

    toFetch.forEach((currency) => exchangeRatePendingRef.current.add(currency));
    try {
      const rates = await fetchForeignExchangeRates(toFetch);
      setExchangeRates((prev) => ({ ...prev, ...rates }));
      const fetchedAt = Date.now();
      toFetch.forEach((currency) => exchangeRateFetchedAtRef.current.set(currency, fetchedAt));
    } finally {
      toFetch.forEach((currency) => exchangeRatePendingRef.current.delete(currency));
    }
  }, []);

  const refreshStockPrices = useCallback(async (targets = [], { force = false } = {}) => {
    if (!isSheetsConnected) return;
    const now = Date.now();
    const uniqueTargets = [...new Map(targets.filter((target) => target?.name && target?.symbol).map((target) => [target.name, target])).values()];
    const toFetch = uniqueTargets.filter((target) => {
      if (quotePendingRef.current.has(target.name)) return false;
      const fetchedAt = quoteFetchedAtRef.current.get(target.name) || 0;
      return force || now - fetchedAt >= LIVE_DATA_CACHE_MS;
    });
    if (toFetch.length === 0) return;

    toFetch.forEach((target) => quotePendingRef.current.add(target.name));
    setIsStockPricesLoading(true);
    try {
      const requestQuote = async (target) => {
        let data = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          data = await fetchJsonWithTimeout(`/api/stocks/quote?symbol=${encodeURIComponent(target.symbol)}&market=${target.market}`);
          if (data.price != null) break;
        }
        return { name: target.name, ...data };
      };
      const results = await Promise.allSettled(toFetch.map(requestQuote));
      const nextPrices = {};
      const nextMeta = {};
      const fetchedAt = Date.now();
      results.forEach((result, index) => {
        const name = toFetch[index].name;
        quoteFetchedAtRef.current.set(name, fetchedAt);
        if (result.status === 'fulfilled' && result.value.price != null) {
          nextPrices[name] = result.value.price;
          nextMeta[name] = { status: result.value.status, limitStatus: result.value.limitStatus, previousClose: result.value.previousClose, source: result.value.source, asOf: result.value.asOf, fetchedAt };
        } else {
          nextMeta[name] = { status: 'unavailable', source: null, asOf: null, fetchedAt };
        }
      });
      if (Object.keys(nextPrices).length > 0) {
        setStockMarketPrices((prev) => ({ ...prev, ...nextPrices }));
      }
      setStockQuoteMeta((prev) => ({ ...prev, ...nextMeta }));
    } finally {
      toFetch.forEach((target) => quotePendingRef.current.delete(target.name));
      setIsStockPricesLoading(false);
    }
  }, [isSheetsConnected]);

  const refreshMonthlyStockClosePrices = useCallback(async (targets = [], monthKeys = [], { force = false } = {}) => {
    if (!isSheetsConnected) return;

    const normalizedTargets = [...new Map(
      targets
        .filter((target) => target?.name && target?.symbol)
        .map((target) => [target.name, target])
    ).values()];
    const normalizedMonths = [...new Set(
      monthKeys
        .map((monthKey) => String(monthKey || '').trim())
        .filter((monthKey) => /^\d{4}-\d{2}$/.test(monthKey))
    )];

    const requests = [];
    normalizedMonths.forEach((monthKey) => {
      normalizedTargets.forEach((target) => {
        const requestKey = `${monthKey}:${target.name}`;
        if (!force && stockMonthlyClosePrices?.[monthKey]?.[target.name] != null) {
          monthlyQuoteFetchedRef.current.add(requestKey);
          return;
        }
        if (!force && monthlyQuoteFetchedRef.current.has(requestKey)) return;
        if (monthlyQuotePendingRef.current.has(requestKey)) return;
        monthlyQuotePendingRef.current.add(requestKey);
        requests.push({ monthKey, target, requestKey });
      });
    });
    if (requests.length === 0) return;

    try {
      const requestQuote = async ({ monthKey, target, requestKey }) => {
        const data = await fetchJsonWithTimeout(
          `/api/stocks/month-close?symbol=${encodeURIComponent(target.symbol)}&market=${target.market}&month=${monthKey}`
        );
        return { monthKey, name: target.name, requestKey, ...data };
      };
      const results = await Promise.allSettled(requests.map(requestQuote));
      const nextMonthlyPrices = {};

      results.forEach((result, index) => {
        const request = requests[index];
        monthlyQuoteFetchedRef.current.add(request.requestKey);
        if (result.status === 'fulfilled' && result.value.price != null) {
          if (!nextMonthlyPrices[result.value.monthKey]) {
            nextMonthlyPrices[result.value.monthKey] = {};
          }
          nextMonthlyPrices[result.value.monthKey][result.value.name] = result.value.price;
        }
      });

      if (Object.keys(nextMonthlyPrices).length > 0) {
        setStockMonthlyClosePrices((prev) => {
          const merged = { ...prev };
          Object.entries(nextMonthlyPrices).forEach(([monthKey, prices]) => {
            merged[monthKey] = { ...(merged[monthKey] || {}), ...prices };
          });
          return merged;
        });
      }
    } finally {
      requests.forEach((request) => monthlyQuotePendingRef.current.delete(request.requestKey));
    }
  }, [isSheetsConnected, stockMonthlyClosePrices]);

  const syncFromSheets = useCallback(async (apiUrl, { silent = false } = {}) => {
    if (!apiUrl) return;
    try {
      const data = await fetchSheetsData(apiUrl);
      const latestAssets = Array.isArray(data.assets) ? data.assets : [];
      setAssets(latestAssets);
      if (Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
      }
      if (Array.isArray(data.costBasisAdjustments)) {
        setCostBasisAdjustments(data.costBasisAdjustments);
        window.localStorage.setItem(COST_BASIS_ADJUSTMENTS_KEY, JSON.stringify(data.costBasisAdjustments));
      }
      if (Array.isArray(data.stockHoldingSnapshots)) {
        setRealStockHoldingSnapshots(data.stockHoldingSnapshots);
      }
      setIndustryCategories(Array.isArray(data.industryCategories) ? data.industryCategories : null);
      if (data.stockMarketPrices && typeof data.stockMarketPrices === 'object') {
        setStockMarketPrices(data.stockMarketPrices);
      }
      if (data.stockMonthlyClosePrices && typeof data.stockMonthlyClosePrices === 'object') {
        setStockMonthlyClosePrices(data.stockMonthlyClosePrices);
      }
      if (data.lastMonthNetWorth !== undefined) {
        setLastMonthNetWorth(data.lastMonthNetWorth);
      }

      // 順便拉取月度資產快照，這樣切換年月時才能看到 Google Sheets 上真實儲存過的歷史資料
      try {
        const monthly = await fetchMonthlyAssetsFromSheets(apiUrl);
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const hasCurrentMonthAssets = Array.isArray(monthly[currentMonthKey])
          && monthly[currentMonthKey].length > 0;

        // 舊版只把最新資料存在 assets 工作表。若當月尚無月度快照，先用 assets
        // 作為畫面 fallback；使用者按儲存後才會正式寫入 monthly_assets。
        setRealMonthlyAssets(
          !hasCurrentMonthAssets && latestAssets.length > 0
            ? { ...monthly, [currentMonthKey]: latestAssets }
            : monthly
        );
      } catch (monthlyError) {
        console.error('Error syncing monthly assets from sheets:', monthlyError);
        // 舊 Apps Script 若尚未支援 monthly_assets，仍顯示 assets 工作表的最新資料。
        if (latestAssets.length > 0) {
          const now = new Date();
          const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          setRealMonthlyAssets({ [currentMonthKey]: latestAssets });
        }
      }

      if (!silent) {
        displayToast('已從 Google Sheets 讀取最新資料', 'success');
      }
    } catch (error) {
      console.error('Error syncing from sheets:', error);
      if (!silent) {
        displayToast(`從 Google Sheets 同步失敗: ${error.message || '請檢查連線'}`, 'error');
      }
      throw error;
    }
  }, [displayToast]);

  useEffect(() => {
    const storedUrl = window.localStorage.getItem(SHEETS_URL_STORAGE_KEY) || '';
    if (storedUrl) {
      setSheetsApiUrl(storedUrl);
      syncFromSheets(storedUrl, { silent: true })
        .then(() => {
          setIsSheetsConnected(true);
        })
        .catch((error) => {
          console.error('Initial Sheets connection test failed:', error);
          setIsSheetsConnected(false);
        })
        .finally(() => setIsAppInitializing(false));
    } else {
      setIsAppInitializing(false);
    }

    const storedSettings = window.localStorage.getItem(STOCK_FEE_SETTINGS_KEY);
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        const storedUs = parsed?.US || {};
        const hasLegacyUsDefaultsBug = Number(storedUs.feeRate) === 0.001425
          && Number(storedUs.feeDiscount) === 0.6
          && Number(storedUs.minFee) === 20
          && Number(storedUs.taxRate) === 0.003;
        const normalizedSettings = hasLegacyUsDefaultsBug
          ? { ...parsed, US: DEFAULT_STOCK_FEE_SETTINGS.US }
          : parsed;
        setStockFeeSettings((prev) => ({ ...prev, ...normalizedSettings }));
        if (hasLegacyUsDefaultsBug) {
          window.localStorage.setItem(STOCK_FEE_SETTINGS_KEY, JSON.stringify(normalizedSettings));
        }
      } catch (e) {
        console.error('Failed to parse stock fee settings from localStorage', e);
      }
    }

    const storedAdjustments = window.localStorage.getItem(COST_BASIS_ADJUSTMENTS_KEY);
    if (storedAdjustments) {
      try {
        const parsed = JSON.parse(storedAdjustments);
        setCostBasisAdjustments(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        console.error('Failed to parse cost basis adjustments', error);
      }
    }

    fetchUsdToTwdRate();
  }, [syncFromSheets, fetchUsdToTwdRate]);

  const addCostBasisAdjustment = useCallback(async (adjustment) => {
    const value = Number(adjustment?.avgCost);
    if (!adjustment?.stock || !Number.isFinite(value) || value < 0) {
      throw new Error('請輸入有效的平均成本');
    }
    const nextAdjustment = {
      ...adjustment,
      id: adjustment.id || `cost_${Date.now()}`,
      effectiveAt: adjustment.effectiveAt || new Date().toISOString(),
      avgCost: value,
      holdingQty: Number(adjustment.holdingQty) || 0,
      totalCostBasis: value * (Number(adjustment.holdingQty) || 0),
    };
    const snapshot = costBasisAdjustments;
    const nextAdjustments = [...snapshot, nextAdjustment];
    setCostBasisAdjustments(nextAdjustments);
    window.localStorage.setItem(COST_BASIS_ADJUSTMENTS_KEY, JSON.stringify(nextAdjustments));
    try {
      if (isSheetsConnected && sheetsApiUrl) {
        await upsertCostBasisAdjustmentInSheets(sheetsApiUrl, nextAdjustment);
      }
      displayToast('成本基準已更新，後續交易將接續計算', 'success');
      return nextAdjustment;
    } catch (error) {
      setCostBasisAdjustments(snapshot);
      window.localStorage.setItem(COST_BASIS_ADJUSTMENTS_KEY, JSON.stringify(snapshot));
      throw error;
    }
  }, [costBasisAdjustments, displayToast, isSheetsConnected, sheetsApiUrl]);

  const saveStockHoldingSnapshots = useCallback(async (monthKey, snapshots) => {
    const key = String(monthKey || '').trim();
    if (!key) {
      throw new Error('缺少要儲存的月份');
    }

    const normalized = (Array.isArray(snapshots) ? snapshots : [])
      .filter((snapshot) => snapshot?.stock && Number(snapshot?.holdingQty) >= 0)
      .map((snapshot) => ({
        ...snapshot,
        monthKey: key,
        holdingQty: Number(snapshot.holdingQty) || 0,
        avgCost: Number(snapshot.avgCost) || 0,
        effectiveAt: String(snapshot.effectiveAt || ''),
      }));

    const snapshotBeforeSave = stockHoldingSnapshots;
    const nextSnapshots = [
      ...snapshotBeforeSave.filter((snapshot) => String(snapshot.monthKey || '').slice(0, 7) !== key),
      ...normalized,
    ];
    setStockHoldingSnapshots(nextSnapshots);

    try {
      if (isSheetsConnected && sheetsApiUrl) {
        await saveStockHoldingSnapshotsToSheets(sheetsApiUrl, key, normalized);
      }
      displayToast(
        isSheetsConnected
          ? `已儲存 ${key} 持股快照，後續交易會接續計算`
          : `已更新本機模擬持股快照（${key}，重新整理後會還原）`,
        'success'
      );
      return normalized;
    } catch (error) {
      setStockHoldingSnapshots(snapshotBeforeSave);
      throw error;
    }
  }, [displayToast, isSheetsConnected, setStockHoldingSnapshots, sheetsApiUrl, stockHoldingSnapshots]);

  const saveIndustryCategories = useCallback(async (categories) => {
    if (!isSheetsConnected || !sheetsApiUrl) {
      throw new Error('請先連接 Google Sheets，再保存產業分類');
    }
    const snapshot = industryCategories;
    const normalized = (Array.isArray(categories) ? categories : []).map((category) => ({
      name: String(category?.name || '').trim(),
      symbols: [...new Set((Array.isArray(category?.symbols) ? category.symbols : [])
        .map((symbol) => String(symbol || '').trim().toUpperCase())
        .filter(Boolean))],
    })).filter((category) => category.name);
    if (normalized.length === 0) {
      throw new Error('至少需要保留一個產業類別');
    }
    setIndustryCategories(normalized);
    try {
      await saveIndustryCategoriesToSheets(sheetsApiUrl, normalized);
      displayToast('產業分類已保存至 Google Sheets', 'success');
      return normalized;
    } catch (error) {
      setIndustryCategories(snapshot);
      throw error;
    }
  }, [displayToast, industryCategories, isSheetsConnected, sheetsApiUrl]);

  const connectSheets = useCallback(async (apiUrl) => {
    const nextUrl = String(apiUrl || '').trim();
    await syncFromSheets(nextUrl, { silent: true });
    window.localStorage.setItem(SHEETS_URL_STORAGE_KEY, nextUrl);
    setSheetsApiUrl(nextUrl);
    setIsSheetsConnected(true);
    return true;
  }, [syncFromSheets]);

  const handleDisconnect = useCallback(() => {
    window.localStorage.removeItem(SHEETS_URL_STORAGE_KEY);
    setSheetsApiUrl('');
    setIsSheetsConnected(false);
    setIndustryCategories(null);
    setTransactions(demoTransactions.map((tx) => ({ ...tx })));
    displayToast('已成功結束連線！', 'success');
  }, [displayToast]);

  const saveAssetsToSheets = useCallback(async (nextAssets) => {
    if (!sheetsApiUrl) {
      throw new Error('尚未設定 Google Sheets Web App URL');
    }
    await upsertAssetsToSheets(sheetsApiUrl, nextAssets);
  }, [sheetsApiUrl]);

  const addTransaction = useCallback(async (tx) => {
    const newTx = { ...tx, id: tx.id || `tx_${Date.now()}`, recordedAt: tx.recordedAt || new Date().toISOString() };
    setTransactions((prev) => [...prev, newTx]);
    if (isSheetsConnected && sheetsApiUrl) {
      await appendTransactionToSheets(sheetsApiUrl, newTx);
    }
    return newTx;
  }, [isSheetsConnected, sheetsApiUrl]);

  const editTransaction = useCallback(async (updatedTx) => {
    setTransactions((prev) =>
        prev.map((tx) => (tx.id === updatedTx.id ? updatedTx : tx))
    );
    try {
        if (isSheetsConnected && sheetsApiUrl) {
            await updateTransactionInSheets(sheetsApiUrl, updatedTx);
        }
    } catch (error) {
        // If sheet update fails, revert local state
        setTransactions((prev) => {
            const originalTx = transactions.find(t => t.id === updatedTx.id);
            return prev.map((tx) => (tx.id === updatedTx.id ? (originalTx || tx) : tx));
        });
        throw error;
    }
  }, [isSheetsConnected, sheetsApiUrl, transactions]);

  const removeTransaction = useCallback(async (id) => {
    let snapshot = [];
    setTransactions((prev) => {
      snapshot = prev;
      return prev.filter((tx) => tx.id !== id);
    });
    try {
      if (isSheetsConnected && sheetsApiUrl) {
        await removeTransactionFromSheets(sheetsApiUrl, id);
      }
    } catch (error) {
      setTransactions(snapshot);
      throw error;
    }
  }, [isSheetsConnected, sheetsApiUrl]);

  const handleTransactionSubmit = async (txData) => {
    setIsTransactionSaving(true);
    try {
      if (txData.id) {
          await editTransaction(txData);
          displayToast(`已成功更新 ${txData.stock} 交易！`, 'success');
      } else {
          await addTransaction(txData);
          displayToast(`已成功記錄 ${txData.stock} 交易！`, 'success');
      }
      setShowTransactionModal(false);
      setEditingTransaction(null);
    } catch (error) {
      displayToast(`交易儲存失敗：${error.message || '請稍後再試'}`, 'error');
    } finally {
      setIsTransactionSaving(false);
    }
  };

  const handleConfigConnect = async (apiUrl) => {
    try {
      await connectSheets(apiUrl);
      displayToast('連線成功🎉恭喜你已完成設定！', 'success');
      setTimeout(() => {
        setShowConfigModal(false);
      }, 1500);
    } catch (error) {
      setIsSheetsConnected(false);
      throw error;
    }
  };

  const handleSaveAssets = async () => {
    if (saveAssetsInProgressRef.current) return;
    saveAssetsInProgressRef.current = true;
    setIsSaveLoading(true);
    try {
      const assetsToSave = dedupeAssets(assets.filter(hasAssetContent));
      setAssets(assetsToSave);
      const { year, month } = manageModalContext;
      if (year && month) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const updatedMonthlyAssets = { ...monthlyAssets, [monthKey]: assetsToSave };
        setMonthlyAssets(updatedMonthlyAssets);

        if (isSheetsConnected) {
          // 如果儲存的是當前月份，也同步更新 master assets 表，確保最新狀態一致，這樣重新載入時才不會因為 getAll 回傳空值而蓋掉欄位
          const today = new Date();
          const shouldSyncCurrentAssets = Number(year) === today.getFullYear() && Number(month) === (today.getMonth() + 1);
          await Promise.all([
            saveMonthlyAssetsToSheets(sheetsApiUrl, monthKey, assetsToSave),
            ...(shouldSyncCurrentAssets ? [saveAssetsToSheets(assetsToSave)] : []),
          ]);
        }
        displayToast(
          isSheetsConnected
            ? `✅ 已儲存 ${year}年${month}月 資產負債`
            : `已更新本機模擬資料（${year}年${month}月，尚未連線 Google Sheets，重新整理後會還原）`,
          'success'
        );
      } else {
        if (isSheetsConnected) {
          await saveAssetsToSheets(assetsToSave);
        }
        displayToast(isSheetsConnected ? '資產負債餘額已同步儲存 🐷' : '已更新本機資料（尚未連線 Google Sheets）', 'success');
      }
      setShowManageModal(false);
    } catch (error) {
      displayToast(`資產同步失敗：${error.message || '請稍後再試'}`, 'error');
    } finally {
      saveAssetsInProgressRef.current = false;
      setIsSaveLoading(false);
    }
  };

  const handleUpdateAsset = (index, newData) => {
    const updated = [...assets];
    updated[index] = newData;
    setAssets(updated);
  };

  const handleAddNewAsset = (category = '台幣活存') => {
    const isForeign = category === '外幣活存';
    const isLiability = category === '負債項目';
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? `new_${crypto.randomUUID()}`
      : `new_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    setAssets([
      ...assets,
      {
        id,
        category,
        name: '',
        balance: '',
        isLiability,
        ...(isForeign ? { currency: 'USD', amount: 0 } : {}),
      },
    ]);
  };

  const handleRemoveAsset = (index, id) => {
    setAssets((prev) => {
      if (id) {
        return prev.filter((item) => String(item.id || '') !== String(id));
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSaveSettings = useCallback((market, newSettingsForMarket) => {
    setIsSettingsSaving(true);
    try {
      const updatedStockFeeSettings = {
        ...stockFeeSettings,
        [market]: {
          ...stockFeeSettings[market],
          ...newSettingsForMarket
        }
      };
      setStockFeeSettings(updatedStockFeeSettings);
      window.localStorage.setItem(STOCK_FEE_SETTINGS_KEY, JSON.stringify(updatedStockFeeSettings));
      displayToast('交易設定已更新！', 'success');
      setShowSettingsModal(false);
      if (settingsModalSource === 'fromTransactionModal') {
        setShowTransactionModal(true);
      }
    } catch (error) {
      displayToast('設定儲存失敗', 'error');
    } finally {
      setIsSettingsSaving(false);
      setSettingsModalSource(null);
    }
  }, [stockFeeSettings, displayToast, settingsModalSource]);

  const handleStockValuationModeChange = useCallback((valuationMode) => {
    const normalizedMode = valuationMode === 'net_liquidation' ? 'net_liquidation' : 'market_value';
    setStockFeeSettings((currentSettings) => {
      const updatedSettings = { ...currentSettings, valuationMode: normalizedMode };
      window.localStorage.setItem(STOCK_FEE_SETTINGS_KEY, JSON.stringify(updatedSettings));
      return updatedSettings;
    });
  }, []);

  const handleCloseSettingsModal = useCallback(() => {
    setShowSettingsModal(false);
    if (settingsModalSource === 'fromTransactionModal') {
      setShowTransactionModal(true);
    }
    setSettingsModalSource(null);
  }, [settingsModalSource]);

  return (
    <AppProvider
      isAppInitializing={isAppInitializing}
      openTransactionModal={(transaction = null) => {
        setEditingTransaction(transaction);
        setShowTransactionModal(true);
      }}
      openConfigModal={() => setShowConfigModal(true)}
      openSettingsModal={(source = null) => {
        setSettingsModalSource(source);
        setShowSettingsModal(true);
      }}
      openManageModal={(context) => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;

        let yearToSet = currentYear;
        let monthToSet = currentMonth;

        if (context && context.year && context.month) {
          const contextDate = new Date(context.year, context.month - 1);
          const currentDate = new Date(currentYear, currentMonth - 1);

          if (contextDate <= currentDate) {
            yearToSet = context.year;
            monthToSet = context.month;
          }
        }

        setManageModalContext({ year: yearToSet, month: monthToSet });

        // 載入對應月份的資料到 assets state
        // monthlyAssets 會依連線狀態自動指向 realMonthlyAssets 或 localDemoMonthlyAssets，兩邊與畫面顯示的資料來源保持一致
        const monthKey = `${yearToSet}-${String(monthToSet).padStart(2, '0')}`;
        
        let monthAssets = [];
        if (monthlyAssets[monthKey] && monthlyAssets[monthKey].length > 0) {
          monthAssets = JSON.parse(JSON.stringify(monthlyAssets[monthKey]));
        } else {
          // 找不到該月資料時，一路往前找最近一筆「真正有資料」的月份當作預設值（最多往前找 60 個月）
          let tempYear = yearToSet;
          let tempMonth = monthToSet;
          for (let i = 0; i < 60; i++) {
            if (tempMonth === 1) {
              tempYear -= 1;
              tempMonth = 12;
            } else {
              tempMonth -= 1;
            }
            const prevKey = `${tempYear}-${String(tempMonth).padStart(2, '0')}`;
            if (monthlyAssets[prevKey] && monthlyAssets[prevKey].length > 0) {
              // 複製上一月份的科目名稱做為模版，方便使用者填寫，不需要重頭新增欄位
              monthAssets = JSON.parse(JSON.stringify(monthlyAssets[prevKey]));
              break;
            }
          }
        }
        setAssets(monthAssets);

        setShowManageModal(true);
      }}
      displayToast={displayToast}
      displayDialog={displayDialog}
      isSheetsConnected={isSheetsConnected}
      sheetsApiUrl={sheetsApiUrl}
      assets={assets}
      transactions={transactions}
      monthlyNetWorth={monthlyNetWorth}
      monthlyAssets={monthlyAssets}
      stockMarketPrices={stockMarketPrices}
      stockMonthlyClosePrices={stockMonthlyClosePrices}
      stockHoldingSnapshots={stockHoldingSnapshots}
      industryCategories={industryCategories}
      stockQuoteMeta={stockQuoteMeta}
      isStockPricesLoading={isStockPricesLoading}
      refreshStockPrices={refreshStockPrices}
      refreshMonthlyStockClosePrices={refreshMonthlyStockClosePrices}
      exchangeRates={exchangeRates}
      refreshExchangeRates={refreshExchangeRates}
      costBasisAdjustments={costBasisAdjustments}
      lastMonthNetWorth={lastMonthNetWorth}
      stockFeeSettings={stockFeeSettings}
      setStockValuationMode={handleStockValuationModeChange}
      setMonthlyAssets={setMonthlyAssets}
      connectSheets={connectSheets}
      syncFromSheets={() => syncFromSheets(sheetsApiUrl)}
      saveAssetsToSheets={saveAssetsToSheets}
      addTransaction={addTransaction}
      removeTransaction={removeTransaction}
      addCostBasisAdjustment={addCostBasisAdjustment}
      saveStockHoldingSnapshots={saveStockHoldingSnapshots}
      saveIndustryCategories={saveIndustryCategories}
      saveStockFeeSettings={handleSaveSettings}
      usdToTwdRate={usdToTwdRate}
    >
      <div className="mx-auto max-w-7xl px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6" suppressHydrationWarning>{children}</div>

      {/* 記帳按鈕 */}
      <button
        onClick={() => setShowTransactionModal(true)}
        className="icon-label fixed bottom-6 right-6 flex items-center rounded-full bg-rose-500 px-5 py-4 text-sm font-extrabold text-white shadow-lg transition hover:scale-105 hover:bg-rose-600 hover:shadow-rose-300 z-40"
      >
        <span aria-hidden="true">🐷</span><span>記一筆股票</span>
      </button>

      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => {
          setShowTransactionModal(false);
          setEditingTransaction(null); // Clear editing transaction on close
        }}
        onSubmit={handleTransactionSubmit}
        initialData={editingTransaction}
        isSaving={isTransactionSaving}
      />
      <ConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onConnect={handleConfigConnect}
        onDisconnect={handleDisconnect}
        initialApiUrl={sheetsApiUrl}
        isConnected={isSheetsConnected}
      />
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={handleCloseSettingsModal}
        onSave={handleSaveSettings}
        initialSettings={stockFeeSettings}
        isSaving={isSettingsSaving}
      />

      <ManageAccountsModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        assets={assets}
        onSave={handleSaveAssets}
        onAddNew={handleAddNewAsset}
        onRemove={handleRemoveAsset}
        onUpdate={handleUpdateAsset}
        editingMonth={manageModalContext.year && manageModalContext.month ? `${manageModalContext.year}年${manageModalContext.month}月` : null}
        isSaving={isSaveLoading}
      />
      <CustomDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        title={dialog.title}
        message={dialog.message}
        buttons={dialog.buttons}
      />
      <Toast message={toastMessage} isVisible={showToast} type={toastType} />
    </AppProvider>
  );
}
