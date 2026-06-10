# My Assets (React 18 + Tailwind + SSR)

這個版本已從單一 `index.html` 完整重構成 **Next.js App Router** 專案（React 18 + Tailwind + SSR），**所有功能都已恢復**。

## ✅ 功能完整清單

### 核心頁面
- **資產與負債頁** (`/assets`)：淨值卡片、資產分類列表、負債統計
- **股票庫存頁** (`/stocks`)：持股表格、損益計算、市值佔比

### 互動功能 (全部恢復)
- ✅ **懸浮記帳按鈕** 🐷 - 記錄新交易
- ✅ **記一筆股票 Modal** - 買進/賣出/配息，含費用計算
- ✅ **管理帳戶 Modal** - 新增/編輯/刪除資產與負債項目
- ✅ **設定 Modal** - Google Sheets 連線設定（預備接入）
- ✅ **自訂對話框 & Toast** - Alert/Confirm 對話框和通知提示
- ✅ **Tab 導覽** - Assets/Stocks 分頁切換，頂部設定按鈕

### 商業邏輯
- ✅ 淨值 = 資產 - 負債
- ✅ 月成長率計算（相比上月設定淨值）
- ✅ 股票損益計算（成本、市值、損益率）
- ✅ 費用估算（買進手續費 0.1425%、賣出 0.1425% + 0.3% 稅）
- ✅ 資產分類管理（台幣活存、外幣活存、信託、負債）

## 檔案結構

```
app/
  (tabs)/
    assets/page.jsx      # 資產與負債頁
    stocks/page.jsx      # 股票庫存頁
    layout.jsx
  layout.jsx
  layout-client.jsx      # 全域 state & Modal 管理
  page.jsx
  globals.css
components/
  TabNav.jsx             # Tab 導覽 + 設定按鈕
  AssetsContent.jsx      # 資產頁內容（含 Modal 按鈕）
  Modals.jsx             # TransactionModal、ConfigModal、Toast
  ManageModal.jsx        # ManageAccountsModal、CustomDialog
lib/
  data.js                # 假資料
  calculations.js        # 計算邏輯
  app-context.js         # React Context（Modal 全域狀態）
```

## 快速開始

```bash
npm install
npm run dev
```

開啟：
- `http://localhost:3000/assets` - 資產與負債
- `http://localhost:3000/stocks` - 股票庫存

## 建置與正式啟動

```bash
npm run build
npm run start
```

## 主要變更

| 功能 | 舊版 | 新版 |
|------|------|------|
| 記一筆股票 | `js/transactions.js` | `components/Modals.jsx` (React Client Component) |
| 管理帳戶 | `js/accounts.js` | `components/ManageModal.jsx` |
| 設定連線 | `js/app.js` | `components/Modals.jsx` + `layout-client.jsx` |
| 自訂對話 | `js/ui.js` | `components/ManageModal.jsx` (CustomDialog) |
| Modal 狀態 | 全局 JavaScript | React Context + useState |
| Toast 通知 | DOM 操作 | React 元件 + setState |

## 下一步（預留骨架）

- [ ] 接入 Google Sheets API (`/api/sheets`)
- [ ] 新增交易到資料庫
- [ ] 實時股價更新（Yahoo Finance）
- [ ] 交易流水歷史列表
- [ ] 資料編輯與刪除功能

## 技術棧

- **Framework**: Next.js 14.2.35 (React 18 + SSR)
- **Styling**: Tailwind CSS 3.4.10
- **Icons**: Lucide Icons
- **State Management**: React Context + Hooks
- **Type Safety**: JSConfig (Path aliases)
