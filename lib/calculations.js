const DEFAULT_TWD_PER_FOREIGN_CURRENCY = {
  USD: 32.5,
  JPY: 0.22,
  EUR: 35.5,
  HKD: 4.15,
  CNY: 4.45,
  SGD: 24.5,
  AUD: 21.0,
};

function toNumberMaybe(value) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).replaceAll(',', '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCurrencyCode(currency) {
  return String(currency || '').trim().toUpperCase();
}

export function getForeignAssetAmount(item) {
  if (!item || item.category !== '外幣活存') {
    return toNumberMaybe(item?.balance) ?? 0;
  }

  return toNumberMaybe(item.amount ?? item.balance) ?? 0;
}

export function getForeignAssetTwdValue(item, fxRates = {}) {
  if (!item || item.category !== '外幣活存') {
    return toNumberMaybe(item?.balance) ?? 0;
  }

  const currency = normalizeCurrencyCode(item.currency || 'USD');
  const amount = getForeignAssetAmount(item);
  const liveRate = toNumberMaybe(fxRates[currency]);
  const fallbackRate = toNumberMaybe(DEFAULT_TWD_PER_FOREIGN_CURRENCY[currency]) ?? 1;
  const twdPerUnit = liveRate && liveRate > 0 ? liveRate : fallbackRate;

  return Math.round(amount * twdPerUnit);
}

export function decorateAssetsWithFx(assetBalances, fxRates = {}) {
  return assetBalances.map((item) => {
    if (item.category !== '外幣活存') {
      return { ...item };
    }

    const currency = normalizeCurrencyCode(item.currency || 'USD');
    const amount = getForeignAssetAmount(item);
    const liveRate = toNumberMaybe(fxRates[currency]);
    const fallbackRate = toNumberMaybe(DEFAULT_TWD_PER_FOREIGN_CURRENCY[currency]) ?? 1;
    const twdPerUnit = liveRate && liveRate > 0 ? liveRate : fallbackRate;

    return {
      ...item,
      currency,
      amount,
      balance: amount,
      fxRate: twdPerUnit,
      convertedBalance: Math.round(amount * twdPerUnit),
    };
  });
}

export async function fetchForeignExchangeRates(currencies = []) {
  const requestedCurrencies = [...new Set(currencies.map(normalizeCurrencyCode).filter(Boolean))];

  if (requestedCurrencies.length === 0) {
    return {};
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/TWD', {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      throw new Error('Unable to fetch exchange rates');
    }

    const json = await res.json();
    const rates = json?.rates || {};

    return requestedCurrencies.reduce((acc, currency) => {
      const foreignPerTwd = toNumberMaybe(rates[currency]);
      if (foreignPerTwd && foreignPerTwd > 0) {
        acc[currency] = 1 / foreignPerTwd;
        return acc;
      }

      acc[currency] = DEFAULT_TWD_PER_FOREIGN_CURRENCY[currency] ?? 1;
      return acc;
    }, {});
  } catch (error) {
    return requestedCurrencies.reduce((acc, currency) => {
      acc[currency] = DEFAULT_TWD_PER_FOREIGN_CURRENCY[currency] ?? 1;
      return acc;
    }, {});
  }
}

export function calculateStockPortfolio(transactions, stockMarketPrices) {
  const portfolioMap = {};

  const sortedTx = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  sortedTx.forEach((tx) => {
    const { stock, type, qty, actualAmount } = tx;
    if (!portfolioMap[stock]) {
      portfolioMap[stock] = { name: stock, holdingQty: 0, totalBuyCost: 0 };
    }

    const pos = portfolioMap[stock];

    if (type === 'buy') {
      pos.holdingQty += Number(qty);
      pos.totalBuyCost += Number(actualAmount);
    } else if (type === 'sell' && pos.holdingQty > 0) {
      const sold = Math.min(Number(qty), pos.holdingQty);
      const ratio = sold / pos.holdingQty;
      pos.holdingQty -= sold;
      pos.totalBuyCost *= 1 - ratio;
    }
  });

  const positions = Object.values(portfolioMap)
    .filter((p) => p.holdingQty > 0)
    .map((p) => {
      const marketPrice = stockMarketPrices[p.name] ?? 0;
      const marketValue = p.holdingQty * marketPrice;
      const unrealizedProfit = marketValue - p.totalBuyCost;
      const profitPercent = p.totalBuyCost > 0 ? (unrealizedProfit / p.totalBuyCost) * 100 : 0;
      return {
        ...p,
        avgCost: p.totalBuyCost / p.holdingQty,
        marketPrice,
        marketValue,
        unrealizedProfit,
        profitPercent,
      };
    });

  const totalInvestmentCost = positions.reduce((acc, p) => acc + p.totalBuyCost, 0);
  const currentPortfolioValue = positions.reduce((acc, p) => acc + p.marketValue, 0);

  return {
    positions,
    totalInvestmentCost,
    currentPortfolioValue,
    unrealizedProfit: currentPortfolioValue - totalInvestmentCost,
  };
}

export function calculateAssetsSummary(assetBalances, stockMarketValue, lastMonthNetWorth, fxRates = {}) {
  const totals = {
    ntdSavings: 0,
    foreignSavings: 0,
    foreignSavingsOriginal: 0,
    otherAssets: 0,
    liabilities: 0,
  };

  assetBalances.forEach((item) => {
    if (item.category === '台幣活存') {
      totals.ntdSavings += toNumberMaybe(item.balance) ?? 0;
    } else if (item.category === '外幣活存') {
      totals.foreignSavingsOriginal += getForeignAssetAmount(item);
      totals.foreignSavings += getForeignAssetTwdValue(item, fxRates);
    } else if (item.category === '員工持股信託') {
      totals.otherAssets += toNumberMaybe(item.balance) ?? 0;
    } else if (item.isLiability || item.category === '負債項目') {
      totals.liabilities += toNumberMaybe(item.balance) ?? 0;
    }
  });

  const totalAssets = Math.round(
    totals.ntdSavings + totals.foreignSavings + totals.otherAssets + stockMarketValue
  );
  const netWorth = totalAssets - Math.round(totals.liabilities);
  const netGrowth = netWorth - Math.round(lastMonthNetWorth);
  const growthRate = lastMonthNetWorth > 0 ? (netGrowth / lastMonthNetWorth) * 100 : 0;

  return {
    totals,
    totalAssets,
    netWorth,
    netGrowth,
    growthRate,
  };
}

export function calculateMonthlyNetWorth(assetBalances, transactions, stockMarketPrices, lastMonthNetWorth) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const monthlyData = [];

  // 計算每月的淨值
  for (let month = 1; month <= 12; month++) {
    const monthStr = `${currentYear}-${String(month).padStart(2, '0')}`;

    // 計算該月的股票持倉價值
    const monthTransactions = transactions.filter((tx) => tx.date.startsWith(monthStr));

    // 從交易歷史推算該月底的持倉
    const portfolioAtMonth = {};
    const allTxUpToMonth = transactions.filter((tx) => tx.date < `${monthStr}-32`); // (該月之前)

    allTxUpToMonth.forEach((tx) => {
      const key = tx.stock;
      if (!portfolioAtMonth[key]) {
        portfolioAtMonth[key] = { holdingQty: 0, totalBuyCost: 0 };
      }
      if (tx.type === 'buy') {
        portfolioAtMonth[key].holdingQty += Number(tx.qty);
        portfolioAtMonth[key].totalBuyCost += Number(tx.actualAmount);
      } else if (tx.type === 'sell' && portfolioAtMonth[key].holdingQty > 0) {
        const sold = Math.min(Number(tx.qty), portfolioAtMonth[key].holdingQty);
        const ratio = sold / portfolioAtMonth[key].holdingQty;
        portfolioAtMonth[key].holdingQty -= sold;
        portfolioAtMonth[key].totalBuyCost *= 1 - ratio;
      }
    });

    // 計算該月的股票市值
    let stockValue = 0;
    Object.entries(portfolioAtMonth).forEach(([stock, pos]) => {
      if (pos.holdingQty > 0) {
        const price = stockMarketPrices[stock] ?? 0;
        stockValue += pos.holdingQty * price;
      }
    });

    // 銀行存款假設逐月遞增（基於成長趨勢）
    const monthGrowthFactor = month / 12;
    const estimatedBankSavings = lastMonthNetWorth * 0.6 * (1 + monthGrowthFactor * 0.2);

    // 負債假設穩定
    const estimatedLiabilities = lastMonthNetWorth * 0.1;

    const monthlyNetWorth = Math.round(estimatedBankSavings + stockValue - estimatedLiabilities);

    monthlyData.push({
      month: `${month}`,
      netWorth: Math.max(0, monthlyNetWorth),
    });
  }

  return monthlyData;
}
