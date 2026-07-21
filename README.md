# 我的小豬存錢筒

以 Next.js App Router 製作的個人資產與股票投資管理工具。可追蹤每月淨值、存款與負債、台美股庫存和交易損益，並透過 Google Apps Script 將資料保存到自己的 Google 試算表。

## 主要功能

### 資產與負債

- 依年月管理台幣活存、外幣活存、員工持股信託與負債
- 顯示總資產、總負債、股票市值、淨值及月成長率
- 以月度快照繪製資產淨值變動趨勢
- 外幣資產換算為新台幣後納入淨值
- 帳戶名稱支援台灣常見銀行搜尋

### 股票庫存

- 支援台股（上市、上櫃、興櫃）與美股
- 記錄買進、賣出、配息，並可編輯或刪除交易
- 計算持股數、平均成本、投資成本、市值、損益與每日損益
- 顯示即時價、最新收盤價及台股漲跌停狀態
- 支援多種持股排序、產業分佈圖與自訂產業分類
- 可用持股快照校正券商帳戶中的實際股數與平均成本
- 可調整台股／美股手續費、折扣、最低手續費，或為單筆交易手動填寫總費用
- 台股賣出交易稅會依一般股票、ETF／ETN 等類型自動計算

### 資料同步與使用體驗

- Google Sheets 雙向同步：資產、月度快照、交易、持股快照、成本校正與產業分類
- 未連線時提供 Demo 資料，可先體驗完整介面；重新整理後，本機 Demo 修改會還原
- 響應式桌面／手機介面、載入骨架、Toast 與自訂確認視窗
- 提供 Web App Manifest 與桌面／手機圖示

## 快速開始

需求：Node.js 20.9 以上（建議使用 Node.js 20 LTS）。

```bash
npm ci
npm run dev
```

開啟 <http://localhost:3000>，首頁會自動導向 `/assets`。

| 頁面 | 路徑 |
| --- | --- |
| 資產與負債 | `/assets` |
| 股票庫存 | `/stocks` |

## 連接 Google Sheets

資料會保存到你自己的 Google 試算表，不需要另外架設資料庫。

1. 建立或開啟一份 Google 試算表。
2. 從「擴充功能 → Apps Script」開啟 Apps Script 編輯器。
3. 將 [`docs/google-apps-script.gs`](docs/google-apps-script.gs) 的內容完整貼入並儲存。
4. 選擇「部署 → 新增部署作業」，類型選「網頁應用程式」。
5. 執行身分選自己；存取權限選「所有人」，完成授權與部署。
6. 複製結尾為 `/exec` 的 Web App URL。
7. 回到網站右上角的連線設定，貼上 URL 後選擇「開始連線」。

Apps Script 更新後，需要到「部署 → 管理部署作業」建立新版本，前端才會使用新程式。網站內的連線設定也提供相同的架設說明與程式下載。

連線後會自動建立下列工作表：

| 工作表 | 用途 |
| --- | --- |
| `assets` | 最新資產與負債 |
| `monthly_assets` | 各月份資產快照 |
| `transactions` | 股票交易紀錄 |
| `monthly_stock_holdings` | 月度持股快照 |
| `cost_basis_adjustments` | 平均成本校正 |
| `stock_industry_categories` | 自訂產業分類 |

Web App URL 與交易費率設定會保存在瀏覽器的 `localStorage`；實際財務資料則在連線後寫入你的 Google 試算表。

## 常用指令

```bash
npm run dev             # 啟動本機開發伺服器
npm run build           # 建立正式版本
npm run start           # 啟動正式伺服器
npm run test:sheets     # Google Sheets client smoke test（使用本機模擬後端）
npm run test:portfolio  # 持股、交易與快照情境測試
```

正式執行：

```bash
npm run build
npm run start
```

`prebuild` 會自動把 Apps Script 模板由 `docs/` 複製到 `public/`，供網站內下載。

## 部署注意事項

本專案包含股票搜尋、即時報價、歷史月收盤價、銀行搜尋與匯率等 Next.js Route Handlers。若要使用這些功能，請部署到能執行 Next.js Server 的環境。

`next.config.mjs` 也保留 GitHub Pages 靜態輸出模式：

```bash
GITHUB_PAGES=true npm run build
```

靜態輸出位於 `out/`，base path 為 `/my-assets`。由於 GitHub Pages 無法執行伺服器端 `/api` 路由，靜態版本的股票／銀行搜尋、即時報價與歷史報價會停用；Google Apps Script 同步仍由瀏覽器直接呼叫。

## 專案結構

```text
app/
  (tabs)/
    assets/page.jsx             # 資產與負債頁
    stocks/page.jsx             # 股票庫存頁
  api/
    banks/search/route.js       # 銀行名稱搜尋
    exchange-rate/route.js      # 匯率
    stocks/search/route.js      # 台美股搜尋
    stocks/quote/route.js       # 即時／最新股價
    stocks/month-close/route.js # 歷史月收盤價
  layout-client.jsx             # 全域狀態、同步與 Modal 管理
  manifest.js                   # Web App Manifest
components/
  AssetsContent.jsx             # 資產頁內容與淨值圖表
  StocksContent.jsx             # 股票頁資料、狀態與事件協調
  stocks/
    StockSummary.jsx            # 股票資產總覽卡片
    MobileStockSectionNav.jsx   # 手機版持股／交易切換導覽
    PositionsSection.jsx        # 持股區標題、篩選與顯示設定
    PositionHoldings.jsx        # 手機版持股卡片與桌面版持股表格
    IndustryDistribution.jsx    # 產業分佈圖與產業持股明細
    TransactionsSection.jsx     # 交易紀錄篩選區
    TransactionRecords.jsx      # 手機版與桌面版交易紀錄及分頁
    StockModals.jsx             # 股票頁 Modal 組合入口
    IndustryEditorModal.jsx     # 產業分類設定
    HoldingSnapshotModal.jsx    # 持股快照編輯
    StockConfirmationModals.jsx # 成本修改與交易刪除確認
    stock-ui.jsx                # 股票頁共用格式與小型 UI 元件
  Modals.jsx                    # 交易與 Google Sheets 連線視窗
  ManageModal.jsx               # 資產帳戶管理
  SettingsModal.jsx             # 交易費率設定
lib/
  calculations.js              # 資產、匯率與投資組合計算
  sheets-client.js              # Google Apps Script client
  trading-fees.js               # 手續費與交易稅規則
  demo-data.js                  # 資產 Demo 資料
  demo-stock-data.js            # 股票 Demo 資料
docs/
  google-apps-script.gs         # Google Apps Script 後端模板（原始檔）
scripts/
  sheets-smoke-test.mjs         # Sheets 同步測試
  portfolio-scenarios-test.mjs  # 投資組合情境測試
```

## Google Apps Script API 契約

前端以 `POST` 傳送 JSON：

```json
{
  "action": "getAll",
  "payload": {}
}
```

目前支援的 action：

| Action | 用途 |
| --- | --- |
| `health` | 連線檢查 |
| `getAll` | 讀取資產、交易、持股快照、成本校正與產業分類 |
| `upsertAssets` | 覆寫最新資產列表 |
| `getMonthlyAssets` | 讀取所有月度資產快照 |
| `upsertMonthlyAssets` | 覆寫指定月份的資產快照 |
| `appendTransaction` | 新增交易 |
| `updateTransaction` | 更新交易 |
| `removeTransaction` | 刪除交易 |
| `upsertStockHoldingSnapshots` | 覆寫指定月份的持股快照 |
| `upsertCostBasisAdjustment` | 新增或更新成本校正 |
| `saveIndustryCategories` | 儲存自訂產業分類 |

## 技術棧

- Next.js 16.2（App Router、Route Handlers、SSR／靜態輸出）
- React 18.3
- Tailwind CSS 3.4
- Recharts 3.8
- Google Apps Script + Google Sheets

> 股價與匯率資料僅供資產追蹤參考，可能因來源、交易時段或快取而延遲，不應作為投資決策或報稅依據。
