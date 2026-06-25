// lib/demo-data.js

const generateDemoMonthlyAssets = () => {
  const monthlyAssets = {};
  let baseNtdBalance = 100000;
  let baseUsdBalance = 3000;
  let baseJpyBalance = 100000;
  let baseTrustBalance = 250000;
  let baseCreditCardLiability = 30000;
  let baseLoanLiability = 150000;

  const banks = ['台灣銀行', '中國信託', '國泰世華', '玉山銀行', '富邦銀行', '台新銀行', '永豐銀行', '兆豐銀行'];

  // 修改年份範圍：從 2025 到 2026
  for (let year = 2025; year <= 2026; year++) {
    // 2025年從 8月開始，2026年到 6月結束
    const startMonth = (year === 2025) ? 8 : 1;
    const endMonth = (year === 2026) ? 6 : 12;

    for (let month = startMonth; month <= endMonth; month++) {
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const assetsForMonth = [];

      // --- 台幣活存 (每個月 5-6 筆) ---
      const entriesCount = 5 + Math.floor(Math.random() * 2); // 隨機 5 或 6
      for (let i = 0; i < entriesCount; i++) {
        // 隨機選一家銀行，避免每次都按照 index 順序
        const bankName = banks[Math.floor(Math.random() * banks.length)];

        // 讓每家銀行的餘額有所區隔，而不是全部圍繞在 baseNtdBalance
        const randomOffset = Math.floor(Math.random() * 100000) - 20000;
        const balance = baseNtdBalance + randomOffset;

        assetsForMonth.push({
          id: `demo-ntd-${monthKey}-${i + 1}`,
          name: bankName,
          category: '台幣活存',
          balance: Math.max(10000, balance), // 最低維持 1 萬
        });
      }
      // 每個月總資產緩緩增長
      baseNtdBalance += 5000 + Math.floor(Math.random() * 5000);

      // --- 外幣活存 (USD) ---
      const usdFxRate = parseFloat((31.0 + Math.random() * 2).toFixed(2));
      const usdBalance = baseUsdBalance + Math.floor(Math.random() * 200) - 100;
      assetsForMonth.push({
        id: `demo-foreign-usd-${monthKey}`,
        name: '國泰世華',
        category: '外幣活存',
        balance: Math.max(2500, usdBalance),
        currency: 'USD',
        fxRate: usdFxRate,
        convertedBalance: Math.round(Math.max(2500, usdBalance) * usdFxRate),
      });
      baseUsdBalance += 50 + Math.floor(Math.random() * 20);

      // --- 外幣活存 (JPY) ---
      const jpyFxRate = parseFloat((0.22 + Math.random() * 0.03).toFixed(3));
      const jpyBalance = baseJpyBalance + Math.floor(Math.random() * 5000) - 2500;
      assetsForMonth.push({
        id: `demo-foreign-jpy-${monthKey}`,
        name: '玉山銀行',
        category: '外幣活存',
        balance: Math.max(90000, jpyBalance),
        currency: 'JPY',
        fxRate: jpyFxRate,
        convertedBalance: Math.round(Math.max(90000, jpyBalance) * jpyFxRate),
      });
      baseJpyBalance += 2000 + Math.floor(Math.random() * 1000);

      // --- 員工持股信託 ---
      const trustBalance = baseTrustBalance + Math.floor(Math.random() * 10000) - 5000;
      assetsForMonth.push({
        id: `demo-trust-${monthKey}`,
        name: '富邦銀行',
        category: '員工持股信託',
        balance: Math.max(200000, trustBalance),
      });
      baseTrustBalance += 8000 + Math.floor(Math.random() * 2000);

      // --- 負債項目 (信用卡費) ---
      const creditCardBalance = baseCreditCardLiability - Math.floor(Math.random() * 5000);
      assetsForMonth.push({
        id: `demo-liability-creditcard-${monthKey}`,
        name: '信用卡費',
        category: '負債項目',
        isLiability: true,
        balance: Math.max(0, creditCardBalance),
      });
      baseCreditCardLiability = Math.max(0, creditCardBalance - 2000);

      // --- 負債項目 (個人信貸) ---
      const loanBalance = baseLoanLiability - Math.floor(Math.random() * 8000);
      assetsForMonth.push({
        id: `demo-liability-loan-${monthKey}`,
        name: '個人信貸',
        category: '負債項目',
        isLiability: true,
        balance: Math.max(50000, loanBalance),
      });
      baseLoanLiability = Math.max(50000, loanBalance - 5000);

      monthlyAssets[monthKey] = assetsForMonth;
    }
  }
  return monthlyAssets;
};

const calculateNetWorth = (assets) => {
  let totalAssets = 0;
  let totalLiabilities = 0;
  assets.forEach(asset => {
    const balance = asset.convertedBalance || asset.balance;
    if (asset.isLiability) {
      totalLiabilities += balance;
    } else {
      totalAssets += balance;
    }
  });
  return totalAssets - totalLiabilities;
};

const generateDemoMonthlyNetWorth = (monthlyAssets) => {
  const netWorthData = [];
  const sortedMonths = Object.keys(monthlyAssets).sort();

  sortedMonths.forEach(monthKey => {
    const assets = monthlyAssets[monthKey];
    const netWorth = calculateNetWorth(assets);
    netWorthData.push({ month: monthKey.split('-')[1], netWorth: Math.round(netWorth / 1000) * 1000 }); // Round to nearest thousand
  });
  return netWorthData;
};

const generateDemoSummary = (monthlyNetWorth) => {
  if (monthlyNetWorth.length < 2) {
    return { netWorth: 0, netGrowth: 0, growthRate: 0 };
  }
  const latestNetWorth = monthlyNetWorth[monthlyNetWorth.length - 1].netWorth;
  const previousNetWorth = monthlyNetWorth[monthlyNetWorth.length - 2].netWorth;
  const netGrowth = latestNetWorth - previousNetWorth;
  const growthRate = previousNetWorth === 0 ? 0 : parseFloat(((netGrowth / previousNetWorth) * 100).toFixed(2));
  return {
    netWorth: latestNetWorth,
    netGrowth: netGrowth,
    growthRate: growthRate,
  };
};

export const demoMonthlyAssets = generateDemoMonthlyAssets();
export const demoMonthlyNetWorth = generateDemoMonthlyNetWorth(demoMonthlyAssets);
export const demoSummary = generateDemoSummary(demoMonthlyNetWorth);


const generateRandomStockHoldings = (count) => {
  const holdings = [];
  const stockNames = ['台積電', '聯發科', '鴻海', '廣達', '台達電', '中華電', '富邦金', '國泰金', '中信金', '兆豐金', '統一', '台塑', '南亞', '台化', '長榮', '陽明', '萬海', '華航', '長榮航', '友達', '群創', '聯電', '世界先進', '日月光投控', '矽力-KY', '譜瑞-KY', '祥碩', '力旺', 'M31', '創意'];
  const stockSymbols = ['2330', '2454', '2317', '2382', '2308', '2412', '2881', '2882', '2891', '2886', '1216', '1301', '1303', '1326', '2603', '2609', '2615', '2610', '2618', '2409', '3481', '2303', '5347', '3711', '6415', '4966', '5269', '3529', '6643', '3443'];

  for (let i = 0; i < count; i++) {
    const nameIndex = Math.floor(Math.random() * stockNames.length);
    const symbol = stockSymbols[nameIndex];
    const name = stockNames[nameIndex];
    const shares = Math.floor(Math.random() * 500) * 100 + 100; // 100 to 50000 shares, in multiples of 100
    const averagePrice = parseFloat((Math.random() * 500 + 50).toFixed(2)); // 50 to 550
    const currentPrice = parseFloat((averagePrice * (1 + (Math.random() * 0.4 - 0.2))).toFixed(2)); // +/- 20%
    const marketValue = shares * currentPrice;
    const cost = shares * averagePrice;
    const profitLoss = marketValue - cost;
    const profitLossRate = parseFloat(((profitLoss / cost) * 100).toFixed(2));

    holdings.push({
      id: `stock-${i + 1}`,
      symbol,
      name,
      shares,
      averagePrice,
      currentPrice,
      marketValue,
      cost,
      profitLoss,
      profitLossRate,
    });
  }
  return holdings;
};

import staticDemoTransactions from './static-demo-transactions.json';


export const demoPortfolio = {
  currentPortfolioValue: 300000, // 假設證券資產
  stockHoldings: generateRandomStockHoldings(30),
  transactionHistory: staticDemoTransactions,
};