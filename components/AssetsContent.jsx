'use client';

import { useState, useMemo, useEffect } from 'react';
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
import {
  calculateAssetsSummary,
  calculateStockPortfolio,
  decorateAssetsWithFx,
  fetchForeignExchangeRates,
} from '@/lib/calculations';
import { stockMarketPrices } from '@/lib/data';
import { demoMonthlyAssets, demoMonthlyNetWorth, demoSummary, demoPortfolio } from '@/lib/demo-data';

function MonthTick({ x, y, payload, currentMonth }) {
  const month = String(payload?.value ?? '');
  const isCurrent = month === currentMonth;
  return (
    <g transform={`translate(${x},${y})`}>
      {isCurrent && <rect x={-16} y={4} width={32} height={16} rx={8} fill="#fee2e2" />}
      <text x={0} y={16} textAnchor="middle" fontSize={11} fontWeight={isCurrent ? 700 : 500} fill={isCurrent ? '#e11d48' : '#64748b'}>{month}</text>
    </g>
  );
}

function ListBlock({ title, subtitle, items, moneyClass = 'text-slate-800', amountRenderer, detailRenderer, totalValue = 0, totalLabel = '總計', totalClass = 'text-slate-700' }) {
  return (
    <div className="card p-5">
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-slate-100 pb-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold leading-5 text-slate-700">{title}</h3>
          <p className={`mt-0.5 text-[11px] leading-4 text-slate-400 ${subtitle ? '' : 'invisible'}`}>{subtitle || '占位'}</p>
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
              <span className={`font-mono font-bold ${moneyClass}`}>{amountRenderer ? amountRenderer(item) : formatMoney(item.balance)}</span>
              {detailRenderer && <span className="mt-0.5 text-[10px] text-slate-400">{detailRenderer(item)}</span>}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-slate-400">目前沒有資料</p>}
      </div>
    </div>
  );
}

export function AssetsContent() {
  const {
    openManageModal,
    openConfigModal,
    isSheetsConnected,
    monthlyAssets: realMonthlyAssets,
    setMonthlyAssets: realSetMonthlyAssets,
    monthlyNetWorth: realMonthlyNetWorth,
    transactions: realTransactions,
  } = useApp();

  const [isTrendOpen, setIsTrendOpen] = useState(false);
  const [fxRates, setFxRates] = useState({});

  const activeMonthlyAssets = isSheetsConnected ? realMonthlyAssets : demoMonthlyAssets;
  const activeMonthlyNetWorth = isSheetsConnected ? realMonthlyNetWorth : demoMonthlyNetWorth;
  const activeTransactions = isSheetsConnected ? (realTransactions || []) : (demoPortfolio.transactionHistory || []);

  const setMonthlyAssets = isSheetsConnected ? realSetMonthlyAssets : () => {
    console.warn("Demo mode: Operation ignored.");
  };

  // 定義「當下」的年月
  const { currentYearReal, currentMonthReal } = useMemo(() => {
    const today = new Date();
    return { currentYearReal: today.getFullYear(), currentMonthReal: today.getMonth() + 1 };
  }, []);

  // 計算有資料的年份 (只要該年有任一月份資料就列出)
  const availableYears = useMemo(() => {
    const years = Object.keys(activeMonthlyAssets || {}).map(key => parseInt(key.split('-')[0]));
    const uniqueYears = [...new Set(years)].sort((a, b) => b - a);

    // 確保「今年」一定在選項中，即使今年還沒紀錄任何資料
    if (!uniqueYears.includes(currentYearReal)) {
      uniqueYears.push(currentYearReal);
      uniqueYears.sort((a, b) => b - a);
    }
    return uniqueYears;
  }, [activeMonthlyAssets, currentYearReal]);

  // 預設狀態：直接設為當前年月
  const [selectedYear, setSelectedYear] = useState(currentYearReal);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthReal);

  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [yearHighlightedIndex, setYearHighlightedIndex] = useState(-1);
  const [monthHighlightedIndex, setMonthHighlightedIndex] = useState(-1);

  // 只要選擇了年份，月份永遠顯示 1-12 月
  const availableMonths = Array.from({ length: 12 }, (_, i) => i + 1);

  const selectedMonthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const getPreviousMonthKey = (year, month) => {
    if (month === 1) return `${year - 1}-12`;
    return `${year}-${String(month - 1).padStart(2, '0')}`;
  };

  const getAssetsForMonth = (yearMonth) => {
    if (activeMonthlyAssets.hasOwnProperty(yearMonth)) {
      return activeMonthlyAssets[yearMonth];
    }

    // 找不到該月資料時，一路往前找最近一筆「真正有資料」的月份當作預設值
    // 安全上限：最多往前找 60 個月（5 年），避免使用者帳號完全沒有任何資料時無窮迴圈
    let [year, month] = yearMonth.split('-').map(Number);
    for (let i = 0; i < 60; i++) {
      const prevKey = getPreviousMonthKey(year, month);
      if (activeMonthlyAssets[prevKey]) {
        // 深拷貝：避免使用者編輯這份「預設值」時，意外動到原始月份的歷史資料
        return JSON.parse(JSON.stringify(activeMonthlyAssets[prevKey]));
      }
      [year, month] = prevKey.split('-').map(Number);
    }

    return [];
  };

  const displayAssetsRaw = useMemo(
    () => getAssetsForMonth(selectedMonthKey),
    [activeMonthlyAssets, selectedMonthKey]
  );

  const hasNoAssets = displayAssetsRaw.length === 0;

  // 拉取外幣即時匯率（僅在連線模式下才需要打 API；demo 資料已經內建 fxRate/convertedBalance）
  useEffect(() => {
    if (!isSheetsConnected) {
      setFxRates({});
      return;
    }
    const currencies = [...new Set(
      displayAssetsRaw
        .filter((item) => item.category === '外幣活存')
        .map((item) => item.currency)
        .filter(Boolean)
    )];

    let active = true;
    fetchForeignExchangeRates(currencies)
      .then((rates) => { if (active) setFxRates(rates); })
      .catch(() => { if (active) setFxRates({}); });

    return () => { active = false; };
  }, [isSheetsConnected, selectedMonthKey, displayAssetsRaw]);

  // 真實模式才需要重新跑匯率換算；demo 資料本身已經算好 convertedBalance
  const displayAssets = useMemo(() => {
    if (!isSheetsConnected) return displayAssetsRaw;
    return decorateAssetsWithFx(displayAssetsRaw, fxRates);
  }, [isSheetsConnected, displayAssetsRaw, fxRates]);

  const displayNtd = hasNoAssets ? [] : displayAssets.filter((a) => a.category === '台幣活存');
  const displayForeign = hasNoAssets ? [] : displayAssets.filter((a) => a.category === '外幣活存');
  const displayTrust = hasNoAssets ? [] : displayAssets.filter((a) => a.category === '員工持股信託');
  const displayLiabilities = hasNoAssets ? [] : displayAssets.filter((a) => a.isLiability || a.category === '負債項目');

  // ─── 依「選定年月」算出當月底持倉與淨值總覽（兩者都會隨年月切換重新計算） ───
  const lastDayOfSelectedMonth = `${selectedMonthKey}-31`; // 字串比較即可，日期格式皆為 YYYY-MM-DD

  const portfolioAtSelectedMonth = useMemo(() => {
    if (!isSheetsConnected) return demoPortfolio;
    const txUpToMonth = (activeTransactions || []).filter((tx) => tx.date <= lastDayOfSelectedMonth);
    return calculateStockPortfolio(txUpToMonth, stockMarketPrices);
  }, [isSheetsConnected, activeTransactions, lastDayOfSelectedMonth]);

  const previousMonthKey = getPreviousMonthKey(selectedYear, selectedMonth);
  const previousMonthSummaryNetWorth = useMemo(() => {
    if (!isSheetsConnected) {
      const idx = activeMonthlyNetWorth.findIndex((d) => d.month === String(selectedMonth));
      return idx > 0 ? activeMonthlyNetWorth[idx - 1].netWorth : 0;
    }
    const found = activeMonthlyNetWorth.find((d) => `${selectedYear}-${String(d.month).padStart(2, '0')}` === previousMonthKey);
    return found ? found.netWorth : 0;
  }, [isSheetsConnected, activeMonthlyNetWorth, selectedMonth, selectedYear, previousMonthKey]);

  const activeSummary = useMemo(() => {
    if (!isSheetsConnected) return demoSummary;
    if (hasNoAssets) return { netWorth: 0, netGrowth: 0, growthRate: 0, totals: {}, totalAssets: 0 };
    return calculateAssetsSummary(
      displayAssets,
      portfolioAtSelectedMonth.currentPortfolioValue,
      previousMonthSummaryNetWorth,
      fxRates
    );
  }, [isSheetsConnected, hasNoAssets, displayAssets, portfolioAtSelectedMonth, previousMonthSummaryNetWorth, fxRates]);

  const activePortfolio = portfolioAtSelectedMonth;
  const totalStocks = activePortfolio?.currentPortfolioValue || 0;

  const totalNtd = displayNtd.reduce((sum, item) => sum + (Number(item.balance) || 0), 0);
  const totalForeign = displayForeign.reduce((sum, item) => sum + (Number(item.convertedBalance ?? item.balance) || 0), 0);
  const totalTrust = displayTrust.reduce((sum, item) => sum + (Number(item.balance) || 0), 0);
  const totalLiabilities = displayLiabilities.reduce((sum, item) => sum + (Number(item.balance) || 0), 0);
  const totalAssets = totalNtd + totalForeign + totalTrust + totalStocks;

  const allocationData = [
    { name: '台幣活存', value: totalNtd, color: '#3b82f6' },     // 藍色
    { name: '外幣活存', value: totalForeign, color: '#0ea5e9' }, // 淺藍
    { name: '證券資產', value: totalStocks, color: '#f43f5e' },  // 玫瑰粉
    { name: '員工信託', value: totalTrust, color: '#eab308' },   // 黃色
  ].filter(d => d.value > 0);

  const fullChartData = activeMonthlyNetWorth && activeMonthlyNetWorth.length > 0 ? activeMonthlyNetWorth : [];
  const visibleEndMonth = Math.max(6, currentMonthReal);
  const chartData = fullChartData.filter((item) => Number(item.month) <= visibleEndMonth);
  const currentMonthStr = String(currentMonthReal);

  return (
    <>
      {!isSheetsConnected && (
        <div className={`mb-4 rounded-2xl border p-4 shadow-sm border-rose-100 bg-rose-50/70`}>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg border bg-white p-1 border-rose-100 text-rose-500">☁️</div>
              <div>
                <h4 className="text-sm font-semibold text-rose-950">目前為單機演示模式</h4>
                <p className="mt-0.5 text-xs text-rose-700/80">小提醒！此模式尚未串接後端，請點擊按鈕設定 Google Sheets 來連線！</p>
              </div>
            </div>
            <button onClick={openConfigModal} className="shrink-0 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition bg-rose-500 hover:bg-rose-600">
              串接 Google 試算表
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card p-6 md:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <span className="hidden rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600 md:inline-flex">淨值總覽</span>
            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500 md:text-sm md:text-slate-700">個人淨資產</p>
          </div>
          <p className="text-4xl font-black text-slate-900">${(activeSummary?.netWorth ?? 0).toLocaleString()}</p>
          <p className={`mt-3 flex items-center text-xs font-bold ${(activeSummary?.netGrowth ?? 0) >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            較上月 <span className="mx-1 text-[10px]">{(activeSummary?.netGrowth ?? 0) >= 0 ? '▲' : '▼'}</span> ${(activeSummary?.netGrowth ?? 0).toLocaleString()} ({(activeSummary?.growthRate ?? 0).toFixed(2)}%)
          </p>

          <button type="button" onClick={() => setIsTrendOpen((prev) => !prev)} className="mt-3 flex w-full justify-center md:hidden">
            <svg viewBox="0 0 20 20" fill="currentColor" className={`h-6 w-6 text-slate-400 transition-transform ${isTrendOpen ? 'rotate-180' : ''}`}><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.116l3.71-3.886a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
          </button>

          <div className={`${isTrendOpen ? 'block' : 'hidden'} md:block`}>
            <div className="mt-3 h-64 rounded-xl border border-rose-100 bg-rose-50/40 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-s font-bold uppercase tracking-wider text-slate-500">📈 資產淨值變動趨勢</h4>
                <span className="text-[10px] font-medium text-slate-400">單位：新台幣</span>
              </div>
              <div className="h-44 flex items-center justify-center">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={(props) => <MonthTick {...props} currentMonth={currentMonthStr} />} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 10000)}萬`} />
                      <Tooltip formatter={(value) => [`$${Number(value).toLocaleString('zh-TW')}`, '淨值']} labelFormatter={(label) => `${label}月`} contentStyle={{ borderRadius: '0.75rem', border: '1px solid #fecdd3', boxShadow: '0 6px 18px rgba(15, 23, 42, 0.08)' }} />
                      <Line type="monotone" dataKey="netWorth" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 5, fill: '#f43f5e' }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-slate-400">尚無資產淨值變動資料</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card flex flex-col justify-center p-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="hidden rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-600 md:inline-flex">配置分析</span>
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500 md:text-sm md:text-slate-700">資產配置比例</h3>
          </div>
          <p className="mt-3 mb-3 hidden text-left text-[11px] text-slate-400 md:block">將滑鼠移動到圓餅圖上，即可顯示該資產名稱及餘額！</p>
          <div className="h-40 w-full flex items-center justify-center">
            {allocationData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={allocationData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value">
                    {allocationData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} contentStyle={{ borderRadius: '0.5rem', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400">尚無資產配置資料</p>
            )}
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
                    <span className="font-mono text-[11px] font-bold text-slate-700">${item.value.toLocaleString()}</span>
                    <span className="w-8 text-right font-mono text-[10px] text-slate-400">{percent.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── 年月篩選器 ─── */}
      <div className="my-4 card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">查看月份：</span>
            <span className="text-xs text-slate-500">選擇年月查看該月資產及負債</span>
          </div>
          <div className="flex items-center gap-2">
            {/* 年份下拉 */}
            <div className="relative">
              <button type="button" onClick={() => { setShowYearDropdown(!showYearDropdown); setShowMonthDropdown(false); if (!showYearDropdown) setYearHighlightedIndex(availableYears.indexOf(selectedYear)); }} onBlur={() => setTimeout(() => setShowYearDropdown(false), 120)} className="flex min-w-[90px] items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none">
                <span>{selectedYear} 年</span>
                <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 text-slate-400 transition-transform ${showYearDropdown ? 'rotate-180' : ''}`}><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.116l3.71-3.886a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
              </button>
              {showYearDropdown && (
                <div className="absolute left-0 z-30 mt-1 w-full min-w-[90px] max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                  {availableYears.map((year, index) => (
                    <button key={year} type="button" onMouseEnter={() => setYearHighlightedIndex(index)} onClick={() => { setSelectedYear(year); setShowYearDropdown(false); }} className={`block w-full px-3 py-2 text-left text-xs font-semibold transition ${selectedYear === year || yearHighlightedIndex === index ? 'bg-rose-50 text-rose-700' : 'text-slate-700 hover:bg-slate-50'}`}>{year} 年</button>
                  ))}
                </div>
              )}
            </div>

            {/* 月份下拉 */}
            <div className="relative">
              <button type="button" onClick={() => { setShowMonthDropdown(!showMonthDropdown); setShowYearDropdown(false); if (!showMonthDropdown) setMonthHighlightedIndex(availableMonths.indexOf(selectedMonth)); }} onBlur={() => setTimeout(() => setShowMonthDropdown(false), 120)} className="flex min-w-[80px] items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none">
                <span>{selectedMonth} 月</span>
                <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 text-slate-400 transition-transform ${showMonthDropdown ? 'rotate-180' : ''}`}><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.116l3.71-3.886a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
              </button>
              {showMonthDropdown && (
                <div className="absolute left-0 z-30 mt-1 max-h-60 w-full min-w-[80px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                  {availableMonths.map((month, index) => (
                    <button key={month} type="button" onMouseEnter={() => setMonthHighlightedIndex(index)} onClick={() => { setSelectedMonth(month); setShowMonthDropdown(false); }} className={`block w-full px-3 py-2 text-left text-xs font-semibold transition ${selectedMonth === month || monthHighlightedIndex === index ? 'bg-rose-50 text-rose-700' : 'text-slate-700 hover:bg-slate-50'}`}>{month} 月</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 管理操作入口 ─── */}
      <div className="my-2">
        {/* 管理帳戶按鈕 */}
        <button
          onClick={() => openManageModal({ year: selectedYear, month: selectedMonth })}
          className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-rose-200 bg-white px-5 py-4 text-left shadow-sm ring-1 ring-rose-100/70 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-100/60"
        >
          {/* 動態小豬圖標 */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-50 text-2xl shadow-md shadow-rose-100 transition-transform group-hover:rotate-12 group-hover:scale-110">
            🐷
          </div>

          {/* 文字內容 */}
          <div className="min-w-0 flex-1">
            <span className="text-base font-black tracking-tight text-slate-800 transition-colors group-hover:text-rose-600">管理帳戶 / 餘額</span>
            <p className="mt-0.5 text-[12px] text-slate-500">更新銀行存款、外幣、信託與負債，並同步至個人 Google Sheets</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-lg bg-rose-500 px-2.5 py-1 text-[11px] font-bold text-white sm:inline-flex">立即管理</span>
            <svg className="h-5 w-5 text-rose-500 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </div>
        </button>
      </div>

      {hasNoAssets ? (
        <div className="card p-8 text-center">
          <div className="mb-4 flex justify-center"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">📝</div></div>
          <h3 className="text-lg font-bold text-slate-700">尚無資產負債資料</h3>
          <p className="mt-2 text-sm text-slate-500">此月份沒有記錄，請點擊「管理帳戶/餘額」新增資產與負債項目</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ListBlock title="台幣活存" items={displayNtd} totalValue={totalNtd} />
          <ListBlock title="外幣活存" subtitle="依當下匯率換算成台幣" items={displayForeign} totalValue={totalForeign} amountRenderer={(item) => {
            const amount = Number(item.amount ?? item.balance) || 0;
            const currency = item.currency || '外幣';
            const converted = item.convertedBalance ?? item.balance;
            return <><span className="text-slate-700">{amount.toLocaleString('zh-TW')} {currency}</span><span className="mx-1 text-slate-400">/</span><span className="text-rose-600">{formatMoney(converted)}</span></>;
          }} detailRenderer={(item) => `匯率 ${Number(item.fxRate || 1).toFixed(4)} / 1 ${item.currency || '外幣'}`} />
          <ListBlock title="員工持股信託" items={displayTrust} totalValue={totalTrust} />
          <div className="card p-5">
            <div className="mb-3 flex items-start justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold leading-5 text-slate-700">負債項目</h3>
              <div className="text-right">
                <p className="text-xs leading-5 text-slate-400">{displayLiabilities.length} 項</p>
                <p className="mt-0.5 font-mono text-[11px] leading-4 font-bold text-rose-600">總計 -{formatMoney(totalLiabilities)}</p>
              </div>
            </div>
            <div className="space-y-2">
              {displayLiabilities.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                  <span className="text-slate-600">{item.name}</span>
                  <span className="font-mono font-bold text-slate-700">-{formatMoney(item.balance)}</span>
                </div>
              ))}
              {displayLiabilities.length === 0 && <p className="text-xs text-slate-400">目前沒有資料</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
