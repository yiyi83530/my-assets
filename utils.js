<<<<<<< HEAD
// 工具函式：格式化、計算、日期處理

function formatCurrency(num) {
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function calculateFees(qty, price, type) {
    const rawTotal = qty * price;
    if (type === 'buy') {
        const handlingFee = rawTotal * 0.001425;
        const tradingTax = 0;
        return Math.round(handlingFee + tradingTax);
    } else if (type === 'sell') {
        const handlingFee = rawTotal * 0.001425;
        const tradingTax = rawTotal * 0.003;
        return Math.round(handlingFee + tradingTax);
    }
    return 0;
}

function getStockHoldings() {
    const holdings = {};
    state.transactions.forEach(tx => {
        if (!holdings[tx.stock]) {
            holdings[tx.stock] = { qty: 0, totalCost: 0 };
        }
        if (tx.type === 'buy') {
            holdings[tx.stock].qty += tx.qty;
            holdings[tx.stock].totalCost += tx.actualAmount;
        } else if (tx.type === 'sell') {
            holdings[tx.stock].qty -= tx.qty;
            holdings[tx.stock].totalCost -= (tx.qty * (tx.actualAmount / tx.qty));
        }
    });
    return holdings;
}

function getCurrentYear() {
    return new Date().getFullYear().toString();
}

function getYearFromDate(dateStr) {
    return dateStr.split('-')[0];
}

function filterTransactionsByYear(txList, year) {
    if (year === 'All') return txList;
    return txList.filter(tx => getYearFromDate(tx.date) === year);
}

function safeCreateIcons() {
    try {
        if (window.lucide) window.lucide.createIcons();
    } catch (e) {
        console.warn('Icon creation failed:', e);
    }
}
=======
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
>>>>>>> main
