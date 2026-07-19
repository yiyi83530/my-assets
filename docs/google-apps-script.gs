const SHEET_ASSETS = 'assets';
const SHEET_TRANSACTIONS = 'transactions';
const SHEET_MONTHLY_ASSETS = 'monthly_assets';

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
// monthKey 額外放在第一欄，後面欄位跟 ASSET_HEADERS 一致，方便沿用既有的 normalize 邏輯
const MONTHLY_ASSET_HEADERS = ['monthKey'].concat(ASSET_HEADERS);

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
    id: String(asset.id || `asset_${new Date().getTime()}`),
    category: category,
    name: String(asset.name || ''),
    balance: isForeign ? amount : balance,
    isLiability: asset.isLiability === true || String(asset.isLiability).toLowerCase() === 'true' || category === '負債項目',
    currency: isForeign ? String(asset.currency || 'USD').toUpperCase() : '',
    amount: isForeign ? amount : '',
  };
}

function normalizeTx_(tx) {
  return {
    id: String(tx.id || `tx_${new Date().getTime()}`),
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
  const symbolColumn = TX_HEADERS.indexOf('symbol') + 1;
  txSheet.getRange(txSheet.getLastRow() + 1, symbolColumn).setNumberFormat('@');
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

function updateTransaction_(transaction) {
  const txSheet = getOrCreateSheet_(SHEET_TRANSACTIONS, TX_HEADERS);
  const normalized = normalizeTx_(transaction || {});
  const txId = normalized.id;

  if (!txId) {
    throw new Error('缺少要更新的交易 ID');
  }

  const lastRow = txSheet.getLastRow();
  if (lastRow <= 1) { // No data rows
    throw new Error('找不到可更新的交易，試算表為空。');
  }

  const dataRange = txSheet.getRange(2, 1, lastRow - 1, TX_HEADERS.length);
  const values = dataRange.getValues();
  const idIndex = TX_HEADERS.indexOf('id');

  let updated = false;
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(txId)) {
      // Found the row to update
      const newRow = TX_HEADERS.map((header) => normalized[header] !== undefined ? normalized[header] : '');
      values[i] = newRow;
      updated = true;
      break; // Assuming IDs are unique, we can stop after finding it
    }
  }

  if (updated) {
    const symbolColumn = TX_HEADERS.indexOf('symbol') + 1;
    txSheet.getRange(2, symbolColumn, values.length, 1).setNumberFormat('@');
    dataRange.setValues(values);
    return { id: txId, status: 'updated' };
  } else {
    throw new Error(`找不到 ID 為 ${txId} 的交易來進行更新。`);
  }
}

// ─────────────────────────────────────────────
// 月度資產快照（monthly_assets）
// 儲存格式：每一列 = 某個月份的某一筆資產，monthKey 欄位用來分組（例如 "2026-06"）
// ─────────────────────────────────────────────

function normalizeMonthKey_(value) {
  if (!value) return '';

  const isDate = value instanceof Date
    || Object.prototype.toString.call(value) === '[object Date]';
  if (isDate && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM');
  }

  const text = String(value).trim();
  const numericMatch = text.match(/^(\d{4})[\/-](\d{1,2})/);
  if (numericMatch) {
    return `${numericMatch[1]}-${numericMatch[2].padStart(2, '0')}`;
  }

  const parsedDate = new Date(text);
  if (!isNaN(parsedDate.getTime())) {
    return Utilities.formatDate(parsedDate, Session.getScriptTimeZone(), 'yyyy-MM');
  }

  return text;
}

function getMonthlyAssets_() {
  const sheet = getOrCreateSheet_(SHEET_MONTHLY_ASSETS, MONTHLY_ASSET_HEADERS);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) return {};

  const rows = sheet.getRange(2, 1, lastRow - 1, MONTHLY_ASSET_HEADERS.length).getValues();
  const objects = rowsToObjects_(rows, MONTHLY_ASSET_HEADERS);

  // 依 monthKey 分組，還原成前端期待的 { "2026-06": [asset, asset, ...], ... } 格式
  const grouped = {};
  objects.forEach((row) => {
    const monthKey = normalizeMonthKey_(row.monthKey);
    if (!monthKey) return;

    const asset = {};
    ASSET_HEADERS.forEach((h) => { asset[h] = row[h]; });

    if (!grouped[monthKey]) grouped[monthKey] = [];
    grouped[monthKey].push(asset);
  });

  return grouped;
}

function upsertMonthlyAssets_(monthKey, assets) {
  const key = String(monthKey || '').trim();
  if (!key) {
    throw new Error('缺少 monthKey');
  }

  const sheet = getOrCreateSheet_(SHEET_MONTHLY_ASSETS, MONTHLY_ASSET_HEADERS);
  const lastRow = sheet.getLastRow();

  // 讀出所有現有列，先過濾掉「屬於這個月份」的舊資料，其餘月份原封不動保留
  const existingRows = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, MONTHLY_ASSET_HEADERS.length).getValues()
    : [];
  const monthKeyIndex = MONTHLY_ASSET_HEADERS.indexOf('monthKey');
  const keptRows = existingRows.filter((row) => String(row[monthKeyIndex]) !== key);

  const normalized = (assets || []).map(normalizeAsset_);
  const newRows = normalized.map((asset) =>
    MONTHLY_ASSET_HEADERS.map((h) => (h === 'monthKey' ? key : (asset[h] !== undefined ? asset[h] : '')))
  );

  const finalRows = keptRows.concat(newRows);

  // 整張表清空後，把保留的舊月份資料＋這個月份的新資料一起寫回去
  const maxRows = sheet.getMaxRows();
  if (maxRows > 1) {
    sheet.getRange(2, 1, maxRows - 1, MONTHLY_ASSET_HEADERS.length).clearContent();
  }
  if (finalRows.length > 0) {
    sheet.getRange(2, 1, finalRows.length, MONTHLY_ASSET_HEADERS.length).setValues(finalRows);
  }

  return { monthKey: key, count: normalized.length };
}

function doGet(e) {
  return jsonResponse({
    ok: true,
    message: "Web App 連線正常！請使用 POST 請求來操作數據。",
    status: "Running"
  });
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

    if (action === 'updateTransaction') {
      return jsonResponse({ ok: true, data: updateTransaction_(payload.transaction || {}) });
    }

    if (action === 'removeTransaction') {
      return jsonResponse({ ok: true, data: removeTransaction_(payload.id) });
    }

    if (action === 'getMonthlyAssets') {
      return jsonResponse({ ok: true, data: getMonthlyAssets_() });
    }

    if (action === 'upsertMonthlyAssets') {
      return jsonResponse({ ok: true, data: upsertMonthlyAssets_(payload.monthKey, payload.assets || []) });
    }

    return jsonResponse({ ok: false, message: `Unknown action: ${action}` });
  } catch (error) {
    return jsonResponse({ ok: false, message: String(error) });
  }
}
