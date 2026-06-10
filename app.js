<<<<<<< HEAD
// 主應用初始化與渲染邏輯

function renderAll() {
    renderAssetAndNetWorth();
    renderStockPortfolio();
    renderStockTable();
    renderTransactionHistory();
}

function renderAssetAndNetWorth() {
    const assets = state.assetBalances.filter(a => !a.isLiability).reduce((sum, a) => sum + a.balance, 0);
    const liabilities = state.assetBalances.filter(a => a.isLiability).reduce((sum, a) => sum + a.balance, 0);
    const stockValue = getStockPortfolioValue();
    const netWorth = assets + stockValue - liabilities;
    
    document.getElementById('netWorthDisplay').textContent = formatCurrency(netWorth);
    document.getElementById('totalAssetsDisplay').textContent = formatCurrency(assets + stockValue);
    document.getElementById('totalLiabilitiesDisplay').textContent = formatCurrency(liabilities);
    
    const growth = ((netWorth - state.lastMonthNetWorth) / state.lastMonthNetWorth * 100).toFixed(2);
    const growthEl = document.getElementById('netGrowthPercentage');
    growthEl.className = growth >= 0 ? 'flex items-center space-x-1 font-bold text-emerald-600' : 'flex items-center space-x-1 font-bold text-rose-600';
    growthEl.innerHTML = `<span>${growth}%</span>`;
    
    renderAccountsDisplay();
}

function renderAccountsDisplay() {
    const ntdList = document.getElementById('ntdSavingsList');
    const foreignList = document.getElementById('foreignSavingsList');
    const otherList = document.getElementById('otherAssetsList');
    const liabilitiesList = document.getElementById('liabilitiesList');
    
    ntdList.innerHTML = '';
    foreignList.innerHTML = '';
    otherList.innerHTML = '';
    liabilitiesList.innerHTML = '';
    
    let ntdTotal = 0, foreignTotal = 0;
    
    state.assetBalances.forEach(acc => {
        const html = `<div class="flex justify-between py-2 px-2 text-xs">
            <span class="text-slate-600 font-medium">${acc.name}</span>
            <span class="text-slate-800 font-bold font-mono">${formatCurrency(acc.balance)}</span>
        </div>`;
        
        if (acc.isLiability) {
            liabilitiesList.innerHTML += html;
        } else if (acc.category === '台幣活存') {
            ntdList.innerHTML += html;
            ntdTotal += acc.balance;
        } else if (acc.category === '外幣活存') {
            foreignList.innerHTML += html;
            foreignTotal += acc.balance;
        } else {
            otherList.innerHTML += html;
        }
    });
    
    document.getElementById('ntdSavingsTotal').textContent = formatCurrency(ntdTotal);
    document.getElementById('foreignSavingsTotal').textContent = formatCurrency(foreignTotal);
}

function getStockPortfolioValue() {
    const holdings = getStockHoldings();
    return Object.keys(holdings).reduce((sum, stock) => {
        const qty = holdings[stock].qty;
        const price = state.stockMarketPrices[stock] || 0;
        return sum + (qty * price);
    }, 0);
}

function renderStockPortfolio() {
    const value = getStockPortfolioValue();
    document.getElementById('stockPortfolioVal').textContent = formatCurrency(value);
    
    const holdings = getStockHoldings();
    let totalCost = 0, totalMarket = 0;
    Object.keys(holdings).forEach(stock => {
        const holding = holdings[stock];
        const avgCost = holding.qty > 0 ? holding.totalCost / holding.qty : 0;
        totalCost += holding.qty * avgCost;
        totalMarket += holding.qty * (state.stockMarketPrices[stock] || 0);
    });
    
    const profit = totalMarket - totalCost;
    const profitRate = totalCost > 0 ? (profit / totalCost * 100).toFixed(2) : 0;
    
    document.getElementById('stockSummaryMarketVal').textContent = formatCurrency(totalMarket);
    document.getElementById('stockSummaryCost').textContent = formatCurrency(totalCost);
    document.getElementById('stockSummaryProfit').textContent = formatCurrency(profit);
    document.getElementById('stockSummaryProfit').className = profit >= 0 ? 'text-2xl font-extrabold font-mono text-emerald-600' : 'text-2xl font-extrabold font-mono text-rose-600';
    document.getElementById('stockSummaryProfitRate').textContent = profitRate + '%';
    document.getElementById('stockSummaryProfitRate').className = profitRate >= 0 ? 'text-2xl font-extrabold font-mono text-emerald-600' : 'text-2xl font-extrabold font-mono text-rose-600';
}

function renderStockTable() {
    const tbody = document.getElementById('stockTableBody');
    tbody.innerHTML = '';
    
    const holdings = getStockHoldings();
    const year = document.getElementById('yearFilter').value;
    
    let totalMarketVal = 0;
    Object.keys(holdings).forEach(stock => {
        const holding = holdings[stock];
        if (holding.qty <= 0) return;
        
        const txsForStock = filterTransactionsByYear(state.transactions.filter(t => t.stock === stock), year);
        if (txsForStock.length === 0) return;
        
        const price = state.stockMarketPrices[stock] || 0;
        const avgCost = holding.totalCost / holding.qty;
        const marketVal = holding.qty * price;
        const profit = marketVal - (holding.qty * avgCost);
        const profitRate = ((profit / (holding.qty * avgCost)) * 100).toFixed(2);
        
        totalMarketVal += marketVal;
        
        const row = `<tr class="hover:bg-slate-50">
            <td class="py-3 px-4 text-center">${stock}</td>
            <td class="py-3 px-4 text-center font-mono">${holding.qty.toLocaleString()}</td>
            <td class="py-3 px-4 text-center font-mono">${formatCurrency(avgCost)}</td>
            <td class="py-3 px-4 text-center">
                <input type="number" value="${price}" step="0.01" onchange="updateStockPrice('${stock}', this.value)" class="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-center">
            </td>
            <td class="py-3 px-4 text-center font-mono">${formatCurrency(holding.qty * avgCost)}</td>
            <td class="py-3 px-4 text-center font-mono">${formatCurrency(marketVal)}</td>
            <td class="py-3 px-4 text-center font-mono ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${formatCurrency(profit)}</td>
            <td class="py-3 px-4 text-center font-mono ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${profitRate}%</td>
            <td class="py-3 px-4 text-center text-xs text-slate-500">${(marketVal / totalMarketVal * 100).toFixed(1)}%</td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

function updateStockPrice(stock, price) {
    state.stockMarketPrices[stock] = parseFloat(price);
    sendCloudAction('updatePrice', { stock, price: parseFloat(price) });
    renderAll();
}

function renderTransactionHistory() {
    const tbody = document.getElementById('txHistoryTableBody');
    tbody.innerHTML = '';
    
    const year = document.getElementById('yearFilter').value;
    const filtered = filterTransactionsByYear(state.transactions, year);
    
    filtered.forEach(tx => {
        const typeDisplay = tx.type === 'buy' ? '買進' : tx.type === 'sell' ? '賣出' : '配息';
        const row = `<tr class="hover:bg-slate-50">
            <td class="py-3 px-0 text-center text-xs">${tx.date}</td>
            <td class="py-3 px-3 text-center text-xs font-medium">${tx.stock}</td>
            <td class="py-3 px-0 text-center text-xs">${typeDisplay}</td>
            <td class="py-3 px-3 text-center text-xs font-mono">${tx.qty}</td>
            <td class="py-3 px-3 text-center text-xs font-mono">${formatCurrency(tx.price)}</td>
            <td class="py-3 px-3 text-center text-xs font-mono">${formatCurrency(tx.actualAmount)}</td>
            <td class="py-3 px-3 text-center text-xs text-slate-500">${tx.note}</td>
            <td class="py-3 px-3 text-center">
                <button onclick="deleteTransaction('${tx.id}')" class="text-rose-500 hover:text-rose-700 text-xs font-bold">刪除</button>
            </td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

function fetchLivePricesFromCloud() {
    showToast('功能開發中...', 'info');
}

window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlApi = urlParams.get('apiUrl');
    
    if (urlApi) {
        state.apiUrl = decodeURIComponent(urlApi);
        document.getElementById('sheetApiUrl').value = state.apiUrl;
        document.getElementById('demoBanner').classList.add('hidden');
        updateConnectionStatus(true);
        fetchCloudData();
    } else {
        state.transactions = [...demoTransactions];
        state.stockMarketPrices = {...demoPrices};
        renderAll();
    }
    
    document.getElementById('scriptCodeArea').value = updatedGASCode;
    safeCreateIcons();
});
=======
document.addEventListener('DOMContentLoaded', () => {
    console.log('🐷 小豬存錢筒系統啟動...');
    
    // 初始化 Lucide 圖標
    lucide.createIcons();

    // 更新 UI 狀態
    if (appState.config.apiUrl) {
        document.getElementById('demoBanner').classList.add('hidden');
        document.getElementById('connectionBadge').innerHTML = `
            <span class="w-1.5 h-1.5 mr-1 rounded-full bg-emerald-500 animate-pulse"></span>已連線雲端
        `;
        api.fetchData().then(() => ui.renderAll());
    } else {
        ui.renderAll();
    }
});

// 處理 API 儲存按鈕
window.directSaveConnection = () => {
    const url = document.getElementById('sheetApiUrl').value;
    appState.config.apiUrl = url;
    localStorage.setItem('piggy_api_url', url);
    utils.showToast('設定已儲存，請重新整理頁面');
    ui.closeConfigModal();
};

/**
 * 交易類型切換邏輯
 */
function setTxType(type) {
    const btnBuy = document.getElementById('btnTypeBuy');
    const btnSell = document.getElementById('btnTypeSell');
    const txTypeInput = document.getElementById('txType');

    // 1. 更新隱藏的 input 欄位
    if (txTypeInput) {
        txTypeInput.value = type;
    }

    // 2. 視覺反饋：切換顏色
    if (type === 'buy') {
        // 買進-選中
        btnBuy.classList.add('border-rose-600', 'bg-rose-50', 'text-rose-600');
        btnBuy.classList.remove('border-slate-200', 'bg-white', 'text-slate-700');
        // 賣出-未選
        btnSell.classList.add('border-slate-200', 'bg-white', 'text-slate-700');
        btnSell.classList.remove('border-emerald-600', 'bg-emerald-50', 'text-emerald-600');
    } else {
        // 賣出-選中
        btnSell.classList.add('border-emerald-600', 'bg-emerald-50', 'text-emerald-600');
        btnSell.classList.remove('border-slate-200', 'bg-white', 'text-slate-700');
        // 買進-未選
        btnBuy.classList.add('border-slate-200', 'bg-white', 'text-slate-700');
        btnBuy.classList.remove('border-rose-600', 'bg-rose-50', 'text-rose-600');
    }
    console.log("Transaction type set to:", type);
}
>>>>>>> main
