const DEFAULT_HEADERS = {
  'Content-Type': 'text/plain', // 修改為 text/plain 以避免 CORS 預檢請求
};

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeMonthKey(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  const numericMatch = text.match(/^(\d{4})[/-](\d{1,2})/);
  if (numericMatch) {
    return `${numericMatch[1]}-${numericMatch[2].padStart(2, '0')}`;
  }

  // Apps Script 有時會把 Sheet 日期 key 序列化成
  // "Mon Jun 01 2026 00:00:00 GMT+0800 (...)"，而不是 YYYY-MM。
  const dateTextMatch = text.match(/^[A-Za-z]{3}\s+([A-Za-z]{3})\s+\d{1,2}\s+(\d{4})/);
  if (dateTextMatch) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames.indexOf(dateTextMatch[1]) + 1;
    if (month > 0) return `${dateTextMatch[2]}-${String(month).padStart(2, '0')}`;
  }

  return text;
}

function normalizeAsset(raw) {
  const category = String(raw?.category || '台幣活存');
  const isForeign = category === '外幣活存';
  const isLiability = category === '負債項目' || raw?.isLiability === true || String(raw?.isLiability).toLowerCase() === 'true';
  const balance = toNumber(raw?.balance, 0);
  const amount = isForeign ? toNumber(raw?.amount ?? balance, 0) : undefined;

  return {
    id: String(raw?.id || `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    category,
    name: String(raw?.name || ''),
    balance: isForeign ? amount : balance,
    isLiability,
    ...(isForeign
      ? {
        currency: String(raw?.currency || 'USD').toUpperCase(),
        amount,
      }
      : {}),
  };
}

function normalizeTransaction(raw) {
  return {
    id: String(raw?.id || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    date: String(raw?.date || new Date().toISOString().slice(0, 10)),
    recordedAt: String(raw?.recordedAt || new Date().toISOString()),
    market: String(raw?.market || 'TWSE').toUpperCase() === 'US' ? 'US' : 'TWSE',
    symbol: String(raw?.symbol || ''),
    stock: String(raw?.stock || ''),
    type: String(raw?.type || 'buy'),
    qty: toNumber(raw?.qty, 0),
    price: toNumber(raw?.price, 0),
    actualAmount: toNumber(raw?.actualAmount, 0),
    note: String(raw?.note || ''),
  };
}

function ensureAbsoluteUrl(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed) {
    throw new Error('請先設定 Google Apps Script Web App URL');
  }
  return trimmed;
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

async function callSheetsApi(apiUrl, action, payload = {}) {
  const url = ensureAbsoluteUrl(apiUrl);

  const response = await fetch(url, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ action, payload }),
  });

  const json = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(json?.message || `Google Sheets API 回應失敗 (${response.status})`);
  }

  // 支援 { ok, data } 或直接回傳資料
  if (json && typeof json === 'object' && 'ok' in json && json.ok === false) {
    throw new Error(json.message || 'Google Sheets API 回傳錯誤');
  }

  return json?.data ?? json;
}

export async function testSheetsConnection(apiUrl) {
  // 優先 health，若 script 未實作則退回 getAll。
  try {
    await callSheetsApi(apiUrl, 'health', {});
    return true;
  } catch (error) {
    await callSheetsApi(apiUrl, 'getAll', {});
    return true;
  }
}

export async function fetchSheetsData(apiUrl) {
  const data = (await callSheetsApi(apiUrl, 'getAll', {})) || {};

  const assets = Array.isArray(data.assets) ? data.assets.map(normalizeAsset) : [];
  const transactions = Array.isArray(data.transactions)
    ? data.transactions.map(normalizeTransaction)
    : [];

  return {
    assets,
    transactions,
    stockMarketPrices: data.stockMarketPrices && typeof data.stockMarketPrices === 'object'
      ? data.stockMarketPrices
      : {},
    lastMonthNetWorth: toNumber(data.lastMonthNetWorth, 0),
  };
}

export async function upsertAssetsToSheets(apiUrl, assets) {
  const normalized = (Array.isArray(assets) ? assets : []).map(normalizeAsset);
  await callSheetsApi(apiUrl, 'upsertAssets', { assets: normalized });
  return normalized;
}

export async function appendTransactionToSheets(apiUrl, tx) {
  const normalized = normalizeTransaction(tx);
  await callSheetsApi(apiUrl, 'appendTransaction', { transaction: normalized });
  return normalized;
}

export async function removeTransactionFromSheets(apiUrl, transactionId) {
  const id = String(transactionId || '').trim();
  if (!id) {
    throw new Error('缺少要刪除的交易 ID');
  }
  await callSheetsApi(apiUrl, 'removeTransaction', { id });
}

export async function updateTransactionInSheets(apiUrl, tx) {
  const normalized = normalizeTransaction(tx);
  if (!normalized.id) {
    throw new Error('缺少要更新的交易 ID');
  }
  await callSheetsApi(apiUrl, 'updateTransaction', { transaction: normalized });
  return normalized;
}


// ─────────────────────────────────────────────
// 月度資產快照（依年月儲存的歷史資產列表）
// ─────────────────────────────────────────────

export async function fetchMonthlyAssetsFromSheets(apiUrl) {
  const data = (await callSheetsApi(apiUrl, 'getMonthlyAssets', {})) || {};

  const normalized = {};
  Object.keys(data).forEach((rawMonthKey) => {
    const monthKey = normalizeMonthKey(rawMonthKey);
    if (!monthKey) return;
    const list = Array.isArray(data[rawMonthKey]) ? data[rawMonthKey] : [];
    normalized[monthKey] = [
      ...(normalized[monthKey] || []),
      ...list.map(normalizeAsset),
    ];
  });

  return normalized;
}

export async function saveMonthlyAssetsToSheets(apiUrl, monthKey, assets) {
  const key = String(monthKey || '').trim();
  if (!key) {
    throw new Error('缺少要儲存的月份（monthKey）');
  }
  const normalized = (Array.isArray(assets) ? assets : []).map(normalizeAsset);
  await callSheetsApi(apiUrl, 'upsertMonthlyAssets', { monthKey: key, assets: normalized });
  return normalized;
}
