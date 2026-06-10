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
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">個人淨資產</p>
            <button
              onClick={openManageModal}
              className="flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100 hover:text-rose-700"
            >
              ➕ 管理帳戶 / 餘額
            </button>
          </div>
          <p className="text-4xl font-black text-slate-900">${summary.netWorth.toLocaleString()}</p>
          <p className={`mt-3 text-xs font-bold ${summary.netGrowth >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            月增減 {summary.netGrowth >= 0 ? '+' : ''} ${summary.netGrowth.toLocaleString()} ({summary.growthRate.toFixed(2)}%)
          </p>
        </div>

        <div className="card p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">證券資產市值</p>
          <p className="mt-2 text-2xl font-black text-slate-900">${portfolio.currentPortfolioValue.toLocaleString()}</p>
          <p className="mt-2 text-xs text-slate-400">即時計算</p>
        </div>
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
