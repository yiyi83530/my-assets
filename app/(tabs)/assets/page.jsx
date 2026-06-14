import dynamic from 'next/dynamic';
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
const AssetsContent = dynamic(
  () => import('@/components/AssetsContent').then((mod) => mod.AssetsContent),
  { ssr: false, loading: () => <div className="p-20 text-center text-slate-400">圖表載入中...</div> }
);

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AssetsPage() {
  let fxRates = {};
  
  try {
    const foreignCurrencies = [...new Set(
      assetBalances
        .filter((item) => item.category === '外幣活存')
        .map((item) => item.currency)
        .filter(Boolean)
    )];
    fxRates = await fetchForeignExchangeRates(foreignCurrencies);
  } catch (error) {
    console.error("Failed to fetch FX rates:", error);
  }

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

  // 強制序列化，確保傳遞給 Client Component 的資料是純 JSON
  const serializedProps = JSON.parse(JSON.stringify({
    summary,
    portfolio,
    monthlyNetWorthData,
    ntd,
    foreign,
    trust,
    liabilities
  }));

  return (
    <>
      <TabNav activeTab="assets" />
      <AssetsContent
        summary={serializedProps.summary}
        portfolio={serializedProps.portfolio}
        monthlyNetWorthData={serializedProps.monthlyNetWorthData}
        ntd={serializedProps.ntd}
        foreign={serializedProps.foreign}
        trust={serializedProps.trust}
        liabilities={serializedProps.liabilities}
      />
    </>
  );
}
