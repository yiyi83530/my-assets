'use client';

import { useState, useCallback, useEffect } from 'react';
import { TransactionModal, ConfigModal, Toast } from '@/components/Modals';
import { ManageAccountsModal, CustomDialog } from '@/components/ManageModal';
import { assetBalances as initialAssets, transactions as initialTransactions, monthlyNetWorthData as initialMonthlyData, monthlyAssetsSnapshots as initialMonthlyAssets } from '@/lib/data';
import { AppProvider } from '@/lib/app-context';
import {
  appendTransactionToSheets,
  fetchSheetsData,
  removeTransactionFromSheets,
  testSheetsConnection,
  upsertAssetsToSheets,
} from '@/lib/sheets-client';

const SHEETS_URL_STORAGE_KEY = 'my_assets_google_sheets_api_url';

export default function RootLayoutClient({ children }) {
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageModalContext, setManageModalContext] = useState({ year: null, month: null });
  const [showDialog, setShowDialog] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [dialog, setDialog] = useState({ title: '', message: '', buttons: [] });
  const [assets, setAssets] = useState(initialAssets);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [monthlyNetWorth, setMonthlyNetWorth] = useState(initialMonthlyData);
  const [monthlyAssets, setMonthlyAssets] = useState(initialMonthlyAssets);
  const [sheetsApiUrl, setSheetsApiUrl] = useState('');
  const [isSheetsConnected, setIsSheetsConnected] = useState(false);

  const displayToast = useCallback((msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);

  const displayDialog = useCallback((title, message, buttons) => {
    setDialog({ title, message, buttons });
    setShowDialog(true);
  }, []);

  const syncFromSheets = useCallback(async (apiUrl, { silent = false } = {}) => {
    if (!apiUrl) return;
    const data = await fetchSheetsData(apiUrl);
    if (Array.isArray(data.assets)) {
      setAssets(data.assets);
    }
    if (Array.isArray(data.transactions)) {
      setTransactions(data.transactions);
    }
    if (!silent) {
      displayToast('已從 Google Sheets 讀取最新資料');
    }
  }, [displayToast]);

  useEffect(() => {
    const stored = window.localStorage.getItem(SHEETS_URL_STORAGE_KEY) || '';
    if (!stored) return;

    setSheetsApiUrl(stored);
    testSheetsConnection(stored)
      .then(async () => {
        setIsSheetsConnected(true);
        await syncFromSheets(stored, { silent: true });
      })
      .catch(() => {
        setIsSheetsConnected(false);
      });
  }, [syncFromSheets]);

  const connectSheets = useCallback(async (apiUrl) => {
    const nextUrl = String(apiUrl || '').trim();
    await testSheetsConnection(nextUrl);
    window.localStorage.setItem(SHEETS_URL_STORAGE_KEY, nextUrl);
    setSheetsApiUrl(nextUrl);
    setIsSheetsConnected(true);
    await syncFromSheets(nextUrl, { silent: true });
    return true;
  }, [syncFromSheets]);

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
    try {
      await addTransaction(txData);
      displayToast(`已成功記錄 ${txData.stock} 交易！`);
      setShowTransactionModal(false);
    } catch (error) {
      displayToast(`交易儲存失敗：${error.message || '請稍後再試'}`);
    }
  };

  const handleConfigConnect = async (apiUrl) => {
    try {
      await connectSheets(apiUrl);
      displayToast('Google Sheets 連線成功，已同步資料！');
      setShowConfigModal(false);
    } catch (error) {
      setIsSheetsConnected(false);
      displayToast(`連線失敗：${error.message || '請檢查 URL 與部署權限'}`);
      throw error;
    }
  };

  const handleSaveAssets = async () => {
    try {
      const { year, month } = manageModalContext;
      if (year && month) {
        // 儲存到對應月份
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const updatedMonthlyAssets = { ...monthlyAssets, [monthKey]: assets };
        setMonthlyAssets(updatedMonthlyAssets);

        if (isSheetsConnected) {
          // TODO: 同步月度資料到 Google Sheets
          // await saveMonthlyAssetsToSheets(sheetsApiUrl, updatedMonthlyAssets);
        }
        displayToast(`✅ 已儲存 ${year}年${month}月 資產負債`);
      } else {
        // fallback: 儲存到全局 assets
        if (isSheetsConnected) {
          await saveAssetsToSheets(assets);
        }
        displayToast(isSheetsConnected ? '資產負債餘額已同步儲存 🐷' : '已更新本機資料（尚未連線 Google Sheets）');
      }
      setShowManageModal(false);
    } catch (error) {
      displayToast(`資產同步失敗：${error.message || '請稍後再試'}`);
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
        name: isLiability ? '新負債項目' : '新銀行/新資產',
        balance: 0,
        isLiability,
        ...(isForeign ? { currency: 'USD', amount: 0 } : {}),
      },
    ]);
  };

  const handleRemoveAsset = (index) => {
    setAssets(assets.filter((_, i) => i !== index));
  };

  return (
    <AppProvider
      openTransactionModal={() => setShowTransactionModal(true)}
      openConfigModal={() => setShowConfigModal(true)}
      openManageModal={(context) => {
        if (context && context.year && context.month) {
          setManageModalContext(context);
          // 載入對應月份的資料到 assets state
          const monthKey = `${context.year}-${String(context.month).padStart(2, '0')}`;
          const monthAssets = monthlyAssets[monthKey] || [];
          setAssets(monthAssets);
        }
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
      setMonthlyAssets={setMonthlyAssets}
      connectSheets={connectSheets}
      syncFromSheets={() => syncFromSheets(sheetsApiUrl)}
      saveAssetsToSheets={saveAssetsToSheets}
      addTransaction={addTransaction}
      removeTransaction={removeTransaction}
    >
      <div className="mx-auto max-w-7xl px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6" suppressHydrationWarning>{children}</div>

      {/* 懸浮記帳按鈕 */}
      <button
        onClick={() => setShowTransactionModal(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-rose-500 px-5 py-4 text-sm font-extrabold text-white shadow-lg transition hover:scale-105 hover:bg-rose-600 hover:shadow-rose-300 z-40"
      >
        🐷 記一筆股票
      </button>

      <TransactionModal isOpen={showTransactionModal} onClose={() => setShowTransactionModal(false)} onSubmit={handleTransactionSubmit} />
      <ConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onConnect={handleConfigConnect}
        initialApiUrl={sheetsApiUrl}
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
      />
      <CustomDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        title={dialog.title}
        message={dialog.message}
        buttons={dialog.buttons}
      />
      <Toast message={toastMessage} isVisible={showToast} />
    </AppProvider>
  );
}
