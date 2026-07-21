// 更新日期：2026-07-22｜版本：V1.0.0（修改本檔案時請同步更新；同日持續修改時依序遞增修訂號）
const SHEET_ASSETS = 'assets';
const SHEET_TRANSACTIONS = 'transactions';
const SHEET_MONTHLY_ASSETS = 'monthly_assets';
const SHEET_STOCK_HOLDING_SNAPSHOTS = 'monthly_stock_holdings';
const SHEET_COST_BASIS_ADJUSTMENTS = 'cost_basis_adjustments';
const SHEET_INDUSTRY_CATEGORIES = 'stock_industry_categories';

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
const STOCK_HOLDING_SNAPSHOT_HEADERS = ['id', 'monthKey', 'market', 'symbol', 'stock', 'holdingQty', 'avgCost', 'note', 'effectiveAt'];
const COST_BASIS_ADJUSTMENT_HEADERS = ['id', 'stock', 'market', 'effectiveAt', 'avgCost', 'holdingQty', 'totalCostBasis'];
const INDUSTRY_CATEGORY_HEADERS = ['category', 'symbols'];

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
  return rows.filter((row) => row.some((cell) => String(cell || '').trim() !== '')).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i];
    });
    return obj;
  });
}

function clearAndWriteObjects_(sheet, headers, items) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
  }

  if (!items || items.length === 0) return;

  const values = items.map((item) => headers.map((h) => item[h] !== undefined ? item[h] : ''));
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}

function assetDedupKey_(asset) {
  const id = String(asset.id || '').trim();
  if (id) return `id:${id}`;

  const category = String(asset.category || '台幣活存').trim();
  const name = String(asset.name || '').trim();
  const currency = String(asset.currency || '').trim().toUpperCase();
  const isLiability = asset.isLiability === true || String(asset.isLiability).toLowerCase() === 'true' || category === '負債項目';
  const balance = Number(asset.balance || 0);
  const amount = Number(asset.amount != null ? asset.amount : balance);
  return `content:${category}|${name}|${currency}|${isLiability}|${balance}|${amount}`;
}

function dedupeAssets_(assets) {
  const byKey = {};
  const orderedKeys = [];
  (assets || []).forEach((asset) => {
    const hasContent = String(asset.id || asset.category || asset.name || asset.balance || asset.amount || '').trim();
    if (!hasContent) return;
    const key = assetDedupKey_(asset);
    if (!Object.prototype.hasOwnProperty.call(byKey, key)) orderedKeys.push(key);
    byKey[key] = normalizeAsset_(asset);
  });
  return orderedKeys.map((key) => byKey[key]);
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

function normalizeCostBasisAdjustment_(adjustment) {
  return {
    id: String(adjustment.id || `cost_${new Date().getTime()}`),
    stock: String(adjustment.stock || ''),
    market: String(adjustment.market || 'TWSE').toUpperCase() === 'US' ? 'US' : 'TWSE',
    effectiveAt: String(adjustment.effectiveAt || new Date().toISOString()),
    avgCost: Number(adjustment.avgCost || 0),
    holdingQty: Number(adjustment.holdingQty || 0),
    totalCostBasis: Number(adjustment.totalCostBasis || 0),
  };
}

function normalizeStockHoldingSnapshot_(snapshot) {
  const market = String(snapshot.market || 'TWSE').toUpperCase() === 'US' ? 'US' : 'TWSE';
  return {
    id: String(snapshot.id || `holding_${new Date().getTime()}`),
    monthKey: normalizeMonthKey_(snapshot.monthKey),
    market: market,
    symbol: String(snapshot.symbol || ''),
    stock: String(snapshot.stock || ''),
    holdingQty: Number(snapshot.holdingQty || 0),
    avgCost: Number(snapshot.avgCost || 0),
    note: String(snapshot.note || ''),
    effectiveAt: String(snapshot.effectiveAt || ''),
  };
}

function normalizeIndustryCategory_(category) {
  const rawSymbols = Array.isArray(category.symbols)
    ? category.symbols
    : String(category.symbols || '').split(/[\s,，、;；]+/);
  const seen = {};
  const symbols = rawSymbols.map(function(symbol) {
    return String(symbol || '').trim().toUpperCase();
  }).filter(function(symbol) {
    if (!symbol || seen[symbol]) return false;
    seen[symbol] = true;
    return true;
  });
  return {
    category: String(category.name || category.category || '').trim(),
    symbols: symbols.join(', '),
  };
}

function getAll_() {
  const assetsSheet = getOrCreateSheet_(SHEET_ASSETS, ASSET_HEADERS);
  const txSheet = getOrCreateSheet_(SHEET_TRANSACTIONS, TX_HEADERS);
  const costSheet = getOrCreateSheet_(SHEET_COST_BASIS_ADJUSTMENTS, COST_BASIS_ADJUSTMENT_HEADERS);
  const holdingSheet = getOrCreateSheet_(SHEET_STOCK_HOLDING_SNAPSHOTS, STOCK_HOLDING_SNAPSHOT_HEADERS);
  const industrySheet = getOrCreateSheet_(SHEET_INDUSTRY_CATEGORIES, INDUSTRY_CATEGORY_HEADERS);

  const assetLastRow = assetsSheet.getLastRow();
  const txLastRow = txSheet.getLastRow();
  const costLastRow = costSheet.getLastRow();
  const holdingLastRow = holdingSheet.getLastRow();
  const industryLastRow = industrySheet.getLastRow();

  const assetsRows = assetLastRow > 1
    ? assetsSheet.getRange(2, 1, assetLastRow - 1, ASSET_HEADERS.length).getValues()
    : [];
  const txRows = txLastRow > 1
    ? txSheet.getRange(2, 1, txLastRow - 1, TX_HEADERS.length).getValues()
    : [];
  const costRows = costLastRow > 1
    ? costSheet.getRange(2, 1, costLastRow - 1, COST_BASIS_ADJUSTMENT_HEADERS.length).getValues()
    : [];
  const holdingRows = holdingLastRow > 1
    ? holdingSheet.getRange(2, 1, holdingLastRow - 1, STOCK_HOLDING_SNAPSHOT_HEADERS.length).getValues()
    : [];
  const industryRows = industryLastRow > 1
    ? industrySheet.getRange(2, 1, industryLastRow - 1, INDUSTRY_CATEGORY_HEADERS.length).getValues()
    : [];
  const industryCategories = rowsToObjects_(industryRows, INDUSTRY_CATEGORY_HEADERS).map(function(category) {
    return {
      name: String(category.category || '').trim(),
      symbols: String(category.symbols || '').split(/[\s,，、;；]+/).filter(Boolean),
    };
  }).filter(function(category) {
    return category.name;
  });

  return {
    assets: rowsToObjects_(assetsRows, ASSET_HEADERS),
    transactions: rowsToObjects_(txRows, TX_HEADERS),
    costBasisAdjustments: rowsToObjects_(costRows, COST_BASIS_ADJUSTMENT_HEADERS),
    stockHoldingSnapshots: rowsToObjects_(holdingRows, STOCK_HOLDING_SNAPSHOT_HEADERS),
    industryCategories: industryCategories.length > 0 ? industryCategories : null,
  };
}

function saveIndustryCategories_(categories) {
  const normalized = (categories || []).map(normalizeIndustryCategory_).filter(function(category) {
    return category.category;
  });
  if (normalized.length === 0) {
    throw new Error('至少需要保留一個產業類別');
  }
  const sheet = getOrCreateSheet_(SHEET_INDUSTRY_CATEGORIES, INDUSTRY_CATEGORY_HEADERS);
  clearAndWriteObjects_(sheet, INDUSTRY_CATEGORY_HEADERS, normalized);
  return { count: normalized.length };
}

function upsertStockHoldingSnapshots_(monthKey, snapshots) {
  const key = normalizeMonthKey_(monthKey);
  if (!key) {
    throw new Error('缺少 monthKey');
  }

  const sheet = getOrCreateSheet_(SHEET_STOCK_HOLDING_SNAPSHOTS, STOCK_HOLDING_SNAPSHOT_HEADERS);
  const lastRow = sheet.getLastRow();
  const monthKeyIndex = STOCK_HOLDING_SNAPSHOT_HEADERS.indexOf('monthKey');

  if (lastRow > 1) {
    const monthKeys = sheet.getRange(2, monthKeyIndex + 1, lastRow - 1, 1).getValues();
    for (let index = monthKeys.length - 1; index >= 0; index--) {
      if (normalizeMonthKey_(monthKeys[index][0]) === key) {
        sheet.deleteRow(index + 2);
      }
    }
  }

  const rows = (snapshots || [])
    .map((snapshot) => normalizeStockHoldingSnapshot_(Object.assign({}, snapshot, { monthKey: key })))
    .filter((snapshot) => snapshot.stock && snapshot.holdingQty >= 0)
    .map((snapshot) => STOCK_HOLDING_SNAPSHOT_HEADERS.map((header) => snapshot[header] !== undefined ? snapshot[header] : ''));

  if (rows.length > 0) {
    const symbolColumn = STOCK_HOLDING_SNAPSHOT_HEADERS.indexOf('symbol') + 1;
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, symbolColumn, rows.length, 1).setNumberFormat('@');
    sheet.getRange(startRow, 1, rows.length, STOCK_HOLDING_SNAPSHOT_HEADERS.length).setValues(rows);
  }

  return { monthKey: key, count: rows.length };
}

function upsertCostBasisAdjustment_(adjustment) {
  const sheet = getOrCreateSheet_(SHEET_COST_BASIS_ADJUSTMENTS, COST_BASIS_ADJUSTMENT_HEADERS);
  const normalized = normalizeCostBasisAdjustment_(adjustment || {});
  const lastRow = sheet.getLastRow();
  const idIndex = COST_BASIS_ADJUSTMENT_HEADERS.indexOf('id');
  const row = COST_BASIS_ADJUSTMENT_HEADERS.map((header) => normalized[header] !== undefined ? normalized[header] : '');

  if (lastRow > 1) {
    const ids = sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues();
    for (let index = 0; index < ids.length; index++) {
      if (String(ids[index][0]) === normalized.id) {
        sheet.getRange(index + 2, 1, 1, COST_BASIS_ADJUSTMENT_HEADERS.length).setValues([row]);
        return { id: normalized.id, status: 'updated' };
      }
    }
  }

  sheet.appendRow(row);
  return { id: normalized.id, status: 'created' };
}

function upsertAssets_(assets) {
  const assetsSheet = getOrCreateSheet_(SHEET_ASSETS, ASSET_HEADERS);
  const normalized = dedupeAssets_(assets || []);
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

    if (!grouped[monthKey]) grouped[monthKey] = {};
    grouped[monthKey][assetDedupKey_(asset)] = normalizeAsset_(asset);
  });

  const result = {};
  Object.keys(grouped).forEach((monthKey) => {
    result[monthKey] = Object.keys(grouped[monthKey]).map((key) => grouped[monthKey][key]);
  });

  return result;
}

function upsertMonthlyAssets_(monthKey, assets) {
  const key = String(monthKey || '').trim();
  if (!key) {
    throw new Error('缺少 monthKey');
  }

  const sheet = getOrCreateSheet_(SHEET_MONTHLY_ASSETS, MONTHLY_ASSET_HEADERS);
  const lastRow = sheet.getLastRow();

  const monthKeyIndex = MONTHLY_ASSET_HEADERS.indexOf('monthKey');

  if (lastRow > 1) {
    const monthKeys = sheet.getRange(2, monthKeyIndex + 1, lastRow - 1, 1).getValues();
    for (let index = monthKeys.length - 1; index >= 0; index--) {
      if (normalizeMonthKey_(monthKeys[index][0]) === key) {
        sheet.deleteRow(index + 2);
      }
    }
  }

  const normalized = dedupeAssets_(assets || []);
  const newRows = normalized.map((asset) =>
    MONTHLY_ASSET_HEADERS.map((h) => (h === 'monthKey' ? key : (asset[h] !== undefined ? asset[h] : '')))
  );

  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, MONTHLY_ASSET_HEADERS.length).setValues(newRows);
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

    if (action === 'upsertCostBasisAdjustment') {
      return jsonResponse({ ok: true, data: upsertCostBasisAdjustment_(payload.adjustment || {}) });
    }

    if (action === 'upsertStockHoldingSnapshots') {
      return jsonResponse({ ok: true, data: upsertStockHoldingSnapshots_(payload.monthKey, payload.snapshots || []) });
    }

    if (action === 'saveIndustryCategories') {
      return jsonResponse({ ok: true, data: saveIndustryCategories_(payload.categories || []) });
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
