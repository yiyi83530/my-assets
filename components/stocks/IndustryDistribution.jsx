'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { fmtCurrency, getIndustryColor } from '@/components/stocks/stock-ui';

export function IndustryDistribution(props) {
  const {
    isPortfolioLoading,
    showChart,
    industryData,
    isCompactIndustryChart,
    openIndustryCategoryEditor,
    selectedIndustry,
    setSelectedIndustry,
    currentTabTotalValue,
    posTab,
    displayCurrency
  } = props;

  return (
    <>
      {!isPortfolioLoading && showChart && industryData.length > 0 && (
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-5 md:px-5">
            <div className="mb-4 sm:flex sm:items-end sm:justify-between sm:gap-3">
              <div className="flex items-start justify-between gap-3 sm:block">
                <div>
                  <h3 className="text-sm font-black tracking-tight text-slate-700 sm:text-xs sm:font-bold sm:uppercase sm:tracking-wide sm:text-slate-500">持股產業分佈</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-[11px] text-slate-400">點選產業查看持股成分</p>
                    <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-bold text-slate-500 sm:hidden">{industryData.length} 類</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openIndustryCategoryEditor}
                  className="icon-label inline-flex h-8 shrink-0 items-center px-1 text-[11px] font-black text-slate-500 transition hover:text-slate-700 sm:hidden"
                >
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h12M7 10h6M9 14h2" />
                  </svg>
                  分類設定
                </button>
              </div>
              <div className="hidden shrink-0 items-center gap-2 sm:flex">
                <span className="text-[11px] font-medium text-slate-400">共 {industryData.length} 個產業</span>
                <button
                  type="button"
                  onClick={openIndustryCategoryEditor}
                  className="icon-label inline-flex h-8 items-center px-1 text-[11px] font-black text-slate-500 transition hover:text-slate-700"
                >
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h12M7 10h6M9 14h2" />
                  </svg>
                  分類設定
                </button>
              </div>
            </div>
            <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.9fr)_minmax(340px,1.1fr)] lg:items-start">
              <div className="rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                <Pie
                  data={industryData}
                  cx="50%"
                  cy="50%"
                  labelLine={!isCompactIndustryChart}
                  label={({ cx, cy, midAngle, outerRadius, percent, name }) => {
                    if (isCompactIndustryChart) {
                      if (percent * 100 < 0.5) return null;
                      const angle = -midAngle * (Math.PI / 180);
                      const side = Math.cos(angle) >= 0 ? 1 : -1;
                      const lineStartX = cx + outerRadius * Math.cos(angle);
                      const lineStartY = cy + outerRadius * Math.sin(angle);
                      const x = cx + side * (outerRadius + 30);
                      const y = cy + (outerRadius + 14) * Math.sin(angle);
                      const estimatedLabelWidth = Math.min((String(name).length + 4) * 8, 84);
                      const lineEndX = x - side * (estimatedLabelWidth / 2 + 4);
                      return (
                        <g>
                          <line
                            x1={lineStartX}
                            y1={lineStartY}
                            x2={lineEndX}
                            y2={y}
                            stroke="#cbd5e1"
                            strokeWidth="1"
                          />
                          <text
                            x={x}
                            y={y}
                            fill="#64748b"
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="text-[9px] font-bold"
                          >
                            {`${name} ${(percent * 100).toFixed(0)}%`}
                          </text>
                        </g>
                      );
                    }
                    if (percent * 100 < 0.5) return null;
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
                  onClick={(entry) => setSelectedIndustry(entry.name)}
                  className="cursor-pointer outline-none"
                >
                  {industryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getIndustryColor(entry.name)}
                      opacity={!selectedIndustry || selectedIndustry === entry.name ? 1 : 0.35}
                      stroke={selectedIndustry === entry.name ? '#fff' : 'transparent'}
                      strokeWidth={selectedIndustry === entry.name ? 3 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => fmtCurrency(value, posTab === 'US' ? displayCurrency : 'TWD')}
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

              <div className="space-y-2">
                {industryData.map((entry) => {
                  const isOpen = selectedIndustry === entry.name;
                  const industryPercent = currentTabTotalValue > 0
                    ? (entry.value / currentTabTotalValue) * 100
                    : 0;
                  return (
                    <div key={entry.name} className={`overflow-hidden rounded-xl border bg-white transition ${isOpen ? 'border-rose-200 shadow-sm' : 'border-slate-100'}`}>
                      <button
                        type="button"
                        onClick={() => setSelectedIndustry(isOpen ? null : entry.name)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-slate-50"
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: getIndustryColor(entry.name) }} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-bold text-slate-700">{entry.name}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{entry.holdings.length} 檔</span>
                          </span>
                          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <span className="block h-full rounded-full" style={{ width: `${Math.min(industryPercent, 100)}%`, backgroundColor: getIndustryColor(entry.name) }} />
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-xs font-black text-slate-700">{industryPercent.toFixed(1)}%</span>
                          <span className="block text-[10px] text-slate-400">{fmtCurrency(entry.value, posTab === 'US' ? displayCurrency : 'TWD')}</span>
                        </span>
                        <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="border-t border-slate-100 bg-slate-50/60 px-3.5 py-2">
                          {entry.holdings.map((holding) => {
                            const displayName = holding.name.split(' ').slice(1).join(' ') || holding.name;
                            return (
                              <div key={`${entry.name}-${holding.symbol}-${holding.name}`} className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-black text-slate-500 shadow-sm">{holding.symbol}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-bold text-slate-700">{displayName}</span>
                                  <span className="text-[10px] text-slate-400">產業內占比 {holding.industryPercent.toFixed(1)}%</span>
                                </span>
                                <span className="text-xs font-bold text-slate-600">{fmtCurrency(holding.marketValue, posTab === 'US' ? displayCurrency : 'TWD')}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
    </>
  );
}
