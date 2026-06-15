export function formatMoney(num) {
  return `$${Math.round(Number(num) || 0).toLocaleString('zh-TW')}`;
}

