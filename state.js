// 初始預設資料 (供單機模式使用)
const DEFAULT_DATA = {
    accounts: [
        { id: 1, name: '國泰世華 (薪轉)', type: 'ntd', balance: 150000 },
        { id: 2, name: '台新 Richart', type: 'ntd', balance: 300000 },
        { id: 3, name: '玉山銀行 (USD)', type: 'foreign', balance: 5000, currency: 'USD', rate: 32.1 },
        { id: 4, name: '中信信用卡', type: 'liability', balance: -15000 }
    ],
    transactions: [
        { id: Date.now(), date: '2025-01-10', stock: '2330 台積電', type: 'buy', qty: 1000, price: 600, fee: 855, total: 600855, note: '初始建倉' }
    ]
};

// 全域狀態
window.appState = {
    config: {
        apiUrl: localStorage.getItem('piggy_api_url') || ''
    },
    accounts: JSON.parse(localStorage.getItem('piggy_accounts')) || DEFAULT_DATA.accounts,
    transactions: JSON.parse(localStorage.getItem('piggy_transactions')) || DEFAULT_DATA.transactions,
    lastMonthNetWorth: parseFloat(localStorage.getItem('piggy_last_month')) || 950000
};

function saveStateToLocal() {
    localStorage.setItem('piggy_accounts', JSON.stringify(appState.accounts));
    localStorage.setItem('piggy_transactions', JSON.stringify(appState.transactions));
    localStorage.setItem('piggy_last_month', appState.lastMonthNetWorth.toString());
}