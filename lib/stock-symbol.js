export function normalizeStockSymbol(symbol, stock = '', market = 'TWSE') {
  const rawSymbol = String(symbol || '').trim();
  if (String(market || '').toUpperCase() === 'US') return rawSymbol.toUpperCase();

  // Sheets may coerce numeric ETF symbols to numbers; the full label stays text.
  const labelCode = String(stock || '').trim().split(/\s+/)[0] || '';
  if (/^0\d{3,5}[A-Z]?$/.test(labelCode)) {
    const comparableLabel = labelCode.replace(/^0+(?=\d)/, '');
    const comparableSymbol = rawSymbol.replace(/^0+(?=\d)/, '');
    if (!rawSymbol || comparableLabel === comparableSymbol) return labelCode;
  }

  return rawSymbol;
}
