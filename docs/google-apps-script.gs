const SHEET_ASSETS = 'assets';
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
    id: String(asset.id || `asset_${new Date().getTime()}`),
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

    return jsonResponse({ ok: false, message: `Unknown action: ${action}` });
  } catch (error) {
    return jsonResponse({ ok: false, message: String(error) });
  }
}

