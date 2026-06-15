'use client';

import { createContext, useContext } from 'react';

const AppContext = createContext({
  openTransactionModal: () => {},
  openConfigModal: () => {},
  openManageModal: () => {},
  displayToast: () => {},
  displayDialog: () => {},
  isSheetsConnected: false,
  sheetsApiUrl: '',
  assets: [],
  transactions: [],
  connectSheets: async () => false,
  syncFromSheets: async () => {},
  saveAssetsToSheets: async () => {},
  addTransaction: () => {},
  removeTransaction: () => {},
});

export const AppProvider = ({ children, ...handlers }) => {
  return <AppContext.Provider value={handlers}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
