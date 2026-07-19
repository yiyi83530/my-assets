"use client";

import nextDynamic from 'next/dynamic';

// 使用動態匯入並停用 SSR，解決 Recharts 在編譯階段因找不到瀏覽器容器寬高而導致的 width(-1) 錯誤
const AssetsContent = nextDynamic(
  () => import('@/components/AssetsContent').then((mod) => mod.AssetsContent),
  { ssr: false, loading: () => <div className="p-20 text-center text-slate-400">圖表載入中...</div> }
);

export default function AssetsPage() {
  return <AssetsContent />;
}
