import TabNav from '@/components/TabNav';
import { AssetsContent } from '@/components/AssetsContent';
import { assetBalances, lastMonthNetWorth, stockMarketPrices, transactions } from '@/lib/data';
import { calculateAssetsSummary, calculateStockPortfolio } from '@/lib/calculations';


export default async function AssetsPage() {
  const portfolio = calculateStockPortfolio(transactions, stockMarketPrices);
  const summary = calculateAssetsSummary(
    assetBalances,
    portfolio.currentPortfolioValue,
    lastMonthNetWorth
  );

  const ntd = assetBalances.filter((a) => a.category === '台幣活存');
  const foreign = assetBalances.filter((a) => a.category === '外幣活存');
  const trust = assetBalances.filter((a) => a.category === '員工持股信託');
  const liabilities = assetBalances.filter((a) => a.isLiability || a.category === '負債項目');

  return (
    <>
      <TabNav activeTab="assets" />
      <AssetsContent
        summary={summary}
        portfolio={portfolio}
        ntd={ntd}
        foreign={foreign}
        trust={trust}
        liabilities={liabilities}
      />
    </>
  );
}
