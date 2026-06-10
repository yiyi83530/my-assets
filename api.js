<<<<<<< HEAD
// API 與 Google Sheets 同步

const updatedGASCode = `function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var txSheet = sheet.getSheetByName("Transactions") || sheet.insertSheet("Transactions");
  var priceSheet = sheet.getSheetByName("MarketPrices") || sheet.insertSheet("MarketPrices");
  var balanceSheet = sheet.getSheetByName("AssetBalances") || sheet.insertSheet("AssetBalances");
  var metaSheet = sheet.getSheetByName("MetaSettings") || sheet.insertSheet("MetaSettings");
  
  if (txSheet.getLastRow() === 0) {
    txSheet.appendRow(["ID", "Date", "Stock", "Type", "Qty", "Price", "RawTotal", "ActualAmount", "Note"]);
  }
  if (priceSheet.getLastRow() === 0) {
    priceSheet.appendRow(["Stock", "Price"]);
  }
  if (balanceSheet.getLastRow() === 0) {
    balanceSheet.appendRow(["ID", "Category", "Name", "Balance", "IsLiability"]);
  }
  if (metaSheet.getLastRow() === 0) {
    metaSheet.appendRow(["Key", "Value"]);
    metaSheet.appendRow(["lastMonthNetWorth", "950000"]);
  }
  
  var txData = [];
  var txValues = txSheet.getDataRange().getValues();
  for (var i = 1; i < txValues.length; i++) {
    txData.push({
      id: txValues[i][0].toString(),
      date: formatDate(txValues[i][1]),
      stock: txValues[i][2],
      type: txValues[i][3],
      qty: Number(txValues[i][4]),
      price: Number(txValues[i][5]),
      rawTotal: Number(txValues[i][6]),
      actualAmount: Number(txValues[i][7]),
      note: txValues[i][8] || ""
    });
  }
  
  var priceData = {};
  var priceValues = priceSheet.getDataRange().getValues();
  for (var j = 1; j < priceValues.length; j++) {
    priceData[priceValues[j][0]] = Number(priceValues[j][1]);
  }
  
  var balanceData = [];
  var balanceValues = balanceSheet.getDataRange().getValues();
  for (var k = 1; k < balanceValues.length; k++) {
    balanceData.push({
      id: balanceValues[k][0].toString(),
      category: balanceValues[k][1],
      name: balanceValues[k][2],
      balance: Number(balanceValues[k][3]),
      isLiability: balanceValues[k][4] === true || balanceValues[k][4].toString().toLowerCase() === "true"
    });
  }
  
  var lastMonthNetWorth = 950000;
  var metaValues = metaSheet.getDataRange().getValues();
  for (var m = 1; m < metaValues.length; m++) {
    if (metaValues[m][0] === "lastMonthNetWorth") {
      lastMonthNetWorth = Number(metaValues[m][1]);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    transactions: txData,
    stockMarketPrices: priceData,
    assetBalances: balanceData,
    lastMonthNetWorth: lastMonthNetWorth
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var txSheet = sheet.getSheetByName("Transactions") || sheet.insertSheet("Transactions");
  var priceSheet = sheet.getSheetByName("MarketPrices") || sheet.insertSheet("MarketPrices");
  var balanceSheet = sheet.getSheetByName("AssetBalances") || sheet.insertSheet("AssetBalances");
  var metaSheet = sheet.getSheetByName("MetaSettings") || sheet.insertSheet("MetaSettings");
  
  var payload = JSON.parse(e.postData.contents);
  var action = payload.action;
  
  if (action === "addTransaction") {
    var tx = payload.data;
    txSheet.appendRow([tx.id, tx.date, tx.stock, tx.type, tx.qty, tx.price, tx.rawTotal, tx.actualAmount, tx.note]);
  } 
  else if (action === "deleteTransaction") {
    var idToDelete = payload.data.id;
    var values = txSheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (values[i][0].toString() === idToDelete.toString()) {
        txSheet.deleteRow(i + 1);
        break;
      }
    }
  } 
  else if (action === "updatePrice") {
    var stock = payload.data.stock;
    var price = payload.data.price;
    updatePriceInSheet(priceSheet, stock, price);
  }
  else if (action === "saveAssetBalances") {
    balanceSheet.clear();
    balanceSheet.appendRow(["ID", "Category", "Name", "Balance", "IsLiability"]);
    var items = payload.data;
    for (var k = 0; k < items.length; k++) {
      balanceSheet.appendRow([items[k].id, items[k].category, items[k].name, items[k].balance, items[k].isLiability]);
    }
  }
  else if (action === "saveLastMonthNetWorth") {
    var lastVal = Number(payload.data.lastMonthNetWorth);
    var metaValues = metaSheet.getDataRange().getValues();
    var found = false;
    for (var i = 1; i < metaValues.length; i++) {
      if (metaValues[i][0] === "lastMonthNetWorth") {
        metaSheet.getRange(i + 1, 2).setValue(lastVal);
        found = true;
        break;
      }
    }
    if (!found) {
      metaSheet.appendRow(["lastMonthNetWorth", lastVal]);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function updatePriceInSheet(priceSheet, stock, price) {
  var values = priceSheet.getDataRange().getValues();
  var found = false;
  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString() === stock.toString()) {
      priceSheet.getRange(i + 1, 2).setValue(price);
      found = true;
      break;
    }
  }
  if (!found) {
    priceSheet.appendRow([stock, price]);
  }
}

function formatDate(dateVal) {
  if (dateVal instanceof Date) {
    var jsDate = new Date(dateVal);
    var year = jsDate.getFullYear();
    var month = ("0" + (jsDate.getMonth() + 1)).slice(-2);
    var day = ("0" + jsDate.getDate()).slice(-2);
    return year + "-" + month + "-" + day;
  }
  return dateVal.toString().substring(0, 10);
}`;

async function fetchCloudData() {
    if (!state.apiUrl) return;
    toggleLoading(true, "正在自 Google 試算表同步資產負債數據...");
    try {
        const res = await fetch(state.apiUrl, { method: 'GET', redirect: 'follow' });
        const json = await res.json();
        if (json) {
            state.transactions = json.transactions || [];
            state.stockMarketPrices = json.stockMarketPrices || {};
            state.assetBalances = json.assetBalances && json.assetBalances.length > 0 ? json.assetBalances : state.assetBalances;
            state.lastMonthNetWorth = json.lastMonthNetWorth !== undefined ? json.lastMonthNetWorth : state.lastMonthNetWorth;
            document.getElementById('lastMonthInput').value = state.lastMonthNetWorth;
            renderAll();
            showToast("小豬存錢筒同步成功！", "check-circle");
        }
    } catch (err) {
        console.error(err);
        showToast("同步失敗，請確認 Apps Script 權限", "alert-circle");
    } finally {
        toggleLoading(false);
    }
}

async function sendCloudAction(action, data) {
    if (!state.apiUrl) return true;
    toggleLoading(true, "正在將變更上傳至 Google 試算表...");
    try {
        const res = await fetch(state.apiUrl, {
            method: 'POST',
            redirect: 'follow',
            body: JSON.stringify({ action, data })
        });
        const r = await res.json();
        toggleLoading(false);
        return r.status === "success";
    } catch (err) {
        toggleLoading(false);
        console.error(err);
        showToast("雲端同步失敗，已更動本地狀態！", "alert-octagon");
        return false;
    }
}
=======
const api = {
    async fetchData() {
        if (!appState.config.apiUrl) return null;
        
        document.getElementById('globalLoading').classList.remove('hidden');
        try {
            const response = await fetch(appState.config.apiUrl);
            const result = await response.json();
            // 同步回本地狀態
            if (result.accounts) appState.accounts = result.accounts;
            if (result.transactions) appState.transactions = result.transactions;
            return result;
        } catch (error) {
            utils.showToast('同步失敗，請檢查連線設定', true);
            return null;
        } finally {
            document.getElementById('globalLoading').classList.add('hidden');
        }
    },
    
    async saveToCloud() {
        if (!appState.config.apiUrl) return;
        // 實作 POST 到 Google Sheets 的邏輯
    },

    async fetchLivePrices() {
        utils.showToast('正在獲取最新報價...');
        // 呼叫 Yahoo Finance 或後端 API
    }
};
>>>>>>> main
