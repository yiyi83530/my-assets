'use client';

import { createContext, useContext, useMemo } from 'react';

const AppContext = createContext({
  openTransactionModal: () => {},
  openConfigModal: () => {},
  openManageModal: () => {},
  displayToast: () => {},
  displayDialog: () => {},
  isAppInitializing: true,
  isSheetsConnected: false,
  sheetsApiUrl: '',
  assets: [],
  transactions: [],
  monthlyNetWorth: [],
  monthlyAssets: {},
  stockMarketPrices: {},
  stockMonthlyClosePrices: {},
  stockHoldingSnapshots: [],
  industryCategories: null,
  stockQuoteMeta: {},
  isStockPricesLoading: false,
  refreshStockPrices: async () => {},
  refreshMonthlyStockClosePrices: async () => {},
  exchangeRates: {},
  refreshExchangeRates: async () => {},
  costBasisAdjustments: [],
  lastMonthNetWorth: 0,
  stockFeeSettings: { valuationMode: 'market_value' },
  setStockValuationMode: () => {},
  setMonthlyAssets: () => {},
  connectSheets: async () => false,
  syncFromSheets: async () => {},
  saveAssetsToSheets: async () => {},
  addTransaction: () => {},
  removeTransaction: () => {},
  addCostBasisAdjustment: async () => {},
  saveStockHoldingSnapshots: async () => {},
  saveIndustryCategories: async () => {},
});

const AppChromeContext = createContext({
  openConfigModal: () => {},
  isSheetsConnected: false,
});

const TransactionSettingsContext = createContext({
  stockFeeSettings: { valuationMode: 'market_value' },
  openSettingsModal: () => {},
});

export const AppProvider = ({
  children,
  openConfigModal,
  isSheetsConnected,
  stockFeeSettings,
  openSettingsModal,
  ...handlers
}) => {
  const chromeValue = useMemo(
    () => ({ openConfigModal, isSheetsConnected }),
    [openConfigModal, isSheetsConnected]
  );
  const transactionSettingsValue = useMemo(
    () => ({ stockFeeSettings, openSettingsModal }),
    [stockFeeSettings, openSettingsModal]
  );
  const appValue = {
    ...handlers,
    openConfigModal,
    isSheetsConnected,
    stockFeeSettings,
    openSettingsModal,
  };

  return (
    <AppChromeContext.Provider value={chromeValue}>
      <TransactionSettingsContext.Provider value={transactionSettingsValue}>
        <AppContext.Provider value={appValue}>{children}</AppContext.Provider>
      </TransactionSettingsContext.Provider>
    </AppChromeContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
export const useAppChrome = () => useContext(AppChromeContext);
export const useTransactionSettings = () => useContext(TransactionSettingsContext);
