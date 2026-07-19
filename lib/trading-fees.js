export const TWSE_COMMISSION_RATE = 0.001425;
export const TWSE_STOCK_TAX_RATE = 0.003;
export const TWSE_ETF_TAX_RATE = 0.001;

function normalizedTwseCode(symbol, stock = '') {
  return String(symbol || String(stock || '').trim().split(/\s+/)[0] || '')
    .trim()
    .toUpperCase();
}

export function isTwseEtfOrEtn(symbol, stock = '') {
  const code = normalizedTwseCode(symbol, stock);
  const name = String(stock || '').toLowerCase();
  return /^00\d{2,4}[a-z]?$/i.test(code)
    || /^02\d{4}$/i.test(code)
    || /etf|etn|指數股票型/.test(name);
}

function isTemporarilyTaxExemptBondEtf(symbol, stock, tradeDate) {
  if (!isTwseEtfOrEtn(symbol, stock)) return false;
  const name = String(stock || '');
  const isBondFund = /債|bond/i.test(name);
  const isLeveragedOrInverse = /正2|反1|槓桿|反向/i.test(name);
  const date = String(tradeDate || new Date().toISOString().slice(0, 10));
  return isBondFund && !isLeveragedOrInverse && date <= '2026-12-31';
}

export function getAutomaticTransactionTaxRate({ market, symbol, stock, tradeDate } = {}) {
  if (String(market || '').toUpperCase() !== 'TWSE') return 0;
  if (isTemporarilyTaxExemptBondEtf(symbol, stock, tradeDate)) return 0;
  if (isTwseEtfOrEtn(symbol, stock)) return TWSE_ETF_TAX_RATE;
  return TWSE_STOCK_TAX_RATE;
}
