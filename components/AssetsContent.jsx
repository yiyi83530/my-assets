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

function MonthTick({ x, y, payload, currentMonth }) {
  const month = String(payload?.value ?? '');
  const isCurrent = month === currentMonth;

  return (
    <g transform={`translate(${x},${y})`}>
      {isCurrent && (
        <rect x={-16} y={4} width={32} height={16} rx={8} fill="#fee2e2" />
      )}
      <text
        x={0}
        y={16}
        textAnchor="middle"
        fontSize={11}
        fontWeight={isCurrent ? 700 : 500}
        fill={isCurrent ? '#e11d48' : '#64748b'}
      >
        {month}
      </text>
    </g>
  );
}

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
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-slate-100 pb-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold leading-5 text-slate-700">{title}</h3>
          <p className={`mt-0.5 text-[11px] leading-4 text-slate-400 ${subtitle ? '' : 'invisible'}`}>
            {subtitle || '占位'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs leading-5 text-slate-400">{items.length} 項</p>
          <p className={`mt-0.5 font-mono text-[11px] leading-4 font-bold ${totalClass}`}>{totalLabel} {formatMoney(totalValue)}</p>
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
  const fullChartData = monthlyNetWorthData && monthlyNetWorthData.length > 0 ? monthlyNetWorthData : [];
  const currentMonthNum = new Date().getMonth() + 1;
  const visibleEndMonth = Math.max(6, currentMonthNum);
  const chartData = fullChartData.filter((item) => Number(item.month) <= visibleEndMonth);
  const currentMonth = String(currentMonthNum);

  return (
    <>
      {!isSheetsConnected && (
      <div className={`mb-4 rounded-2xl border p-4 shadow-sm border-rose-100 bg-rose-50/70`}>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg border bg-white p-1 border-rose-100 text-rose-500">
              ☁️
            </div>
            <div>
              <h4 className="text-sm font-semibold text-rose-950">目前為單機演示模式（重新整理將重置）</h4>
              <p className="mt-0.5 text-xs text-rose-700/80">
                小提醒！此模式尚未串接後端，如果要完整體驗小豬存錢筒，請點擊右方按鈕設定 Google Sheets 來實現永久自動連線！
              </p>
            </div>
          </div>
          <button
            onClick={openConfigModal}
            className="shrink-0 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition bg-rose-500 hover:bg-rose-600"
          >
            串接 Google 試算表
          </button>
        </div>
      </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card p-6 md:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <span className="hidden rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600 md:inline-flex">
              淨值總覽
            </span>
            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500 md:text-sm md:text-slate-700">
              個人淨資產
            </p>
          </div>
          <p className="text-4xl font-black text-slate-900">${summary.netWorth.toLocaleString()}</p>
          <p className={`mt-3 flex items-center text-xs font-bold ${summary.netGrowth >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            較上月 <span className="mx-1 text-[10px]">{summary.netGrowth >= 0 ? '▲' : '▼'}</span> ${summary.netGrowth.toLocaleString()} ({summary.growthRate.toFixed(2)}%)
          </p>

          <button
            type="button"
            onClick={() => setIsTrendOpen((prev) => !prev)}
            className="mt-3 flex w-full justify-center md:hidden"
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

           <div className={`${isTrendOpen ? 'block' : 'hidden'} md:block`}>
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
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={(props) => <MonthTick {...props} currentMonth={currentMonth} />}
                    />
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
          </div>
        </div>

        <div className="card flex flex-col justify-center p-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="hidden rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-600 md:inline-flex">
              配置分析
            </span>
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500 md:text-sm md:text-slate-700">資產配置比例</h3>
          </div>
          <p className="mt-3 mb-3 hidden text-left text-[11px] text-slate-400 md:block">
            將滑鼠移動到圓餅圖上，就可以顯示該資產名稱及餘額哦！
          </p>

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
          className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-rose-200 bg-white px-5 py-4 text-left shadow-sm ring-1 ring-rose-100/70 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-100/60"
        >
          {/* 動態小豬圖標 */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-50 text-2xl shadow-md shadow-rose-100 transition-transform group-hover:rotate-12 group-hover:scale-110">
            🐷
          </div>

          {/* 文字內容 */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-slate-800 transition-colors group-hover:text-rose-600">
                管理帳戶 / 餘額
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-slate-500">
              更新銀行存款、外幣、信託與負債，並同步至個人 Google Sheets
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-lg bg-rose-500 px-2.5 py-1 text-[11px] font-bold text-white sm:inline-flex">
              立即管理
            </span>
            <svg className="h-5 w-5 text-rose-500 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <div className="mb-3 flex items-start justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold leading-5 text-slate-700">負債項目</h3>
              <div className="text-right">
                <p className="text-xs leading-5 text-slate-400">{liabilities.length} 項</p>
                <p className="mt-0.5 font-mono text-[11px] leading-4 font-bold text-rose-600">總計 -{formatMoney(totalLiabilities)}</p>
              </div>
            </div>
            <div className="space-y-2">
              {liabilities.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                  <span className="text-slate-600">{item.name}</span>
                  <span className="font-mono font-bold text-slate-700">-{formatMoney(item.balance)}</span>
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
