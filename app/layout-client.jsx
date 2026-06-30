'use client';

import { useState, useCallback, useEffect } from 'react';
import { TransactionModal, ConfigModal, Toast } from '@/components/Modals';
import { SettingsModal } from '@/components/SettingsModal';
import { ManageAccountsModal, CustomDialog } from '@/components/ManageModal';
import { assetBalances as initialAssets, transactions as initialTransactions, monthlyNetWorthData as initialMonthlyData, monthlyAssetsSnapshots as initialMonthlyAssets } from '@/lib/data';
import { demoMonthlyAssets, demoPortfolio } from '@/lib/demo-data';
import { AppProvider } from '@/lib/app-context';
import {
  appendTransactionToSheets,
  fetchMonthlyAssetsFromSheets,
  fetchSheetsData,
  removeTransactionFromSheets,
  saveMonthlyAssetsToSheets,
  testSheetsConnection,
  updateTransactionInSheets,
  upsertAssetsToSheets,
} from '@/lib/sheets-client';

const SHEETS_URL_STORAGE_KEY = 'my_assets_google_sheets_api_url';
const STOCK_FEE_SETTINGS_KEY = 'my_assets_stock_fee_settings';

const DEFAULT_STOCK_FEE_SETTINGS = {
  TWSE: {
    feeRate: 0.001425,
    feeDiscount: 0.6,
    minFee: 20,
    taxRate: 0.003,
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

  const [dialog, setDialog] = useState({ title: '', message: '', buttons: [] });
  const [assets, setAssets] = useState(initialAssets);
  const [transactions, setTransactions] = useState(() => {
    // 預設載入富含歷史記錄的 demo 交易資料並進行格式標準化，讓 Demo 模式下也能完整互動
    return (demoPortfolio?.transactionHistory || []).map((tx) => ({
      ...tx,
      stock: tx.stock || tx.name || '',
      qty: Number(tx.qty ?? tx.shares ?? 0),
      actualAmount: Number(tx.actualAmount ?? tx.amount ?? 0),
      price: Number(tx.price ?? 0),
    }));
  });
  const [monthlyNetWorth, setMonthlyNetWorth] = useState(initialMonthlyData);
  const [sheetsApiUrl, setSheetsApiUrl] = useState('');
  const [isSheetsConnected, setIsSheetsConnected] = useState(false);
  const [stockMarketPrices, setStockMarketPrices] = useState({});
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
      const response = await fetch('/api/exchange-rate');
      if (response.ok) {
        const data = await response.json();
        setUsdToTwdRate(data.usdToTwd);
      } else {
        console.error('Failed to fetch USD to TWD exchange rate');
        setUsdToTwdRate(null);
      }
    } catch (error) {
      console.error('Error fetching USD to TWD exchange rate:', error);
      setUsdToTwdRate(null);
    }
  }, []);

  const syncFromSheets = useCallback(async (apiUrl, { silent = false } = {}) => {
    if (!apiUrl) return;
    try {
      const data = await fetchSheetsData(apiUrl);
      if (Array.isArray(data.assets)) {
        setAssets(data.assets);
      }
      if (Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
      }
      if (data.stockMarketPrices && typeof data.stockMarketPrices === 'object') {
        setStockMarketPrices(data.stockMarketPrices);
      }
      if (data.lastMonthNetWorth !== undefined) {
        setLastMonthNetWorth(data.lastMonthNetWorth);
      }

      // 順便拉取月度資產快照，這樣切換年月時才能看到 Google Sheets 上真實儲存過的歷史資料
      try {
        const monthly = await fetchMonthlyAssetsFromSheets(apiUrl);
        setRealMonthlyAssets(monthly);
      } catch (monthlyError) {
        console.error('Error syncing monthly assets from sheets:', monthlyError);
        // 月度快照失敗不影響主要同步流程，僅記錄錯誤
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
      testSheetsConnection(storedUrl)
        .then(async (isConnected) => {
          if (isConnected) {
            setIsSheetsConnected(true);
            await syncFromSheets(storedUrl, { silent: true });
          } else {
            setIsSheetsConnected(false);
          }
        })
        .catch((error) => {
          console.error('Initial Sheets connection test failed:', error);
          setIsSheetsConnected(false);
        });
    }

    const storedSettings = window.localStorage.getItem(STOCK_FEE_SETTINGS_KEY);
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        setStockFeeSettings((prev) => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to parse stock fee settings from localStorage', e);
      }
    }

    fetchUsdToTwdRate();
  }, [syncFromSheets, fetchUsdToTwdRate]);

  const connectSheets = useCallback(async (apiUrl) => {
    const nextUrl = String(apiUrl || '').trim();
    const isConnected = await testSheetsConnection(nextUrl);

    if (!isConnected) {
      throw new Error('Google Sheets 連線測試失敗，請檢查 URL 或部署權限。');
    }

    window.localStorage.setItem(SHEETS_URL_STORAGE_KEY, nextUrl);
    setSheetsApiUrl(nextUrl);
    setIsSheetsConnected(true);
    await syncFromSheets(nextUrl, { silent: true });
    return true;
  }, [syncFromSheets]);

  const handleDisconnect = useCallback(() => {
    window.localStorage.removeItem(SHEETS_URL_STORAGE_KEY);
    setSheetsApiUrl('');
    setIsSheetsConnected(false);
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
    setIsSaveLoading(true);
    try {
      const { year, month } = manageModalContext;
      if (year && month) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const updatedMonthlyAssets = { ...monthlyAssets, [monthKey]: assets };
        setMonthlyAssets(updatedMonthlyAssets);

        if (isSheetsConnected) {
          await saveMonthlyAssetsToSheets(sheetsApiUrl, monthKey, assets);
          
          // 如果儲存的是當前月份，也同步更新 master assets 表，確保最新狀態一致，這樣重新載入時才不會因為 getAll 回傳空值而蓋掉欄位
          const today = new Date();
          if (Number(year) === today.getFullYear() && Number(month) === (today.getMonth() + 1)) {
            await saveAssetsToSheets(assets);
          }
        }
        displayToast(
          isSheetsConnected
            ? `✅ 已儲存 ${year}年${month}月 資產負債`
            : `已更新本機模擬資料（${year}年${month}月，尚未連線 Google Sheets，重新整理後會還原）`,
          'success'
        );
      } else {
        if (isSheetsConnected) {
          await saveAssetsToSheets(assets);
        }
        displayToast(isSheetsConnected ? '資產負債餘額已同步儲存 🐷' : '已更新本機資料（尚未連線 Google Sheets）', 'success');
      }
      setShowManageModal(false);
    } catch (error) {
      displayToast(`資產同步失敗：${error.message || '請稍後再試'}`, 'error');
    } finally {
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

    setAssets([
      ...assets,
      {
        id: 'new_' + Date.now(),
        category,
        name: '',
        balance: '',
        isLiability,
        ...(isForeign ? { currency: 'USD', amount: 0 } : {}),
      },
    ]);
  };

  const handleRemoveAsset = (index) => {
    setAssets(assets.filter((_, i) => i !== index));
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

  const handleCloseSettingsModal = useCallback(() => {
    setShowSettingsModal(false);
    if (settingsModalSource === 'fromTransactionModal') {
      setShowTransactionModal(true);
    }
    setSettingsModalSource(null);
  }, [settingsModalSource]);

  return (
    <AppProvider
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
      lastMonthNetWorth={lastMonthNetWorth}
      stockFeeSettings={stockFeeSettings}
      setMonthlyAssets={setMonthlyAssets}
      connectSheets={connectSheets}
      syncFromSheets={() => syncFromSheets(sheetsApiUrl)}
      saveAssetsToSheets={saveAssetsToSheets}
      addTransaction={addTransaction}
      removeTransaction={removeTransaction}
      saveStockFeeSettings={handleSaveSettings}
      usdToTwdRate={usdToTwdRate}
    >
      <div className="mx-auto max-w-7xl px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6" suppressHydrationWarning>{children}</div>

      {/* 記帳按鈕 */}
      <button
        onClick={() => setShowTransactionModal(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-rose-500 px-5 py-4 text-sm font-extrabold text-white shadow-lg transition hover:scale-105 hover:bg-rose-600 hover:shadow-rose-300 z-40"
      >
        🐷 記一筆股票
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
