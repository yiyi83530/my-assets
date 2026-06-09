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