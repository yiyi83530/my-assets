export function formatMoney(num) {
  return `$${Math.round(num).toLocaleString('zh-TW')}`;
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

export function calculateAssetsSummary(assetBalances, stockMarketValue, lastMonthNetWorth) {
  const totals = {
    ntdSavings: 0,
    foreignSavings: 0,
    otherAssets: 0,
    liabilities: 0,
  };

  assetBalances.forEach((item) => {
    if (item.category === '台幣活存') totals.ntdSavings += item.balance;
    else if (item.category === '外幣活存') totals.foreignSavings += item.balance;
    else if (item.category === '員工持股信託') totals.otherAssets += item.balance;
    else if (item.isLiability || item.category === '負債項目') totals.liabilities += item.balance;
  });

  const totalAssets = totals.ntdSavings + totals.foreignSavings + totals.otherAssets + stockMarketValue;
  const netWorth = totalAssets - totals.liabilities;
  const netGrowth = netWorth - lastMonthNetWorth;
  const growthRate = lastMonthNetWorth > 0 ? (netGrowth / lastMonthNetWorth) * 100 : 0;

  return {
    totals,
    totalAssets,
    netWorth,
    netGrowth,
    growthRate,
  };
}

