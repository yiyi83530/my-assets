import { calculateStockPortfolio } from '../lib/calculations.js';
import { calculateEstimatedSellFees, calculatePortfolioValuation } from '../lib/trading-fees.js';

const STOCK = '2330 台積電';

function tx(id, date, recordedAt, type, qty, actualAmount) {
  return { id, date, recordedAt, stock: STOCK, symbol: '2330', market: 'TWSE', type, qty, actualAmount };
}

function snapshot(monthKey, holdingQty, avgCost, effectiveAt = '') {
  return { id: `snapshot_${monthKey}`, monthKey, stock: STOCK, symbol: '2330', market: 'TWSE', holdingQty, avgCost, effectiveAt };
}

function portfolio(transactions = [], snapshots = [], prices = { [STOCK]: 100 }, options = {}) {
  return calculateStockPortfolio(transactions, prices, [], {}, snapshots, options);
}

function assertEqual(actual, expected, message) {
  if (Math.abs(Number(actual) - Number(expected)) > 0.000001) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

// 1. 不記交易：沿用最近快照的股數，但市值每天跟著報價變化；月底新快照直接校正。
const passiveJune = portfolio([], [snapshot('2026-06', 10, 80, '2026-06-30T15:59:59.999Z')], { [STOCK]: 120 });
assertEqual(passiveJune.positions[0].holdingQty, 10, 'Passive snapshot quantity');
assertEqual(passiveJune.currentPortfolioValue, 1200, 'Passive snapshot follows live price');

const passiveJuly = portfolio([], [
  snapshot('2026-06', 10, 80, '2026-06-30T15:59:59.999Z'),
  snapshot('2026-07', 15, 90, '2026-07-31T15:59:59.999Z'),
], { [STOCK]: 120 });
assertEqual(passiveJuly.positions[0].holdingQty, 15, 'New month snapshot corrects quantity');

// 2. 每筆記錄：沒有快照時，完整依買賣紀錄推算數量與移動平均成本。
const diligent = portfolio([
  tx('buy_1', '2026-07-01', '2026-07-01T01:00:00.000Z', 'buy', 10, 1000),
  tx('buy_2', '2026-07-02', '2026-07-02T01:00:00.000Z', 'buy', 5, 600),
  tx('sell_1', '2026-07-03', '2026-07-03T01:00:00.000Z', 'sell', 3, 390),
]);
assertEqual(diligent.positions[0].holdingQty, 12, 'Transactions calculate current quantity');
assertEqual(diligent.positions[0].totalBuyCost, 1280, 'Sell reduces proportional cost basis');

// 3. 忘記月底更新：系統只能沿用舊快照，但仍會套用新價格。
const forgotten = portfolio([], [snapshot('2026-06', 10, 80, '2026-06-30T15:59:59.999Z')], { [STOCK]: 130 });
assertEqual(forgotten.positions[0].holdingQty, 10, 'Forgotten snapshot keeps last known quantity');
assertEqual(forgotten.currentPortfolioValue, 1300, 'Forgotten snapshot still follows price');

// 4. 月中快照：快照以前的交易已包含在基準內，儲存後同月新增交易必須繼續累加。
const midMonth = portfolio([
  tx('before_snapshot', '2026-07-10', '2026-07-10T01:00:00.000Z', 'buy', 10, 900),
  tx('after_snapshot', '2026-07-15', '2026-07-15T06:00:00.000Z', 'buy', 5, 600),
], [snapshot('2026-07', 10, 100, '2026-07-15T02:00:00.000Z')]);
assertEqual(midMonth.positions[0].holdingQty, 15, 'Same-month transaction after snapshot is retained');
assertEqual(midMonth.positions[0].totalBuyCost, 1600, 'Cost continues from snapshot baseline');

// 舊快照沒有 effectiveAt 時維持月底語意，確保既有資料不被重新解讀。
const legacy = portfolio([
  tx('same_month', '2026-07-20', '2026-07-20T01:00:00.000Z', 'buy', 5, 600),
  tx('next_month', '2026-08-01', '2026-08-01T01:00:00.000Z', 'buy', 2, 240),
], [snapshot('2026-07', 10, 100)]);
assertEqual(legacy.positions[0].holdingQty, 12, 'Legacy snapshot keeps month-end behavior');

// 完整股倉快照用 0 股標記已清倉；更早持股不會復活，之後重新買進仍會正常累加。
const reopened = portfolio([
  tx('old_buy', '2026-06-01', '2026-06-01T01:00:00.000Z', 'buy', 10, 1000),
  tx('reopen', '2026-07-16', '2026-07-16T01:00:00.000Z', 'buy', 2, 220),
], [snapshot('2026-07', 0, 0, '2026-07-15T02:00:00.000Z')]);
assertEqual(reopened.positions[0].holdingQty, 2, 'Zero snapshot closes old position and allows later reopening');

// 估值模式只預扣未來賣出費用，不改寫原始市值或持股成本。
const estimatedStockSellFees = calculateEstimatedSellFees({
  market: 'TWSE',
  symbol: '2330',
  stock: STOCK,
  marketValue: 100000,
  settings: { feeDiscount: 0.6, minFee: 20 },
  tradeDate: '2026-07-22',
});
assertEqual(estimatedStockSellFees.commission, 85, 'Estimated commission follows configured discount');
assertEqual(estimatedStockSellFees.tax, 300, 'Estimated stock transaction tax');
assertEqual(estimatedStockSellFees.total, 385, 'Estimated total sell fees');

const grossValuation = calculatePortfolioValuation([
  { market: 'TWSE', symbol: '2330', name: STOCK, marketValue: 100000, fxRate: 1 },
], { valuationMode: 'market_value', TWSE: { feeDiscount: 0.6, minFee: 20 } }, '2026-07-22');
assertEqual(grossValuation.grossValueTwd, 100000, 'Market-value mode keeps gross value');
assertEqual(grossValuation.estimatedSellFeesTwd, 0, 'Market-value mode does not pre-deduct fees');

const netValuation = calculatePortfolioValuation([
  { market: 'TWSE', symbol: '2330', name: STOCK, marketValue: 100000, fxRate: 1 },
], { valuationMode: 'net_liquidation', TWSE: { feeDiscount: 0.6, minFee: 20 } }, '2026-07-22');
assertEqual(netValuation.grossValueTwd - netValuation.estimatedSellFeesTwd, 99615, 'Net-liquidation mode pre-deducts estimated fees');

console.log('Portfolio scenario tests passed');
