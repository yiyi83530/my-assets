'use client';

import { useEffect, useState } from 'react';
import { TWSE_COMMISSION_RATE, TWSE_STOCK_TAX_RATE } from '@/lib/trading-fees';

export function SettingsModal({ isOpen, onClose, onSave, initialSettings, isSaving }) {
  const [selectedMarket, setSelectedMarket] = useState('TWSE');
  const [feeRate, setFeeRate] = useState('0.001425');
  const [feeDiscount, setFeeDiscount] = useState('0.6');
  const [minFee, setMinFee] = useState('20');

  useEffect(() => {
    if (initialSettings) {
      const currentMarketSettings = initialSettings[selectedMarket] || {};
      const defaults = selectedMarket === 'US'
        ? { feeRate: 0, feeDiscount: 1, minFee: 0 }
        : { feeRate: TWSE_COMMISSION_RATE, feeDiscount: 0.6, minFee: 20 };
      setFeeRate(String(currentMarketSettings.feeRate ?? defaults.feeRate));
      setFeeDiscount(String(currentMarketSettings.feeDiscount ?? defaults.feeDiscount));
      setMinFee(String(currentMarketSettings.minFee ?? defaults.minFee));
    }
  }, [initialSettings, selectedMarket]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(selectedMarket, {
      feeRate: selectedMarket === 'TWSE' ? TWSE_COMMISSION_RATE : (Number(feeRate) || 0),
      feeDiscount: selectedMarket === 'TWSE' ? (Number(feeDiscount) || 0) : 1,
      minFee: Number(minFee) || 0,
      taxRate: selectedMarket === 'TWSE' ? TWSE_STOCK_TAX_RATE : 0,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs z-50">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-rose-100 px-6 py-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">⚙️ 交易設定</h3>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-center gap-1 rounded-xl bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setSelectedMarket('TWSE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedMarket === 'TWSE' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              📈 台股設定
            </button>
            <button
              type="button"
              onClick={() => setSelectedMarket('US')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedMarket === 'US' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              🇺🇸 美股設定
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {selectedMarket === 'US' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                券商手續費率
              </label>
              <input
                type="number"
                value={feeRate}
                onChange={(e) => setFeeRate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition focus:border-rose-300 focus:bg-white focus:outline-none"
                step="0.000001"
                min="0"
                required
                inputMode="decimal"
              />
              <p className="mt-1 text-[11px] text-slate-400">免手續費請填 0；若券商按成交金額計費，可輸入對應費率。</p>
            </div>
          )}
          {selectedMarket === 'TWSE' && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              預設手續費折扣
            </label>
            <input
              type="number"
              value={feeDiscount}
              onChange={(e) => setFeeDiscount(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition focus:border-rose-300 focus:bg-white focus:outline-none"
              step="0.01"
              min="0"
              required
              inputMode="decimal"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              請輸入券商給的折扣，例如 6 折請輸入 0.6，38 折請輸入 0.38，無折扣請輸入 1。
            </p>
          </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              預設最低手續費 {selectedMarket === 'TWSE' ? '(台幣)' : '(USD)'}
            </label>
            <input
              type="number"
              value={minFee}
              onChange={(e) => setMinFee(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition focus:border-rose-300 focus:bg-white focus:outline-none"
              min="0"
              required
              inputMode="numeric"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              單筆交易的最低手續費，{selectedMarket === 'TWSE' ? '通常為 20 元。' : '通常美股沒有最低手續費，填 0 即可。'} 若無，請輸入 0。
            </p>
          </div>
          {selectedMarket === 'TWSE' && (
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 px-4 py-3">
              <p className="text-xs font-bold text-rose-700">系統自動套用</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                台股手續費基準為 0.1425%；賣出交易稅會依一般股票、ETF／ETN 與符合條件的債券 ETF 自動計算。
              </p>
              <p className="mt-1 text-[10px] leading-4 text-slate-400">當沖或其他特殊費率，可在單筆交易使用「手動填寫總費用」。</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 rounded-lg bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-1/2 rounded-lg bg-rose-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-100 transition hover:bg-rose-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  儲存中
                </>
              ) : '儲存設定'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
