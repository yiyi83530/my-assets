'use client';

import { useState, useCallback } from 'react';
import { TransactionModal, ConfigModal, Toast } from '@/components/Modals';
import { ManageAccountsModal, CustomDialog } from '@/components/ManageModal';
import { assetBalances as initialAssets, transactions as initialTransactions } from '@/lib/data';
import { AppProvider } from '@/lib/app-context';

export default function RootLayoutClient({ children }) {
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [dialog, setDialog] = useState({ title: '', message: '', buttons: [] });
  const [assets, setAssets] = useState(initialAssets);
  const [transactions, setTransactions] = useState(initialTransactions);

  const displayToast = useCallback((msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);

  const displayDialog = useCallback((title, message, buttons) => {
    setDialog({ title, message, buttons });
    setShowDialog(true);
  }, []);

  const addTransaction = useCallback((tx) => {
    setTransactions((prev) => [...prev, { ...tx, id: tx.id || `tx_${Date.now()}` }]);
  }, []);

  const removeTransaction = useCallback((id) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  }, []);

  const handleTransactionSubmit = (txData) => {
    addTransaction({ ...txData, id: `tx_${Date.now()}`, recordedAt: new Date().toISOString() });
    displayToast(`已成功記錄 ${txData.stock} 交易！`);
    setShowTransactionModal(false);
  };

  const handleConfigConnect = (apiUrl) => {
    displayToast('Google Sheets 連線已儲存！');
    setShowConfigModal(false);
    console.log('API URL:', apiUrl);
  };

  const handleSaveAssets = () => {
    displayToast('資產負債餘額已同步儲存 🐷');
    setShowManageModal(false);
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
      openManageModal={() => setShowManageModal(true)}
      displayToast={displayToast}
      displayDialog={displayDialog}
      transactions={transactions}
      addTransaction={addTransaction}
      removeTransaction={removeTransaction}
    >
      <div className="mx-auto max-w-7xl px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-6" suppressHydrationWarning>{children}</div>

      {/* 懸浮記帳按鈕 */}
      <button
        onClick={() => setShowTransactionModal(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-rose-500 px-5 py-4 text-sm font-extrabold text-white shadow-lg transition hover:scale-105 hover:bg-rose-600 hover:shadow-rose-300 z-40"
      >
        🐷 記一筆股票
      </button>

      <TransactionModal isOpen={showTransactionModal} onClose={() => setShowTransactionModal(false)} onSubmit={handleTransactionSubmit} />
      <ConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} onConnect={handleConfigConnect} />
      <ManageAccountsModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        assets={assets}
        onSave={handleSaveAssets}
        onAddNew={handleAddNewAsset}
        onRemove={handleRemoveAsset}
        onUpdate={handleUpdateAsset}
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
