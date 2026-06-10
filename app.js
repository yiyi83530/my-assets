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
