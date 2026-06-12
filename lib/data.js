export const assetBalances = [
  { id: 'a1', category: '台幣活存', name: '台新 Richart', balance: 150000, isLiability: false },
  { id: 'a2', category: '台幣活存', name: 'Line Bank', balance: 85000, isLiability: false },
  { id: 'a3', category: '台幣活存', name: '國泰世華', balance: 35000, isLiability: false },
  { id: 'a4', category: '外幣活存', name: '玉山銀行', currency: 'USD', amount: 3200, balance: 3200, isLiability: false },
  { id: 'a5', category: '外幣活存', name: '中信銀行', currency: 'JPY', amount: 150000, balance: 150000, isLiability: false },
  { id: 'a6', category: '員工持股信託', name: '公司提撥信託基金', balance: 120000, isLiability: false },
  { id: 'a7', category: '負債項目', name: '台新信用卡帳單', balance: 15800, isLiability: true },
  { id: 'a8', category: '負債項目', name: '低利信用貸款', balance: 320000, isLiability: true },
];

export const transactions = [
  { id: 't1', date: '2026-03-02', recordedAt: '2026-03-02T09:15:00.000Z', market: 'TWSE', symbol: '2330', stock: '2330 台積電', type: 'buy', qty: 1000, price: 820, actualAmount: 821168, note: '建倉台積電' },
  { id: 't2', date: '2026-03-15', recordedAt: '2026-03-15T10:30:00.000Z', market: 'TWSE', symbol: '0050', stock: '0050 元大台灣50', type: 'buy', qty: 2000, price: 155, actualAmount: 310441, note: '定期定額大盤' },
  { id: 't3', date: '2026-05-20', recordedAt: '2026-05-20T14:22:00.000Z', market: 'US', symbol: 'AAPL', stock: 'AAPL Apple', type: 'buy', qty: 50, price: 180, actualAmount: 9000, note: '美股建倉 AAPL' },
  { id: 't4', date: '2026-06-02', recordedAt: '2026-06-02T11:08:00.000Z', market: 'TWSE', symbol: '2330', stock: '2330 台積電', type: 'sell', qty: 300, price: 880, actualAmount: 262816, note: '波段停利一部分' },
];

export const stockMarketPrices = {
  '2330 台積電': 890,
  '0050 元大台灣50': 162,
  'AAPL Apple': 188,
};

export const lastMonthNetWorth = 950000;

