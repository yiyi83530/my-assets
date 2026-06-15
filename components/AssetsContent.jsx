'use client';

import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '@/lib/app-context';
import { formatMoney } from '@/lib/format';

function ListBlock({
  title,
  subtitle,
  items,
  moneyClass = 'text-slate-800',
  amountRenderer,
  detailRenderer,
  totalValue = 0,
  totalLabel = '總計',
  totalClass = 'text-slate-700',
}) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
        <div>
          <h3 className="text-sm font-bold text-slate-700">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>}
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">{items.length} 項</span>
          <p className={`mt-0.5 font-mono text-[11px] font-bold ${totalClass}`}>{totalLabel} {formatMoney(totalValue)}</p>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
            <span className="text-slate-600">{item.name}</span>
            <div className="flex flex-col items-end text-right">
              <span className={`font-mono font-bold ${moneyClass}`}>
                {amountRenderer ? amountRenderer(item) : formatMoney(item.balance)}
              </span>
              {detailRenderer && <span className="mt-0.5 text-[10px] text-slate-400">{detailRenderer(item)}</span>}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-slate-400">目前沒有資料</p>}
      </div>
    </div>
  );
}

export function AssetsContent({ summary, portfolio, monthlyNetWorthData, ntd, foreign, trust, liabilities }) {
  const { openManageModal, openConfigModal, isSheetsConnected } = useApp();
  const [isTrendOpen, setIsTrendOpen] = useState(false);

  // ─── 資產配置計算 ───
  const totalNtd = ntd.reduce((sum, item) => sum + (Number(item.balance) || 0), 0);
  const totalForeign = foreign.reduce((sum, item) => sum + (Number(item.convertedBalance ?? item.balance) || 0), 0);
  const totalTrust = trust.reduce((sum, item) => sum + (Number(item.balance) || 0), 0);
  const totalLiabilities = liabilities.reduce((sum, item) => sum + (Number(item.balance) || 0), 0);
  const totalStocks = portfolio.currentPortfolioValue;
  const totalAssets = totalNtd + totalForeign + totalTrust + totalStocks;

  const allocationData = [
    { name: '台幣活存', value: totalNtd, color: '#3b82f6' },     // 藍色
    { name: '外幣活存', value: totalForeign, color: '#0ea5e9' }, // 淺藍
    { name: '證券資產', value: totalStocks, color: '#f43f5e' },  // 玫瑰粉
    { name: '員工信託', value: totalTrust, color: '#eab308' },   // 黃色
  ].filter(d => d.value > 0);
  // ──────────────────

  // 使用傳入的真實月份資料，如果沒有就用空陣列
  const chartData = monthlyNetWorthData && monthlyNetWorthData.length > 0 ? monthlyNetWorthData : [];

  return (
    <>
      <div className={`mb-4 rounded-2xl border p-4 shadow-sm ${isSheetsConnected ? 'border-emerald-100 bg-emerald-50/70' : 'border-rose-100 bg-rose-50/70'}`}>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 rounded-lg border bg-white p-1 ${isSheetsConnected ? 'border-emerald-100 text-emerald-500' : 'border-rose-100 text-rose-500'}`}>
              {isSheetsConnected ? '✅' : '☁️'}
            </div>
            <div>
              {isSheetsConnected ? (
                <>
                  <h4 className="text-sm font-semibold text-emerald-950">已連線 Google Sheets（資料為即時同步）</h4>
                  <p className="mt-0.5 text-xs text-emerald-700/80">
                    交易與資產更新會同步寫入您的 Google Sheets，重新整理後會讀取最新資料。
                  </p>
                </>
              ) : (
                <>
                  <h4 className="text-sm font-semibold text-rose-950">目前為單機演示模式（重新整理將重置）</h4>
                  <p className="mt-0.5 text-xs text-rose-700/80">
                    此模式未串接後端，方便您體驗小豬存錢筒。請點擊右方按鈕設定 Google Sheets 來實現永久自動連線！
                  </p>
                </>
              )}
            </div>
          </div>
          <button
            onClick={openConfigModal}
            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition ${isSheetsConnected ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}
          >
            {isSheetsConnected ? '更新連線設定' : '串接 Google 試算表'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card p-6 md:col-span-2">
          <p className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-400">個人淨資產</p>
          <p className="text-4xl font-black text-slate-900">${summary.netWorth.toLocaleString()}</p>
          <p className={`mt-3 flex items-center text-xs font-bold ${summary.netGrowth >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            較上月 <span className="mx-1 text-[10px]">{summary.netGrowth >= 0 ? '▲' : '▼'}</span> ${summary.netGrowth.toLocaleString()} ({summary.growthRate.toFixed(2)}%)
          </p>

          <button
            type="button"
            onClick={() => setIsTrendOpen((prev) => !prev)}
            className="mt-3 flex w-full justify-center"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-6 w-6 text-slate-400 transition-transform ${isTrendOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            >
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.116l3.71-3.886a.75.75 0 111.08 1.04l-4.25 4.454a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>

           {isTrendOpen && (
             <div className="mt-3 h-64 rounded-xl border border-rose-100 bg-rose-50/40 p-4">
               <div className="mb-4 flex items-center justify-between">
                 <h4 className="text-s font-bold uppercase tracking-wider text-slate-500">
                   📈 資產淨值變動趨勢
                 </h4>
                 <span className="text-[10px] font-medium text-slate-400">單位：新台幣</span>
               </div>
               <div className="h-44">
                 <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                   <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                   <YAxis
                     tick={{ fontSize: 11, fill: '#64748b' }}
                     axisLine={false}
                     tickLine={false}
                     tickFormatter={(value) => `${Math.round(value / 10000)}萬`}
                   />
                   <Tooltip
                     formatter={(value) => [`$${Number(value).toLocaleString('zh-TW')}`, '淨值']}
                     labelFormatter={(label) => `${label}月`}
                     contentStyle={{
                       borderRadius: '0.75rem',
                       border: '1px solid #fecdd3',
                       boxShadow: '0 6px 18px rgba(15, 23, 42, 0.08)',
                     }}
                   />
                   <Line
                     type="monotone"
                     dataKey="netWorth"
                     stroke="#f43f5e"
                     strokeWidth={2.5}
                     dot={{ r: 5, fill: '#f43f5e' }}
                     activeDot={{ r: 5 }}
                   />
                 </LineChart>
                 </ResponsiveContainer>
               </div>
            </div>
          )}
        </div>

        <div className="card flex flex-col p-6">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">資產配置比例</h3>

          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `$${value.toLocaleString()}`}
                  contentStyle={{ borderRadius: '0.5rem', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 簡易圖例與數值 */}
          <div className="mt-2 w-full space-y-1.5">
            {allocationData.map((item) => {
              const percent = totalAssets > 0 ? (item.value / totalAssets) * 100 : 0;
              return (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] font-medium text-slate-500">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] font-bold text-slate-700">
                      ${item.value.toLocaleString()}
                    </span>
                    <span className="w-8 text-right font-mono text-[10px] text-slate-400">
                      {percent.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
      </div>

      {/* ─── 管理操作入口 (橫跨橫條) ─── */}
      <div className="my-2 flex justify-center">
        <button
          onClick={openManageModal}
          className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-white/50 px-4 py-4 transition-all hover:border-rose-200 hover:bg-white hover:shadow-xl hover:shadow-rose-100/50"
        >
          {/* 動態小豬圖標 */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-50 text-2xl shadow-sm transition-transform group-hover:rotate-12 group-hover:scale-110">
            🐷
          </div>

          {/* 文字內容 */}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-700 transition-colors group-hover:text-rose-500">管理帳戶 / 餘額</span>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-500 opacity-0 transition-opacity group-hover:opacity-100">
                QUICK EDIT
              </span>
            </div>
            <p className="text-[11px] text-slate-400">更新銀行存款、負債並同步至個人 Google Sheets</p>
          </div>

          {/* 右側引導箭頭 */}
          <div className="ml-auto translate-x-0 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100">
            <svg className="h-5 w-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListBlock title="台幣活存" items={ntd} totalValue={totalNtd} />
        <ListBlock
          title="外幣活存"
          subtitle="依當下匯率換算成台幣"
          items={foreign}
          totalValue={totalForeign}
          amountRenderer={(item) => {
            const amount = Number(item.amount ?? item.balance) || 0;
            const currency = item.currency || '外幣';
            const converted = item.convertedBalance ?? item.balance;
            return (
              <>
                <span className="text-slate-700">{amount.toLocaleString('zh-TW')} {currency}</span>
                <span className="mx-1 text-slate-400">/</span>
                <span className="text-rose-600">{formatMoney(converted)}</span>
              </>
            );
          }}
          detailRenderer={(item) => {
            const currency = item.currency || '外幣';
            const rate = Number(item.fxRate) || 1;
            return `匯率 ${rate.toFixed(4)} / 1 ${currency}`;
          }}
        />
        <ListBlock title="員工持股信託" items={trust} totalValue={totalTrust} />
        <div>
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-700">負債項目</h3>
                <p className="mt-0.5 font-mono text-[11px] font-bold text-rose-600">總計 -{formatMoney(totalLiabilities)}</p>
              </div>
              <button
                onClick={openManageModal}
                className="text-xs font-bold text-rose-600 hover:text-rose-700"
              >
                更新負債
              </button>
            </div>
            <div className="space-y-2">
              {liabilities.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                  <span className="text-slate-600">{item.name}</span>
                  <span className="font-mono font-bold text-rose-600">-{formatMoney(item.balance)}</span>
                </div>
              ))}
              {liabilities.length === 0 && <p className="text-xs text-slate-400">目前沒有資料</p>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
