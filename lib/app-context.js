'use client';

import { createContext, useContext } from 'react';

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
  stockQuoteMeta: {},
  isStockPricesLoading: false,
  refreshStockPrices: async () => {},
  exchangeRates: {},
  refreshExchangeRates: async () => {},
  costBasisAdjustments: [],
  lastMonthNetWorth: 0,
  setMonthlyAssets: () => {},
  connectSheets: async () => false,
  syncFromSheets: async () => {},
  saveAssetsToSheets: async () => {},
  addTransaction: () => {},
  removeTransaction: () => {},
  addCostBasisAdjustment: async () => {},
});

export const AppProvider = ({ children, ...handlers }) => {
  return <AppContext.Provider value={handlers}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
