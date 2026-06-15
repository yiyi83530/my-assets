"use client";

import { useEffect, useMemo, useState } from 'react';
import nextDynamic from 'next/dynamic';
import { assetBalances as initialAssets, lastMonthNetWorth, stockMarketPrices } from '@/lib/data';
import {
  calculateAssetsSummary,
  calculateStockPortfolio,
  calculateMonthlyNetWorth,
  decorateAssetsWithFx,
  fetchForeignExchangeRates,
} from '@/lib/calculations';
import { useApp } from '@/lib/app-context';

// 使用動態匯入並停用 SSR，解決 Recharts 在編譯階段因找不到瀏覽器容器寬高而導致的 width(-1) 錯誤
const AssetsContent = nextDynamic(
  () => import('@/components/AssetsContent').then((mod) => mod.AssetsContent),
  { ssr: false, loading: () => <div className="p-20 text-center text-slate-400">圖表載入中...</div> }
);

export default function AssetsPage() {
  const { assets = initialAssets, transactions = [], monthlyNetWorth = [] } = useApp();
  const [fxRates, setFxRates] = useState({});

  useEffect(() => {
    const currencies = [...new Set(
      (assets || [])
        .filter((item) => item.category === '外幣活存')
        .map((item) => item.currency)
        .filter(Boolean)
    )];

    let active = true;
    fetchForeignExchangeRates(currencies)
      .then((rates) => {
        if (active) setFxRates(rates);
      })
      .catch(() => {
        if (active) setFxRates({});
      });

    return () => {
      active = false;
    };
  }, [assets]);

  const assetsWithFx = useMemo(() => decorateAssetsWithFx(assets || [], fxRates), [assets, fxRates]);
  const portfolio = useMemo(
    () => calculateStockPortfolio(transactions || [], stockMarketPrices),
    [transactions]
  );

  const summary = useMemo(
    () => calculateAssetsSummary(assetsWithFx, portfolio.currentPortfolioValue, lastMonthNetWorth, fxRates),
    [assetsWithFx, portfolio.currentPortfolioValue, fxRates]
  );

  const ntd = assetsWithFx.filter((a) => a.category === '台幣活存');
  const foreign = assetsWithFx.filter((a) => a.category === '外幣活存');
  const trust = assetsWithFx.filter((a) => a.category === '員工持股信託');
  const liabilities = assetsWithFx.filter((a) => a.isLiability || a.category === '負債項目');

  return (
    <>
      <AssetsContent
        summary={summary}
        portfolio={portfolio}
        monthlyNetWorthData={monthlyNetWorth}
        ntd={ntd}
        foreign={foreign}
        trust={trust}
        liabilities={liabilities}
      />
    </>
  );
}
