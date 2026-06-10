'use client';

import { useState } from 'react';

export function ManageAccountsModal({ isOpen, onClose, assets, onSave, onAddNew, onRemove, onUpdate }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs z-50">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-rose-100 px-6 py-4 shrink-0">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            ✎ 管理活存與負債餘額
          </h3>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <p className="text-xs text-slate-400">
            您可以在此手動輸入或更新各大銀行、信託、借貸 or 信用卡的名稱與目前金額。更新後點選「全部儲存」將即時同步至 Google Sheets。
          </p>

          <div className="space-y-4">
            {assets.map((item, index) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-slate-50 p-3.5">
                <div className="w-1/3">
                  <label className="mb-0.5 block text-[10px] font-bold uppercase text-slate-400">分類</label>
                  <select
                    value={item.category}
                    onChange={(e) => onUpdate(index, { ...item, category: e.target.value, isLiability: e.target.value === '負債項目' })}
                    className="w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs text-slate-800"
                  >
                    <option value="台幣活存">台幣活存</option>
                    <option value="外幣活存">外幣活存</option>
                    <option value="員工持股信託">員工持股信託</option>
                    <option value="負債項目">負債項目</option>
                  </select>
                </div>
                <div className="w-1/3">
                  <label className="mb-0.5 block text-[10px] font-bold uppercase text-slate-400">名稱</label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => onUpdate(index, { ...item, name: e.target.value })}
                    placeholder="例如：Richart"
                    className="w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs text-slate-800"
                  />
                </div>
                <div className="w-1/4">
                  <label className="mb-0.5 block text-[10px] font-bold uppercase text-slate-400">金額 (TWD)</label>
                  <input
                    type="number"
                    value={item.balance}
                    onChange={(e) => onUpdate(index, { ...item, balance: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-200 bg-white p-1.5 text-right font-mono text-xs text-slate-800"
                  />
                </div>
                <div className="pt-4">
                  <button
                    onClick={() => onRemove(index)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:text-rose-500"
                    title="移除本項"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onAddNew}
            className="w-full flex items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100"
          >
            ➕ 新增一個帳戶/負債項目
          </button>
        </div>

        <div className="border-t border-rose-50 bg-slate-50 px-6 py-4 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            關閉
          </button>
          <button
            type="button"
            onClick={onSave}
            className="w-1/2 rounded-lg bg-rose-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-100 transition hover:bg-rose-600"
          >
            全部儲存同步 🐷
          </button>
        </div>
      </div>
    </div>
  );
}

export function CustomDialog({ isOpen, onClose, title, message, buttons = [] }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs z-50">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
            ℹ️
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-slate-500" style={{ wordBreak: 'break-all' }}>
              {message}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          {buttons.map((btn, idx) => (
            <button
              key={idx}
              onClick={btn.onClick}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                btn.isPrimary
                  ? 'bg-rose-500 text-white shadow-sm shadow-rose-100 hover:bg-rose-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

