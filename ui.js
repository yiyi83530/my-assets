// UI 互動函式：Modal 開關、表格渲染、事件處理

function openTransactionModal() {
    document.getElementById('transactionModal').classList.remove('hidden');
    document.getElementById('txDate').valueAsDate = new Date();
    safeCreateIcons();
}

function closeTransactionModal() {
    document.getElementById('transactionModal').classList.add('hidden');
    document.getElementById('transactionForm').reset();
}

function openManageAccountsModal() {
    renderAccountsForm();
    document.getElementById('manageAccountsModal').classList.remove('hidden');
    safeCreateIcons();
}

function closeManageAccountsModal() {
    document.getElementById('manageAccountsModal').classList.add('hidden');
}

function openConfigModal() {
    document.getElementById('configModal').classList.remove('hidden');
    document.getElementById('scriptCodeArea').value = updatedGASCode;
    safeCreateIcons();
}

function closeConfigModal() {
    document.getElementById('configModal').classList.add('hidden');
}

function closeCustomDialog() {
    document.getElementById('customDialogModal').classList.add('hidden');
}

function switchTab(tabName) {
    document.getElementById('tabContentAssets').classList.toggle('hidden', tabName !== 'assets');
    document.getElementById('tabContentStocks').classList.toggle('hidden', tabName !== 'stocks');
    document.getElementById('tabBtnAssets').classList.toggle('bg-white', tabName === 'assets');
    document.getElementById('tabBtnStocks').classList.toggle('bg-white', tabName === 'stocks');
    document.getElementById('tabBtnAssets').classList.toggle('text-slate-800', tabName === 'assets');
    document.getElementById('tabBtnStocks').classList.toggle('text-slate-800', tabName === 'stocks');
    document.getElementById('tabBtnAssets').classList.toggle('text-slate-500', tabName !== 'assets');
    document.getElementById('tabBtnStocks').classList.toggle('text-slate-500', tabName !== 'stocks');
}

function setTxType(type) {
    document.getElementById('txType').value = type;
    const buyBtn = document.getElementById('btnTypeBuy');
    const sellBtn = document.getElementById('btnTypeSell');
    const divBtn = document.getElementById('btnTypeDividend');
    
    buyBtn.classList.toggle('bg-rose-100 border-rose-500 text-rose-600', type === 'buy');
    buyBtn.classList.toggle('border-slate-200 text-slate-500', type !== 'buy');
    sellBtn.classList.toggle('bg-emerald-100 border-emerald-500 text-emerald-600', type === 'sell');
    sellBtn.classList.toggle('border-slate-200 text-slate-500', type !== 'sell');
    divBtn.classList.toggle('bg-purple-100 border-purple-500 text-purple-600', type === 'dividend');
    divBtn.classList.toggle('border-slate-200 text-slate-500', type !== 'dividend');
    
    updateTransactionLabels();
}

function updateTransactionLabels() {
    const type = document.getElementById('txType').value;
    const labelQty = document.getElementById('labelQty');
    const labelPrice = document.getElementById('labelPrice');
    const labelFinalTotal = document.getElementById('labelFinalTotal');
    
    if (type === 'dividend') {
        labelQty.textContent = '配息金額';
        labelPrice.textContent = '持有股數';
        labelFinalTotal.textContent = '配息總額';
    } else {
        labelQty.textContent = type === 'buy' ? '交易股數' : '賣出股數';
        labelPrice.textContent = '每股單價';
        labelFinalTotal.textContent = type === 'buy' ? '實際預計支出' : '實際預計收入';
    }
}

function calculateEstimates() {
    const qty = parseFloat(document.getElementById('txQty').value) || 0;
    const price = parseFloat(document.getElementById('txPrice').value) || 0;
    const type = document.getElementById('txType').value;
    const rawTotal = qty * price;
    const fees = calculateFees(qty, price, type);
    const finalTotal = type === 'sell' ? rawTotal - fees : rawTotal + fees;
    
    document.getElementById('estRawTotal').textContent = formatCurrency(rawTotal);
    document.getElementById('estFee').textContent = formatCurrency(fees);
    document.getElementById('estFinalTotal').textContent = formatCurrency(finalTotal);
}

function handleTransactionSubmit(event) {
    event.preventDefault();
    const type = document.getElementById('txType').value;
    const date = document.getElementById('txDate').value;
    const stock = document.getElementById('txStock').value;
    const qty = parseInt(document.getElementById('txQty').value);
    const price = parseFloat(document.getElementById('txPrice').value);
    const note = document.getElementById('txNote').value;
    
    const rawTotal = qty * price;
    const fees = calculateFees(qty, price, type);
    const actualAmount = type === 'sell' ? rawTotal - fees : rawTotal + fees;
    
    const transaction = {
        id: generateId(),
        date,
        stock,
        type,
        qty,
        price,
        rawTotal,
        actualAmount,
        note
    };
    
    state.transactions.push(transaction);
    sendCloudAction('addTransaction', transaction);
    closeTransactionModal();
    renderAll();
    showToast('股票交易已記錄！', 'check-circle');
}

function deleteTransaction(id) {
    customConfirm('確認刪除', '確定要刪除此交易紀錄嗎？', () => {
        state.transactions = state.transactions.filter(t => t.id !== id);
        sendCloudAction('deleteTransaction', { id });
        renderAll();
        showToast('交易紀錄已刪除', 'trash-2');
    });
}

function renderAccountsForm() {
    const container = document.getElementById('manageAccountsFormContainer');
    container.innerHTML = '';
    state.assetBalances.forEach((account, idx) => {
        const div = document.createElement('div');
        div.className = 'bg-slate-50 p-4 rounded-xl border border-slate-200';
        div.innerHTML = `
            <div class="grid grid-cols-3 gap-3">
                <input type="text" value="${account.category}" class="account-category bg-white border border-slate-200 rounded px-3 py-2 text-xs" placeholder="分類">
                <input type="text" value="${account.name}" class="account-name bg-white border border-slate-200 rounded px-3 py-2 text-xs" placeholder="帳戶名稱">
                <div class="flex gap-2">
                    <input type="number" value="${account.balance}" class="account-balance flex-1 bg-white border border-slate-200 rounded px-3 py-2 text-xs" placeholder="餘額">
                    <label class="flex items-center">
                        <input type="checkbox" ${account.isLiability ? 'checked' : ''} class="account-liability">
                        <span class="text-xs ml-1 text-slate-500">負債</span>
                    </label>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function addNewAccountRow() {
    const newAccount = {
        id: generateId(),
        category: '新類別',
        name: '新帳戶',
        balance: 0,
        isLiability: false
    };
    state.assetBalances.push(newAccount);
    renderAccountsForm();
}

function saveAllAccountBalances() {
    const rows = document.querySelectorAll('#manageAccountsFormContainer > div');
    const updated = [];
    rows.forEach((row, idx) => {
        const category = row.querySelector('.account-category').value;
        const name = row.querySelector('.account-name').value;
        const balance = parseFloat(row.querySelector('.account-balance').value) || 0;
        const isLiability = row.querySelector('.account-liability').checked;
        
        updated.push({
            ...state.assetBalances[idx],
            category,
            name,
            balance,
            isLiability
        });
    });
    state.assetBalances = updated;
    sendCloudAction('saveAssetBalances', updated);
    closeManageAccountsModal();
    renderAll();
    showToast('資產餘額已儲存！', 'check-circle');
}

function updateLastMonthNetWorth(value) {
    state.lastMonthNetWorth = parseFloat(value) || 0;
    sendCloudAction('saveLastMonthNetWorth', { lastMonthNetWorth: state.lastMonthNetWorth });
    renderAll();
}

function toggleLoading(show, text = "") {
    const loader = document.getElementById('globalLoading');
    const loadText = document.getElementById('loadingText');
    if (show) {
        if (text) loadText.innerText = text;
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

function showToast(message, iconName = 'info') {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = message;
    const iconEl = document.getElementById('toastIcon');
    iconEl.innerHTML = `<i data-lucide="${iconName}" class="w-5 h-5"></i>`;
    toast.classList.remove('translate-y-20', 'opacity-0');
    safeCreateIcons();
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

function customAlert(title, message, callback) {
    const modal = document.getElementById('customDialogModal');
    document.getElementById('dialogTitle').innerText = title;
    document.getElementById('dialogMessage').innerText = message;
    const btnContainer = document.getElementById('dialogButtons');
    window._dialogAlertCallback = () => {
        closeCustomDialog();
        if (callback) callback();
    };
    btnContainer.innerHTML = `
        <button onclick="window._dialogAlertCallback()" class="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-sm transition">
            確定
        </button>
    `;
    safeCreateIcons();
    modal.classList.remove('hidden');
}

function customConfirm(title, message, onConfirm, onCancel) {
    const modal = document.getElementById('customDialogModal');
    document.getElementById('dialogTitle').innerText = title;
    document.getElementById('dialogMessage').innerText = message;
    const btnContainer = document.getElementById('dialogButtons');
    window._dialogConfirmCallback = () => {
        closeCustomDialog();
        if (onConfirm) onConfirm();
    };
    window._dialogCancelCallback = () => {
        closeCustomDialog();
        if (onCancel) onCancel();
    };
    btnContainer.innerHTML = `
        <button onclick="window._dialogCancelCallback()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition">
            取消
        </button>
        <button onclick="window._dialogConfirmCallback()" class="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold shadow-sm transition">
            確定
        </button>
    `;
    safeCreateIcons();
    modal.classList.remove('hidden');
}

function copyScriptCode() {
    const textarea = document.getElementById('scriptCodeArea');
    textarea.select();
    document.execCommand('copy');
    showToast('代碼已複製到剪貼板！', 'clipboard-check');
}

function directSaveConnection() {
    const urlInput = document.getElementById('sheetApiUrl').value.trim();
    if (!urlInput) {
        showToast("請輸入有效 URL", "alert-circle");
        return;
    }
    state.apiUrl = urlInput;
    const encodedUrl = encodeURIComponent(urlInput);
    try {
        window.history.pushState({}, '', `?apiUrl=${encodedUrl}`);
    } catch (e) {
        console.warn('Cannot update URL in current context');
    }
    document.getElementById('demoBanner').classList.add('hidden');
    updateConnectionStatus(true);
    fetchCloudData();
    closeConfigModal();
    customAlert('💾 雲端連線已直接儲存！', '小豬存錢筒已與 Google 試算表金鑰綁定成功！');
}

function updateConnectionStatus(isConnected) {
    const badge = document.getElementById('connectionBadge');
    if (isConnected) {
        badge.className = "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-100 text-rose-700 border border-rose-200";
        badge.innerHTML = `<span class="w-1.5 h-1.5 mr-1 rounded-full bg-rose-500 animate-pulse"></span>雲端已同步 🐷`;
    } else {
        badge.className = "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200";
        badge.innerHTML = `<span class="w-1.5 h-1.5 mr-1 rounded-full bg-amber-500 animate-pulse"></span>單機試用中`;
    }
}