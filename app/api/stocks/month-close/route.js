function toNumberMaybe(value) {
  if (value === undefined || value === null || value === '' || value === '-') return null;
  const parsed = Number(String(value).replaceAll(',', '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function getMonthRangeSeconds(monthKey) {
  const match = String(monthKey || '').trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null;
  }

  const start = Math.floor(Date.UTC(year, monthIndex, 1) / 1000);
  const end = Math.floor(Date.UTC(year, monthIndex + 1, 1) / 1000);
  return { start, end };
}

function normalizeMonths(values) {
  return [...new Set(values
    .map((value) => String(value || '').trim())
    .filter((value) => getMonthRangeSeconds(value)))]
    .sort();
}

function getCombinedMonthRangeSeconds(months) {
  if (months.length === 0) return null;
  const first = getMonthRangeSeconds(months[0]);
  const last = getMonthRangeSeconds(months[months.length - 1]);
  return first && last ? { start: first.start, end: last.end } : null;
}

function getYahooSymbols(symbol, isUs) {
  if (isUs) return [symbol];
  return [`${symbol}.TW`, `${symbol}.TWO`];
}

async function fetchYahooMonthCloses(yahooSymbol, months) {
  const range = getCombinedMonthRangeSeconds(months);
  if (!range) return null;

  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const includesCurrentMonth = months.includes(currentMonth);
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${range.start}&period2=${range.end}&interval=1d&events=history`,
      { next: { revalidate: includesCurrentMonth ? 300 : 60 * 60 * 24 * 30 } }
    );
    if (!res.ok) return null;

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
    const closes = Array.isArray(result?.indicators?.quote?.[0]?.close)
      ? result.indicators.quote[0].close
      : [];

    const requestedMonths = new Set(months);
    const prices = {};
    for (let index = 0; index < closes.length; index += 1) {
      const price = toNumberMaybe(closes[index]);
      const timestamp = timestamps[index];
      if (price !== null && timestamp) {
        const asOf = new Date(timestamp * 1000).toISOString().slice(0, 10);
        const monthKey = asOf.slice(0, 7);
        if (!requestedMonths.has(monthKey)) continue;
        prices[monthKey] = {
          price,
          status: 'month_close',
          source: 'Yahoo Finance',
          asOf,
        };
      }
    }
    return Object.keys(prices).length > 0 ? prices : null;
  } catch {}

  return null;
}

export async function GET(request) {
  if (process.env.GITHUB_PAGES === 'true') {
    return Response.json({ price: null, status: 'unavailable', source: null, asOf: null });
  }

  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') || '').trim().toUpperCase();
  const month = (searchParams.get('month') || '').trim();
  const months = normalizeMonths([
    ...String(searchParams.get('months') || '').split(','),
    month,
  ]);
  const isUs = (searchParams.get('market') || 'TWSE').trim().toUpperCase() === 'US';

  if (!symbol || months.length === 0) {
    return Response.json(month
      ? { price: null, status: 'unavailable', source: null, asOf: null }
      : { prices: {} });
  }

  const candidates = getYahooSymbols(symbol, isUs);
  for (const yahooSymbol of candidates) {
    const prices = await fetchYahooMonthCloses(yahooSymbol, months);
    if (prices) {
      if (month && !searchParams.get('months')) {
        const quote = prices[month];
        return Response.json(quote
          ? { ...quote, yahooSymbol }
          : { price: null, status: 'unavailable', source: null, asOf: null });
      }
      return Response.json({ prices, yahooSymbol });
    }
  }

  return Response.json(month && !searchParams.get('months')
    ? { price: null, status: 'unavailable', source: null, asOf: null }
    : { prices: {} });
}
