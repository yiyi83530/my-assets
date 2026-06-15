'use client';

import { createContext, useContext } from 'react';

const AppContext = createContext({
  openTransactionModal: () => {},
  openConfigModal: () => {},
  openManageModal: () => {},
  openMonthlySnapshotModal: () => {},
  displayToast: () => {},
  displayDialog: () => {},
  isSheetsConnected: false,
  sheetsApiUrl: '',
  assets: [],
  transactions: [],
  monthlyNetWorth: [],
  connectSheets: async () => false,
  syncFromSheets: async () => {},
  saveAssetsToSheets: async () => {},
  addTransaction: () => {},
  removeTransaction: () => {},
  saveMonthlySnapshot: async () => {},
});

export const AppProvider = ({ children, ...handlers }) => {
  return <AppContext.Provider value={handlers}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
