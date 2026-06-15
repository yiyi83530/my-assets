'use client';

import { useEffect, useRef, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useApp } from '@/lib/app-context';

// ─── helpers ─────────────────────────────────────────────────────────────────

// 股票代號 → 產業分類映射 (可擴展)
const INDUSTRY_MAP = {
  // 台股
  2330: '半導體',
  2454: '半導體',
  3034: '半導體',
  2308: '半導體',
  2317: '半導體',
  2382: '半導體',
  3231: '半導體',
  1301: '水泥',
  1402: '鋼鐵',
  2353: '晶圓代工',
  2379: '晶圓代工',
  2880: '金融保險',
  2881: '金融保險',
  2886: '金融保險',
  2890: '金融保險',
  1590: '纖維',
  4938: '光磊',
  2409: '光磊',
  6488: '光磊',
  2882: '金融保險',
  2883: '金融保險',
  2884: '金融保險',
  2885: '金融保險',
  2887: '金融保險',
  3044: '消費電子',
  2481: '光磊',
  2347: '光磊',
  3016: '消費電子',
  TSMC: '半導體',
  MediaTek: '半導體',
  // 美股
  AAPL: '消費電子',
  MSFT: '軟體/雲計算',
  GOOGL: '網路/軟體',
  AMZN: '電子商務',
  NVDA: 'AI/晶片',
  META: '社群媒體',
  TSLA: '電動車',
  JPM: '金融',
  BAC: '金融',
  WMT: '零售',
  MCD: '餐飲',
  KO: '飲料食品',
};

// 依產業分類預設顏色
const INDUSTRY_COLORS = {
  '半導體': '#ef4444',
  '晶圓代工': '#f97316',
  '金融保險': '#eab308',
  '消費電子': '#22c55e',
  '軟體/雲計算': '#06b6d4',
  '網路/軟體': '#3b82f6',
  '電子商務': '#6366f1',
  'AI/晶片': '#d946ef',
  '光磊': '#ec4899',
  '電動車': '#8b5cf6',
  '社群媒體': '#14b8a6',
  '水泥': '#f59e0b',
  '鋼鐵': '#78716c',
  '纖維': '#0ea5e9',
  '消費': '#green',
  '餐飲': '#hsl(210, 40%, 80%)',
  '飲料食品': '#hsl(30, 80%, 60%)',
  '零售': '#hsl(280, 80%, 60%)',
  '金融': '#hsl(200, 80%, 60%)',
  'default': '#a78bfa',
};

function getIndustry(symbol) {
  return INDUSTRY_MAP[symbol] || '其他';
}

function buildBasePositions(txList) {
  const map = {};
  const sorted = [...txList].sort((a, b) => new Date(a.date) - new Date(b.date));

  sorted.forEach((tx) => {
    const key = tx.stock;
    if (!map[key]) {
      map[key] = {
        name: tx.stock,
        symbol: tx.symbol || tx.stock.split(' ')[0],
        market: tx.market || 'TWSE',
        holdingQty: 0,
        totalBuyCost: 0,
      };
    }
    const pos = map[key];
    if (tx.type === 'buy') {
      pos.holdingQty += Number(tx.qty);
      pos.totalBuyCost += Number(tx.actualAmount);
    } else if (tx.type === 'sell' && pos.holdingQty > 0) {
      const sold = Math.min(Number(tx.qty), pos.holdingQty);
      const ratio = sold / pos.holdingQty;
      pos.holdingQty -= sold;
      pos.totalBuyCost *= 1 - ratio;
    }
  });

  return Object.values(map)
    .filter((p) => p.holdingQty > 0)
    .map((p) => ({
      ...p,
      avgCost: p.holdingQty > 0 ? p.totalBuyCost / p.holdingQty : 0,
    }));
}

function tabBtnClass(active) {
  return `px-3 py-1.5 rounded-lg text-xs font-bold transition ${
    active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
  }`;
}

function fmt(num) {
  return Math.round(num).toLocaleString('zh-TW');
}

// "2026-03-02" → "2026/3/2"
function fmtDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}/${parseInt(m)}/${parseInt(d)}`;
}

// ISO string → "13:02"（local time, 24h）
function fmtTime(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// ─── component ────────────────────────────────────────────────────────────────

export function StocksContent({ initialPrices = {} }) {
  const { transactions, removeTransaction } = useApp();

  const [priceMap, setPriceMap] = useState(initialPrices);
  const [deleteId, setDeleteId] = useState(null); // 儲存準備刪除的 ID
  const [isDeleting, setIsDeleting] = useState(false); // 刪除中的 loading 狀態
  const [showChart, setShowChart] = useState(false); // 圓餅圖顯示/隱藏

  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  const [posTab, setPosTab] = useState('TWSE');
  const [histTab, setHistTab] = useState('TWSE');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [yearHighlightedIndex, setYearHighlightedIndex] = useState(-1);
  const fetchedRef = useRef(new Set());

  const availableYears = [...new Set(
    transactions
      .map((tx) => Number(String(tx.date || '').slice(0, 4)))
      .filter((year) => Number.isFinite(year) && year > 0)
  )].sort((a, b) => b - a);

  const yearOptions = ['ALL', ...availableYears.map((year) => String(year))];
  const yearLabel = selectedYear === 'ALL' ? '全部年份' : `${selectedYear} 年`;

  useEffect(() => {
    if (selectedYear !== 'ALL' && !yearOptions.includes(selectedYear)) {
      setSelectedYear('ALL');
    }
  }, [selectedYear, yearOptions]);

  const filteredTransactions = selectedYear === 'ALL'
    ? transactions
    : transactions.filter((tx) => String(tx.date || '').slice(0, 4) === selectedYear);

  // ── derive positions (必須在報價抓取邏輯之前，因為報價邏輯依賴這些數據) ──────────────────────────────────────────────────────
  const basePositions = buildBasePositions(transactions);
  const positionKeys = basePositions.map((p) => p.name).join('|');

  const fetchPrices = async (toFetch) => {
    if (toFetch.length === 0) return;
    setIsFetchingPrices(true);

    try {
      const results = await Promise.allSettled(
        toFetch.map((pos) =>
          fetch(
            `/api/stocks/quote?symbol=${encodeURIComponent(pos.symbol)}&market=${pos.market}`
          )
            .then((r) => r.json())
            .then((data) => ({ name: pos.name, price: data.price }))
        )
      );

      const newPrices = {};
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value.price != null) {
          newPrices[r.value.name] = r.value.price;
        }
      });

      toFetch.forEach((pos) => fetchedRef.current.add(pos.name));
      if (Object.keys(newPrices).length > 0) {
        setPriceMap((prev) => ({ ...prev, ...newPrices }));
      }
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    } finally {
      setIsFetchingPrices(false);
    }
  };

  // 自動抓取新持股的報價
  useEffect(() => {
    const toFetch = basePositions.filter((p) => !fetchedRef.current.has(p.name));
    fetchPrices(toFetch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionKeys]);

  // 手動重新整理目前分頁的報價
  const handleManualRefresh = () => {
    if (isFetchingPrices) return;
    const currentTabPositions = posTab === 'TWSE' ? twsePositions : usPositions;
    fetchPrices(currentTabPositions);
  };

  const allPositions = basePositions.map((p) => {
    const marketPrice = priceMap[p.name] ?? 0;
    const marketValue = p.holdingQty * marketPrice;
    const unrealizedProfit = marketValue - p.totalBuyCost;
    const profitPercent =
      p.totalBuyCost > 0 ? (unrealizedProfit / p.totalBuyCost) * 100 : 0;
    return { ...p, marketPrice, marketValue, unrealizedProfit, profitPercent };
  });
  const totalValue = allPositions.reduce((s, p) => s + p.marketValue, 0);
  const totalCost = allPositions.reduce((s, p) => s + p.totalBuyCost, 0);
  const totalUnrealized = totalValue - totalCost;
  const totalReturnRate = totalCost > 0 ? (totalUnrealized / totalCost) * 100 : 0;

  const twsePositions = allPositions.filter((p) => p.market === 'TWSE');
  const usPositions = allPositions.filter((p) => p.market === 'US');
  const activePositions = posTab === 'TWSE' ? twsePositions : usPositions;

  // ── 按產業聚合 ────────────────────────────────────────────────────────
  const industryData = (() => {
    const industryMap = {};
    activePositions.forEach((pos) => {
      const industry = getIndustry(pos.symbol);
      if (!industryMap[industry]) {
        industryMap[industry] = 0;
      }
      industryMap[industry] += pos.marketValue;
    });

    return Object.entries(industryMap)
      .map(([name, value]) => ({
        name,
        value: Math.round(value),
      }))
      .sort((a, b) => b.value - a.value);
  })();

  const handlePriceChange = (name, value) => {
    const num = parseFloat(value);
    setPriceMap((prev) => ({ ...prev, [name]: isNaN(num) ? 0 : num }));
  };

  // ── 執行確認刪除 ──────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await removeTransaction(deleteId); // 這裡會呼叫 API 並同步 Google Sheets
      setDeleteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── transaction history ───────────────────────────────────────────────────

  const twseTx = filteredTransactions.filter((tx) => (tx.market || 'TWSE') === 'TWSE');
  const usTx = filteredTransactions.filter((tx) => tx.market === 'US');
  const activeTx = [...(histTab === 'TWSE' ? twseTx : usTx)].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Summary Stats ── */}
      {/* 手機版使用 2x2 網格 (grid-cols-2)，電腦版使用 4 欄 (md:grid-cols-4) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <div className="card p-3 md:p-5">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-slate-400">持股現值總計</p>
          <p className="mt-1 md:mt-2 text-lg md:text-2xl font-black text-slate-900">${fmt(totalValue)}</p>
        </div>
        <div className="card p-3 md:p-5">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-slate-400">總投資成本</p>
          <p className="mt-1 md:mt-2 text-lg md:text-2xl font-black text-slate-900">${fmt(totalCost)}</p>
        </div>
        <div className="card p-3 md:p-5">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-slate-400">未實現損益</p>
          <p className={`mt-1 md:mt-2 text-lg md:text-2xl font-black ${totalUnrealized >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {totalUnrealized >= 0 ? '+' : '-'}${fmt(Math.abs(totalUnrealized))}
          </p>
        </div>
        <div className="card p-3 md:p-5">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-slate-400">總報酬率</p>
          <p className={`mt-1 md:mt-2 text-lg md:text-2xl font-black ${totalReturnRate >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {totalReturnRate >= 0 ? '+' : ''}{totalReturnRate.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* ── Positions Section ── */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">個人即時持股明細</h2>
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-0.5">
              <button onClick={() => setPosTab('TWSE')} className={tabBtnClass(posTab === 'TWSE')}>
                📈 台股
              </button>
              <button onClick={() => setPosTab('US')} className={tabBtnClass(posTab === 'US')}>
                🇺🇸 美股
              </button>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button
              onClick={handleManualRefresh}
              disabled={isFetchingPrices}
              className="group flex items-center gap-1.5 rounded-full bg-rose-50/50 px-3 py-1 text-[11px] font-bold text-rose-500 transition-all hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
            >
              {isFetchingPrices ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-rose-600" />
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 transition-transform group-hover:rotate-180 duration-500">
                  <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.45a.75.75 0 000-1.5H4.147a.75.75 0 00-.75.75v4.103a.75.75 0 001.5 0v-2.151l.33.33a7 7 0 0011.778-3.391.75.75 0 00-1.693-.44zM4.688 8.576a5.5 5.5 0 019.201-2.466l.312.311h-2.45a.75.75 0 000-1.5h4.103a.75.75 0 00.75-.75V3.068a.75.75 0 00-1.5 0v2.151l-.33-.33a7 7 0 00-11.778 3.391.75.75 0 001.693.44z" clipRule="evenodd" />
                </svg>
              )}
              更新現價
            </button>
            <button
              onClick={() => setShowChart(!showChart)}
              className={`inline-flex items-center gap-1 pb-0.5 text-xs font-bold transition border-b-2 ${
                showChart
                  ? 'text-slate-400 border-slate-400 hover:text-slate-500'
                  : 'text-rose-300 border-rose-300 hover:text-rose-500'
              }`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M10 2.5a.75.75 0 01.75.75v6.25H17a.75.75 0 01.75.75A8.75 8.75 0 1110 1.25a.75.75 0 010 1.5z" />
                <path d="M12.5 2.08a8.02 8.02 0 014.92 4.92h-4.17a.75.75 0 01-.75-.75V2.08z" />
              </svg>
              {showChart ? '隱藏' : '顯示'}產業分佈
            </button>
          </div>
        </div>

        {showChart && industryData.length > 0 && (
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">持股產業分佈</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={industryData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ cx, cy, midAngle, outerRadius, percent, name }) => {
                    const radius = outerRadius + 12;
                    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                    return (
                      <text
                        x={x}
                        y={y}
                        fill="#64748b"
                        textAnchor={x > cx ? "start" : "end"}
                        dominantBaseline="central"
                        className="text-[10px] font-bold"
                      >
                        {`${name} ${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {industryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={INDUSTRY_COLORS[entry.name] || INDUSTRY_COLORS.default} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `$${value.toLocaleString('zh-TW')}`}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div key={posTab} className="animate-in fade-in duration-500">
          {activePositions.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">
              目前沒有 {posTab === 'TWSE' ? '台股' : '美股'} 持股紀錄
            </div>
          ) : (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full min-w-[960px] text-center">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-400 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 align-middle text-left whitespace-nowrap">股票</th>
                  <th className="px-4 py-3 align-middle whitespace-nowrap">持有股數</th>
                  <th className="px-4 py-3 align-middle whitespace-nowrap">成本價</th>
                  <th className="px-4 py-3 align-middle whitespace-nowrap">現價（可修改）</th>
                  <th className="px-4 py-3 align-middle whitespace-nowrap">投資成本</th>
                  <th className="px-4 py-3 align-middle whitespace-nowrap">帳面現值</th>
                  <th className="px-4 py-3 align-middle whitespace-nowrap">未實現損益</th>
                  <th className="px-4 py-3 align-middle whitespace-nowrap">損益率</th>
                  <th className="px-4 py-3 align-middle whitespace-nowrap">市值佔比</th>
                </tr>
              </thead>
              <tbody>
                {activePositions.map((pos) => {
                  const sharePercent =
                    totalValue > 0 ? (pos.marketValue / totalValue) * 100 : 0;
                  const nameParts = pos.name.split(' ');
                  const displayName = nameParts.slice(1).join(' ') || nameParts[0];

                  return (
                    <tr key={pos.name} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                      {/* 股票 */}
                      <td className="px-4 py-3 align-middle text-left">
                        <div className="text-xs font-bold text-slate-400">{pos.symbol}</div>
                        <div className="text-sm text-slate-800">{displayName}</div>
                      </td>

                      {/* 持有股數 */}
                      <td className="px-4 py-3 align-middle font-mono text-sm text-slate-700">
                        {pos.holdingQty.toLocaleString()}
                      </td>

                      {/* 成本價 */}
                      <td className="px-4 py-3 align-middle font-mono text-sm text-slate-700">
                        {pos.avgCost.toFixed(2)}
                      </td>

                      {/* 現價 (editable) */}
                      <td className="px-4 py-3 align-middle">
                        <div className="flex justify-center">
                          <input
                            type="number"
                            value={pos.marketPrice || ''}
                            onChange={(e) => handlePriceChange(pos.name, e.target.value)}
                            className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center font-mono text-sm text-slate-800 transition focus:border-rose-300 focus:outline-none"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      </td>

                      {/* 投資成本 */}
                      <td className="px-4 py-3 align-middle font-mono text-sm text-slate-700">
                        ${fmt(pos.totalBuyCost)}
                      </td>

                      {/* 帳面現值 */}
                      <td className="px-4 py-3 align-middle font-mono text-sm text-slate-700">
                        ${fmt(pos.marketValue)}
                      </td>

                      {/* 未實現損益 */}
                      <td className={`px-4 py-3 align-middle font-mono text-sm font-bold ${pos.unrealizedProfit >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {pos.unrealizedProfit >= 0 ? '+' : '-'}${fmt(Math.abs(pos.unrealizedProfit))}
                      </td>

                      {/* 損益率 */}
                      <td className={`px-4 py-3 align-middle font-mono text-sm font-bold ${pos.profitPercent >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {pos.profitPercent >= 0 ? '+' : ''}{pos.profitPercent.toFixed(2)}%
                      </td>

                      {/* 市值佔比 + bar */}
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-10 text-right font-mono text-xs text-slate-600">
                            {sharePercent.toFixed(1)}%
                          </span>
                          <div className="relative h-1 w-12 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="absolute left-0 top-0 h-full rounded-full bg-rose-400 transition-all duration-300"
                              style={{ width: `${Math.min(sharePercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>

      {/* ── Transaction History ── */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">股票交易歷史紀錄</h2>
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-0.5">
              <button onClick={() => setHistTab('TWSE')} className={tabBtnClass(histTab === 'TWSE')}>
                📈 台股
              </button>
              <button onClick={() => setHistTab('US')} className={tabBtnClass(histTab === 'US')}>
                🇺🇸 美股
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">篩選年度</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowYearDropdown((prev) => !prev);
                  if (!showYearDropdown) {
                    setYearHighlightedIndex(Math.max(yearOptions.indexOf(selectedYear), 0));
                  }
                }}
                onBlur={() => setTimeout(() => setShowYearDropdown(false), 120)}
                className="flex min-w-[126px] items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none"
              >
                <span>{yearLabel}</span>
                <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 text-slate-400 transition-transform ${showYearDropdown ? 'rotate-180' : ''}`}>
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.116l3.71-3.886a.75.75 0 111.08 1.04l-4.25 4.454a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              {showYearDropdown && (
                <div className="absolute left-0 z-30 mt-1 w-full min-w-[126px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  {yearOptions.map((year, index) => {
                    const active = selectedYear === year;
                    const highlighted = yearHighlightedIndex === index;
                    return (
                      <button
                        key={year}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setYearHighlightedIndex(index)}
                        onClick={() => {
                          setSelectedYear(year);
                          setShowYearDropdown(false);
                        }}
                        className={`block w-full px-3 py-2 text-left text-xs font-semibold transition ${
                          active || highlighted
                            ? 'bg-rose-50 text-rose-700'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {year === 'ALL' ? '全部年份' : `${year} 年`}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div key={histTab} className="animate-in fade-in duration-500 max-h-[520px] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
          {activeTx.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">
              目前沒有 {histTab === 'TWSE' ? '台股' : '美股'} 交易紀錄
            </div>
          ) : (
          <div className="">
            <table className="w-full min-w-[760px] text-center border-separate border-spacing-0 relative">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-400 shadow-sm">
                <tr>
                  <th className="px-4 py-3 align-middle text-left">日期 / 時間</th>
                  <th className="px-4 py-3 align-middle text-left">股票</th>
                  <th className="px-4 py-3 align-middle">類型</th>
                  <th className="px-4 py-3 align-middle">股數</th>
                  <th className="px-4 py-3 align-middle">成交單價</th>
                  <th className="px-4 py-3 align-middle">實際收支</th>
                  <th className="px-4 py-3 align-middle">備註</th>
                  <th className="px-4 py-3 align-middle">操作</th>
                </tr>
              </thead>
              <tbody>
                {activeTx.map((tx) => {
                  const txSymbol = tx.stock.split(' ')[0];
                  const txName = tx.stock.split(' ').slice(1).join(' ');
                  const txTime = fmtTime(tx.recordedAt);
                  return (
                    <tr key={tx.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                      {/* 日期 / 時間 */}
                      <td className="px-4 py-3 align-middle text-left">
                        <div className="font-mono text-xs text-slate-700">{fmtDate(tx.date)}</div>
                        {txTime && <div className="font-mono text-xs text-slate-400">{txTime}</div>}
                      </td>
                      {/* 股票 */}
                      <td className="px-4 py-3 align-middle text-left">
                        <div className="text-xs font-bold text-slate-400">{txSymbol}</div>
                        {txName && <div className="text-sm text-slate-800">{txName}</div>}
                      </td>
                      {/* 類型 */}
                      <td className="px-4 py-3 align-middle">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tx.type === 'buy' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {tx.type === 'buy' ? '買進' : '賣出'}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle font-mono text-sm text-slate-700">
                        {Number(tx.qty).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 align-middle font-mono text-sm text-slate-700">
                        ${Number(tx.price).toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 align-middle font-mono text-sm font-bold ${tx.type === 'buy' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {tx.type === 'buy' ? '-' : '+'}${Number(tx.actualAmount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 align-middle text-left text-xs text-slate-500">{tx.note || '—'}</td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex justify-center">
                          <button
                            onClick={() => setDeleteId(tx.id)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                            title="刪除此筆紀錄"
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193v-.443A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>

      {/* ── 刪除確認 Modal ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 背景遮罩 */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteId(null)} />

          {/* Modal 內容 */}
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">確定要刪除嗎？</h3>
              <p className="mt-2 text-sm text-slate-500">
                此動作將永久刪除這筆交易紀錄，並同步更新您的庫存與 Google 表格數據。
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
              >
                取消
              </button>
              <button
                disabled={isDeleting}
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white transition hover:bg-rose-600 shadow-sm shadow-rose-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    處理中
                  </>
                ) : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
