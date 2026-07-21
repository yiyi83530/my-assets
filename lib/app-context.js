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

export const AppProvider = ({ children, ...handlers }) => {
  return <AppContext.Provider value={handlers}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
