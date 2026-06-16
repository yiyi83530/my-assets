export const GOOGLE_APPS_SCRIPT_CODE = `const SHEET_ASSETS = 'assets';
const SHEET_TRANSACTIONS = 'transactions';

const ASSET_HEADERS = ['id', 'category', 'name', 'balance', 'isLiability', 'currency', 'amount'];
const TX_HEADERS = [
  'id',
  'date',
  'recordedAt',
  'market',
  'symbol',
  'stock',
  'type',
  'qty',
  'price',
  'actualAmount',
  'note',
];

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    const mismatch = headers.some((h, i) => String(currentHeaders[i] || '') !== h);
    if (mismatch) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }

  return sheet;
}

function rowsToObjects_(rows, headers) {
  return rows.map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i];
    });
    return obj;
  });
}

function clearAndWriteObjects_(sheet, headers, items) {
  const maxRows = sheet.getMaxRows();
  if (maxRows > 1) {
    sheet.getRange(2, 1, maxRows - 1, headers.length).clearContent();
  }

  if (!items || items.length === 0) return;

  const values = items.map((item) => headers.map((h) => item[h] !== undefined ? item[h] : ''));
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}

function normalizeAsset_(asset) {
  const category = String(asset.category || '台幣活存');
  const isForeign = category === '外幣活存';
  const balance = Number(asset.balance || 0);
  const amount = isForeign ? Number(asset.amount != null ? asset.amount : balance) : '';
  return {
    id: String(asset.id || \`asset_\$\{new Date().getTime()}\`),
    category: category,
    name: String(asset.name || ''),
    balance: isForeign ? amount : balance,
    isLiability: Boolean(asset.isLiability || category === '負債項目'),
    currency: isForeign ? String(asset.currency || 'USD').toUpperCase() : '',
    amount: isForeign ? amount : '',
  };
}

function normalizeTx_(tx) {
  return {
    id: String(tx.id || \`tx_\$\{new Date().getTime()}\`),
    date: String(tx.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')),
    recordedAt: String(tx.recordedAt || new Date().toISOString()),
    market: String((tx.market || 'TWSE')).toUpperCase() === 'US' ? 'US' : 'TWSE',
    symbol: String(tx.symbol || ''),
    stock: String(tx.stock || ''),
    type: String(tx.type || 'buy'),
    qty: Number(tx.qty || 0),
    price: Number(tx.price || 0),
    actualAmount: Number(tx.actualAmount || 0),
    note: String(tx.note || ''),
  };
}

function getAll_() {
  const assetsSheet = getOrCreateSheet_(SHEET_ASSETS, ASSET_HEADERS);
  const txSheet = getOrCreateSheet_(SHEET_TRANSACTIONS, TX_HEADERS);

  const assetLastRow = assetsSheet.getLastRow();
  const txLastRow = txSheet.getLastRow();

  const assetsRows = assetLastRow > 1
    ? assetsSheet.getRange(2, 1, assetLastRow - 1, ASSET_HEADERS.length).getValues()
    : [];
  const txRows = txLastRow > 1
    ? txSheet.getRange(2, 1, txLastRow - 1, TX_HEADERS.length).getValues()
    : [];

  return {
    assets: rowsToObjects_(assetsRows, ASSET_HEADERS),
    transactions: rowsToObjects_(txRows, TX_HEADERS),
  };
}

function upsertAssets_(assets) {
  const assetsSheet = getOrCreateSheet_(SHEET_ASSETS, ASSET_HEADERS);
  const normalized = (assets || []).map(normalizeAsset_);
  clearAndWriteObjects_(assetsSheet, ASSET_HEADERS, normalized);
  return { count: normalized.length };
}

function appendTransaction_(transaction) {
  const txSheet = getOrCreateSheet_(SHEET_TRANSACTIONS, TX_HEADERS);
  const tx = normalizeTx_(transaction || {});
  const row = TX_HEADERS.map((h) => tx[h] !== undefined ? tx[h] : '');
  txSheet.appendRow(row);
  return { id: tx.id };
}

function removeTransaction_(id) {
  const txSheet = getOrCreateSheet_(SHEET_TRANSACTIONS, TX_HEADERS);
  const lastRow = txSheet.getLastRow();
  if (lastRow <= 1) return { removed: 0 };

  const values = txSheet.getRange(2, 1, lastRow - 1, TX_HEADERS.length).getValues();
  const idIndex = TX_HEADERS.indexOf('id');
  let removed = 0;

  for (let i = values.length - 1; i >= 0; i--) {
    if (String(values[i][idIndex]) === String(id || '')) {
      txSheet.deleteRow(i + 2);
      removed += 1;
    }
  }

  return { removed: removed };
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = String(body.action || '').trim();
    const payload = body.payload || {};

    if (action === 'health') {
      return jsonResponse({ ok: true, data: { status: 'ok' } });
    }

    if (action === 'getAll') {
      return jsonResponse({ ok: true, data: getAll_() });
    }

    if (action === 'upsertAssets') {
      return jsonResponse({ ok: true, data: upsertAssets_(payload.assets || []) });
    }

    if (action === 'appendTransaction') {
      return jsonResponse({ ok: true, data: appendTransaction_(payload.transaction || {}) });
    }

    if (action === 'removeTransaction') {
      return jsonResponse({ ok: true, data: removeTransaction_(payload.id) });
    }

    return jsonResponse({ ok: false, message: \`Unknown action: \$\{action}\` });
  } catch (error) {
    return jsonResponse({ ok: false, message: String(error) });
  }
}
`;

// ─── helpers ─────────────────────────────────────────────────────────────────

// 股票代號 → 產業分類映射 (可擴展)
export const INDUSTRY_MAP = {
  // 台股
  2330: '半導體',
  2454: '半導體',
  3034: '半導體',
  2308: '半導體',
  2317: '半導體',
  2382: '半導體',
  3231: '半導體',
  1301: '水泥',
  1402: '鋼鐵',
  2353: '晶圓代工',
  2379: '晶圓代工',
  2880: '金融保險',
  2881: '金融保險',
  2886: '金融保險',
  2890: '金融保險',
  1590: '纖維',
  4938: '光磊',
  2409: '光磊',
  6488: '光磊',
  2882: '金融保險',
  2883: '金融保險',
  2884: '金融保險',
  2885: '金融保險',
  2887: '金融保險',
  3044: '消費電子',
  2481: '光磊',
  2347: '光磊',
  3016: '消費電子',
  TSMC: '半導體',
  MediaTek: '半導體',
  // 美股
  AAPL: '消費電子',
  MSFT: '軟體/雲計算',
  GOOGL: '網路/軟體',
  AMZN: '電子商務',
  NVDA: 'AI/晶片',
  META: '社群媒體',
  TSLA: '電動車',
  JPM: '金融',
  BAC: '金融',
  WMT: '零售',
  MCD: '餐飲',
  KO: '飲料食品',
};

// 依產業分類預設顏色
export const INDUSTRY_COLORS = {
  '半導體': '#ef4444',
  '晶圓代工': '#f97316',
  '金融保險': '#eab308',
  '消費電子': '#22c55e',
  '軟體/雲計算': '#06b6d4',
  '網路/軟體': '#3b82f6',
  '電子商務': '#6366f1',
  'AI/晶片': '#d946ef',
  '光磊': '#ec4899',
  '電動車': '#8b5cf6',
  '社群媒體': '#14b8a6',
  '水泥': '#f59e0b',
  '鋼鐵': '#78716c',
  '纖維': '#0ea5e9',
  '消費': '#green',
  '餐飲': '#hsl(210, 40%, 80%)',
  '飲料食品': '#hsl(30, 80%, 60%)',
  '零售': '#hsl(280, 80%, 60%)',
  '金融': '#hsl(200, 80%, 60%)',
  'default': '#a78bfa',
};

export const ASSETS_CATEGORIES = ['台幣活存', '外幣活存', '員工持股信託', '負債項目'];
export const FOREIGN_CURRENCIES = ['USD', 'JPY', 'EUR', 'HKD', 'CNY', 'SGD'];
