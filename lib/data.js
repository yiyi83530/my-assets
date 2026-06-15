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
  { id: 't1', date: '2024-02-08', recordedAt: '2024-02-08T09:18:00.000Z', market: 'TWSE', symbol: '2330', stock: '2330 台積電', type: 'buy', qty: 600, price: 620, actualAmount: 372531, note: '2024 年初建倉' },
  { id: 't2', date: '2024-05-10', recordedAt: '2024-05-10T10:22:00.000Z', market: 'TWSE', symbol: '0050', stock: '0050 元大台灣50', type: 'buy', qty: 1200, price: 140, actualAmount: 168240, note: '台股 ETF 佈局' },
  { id: 't3', date: '2024-09-18', recordedAt: '2024-09-18T21:35:00.000Z', market: 'US', symbol: 'MSFT', stock: 'MSFT Microsoft', type: 'buy', qty: 20, price: 360, actualAmount: 7200, note: '美股配置' },
  { id: 't4', date: '2025-01-22', recordedAt: '2025-01-22T11:04:00.000Z', market: 'TWSE', symbol: '2330', stock: '2330 台積電', type: 'sell', qty: 200, price: 760, actualAmount: 151566, note: '調節持股' },
  { id: 't5', date: '2025-03-14', recordedAt: '2025-03-14T09:41:00.000Z', market: 'US', symbol: 'AAPL', stock: 'AAPL Apple', type: 'buy', qty: 30, price: 172, actualAmount: 5160, note: '逢低分批買進' },
  { id: 't6', date: '2025-08-20', recordedAt: '2025-08-20T13:16:00.000Z', market: 'TWSE', symbol: '0050', stock: '0050 元大台灣50', type: 'buy', qty: 800, price: 150, actualAmount: 120171, note: '持續定期定額' },
  { id: 't7', date: '2025-11-05', recordedAt: '2025-11-05T22:10:00.000Z', market: 'US', symbol: 'AAPL', stock: 'AAPL Apple', type: 'sell', qty: 10, price: 190, actualAmount: 1893, note: '部分停利' },
  { id: 't8', date: '2026-03-02', recordedAt: '2026-03-02T09:15:00.000Z', market: 'TWSE', symbol: '2330', stock: '2330 台積電', type: 'buy', qty: 1000, price: 820, actualAmount: 821168, note: '建倉台積電' },
  { id: 't9', date: '2026-03-15', recordedAt: '2026-03-15T10:30:00.000Z', market: 'TWSE', symbol: '0050', stock: '0050 元大台灣50', type: 'buy', qty: 2000, price: 155, actualAmount: 310441, note: '定期定額大盤' },
  { id: 't10', date: '2026-05-20', recordedAt: '2026-05-20T14:22:00.000Z', market: 'US', symbol: 'AAPL', stock: 'AAPL Apple', type: 'buy', qty: 50, price: 180, actualAmount: 9000, note: '美股建倉 AAPL' },
  { id: 't11', date: '2026-06-02', recordedAt: '2026-06-02T11:08:00.000Z', market: 'TWSE', symbol: '2330', stock: '2330 台積電', type: 'sell', qty: 300, price: 880, actualAmount: 262816, note: '波段停利一部分' },
  { id: 't12', date: '2026-10-08', recordedAt: '2026-10-08T21:18:00.000Z', market: 'US', symbol: 'NVDA', stock: 'NVDA NVIDIA', type: 'buy', qty: 10, price: 900, actualAmount: 9000, note: 'AI 題材配置' },
];

export const stockMarketPrices = {
  '2330 台積電': 890,
  '0050 元大台灣50': 162,
  'AAPL Apple': 188,
  'MSFT Microsoft': 430,
  'NVDA NVIDIA': 980,
};

export const lastMonthNetWorth = 950000;

