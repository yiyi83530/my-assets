<<<<<<< HEAD
// 全域狀態：整合資產與負債 🐷
let state = {
    transactions: [],
    stockMarketPrices: {},
    assetBalances: [
        { id: 'a1', category: '台幣活存', name: '台新 Richart', balance: 150000, isLiability: false },
        { id: 'a2', category: '台幣活存', name: 'Line Bank', balance: 85000, isLiability: false },
        { id: 'a3', category: '台幣活存', name: '國泰世華', balance: 35000, isLiability: false },
        { id: 'a4', category: '外幣活存', name: '玉山銀行 (USD 3,200)', balance: 104000, isLiability: false },
        { id: 'a5', category: '外幣活存', name: '中信銀行 (JPY 150,000)', balance: 31000, isLiability: false },
        { id: 'a6', category: '員工持股信託', name: '公司提撥信託基金', balance: 120000, isLiability: false },
        { id: 'a7', category: '負債項目', name: '台新信用卡帳單', balance: 15800, isLiability: true },
        { id: 'a8', category: '負債項目', name: '低利信用貸款', balance: 320000, isLiability: true }
    ],
    lastMonthNetWorth: 950000,
    apiUrl: ""
};

const demoTransactions = [
    { id: 't1', date: '2026-03-02', stock: '2330 台積電', type: 'buy', qty: 1000, price: 820, rawTotal: 820000, actualAmount: 821168, note: '建倉台積電' },
    { id: 't2', date: '2026-03-15', stock: '0050 元大台灣50', type: 'buy', qty: 2000, price: 155, rawTotal: 310000, actualAmount: 310441, note: '定期定額大盤' },
    { id: 't3', date: '2026-05-20', stock: 'AAPL Apple', type: 'buy', qty: 50, price: 180, rawTotal: 9000, actualAmount: 9000, note: '美股建倉 AAPL' },
    { id: 't4', date: '2026-06-02', stock: '2330 台積電', type: 'sell', qty: 300, price: 880, rawTotal: 264000, actualAmount: 262816, note: '波段停利一部分' }
];

const demoPrices = {
    '2330 台積電': 890,
    '0050 元大台灣50': 162,
    'AAPL Apple': 188
};

const INITIAL_CAPITAL = 1000000;
=======
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
>>>>>>> main
