'use client';

import Link from 'next/link';
import { useApp } from '@/lib/app-context';

function tabClass(isActive) {
  return [
    'w-full rounded-lg px-4 py-2 text-center text-xs font-bold transition-all duration-200',
    isActive
      ? 'bg-white text-slate-800 shadow-sm'
      : 'text-slate-500 hover:text-slate-800',
  ].join(' ');
}

export default function TabNav({ activeTab }) {
  const { openConfigModal } = useApp();

  return (
    <header className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-extrabold tracking-tight text-slate-900">
            我的小豬存錢筒 <span className="text-rose-500">🐷</span>
          </h1>
          <p className="text-xs text-slate-400">Google Sheets 個人資產庫</p>
        </div>
        <button
          onClick={openConfigModal}
          className="p-1.5 text-slate-500 transition hover:text-slate-900"
          title="雲端設定"
          aria-label="雲端設定"
        >
          ⚙️
        </button>
      </div>

      <div className="grid w-full grid-cols-2 gap-2 rounded-xl bg-slate-100/80 p-1">
        <Link href="/assets" className={tabClass(activeTab === 'assets')}>
          資產與負債
        </Link>
        <Link href="/stocks" className={tabClass(activeTab === 'stocks')}>
          股票庫存
        </Link>
      </div>
    </header>
  );
}
