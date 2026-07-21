'use client';

import Link from 'next/link';
import { useApp } from '@/lib/app-context';
import { useState, useEffect } from 'react';

function tabClass(isActive) {
  return [
    'relative z-10 w-full rounded-lg px-4 py-2.5 text-center text-xs font-bold transition-colors duration-200 md:px-6 md:py-3 md:text-sm',
    isActive
      ? 'text-slate-700'
      : 'text-slate-500 md:hover:bg-white/70 md:hover:text-slate-800',
  ].join(' ');
}

export default function TabNav({ activeTab }) {
  const { openConfigModal, isSheetsConnected } = useApp();
  const [mounted, setMounted] = useState(false);
  const [optimisticTab, setOptimisticTab] = useState(activeTab);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOptimisticTab(activeTab);
  }, [activeTab]);

  return (
    <header className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="icon-label inline-flex items-center text-base font-extrabold tracking-tight text-slate-900">
              <span>我的小豬存錢筒</span><span className="text-rose-500" aria-hidden="true">🐷</span>
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
          title="連線設定"
          aria-label="連線設定"
        >
          ⚙️
        </button>
      </div>

      <div className="relative grid w-full grid-cols-2 rounded-xl bg-slate-100/90 p-1.5 md:p-2">
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-1.5 left-1.5 w-[calc(50%_-_6px)] rounded-lg bg-white shadow-sm transition-transform duration-200 ease-out md:inset-y-2 md:left-2 md:w-[calc(50%_-_8px)] ${
            optimisticTab === 'stocks' ? 'translate-x-full' : 'translate-x-0'
          }`}
        />
        <Link
          href="/assets"
          onClick={() => setOptimisticTab('assets')}
          aria-current={optimisticTab === 'assets' ? 'page' : undefined}
          className={tabClass(optimisticTab === 'assets')}
        >
          資產與負債
        </Link>
        <Link
          href="/stocks"
          onClick={() => setOptimisticTab('stocks')}
          aria-current={optimisticTab === 'stocks' ? 'page' : undefined}
          className={tabClass(optimisticTab === 'stocks')}
        >
          股票庫存
        </Link>
      </div>
    </header>
  );
}
