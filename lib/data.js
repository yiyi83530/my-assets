// 每月資產負債快照（按 YYYY-MM 格式儲存）
export const monthlyAssetsSnapshots = {
  '2026-01': [
    { id: 'a1', category: '台幣活存', name: '台新 Richart', balance: 120000, isLiability: false },
    { id: 'a2', category: '台幣活存', name: 'Line Bank', balance: 65000, isLiability: false },
  ],
  '2026-03': [
    { id: 'a1', category: '台幣活存', name: '台新 Richart', balance: 130000, isLiability: false },
    { id: 'a2', category: '台幣活存', name: 'Line Bank', balance: 75000, isLiability: false },
    { id: 'a3', category: '台幣活存', name: '國泰世華', balance: 25000, isLiability: false },
  ],
  '2026-04': [
    { id: 'a1', category: '台幣活存', name: '台新 Richart', balance: 140000, isLiability: false },
    { id: 'a2', category: '台幣活存', name: 'Line Bank', balance: 80000, isLiability: false },
    { id: 'a3', category: '台幣活存', name: '國泰世華', balance: 30000, isLiability: false },
    { id: 'a4', category: '外幣活存', name: '玉山銀行', currency: 'USD', amount: 3000, balance: 3000, isLiability: false },
  ],
  '2026-05': [
    { id: 'a1', category: '台幣活存', name: '台新 Richart', balance: 150000, isLiability: false },
    { id: 'a2', category: '台幣活存', name: 'Line Bank', balance: 85000, isLiability: false },
    { id: 'a3', category: '台幣活存', name: '國泰世華', balance: 35000, isLiability: false },
    { id: 'a4', category: '外幣活存', name: '玉山銀行', currency: 'USD', amount: 3200, balance: 3200, isLiability: false },
    { id: 'a5', category: '外幣活存', name: '中信銀行', currency: 'JPY', amount: 150000, balance: 150000, isLiability: false },
    { id: 'a6', category: '員工持股信託', name: '公司提撥信託基金', balance: 120000, isLiability: false },
    { id: 'a7', category: '負債項目', name: '台新信用卡帳單', balance: 15800, isLiability: true },
    { id: 'a8', category: '負債項目', name: '低利信用貸款', balance: 320000, isLiability: true },
  ],
  '2026-06': [
    { id: 'a1', category: '台幣活存', name: '台新 Richart', balance: 160000, isLiability: false },
    { id: 'a2', category: '台幣活存', name: 'Line Bank', balance: 90000, isLiability: false },
    { id: 'a3', category: '台幣活存', name: '國泰世華', balance: 40000, isLiability: false },
    { id: 'a4', category: '外幣活存', name: '玉山銀行', currency: 'USD', amount: 3500, balance: 3500, isLiability: false },
    { id: 'a5', category: '外幣活存', name: '中信銀行', currency: 'JPY', amount: 180000, balance: 180000, isLiability: false },
    { id: 'a6', category: '員工持股信託', name: '公司提撥信託基金', balance: 135000, isLiability: false },
    { id: 'a7', category: '負債項目', name: '台新信用卡帳單', balance: 12500, isLiability: true },
    { id: 'a8', category: '負債項目', name: '低利信用貸款', balance: 300000, isLiability: true },
  ],
};

// 舊的 assetBalances 保留做為 fallback（與 2026-05 相同）
export const assetBalances = monthlyAssetsSnapshots['2026-05'];


export const transactions = [
  { id: 't1', date: '2024-02-08', recordedAt: '2024-02-08T09:18:00.000Z', market: 'TWSE', symbol: '2330', stock: '2330 台積電', type: 'buy', qty: 600, price: 620, actualAmount: 372531, note: '2024 年初建倉，看好半導體前景' },
  { id: 't2', date: '2024-05-10', recordedAt: '2024-05-10T10:22:00.000Z', market: 'TWSE', symbol: '0050', stock: '0050 元大台灣50', type: 'buy', qty: 1200, price: 140, actualAmount: 168240, note: '台股 ETF 佈局，分散風險' },
  { id: 't3', date: '2024-09-18', recordedAt: '2024-09-18T21:35:00.000Z', market: 'US', symbol: 'MSFT', stock: 'MSFT Microsoft', type: 'buy', qty: 20, price: 360, actualAmount: 7200, note: '美股配置，長期持有' },
  { id: 't4', date: '2025-01-22', recordedAt: '2025-01-22T11:04:00.000Z', market: 'TWSE', symbol: '2330', stock: '2330 台積電', type: 'sell', qty: 200, price: 760, actualAmount: 151566, note: '調節持股，實現部分獲利' },
  { id: 't5', date: '2025-03-14', recordedAt: '2025-03-14T09:41:00.000Z', market: 'US', symbol: 'AAPL', stock: 'AAPL Apple', type: 'buy', qty: 30, price: 172, actualAmount: 5160, note: '逢低分批買進，看好新品發表' },
  { id: 't6', date: '2025-08-20', recordedAt: '2025-08-20T13:16:00.000Z', market: 'TWSE', symbol: '0050', stock: '0050 元大台灣50', type: 'buy', qty: 800, price: 150, actualAmount: 120171, note: '持續定期定額，累積部位' },
  { id: 't7', date: '2025-11-05', recordedAt: '2025-11-05T22:10:00.000Z', market: 'US', symbol: 'AAPL', stock: 'AAPL Apple', type: 'sell', qty: 10, price: 190, actualAmount: 1893, note: '部分停利，資金轉移' },
  { id: 't8', date: '2026-03-02', recordedAt: '2026-03-02T09:15:00.000Z', market: 'TWSE', symbol: '2330', stock: '2330 台積電', type: 'buy', qty: 1000, price: 820, actualAmount: 821168, note: '加碼台積電，看好先進製程' },
  { id: 't9', date: '2026-03-15', recordedAt: '2026-03-15T10:30:00.000Z', market: 'TWSE', symbol: '0050', stock: '0050 元大台灣50', type: 'buy', qty: 2000, price: 155, actualAmount: 310441, note: '定期定額大盤，穩健投資' },
  { id: 't10', date: '2026-05-20', recordedAt: '2026-05-20T14:22:00.000Z', market: 'US', symbol: 'AAPL', stock: 'AAPL Apple', type: 'buy', qty: 50, price: 180, actualAmount: 9000, note: '美股建倉 AAPL，看好生態系' },
  { id: 't11', date: '2026-06-02', recordedAt: '2026-06-02T11:08:00.000Z', market: 'TWSE', symbol: '2330', stock: '2330 台積電', type: 'sell', qty: 300, price: 880, actualAmount: 262816, note: '波段停利一部分，降低風險' },
  { id: 't12', date: '2026-10-08', recordedAt: '2026-10-08T21:18:00.000Z', market: 'US', symbol: 'NVDA', stock: 'NVDA NVIDIA', type: 'buy', qty: 10, price: 900, actualAmount: 9000, note: 'AI 題材配置，看好未來成長' },
  { id: 't13', date: '2026-11-01', recordedAt: '2026-11-01T09:00:00Z', market: 'TWSE', symbol: '2330', stock: '2330 台積電', type: 'buy', qty: 100, price: 910, actualAmount: 91129, note: '小額加碼，平均成本' },
  { id: 't14', date: '2026-11-05', recordedAt: '2026-11-05T10:15:00Z', market: 'US', symbol: 'TSLA', stock: 'TSLA Tesla', type: 'buy', qty: 5, price: 210, actualAmount: 1050, note: '電動車產業佈局' },
  { id: 't15', date: '2026-11-10', recordedAt: '2026-11-10T09:30:00Z', market: 'TWSE', symbol: '2454', stock: '2454 聯發科', type: 'buy', qty: 200, price: 1100, actualAmount: 220313, note: '手機晶片需求增長' },
  { id: 't16', date: '2026-11-15', recordedAt: '2026-11-15T13:45:00Z', market: 'TWSE', symbol: '2317', stock: '2317 鴻海', type: 'buy', qty: 1000, price: 180, actualAmount: 180256, note: '電動車組裝業務' },
  { id: 't17', date: '2026-11-20', recordedAt: '2026-11-20T22:00:00Z', market: 'US', symbol: 'GOOGL', stock: 'GOOGL Alphabet', type: 'buy', qty: 15, price: 150, actualAmount: 2250, note: '雲端服務成長' },
  { id: 't18', date: '2026-11-25', recordedAt: '2026-11-25T11:10:00Z', market: 'TWSE', symbol: '2881', stock: '2881 富邦金', type: 'buy', qty: 2000, price: 75, actualAmount: 150213, note: '金融股穩健配息' },
  { id: 't19', date: '2026-12-01', recordedAt: '2026-12-01T09:05:00Z', market: 'TWSE', symbol: '2330', stock: '2330 台積電', type: 'sell', qty: 100, price: 950, actualAmount: 94520, note: '短期獲利了結' },
  { id: 't20', date: '2026-12-05', recordedAt: '2026-12-05T21:30:00Z', market: 'US', symbol: 'AMZN', stock: 'AMZN Amazon', type: 'buy', qty: 10, price: 180, actualAmount: 1800, note: '電商巨頭，持續成長' },
  { id: 't21', date: '2026-12-10', recordedAt: '2026-12-10T10:00:00Z', market: 'TWSE', symbol: '3034', stock: '3034 聯詠', type: 'buy', qty: 500, price: 600, actualAmount: 300427, note: '驅動 IC 需求旺盛' },
  { id: 't22', date: '2026-12-15', recordedAt: '2026-12-15T14:20:00Z', market: 'TWSE', symbol: '2382', stock: '2382 廣達', type: 'buy', qty: 1000, price: 250, actualAmount: 250356, note: 'AI 伺服器概念股' },
  { id: 't23', date: '2026-12-20', recordedAt: '2026-12-20T22:15:00Z', market: 'US', symbol: 'META', stock: 'META Meta', type: 'buy', qty: 8, price: 450, actualAmount: 3600, note: '元宇宙長期投資' },
  { id: 't24', date: '2026-12-25', recordedAt: '2026-12-25T09:50:00Z', market: 'TWSE', symbol: '2882', stock: '2882 國泰金', type: 'buy', qty: 3000, price: 55, actualAmount: 165235, note: '金融股存股' },
  { id: 't25', date: '2027-01-05', recordedAt: '2027-01-05T09:20:00Z', market: 'TWSE', symbol: '2330', stock: '2330 台積電', type: 'buy', qty: 200, price: 980, actualAmount: 196279, note: '逢回檔加碼' },
  { id: 't26', date: '2027-01-10', recordedAt: '2027-01-10T21:45:00Z', market: 'US', symbol: 'NVDA', stock: 'NVDA NVIDIA', type: 'buy', qty: 5, price: 1100, actualAmount: 5500, note: 'AI 晶片龍頭' },
  { id: 't27', date: '2027-01-15', recordedAt: '2027-01-15T10:30:00Z', market: 'TWSE', symbol: '2308', stock: '2308 台達電', type: 'buy', qty: 500, price: 380, actualAmount: 190271, note: '電動車充電樁業務' },
  { id: 't28', date: '2027-01-20', recordedAt: '2027-01-20T11:55:00Z', market: 'TWSE', symbol: '3231', stock: '3231 緯創', type: 'buy', qty: 2000, price: 110, actualAmount: 220313, note: 'AI 伺服器組裝' },
  { id: 't29', date: '2027-01-25', recordedAt: '2027-01-25T22:30:00Z', market: 'US', symbol: 'AAPL', stock: 'AAPL Apple', type: 'sell', qty: 5, price: 220, actualAmount: 1096, note: '獲利了結，部分減碼' },
  { id: 't30', date: '2027-02-01', recordedAt: '2027-02-01T09:10:00Z', market: 'TWSE', symbol: '2330', stock: '2330 台積電', type: 'buy', qty: 100, price: 1005, actualAmount: 100643, note: '看好未來展望' },
  { id: 't31', date: '2027-02-05', recordedAt: '2027-02-05T21:10:00Z', market: 'US', symbol: 'MSFT', stock: 'MSFT Microsoft', type: 'buy', qty: 10, price: 420, actualAmount: 4200, note: '雲端服務持續成長' },
  { id: 't32', date: '2027-02-10', recordedAt: '2027-02-10T10:15:00Z', market: 'TWSE', symbol: '2454', stock: '2454 聯發科', type: 'sell', qty: 100, price: 1200, actualAmount: 119313, note: '調節持股，獲利出場' },
  { id: 't33', date: '2027-02-15', recordedAt: '2027-02-15T13:25:00Z', market: 'TWSE', symbol: '2317', stock: '2317 鴻海', type: 'buy', qty: 500, price: 200, actualAmount: 100142, note: '低價佈局' },
  { id: 't34', date: '2027-02-20', recordedAt: '2027-02-20T22:40:00Z', market: 'US', symbol: 'GOOGL', stock: 'GOOGL Alphabet', type: 'sell', qty: 5, price: 170, actualAmount: 848, note: '部分停利' },
  { id: 't35', date: '2027-02-25', recordedAt: '2027-02-25T09:35:00Z', market: 'TWSE', symbol: '2881', stock: '2881 富邦金', type: 'sell', qty: 1000, price: 85, actualAmount: 84487, note: '資金調度' },
  { id: 't36', date: '2027-03-01', recordedAt: '2027-03-01T09:00:00Z', market: 'TWSE', symbol: '2330', stock: '2330 台積電', type: 'buy', qty: 100, price: 1050, actualAmount: 105150, note: '持續看好晶圓代工' },
  { id: 't37', date: '2027-03-05', recordedAt: '2027-03-05T21:50:00Z', market: 'US', symbol: 'AMZN', stock: 'AMZN Amazon', type: 'buy', qty: 5, price: 195, actualAmount: 975, note: '雲端業務成長' },
  { id: 't38', date: '2027-03-10', recordedAt: '2027-03-10T10:50:00Z', market: 'TWSE', symbol: '3034', stock: '3034 聯詠', type: 'buy', qty: 200, price: 650, actualAmount: 130185, note: '面板驅動 IC 需求' },
  { id: 't39', date: '2027-03-15', recordedAt: '2027-03-15T14:40:00Z', market: 'TWSE', symbol: '2382', stock: '2382 廣達', type: 'buy', qty: 500, price: 280, actualAmount: 140200, note: 'AI 伺服器訂單' },
  { id: 't40', date: '2027-03-20', recordedAt: '2027-03-20T22:20:00Z', market: 'US', symbol: 'META', stock: 'META Meta', type: 'sell', qty: 3, price: 500, actualAmount: 1496, note: '短期獲利了結' },
  { id: 't41', date: '2027-03-25', recordedAt: '2027-03-25T11:00:00Z', market: 'TWSE', symbol: '2882', stock: '2882 國泰金', type: 'sell', qty: 1000, price: 65, actualAmount: 64612, note: '資金轉投其他標的' },
  { id: 't42', date: '2027-04-05', recordedAt: '2027-04-05T09:40:00Z', market: 'TWSE', symbol: '2330', stock: '2330 台積電', type: 'buy', qty: 50, price: 1100, actualAmount: 55078, note: '零股交易' },
  { id: 't43', date: '2027-04-10', recordedAt: '2027-04-10T21:15:00Z', market: 'US', symbol: 'NVDA', stock: 'NVDA NVIDIA', type: 'buy', qty: 2, price: 1250, actualAmount: 2500, note: 'AI 晶片需求強勁' },
  { id: 't44', date: '2027-04-15', recordedAt: '2027-04-15T10:10:00Z', market: 'TWSE', symbol: '2308', stock: '2308 台達電', type: 'buy', qty: 200, price: 420, actualAmount: 84120, note: '綠能概念股' },
  { id: 't45', date: '2027-04-20', recordedAt: '2027-04-20T13:50:00Z', market: 'TWSE', symbol: '3231', stock: '3231 緯創', type: 'sell', qty: 1000, price: 130, actualAmount: 129213, note: '獲利了結' },
  { id: 't46', date: '2027-04-25', recordedAt: '2027-04-25T22:50:00Z', market: 'US', symbol: 'AAPL', stock: 'AAPL Apple', type: 'buy', qty: 10, price: 210, actualAmount: 2100, note: '長期投資' },
  { id: 't47', date: '2027-05-01', recordedAt: '2027-05-01T09:25:00Z', market: 'TWSE', symbol: '2330', stock: '2330 台積電', type: 'sell', qty: 500, price: 1150, actualAmount: 571612, note: '波段操作' },
  { id: 't48', date: '2027-05-05', recordedAt: '2027-05-05T21:40:00Z', market: 'US', symbol: 'TSLA', stock: 'TSLA Tesla', type: 'sell', qty: 2, price: 250, actualAmount: 498, note: '部分減碼' },
  { id: 't49', date: '2027-05-10', recordedAt: '2027-05-10T10:45:00Z', market: 'TWSE', symbol: '2454', stock: '2454 聯發科', type: 'buy', qty: 100, price: 1300, actualAmount: 130185, note: '看好手機市場復甦' },
  { id: 't50', date: '2027-05-15', recordedAt: '2027-05-15T13:10:00Z', market: 'TWSE', symbol: '2317', stock: '2317 鴻海', type: 'sell', qty: 1000, price: 220, actualAmount: 218663, note: '獲利了結，資金轉移' },
];

export const stockMarketPrices = {
  '2330 台積電': 890,
  '0050 元大台灣50': 162,
  'AAPL Apple': 188,
  'MSFT Microsoft': 430,
  'NVDA NVIDIA': 980,
};

export const lastMonthNetWorth = 950000;

// 月度淨值記錄（每月月底手動記帳快照）
export const monthlyNetWorthData = [
  { month: '1', netWorth: 850000 },
  { month: '2', netWorth: 880000 },
  { month: '3', netWorth: 920000 },
  { month: '4', netWorth: 950000 },
  { month: '5', netWorth: 980000 },
  { month: '6', netWorth: 1020000 },
];

