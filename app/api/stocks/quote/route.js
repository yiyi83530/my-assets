function toNumberMaybe(value) {
  if (value === undefined || value === null || value === '' || value === '-') return null;
  const parsed = Number(String(value).replaceAll(',', '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

const TWSE_DAILY_URL = 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL';
const TPEX_DAILY_URL = 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes';
const TPEX_ESB_STATS_URL = 'https://www.tpex.org.tw/openapi/v1/tpex_esb_latest_statistics';

async function fetchRealtimeTwQuote(symbol, exchange) {
  const channel = `${exchange}_${symbol}.tw`;
  try {
    const res = await fetch(
      `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${channel}&_=${Date.now()}`,
      {
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          Referer: 'https://mis.twse.com.tw/stock/fibest.jsp',
          'User-Agent': 'Mozilla/5.0 (compatible; portfolio-quote/1.0)',
        },
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const row = Array.isArray(json.msgArray) ? json.msgArray[0] : null;
    if (!row) return null;

    const traded = toNumberMaybe(row.z);
    const previousClose = toNumberMaybe(row.y);
    if (traded !== null) {
      return { price: traded, status: 'realtime', source: exchange === 'tse' ? 'TWSE' : 'TPEx', asOf: row.tlong || null };
    }
    if (previousClose !== null) {
      return { price: previousClose, status: 'previous_close', source: exchange === 'tse' ? 'TWSE' : 'TPEx', asOf: row.tlong || null };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchDailyClose(symbol, url, exchange) {
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows)) return null;
    const row = rows.find((item) =>
      String(item.Code || item.SecuritiesCompanyCode || '').trim() === symbol
    );
    if (!row) return null;
    const price = toNumberMaybe(row.ClosingPrice ?? row.Close);
    if (price === null) return null;
    return { price, status: 'daily_close', source: exchange, asOf: row.Date || null };
  } catch {
    return null;
  }
}

async function fetchEsbQuote(symbol) {
  try {
    const res = await fetch(TPEX_ESB_STATS_URL, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const rows = await res.json();
    const row = Array.isArray(rows)
      ? rows.find((item) => String(item.SecuritiesCompanyCode || '').trim() === symbol)
      : null;
    if (!row) return null;
    const price = toNumberMaybe(row.LatestPrice) ?? toNumberMaybe(row.BuyingPrice)
      ?? toNumberMaybe(row.SellingPrice) ?? toNumberMaybe(row.PreviousAveragePrice);
    return price === null ? null : { price, status: 'esb_quote', source: 'TPEx ESB', asOf: row.Date || null };
  } catch {
    return null;
  }
}

async function fetchUsQuote(symbol) {
  try {
    const yahooRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
      cache: 'no-store',
    });
    if (yahooRes.ok) {
      const json = await yahooRes.json();
      const result = json?.chart?.result?.[0];
      const price = toNumberMaybe(result?.meta?.regularMarketPrice);
      if (price !== null) {
        return { price, status: 'realtime', source: 'Yahoo Finance', asOf: result?.meta?.regularMarketTime || null };
      }
    }
  } catch {}

  try {
    const res = await fetch(`https://stooq.com/q/l/?s=${symbol.toLowerCase()}.us&i=d`, { cache: 'no-store' });
    if (!res.ok) return null;
    const parts = (await res.text()).trim().split('\n')[1]?.split(',');
    const price = toNumberMaybe(parts?.[6]);
    return price === null ? null : { price, status: 'daily_close', source: 'Stooq', asOf: parts?.[1] || null };
  } catch {
    return null;
  }
}

export async function GET(request) {
  if (process.env.GITHUB_PAGES === 'true') return Response.json({ price: null, status: 'unavailable' });

  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') || '').trim().toUpperCase();
  const isUs = (searchParams.get('market') || 'TWSE').trim().toUpperCase() === 'US';
  if (!symbol) return Response.json({ price: null, status: 'unavailable' });

  let quote = null;
  if (isUs) {
    quote = await fetchUsQuote(symbol);
  } else {
    // 先試即時上市與上櫃，再依序使用兩個市場的官方收盤資料，最後才查興櫃。
    quote = await fetchRealtimeTwQuote(symbol, 'tse')
      || await fetchRealtimeTwQuote(symbol, 'otc')
      || await fetchDailyClose(symbol, TWSE_DAILY_URL, 'TWSE')
      || await fetchDailyClose(symbol, TPEX_DAILY_URL, 'TPEx')
      || await fetchEsbQuote(symbol);
  }

  return Response.json(quote || { price: null, status: 'unavailable', source: null, asOf: null });
}
