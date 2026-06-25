'use client';

import Link from 'next/link';
import { useApp } from '@/lib/app-context';
import { useState, useEffect } from 'react';

function tabClass(isActive) {
  return [
    'w-full rounded-lg px-4 py-2.5 text-center text-xs font-bold transition-all duration-200 md:px-6 md:py-3 md:text-sm',
    isActive
      ? 'bg-white text-slate-700 shadow-sm ring-0'
      : 'text-slate-500 hover:bg-white/70 hover:text-slate-800',
  ].join(' ');
}

export default function TabNav({ activeTab }) {
  const { openConfigModal, isSheetsConnected } = useApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold tracking-tight text-slate-900">
              我的小豬存錢筒 <span className="text-rose-500">🐷</span>
            </h1>
            {mounted && (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isSheetsConnected
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {isSheetsConnected ? '成功連線' : '未連線'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">Google Sheets 個人資產庫</p>
        </div>
        <button
          onClick={openConfigModal}
          className=" p-1.5 text-slate-500 transition hover:text-slate-900"
          title="設定"
          aria-label="設定"
        >
          ⚙️
        </button>
      </div>

      <div className="grid w-full grid-cols-2 gap-2 rounded-xl bg-slate-100/90 p-1.5 md:gap-2.5 md:p-2">
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
