const ui = {
    switchTab(tab) {
        const isAssets = tab === 'assets';
        document.getElementById('tabContentAssets').classList.toggle('hidden', !isAssets);
        document.getElementById('tabContentStocks').classList.toggle('hidden', isAssets);
        
        // 更新按鈕樣式
        const btnAssets = document.getElementById('tabBtnAssets');
        const btnStocks = document.getElementById('tabBtnStocks');
        
        if (isAssets) {
            btnAssets.className = 'flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-lg bg-white text-slate-800 shadow-sm text-center';
            btnStocks.className = 'flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 text-center';
        } else {
            btnStocks.className = 'flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-lg bg-white text-slate-800 shadow-sm text-center';
            btnAssets.className = 'flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 text-center';
        }
    },

    renderAll() {
        this.renderNetWorthCards();
        this.renderAccounts();
        this.renderTransactions();
        lucide.createIcons();
    },

    renderNetWorthCards() {
        const totalAssets = appState.accounts
            .filter(a => a.type !== 'liability')
            .reduce((sum, a) => sum + (a.type === 'foreign' ? a.balance * a.rate : a.balance), 0);
        
        const totalLiabilities = Math.abs(appState.accounts
            .filter(a => a.type === 'liability')
            .reduce((sum, a) => sum + a.balance, 0));

        const netWorth = totalAssets - totalLiabilities;

        document.getElementById('netWorthDisplay').innerText = utils.formatCurrency(netWorth);
        document.getElementById('totalAssetsDisplay').innerText = utils.formatCurrency(totalAssets);
        document.getElementById('totalLiabilitiesDisplay').innerText = utils.formatCurrency(totalLiabilities);
        
        // 計算成長率
        const diff = netWorth - appState.lastMonthNetWorth;
        const percent = ((diff / appState.lastMonthNetWorth) * 100).toFixed(1);
        const growthEl = document.getElementById('netGrowthPercentage');
        growthEl.innerHTML = `${diff >= 0 ? '↑' : '↓'} ${Math.abs(percent)}% <span class="text-[10px] font-normal text-slate-400">vs 上月</span>`;
        growthEl.className = `flex items-center space-x-1 font-bold ${diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`;
    },

    renderAccounts() {
        const ntdList = document.getElementById('ntdSavingsList');
        const ntdAccounts = appState.accounts.filter(a => a.type === 'ntd');
        
        ntdList.innerHTML = ntdAccounts.map(a => `
            <div class="flex justify-between py-2.5 items-center">
                <span class="text-xs font-medium text-slate-600">${a.name}</span>
                <span class="font-mono text-sm font-bold text-slate-800">${utils.formatCurrency(a.balance)}</span>
            </div>
        `).join('');
    },

    renderTransactions() {
        // 這裡實作交易紀錄與股票庫存的渲染...
    },

    openConfigModal() {
        document.getElementById('configModal').classList.remove('hidden');
        document.getElementById('sheetApiUrl').value = appState.config.apiUrl;
    },

    closeConfigModal() {
        document.getElementById('configModal').classList.add('hidden');
    }
};

// 全域 Function 掛載 (讓 HTML onclick 抓得到)
window.switchTab = ui.switchTab;
window.openConfigModal = ui.openConfigModal;
window.closeConfigModal = ui.closeConfigModal;
window.renderAll = ui.renderAll.bind(ui);
window.updateLastMonthNetWorth = (val) => { appState.lastMonthNetWorth = parseFloat(val); saveStateToLocal(); ui.renderNetWorthCards(); };