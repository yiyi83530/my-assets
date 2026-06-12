'use client';

import { useApp } from '@/lib/app-context';

function ListBlock({ title, items, moneyClass = 'text-slate-800' }) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>
        <span className="text-xs text-slate-400">{items.length} 項</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
            <span className="text-slate-600">{item.name}</span>
            <span className={`font-mono font-bold ${moneyClass}`}>${item.balance.toLocaleString()}</span>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-slate-400">目前沒有資料</p>}
      </div>
    </div>
  );
}

export function AssetsContent({ summary, portfolio, ntd, foreign, trust, liabilities }) {
  const { openManageModal, openConfigModal } = useApp();

  return (
    <>
      <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50/70 p-4 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg border border-rose-100 bg-white p-1 text-rose-500">
              ☁️
            </div>
            <div>
              <h4 className="text-sm font-semibold text-rose-950">目前為單機演示模式（重新整理將重置）</h4>
              <p className="mt-0.5 text-xs text-rose-700/80">
                此模式未串接後端，方便您體驗小豬存錢筒。請點擊右方按鈕設定 Google Sheets 來實現永久自動連線！
              </p>
            </div>
          </div>
          <button
            onClick={openConfigModal}
            className="shrink-0 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-rose-600"
          >
            串接 Google 試算表
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card p-6 md:col-span-2">
          <p className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-400">個人淨資產</p>
          <p className="text-4xl font-black text-slate-900">${summary.netWorth.toLocaleString()}</p>
          <p className={`mt-3 text-xs font-bold ${summary.netGrowth >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            月增減 {summary.netGrowth >= 0 ? '+' : ''} ${summary.netGrowth.toLocaleString()} ({summary.growthRate.toFixed(2)}%)
          </p>
        </div>

        <div className="card p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">證券資產市值（即時計算）</p>
          <p className="mt-2 text-2xl font-black text-slate-900">${portfolio.currentPortfolioValue.toLocaleString()}</p>
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
        <ListBlock title="台幣活存" items={ntd} />
        <ListBlock title="外幣活存" items={foreign} />
        <ListBlock title="員工持股信託" items={trust} />
        <div>
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-700">負債項目</h3>
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
                  <span className="font-mono font-bold text-rose-600">-${item.balance.toLocaleString()}</span>
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
