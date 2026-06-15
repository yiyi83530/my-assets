import nextDynamic from 'next/dynamic';
import TabNav from '@/components/TabNav';
import { assetBalances, lastMonthNetWorth, stockMarketPrices, transactions } from '@/lib/data';
import {
  calculateAssetsSummary,
  calculateStockPortfolio,
  calculateMonthlyNetWorth,
  decorateAssetsWithFx,
  fetchForeignExchangeRates,
} from '@/lib/calculations';

// 使用動態匯入並停用 SSR，解決 Recharts 在編譯階段因找不到瀏覽器容器寬高而導致的 width(-1) 錯誤
const AssetsContent = nextDynamic(
  () => import('@/components/AssetsContent').then((mod) => mod.AssetsContent),
  { ssr: false, loading: () => <div className="p-20 text-center text-slate-400">圖表載入中...</div> }
);

export const dynamic = 'auto';

export default async function AssetsPage() {
  const foreignCurrencies = [...new Set(
    assetBalances
      .filter((item) => item.category === '外幣活存')
      .map((item) => item.currency)
      .filter(Boolean)
  )];
  const fxRates = await fetchForeignExchangeRates(foreignCurrencies);
  const assetsWithFx = decorateAssetsWithFx(assetBalances, fxRates);

  const portfolio = calculateStockPortfolio(transactions, stockMarketPrices);
  const summary = calculateAssetsSummary(
    assetsWithFx,
    portfolio.currentPortfolioValue,
    lastMonthNetWorth,
    fxRates
  );

  const monthlyNetWorthData = calculateMonthlyNetWorth(assetsWithFx, transactions, stockMarketPrices, lastMonthNetWorth);

  const ntd = assetsWithFx.filter((a) => a.category === '台幣活存');
  const foreign = assetsWithFx.filter((a) => a.category === '外幣活存');
  const trust = assetsWithFx.filter((a) => a.category === '員工持股信託');
  const liabilities = assetsWithFx.filter((a) => a.isLiability || a.category === '負債項目');

  return (
    <>
      <TabNav activeTab="assets" />
      <AssetsContent
        summary={summary}
        portfolio={portfolio}
        monthlyNetWorthData={monthlyNetWorthData}
        ntd={ntd}
        foreign={foreign}
        trust={trust}
        liabilities={liabilities}
      />
    </>
  );
}
