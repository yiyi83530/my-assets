const utils = {
    formatNumber(num) {
        return new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 }).format(num);
    },
    formatCurrency(num) {
        return '$' + this.formatNumber(num);
    },
    showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        const msgEl = document.getElementById('toastMessage');
        const iconEl = document.getElementById('toastIcon');
        
        msgEl.innerText = message;
        toast.classList.remove('translate-y-20', 'opacity-0');
        
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
        }, 3000);
    },
    // 簡單的 API URL 驗證
    isValidUrl: (url) => url.startsWith('https://script.google.com/')
};