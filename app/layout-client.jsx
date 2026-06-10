'use client';

import { useState, useCallback } from 'react';
import { TransactionModal, ConfigModal, Toast } from '@/components/Modals';
import { ManageAccountsModal, CustomDialog } from '@/components/ManageModal';
import { assetBalances as initialAssets } from '@/lib/data';
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

  const displayToast = useCallback((msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);

  const displayDialog = useCallback((title, message, buttons) => {
    setDialog({ title, message, buttons });
    setShowDialog(true);
  }, []);

  const handleTransactionSubmit = (txData) => {
    // TODO: 存檔交易（可連到 API）
    displayToast(`已成功記錄 ${txData.stock} 交易！`);
    setShowTransactionModal(false);
    console.log('新交易：', txData);
  };

  const handleConfigConnect = (apiUrl) => {
    // TODO: 儲存 Google Sheets 連線
    displayToast('Google Sheets 連線已儲存！');
    setShowConfigModal(false);
    console.log('API URL:', apiUrl);
  };

  const handleSaveAssets = () => {
    // TODO: 儲存資產餘額到 API
    displayToast('資產負債餘額已同步儲存 🐷');
    setShowManageModal(false);
    console.log('儲存資產：', assets);
  };

  const handleUpdateAsset = (index, newData) => {
    const updated = [...assets];
    updated[index] = newData;
    setAssets(updated);
  };

  const handleAddNewAsset = () => {
    setAssets([
      ...assets,
      {
        id: 'new_' + Date.now(),
        category: '台幣活存',
        name: '新銀行/新資產',
        balance: 0,
        isLiability: false,
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
    >
      <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>

      {/* 懸浮記帳按鈕 */}
      <button
        onClick={() => setShowTransactionModal(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-rose-500 px-5 py-4 text-sm font-extrabold text-white shadow-lg transition hover:scale-105 hover:bg-rose-600 hover:shadow-rose-300 z-40"
      >
        🐷 記一筆股票
      </button>

      {/* Modals */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSubmit={handleTransactionSubmit}
      />

      <ConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onConnect={handleConfigConnect}
      />

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

      {/* Toast */}
      <Toast message={toastMessage} isVisible={showToast} />
    </AppProvider>
  );
}

