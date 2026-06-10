import TabNav from '@/components/TabNav';
import { stockMarketPrices, transactions } from '@/lib/data';
import { calculateStockPortfolio } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

export default async function StocksPage() {
  const portfolio = calculateStockPortfolio(transactions, stockMarketPrices);

  return (
    <>
      <TabNav activeTab="stocks" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="card p-5">
          <p className="text-xs font-bold text-slate-400">持股現值總計</p>
          <p className="mt-2 text-2xl font-black text-slate-900">${portfolio.currentPortfolioValue.toLocaleString()}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-bold text-slate-400">總投資成本</p>
          <p className="mt-2 text-2xl font-black text-slate-900">${portfolio.totalInvestmentCost.toLocaleString()}</p>
        </div>
        <div className="card p-5 md:col-span-2">
          <p className="text-xs font-bold text-slate-400">未實現損益</p>
          <p className={`mt-2 text-2xl font-black ${portfolio.unrealizedProfit >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {portfolio.unrealizedProfit >= 0 ? '+' : ''}${Math.abs(portfolio.unrealizedProfit).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-800">股票庫存【資料夾路由：/stocks】</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">股票</th>
                <th className="px-4 py-3 text-right">持有股數</th>
                <th className="px-4 py-3 text-right">均價</th>
                <th className="px-4 py-3 text-right">現價</th>
                <th className="px-4 py-3 text-right">成本</th>
                <th className="px-4 py-3 text-right">現值</th>
                <th className="px-4 py-3 text-right">損益率</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.positions.map((pos) => (
                <tr key={pos.name} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-800">{pos.name}</td>
                  <td className="px-4 py-3 text-right font-mono">{pos.holdingQty.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">${pos.avgCost.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">${pos.marketPrice.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">${pos.totalBuyCost.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">${pos.marketValue.toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right font-mono ${pos.profitPercent >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {pos.profitPercent >= 0 ? '+' : ''}{pos.profitPercent.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
