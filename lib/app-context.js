'use client';

import { createContext, useContext } from 'react';

const AppContext = createContext({
  openTransactionModal: () => {},
  openConfigModal: () => {},
  openManageModal: () => {},
  displayToast: () => {},
  displayDialog: () => {},
});

export const AppProvider = ({ children, ...handlers }) => {
  return <AppContext.Provider value={handlers}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);

