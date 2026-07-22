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
              <span>小豬存錢筒</span><span className="text-rose-500" aria-hidden="true">🐷</span>
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
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg bg-slate-50 px-2 text-[10px] font-bold text-slate-600 shadow-sm ring-1 ring-slate-200/80 transition hover:bg-rose-50 hover:text-rose-600 hover:ring-rose-200 md:h-8 md:gap-1.5 md:rounded-xl md:px-2.5 md:text-[11px]"
          title={mounted && isSheetsConnected ? '管理 Google Sheets 連線' : '設定 Google Sheets 連線'}
          aria-label={mounted && isSheetsConnected ? '管理 Google Sheets 連線' : '設定 Google Sheets 連線'}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 15.25h9.25a3 3 0 00.45-5.97A5.25 5.25 0 005 7.75a3.75 3.75 0 00.25 7.5z" />
          </svg>
          <span>{mounted && isSheetsConnected ? '管理連線' : '設定連線'}</span>
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
