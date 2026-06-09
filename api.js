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