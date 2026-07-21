function toNumberMaybe(value) {
  if (value === undefined || value === null || value === '' || value === '-') return null;
  const parsed = Number(String(value).replaceAll(',', '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function getLimitStatus(price, upperLimit, lowerLimit) {
  if (price === null) return null;
  if (upperLimit !== null && Math.abs(price - upperLimit) < 0.000001) return 'limit_up';
  if (lowerLimit !== null && Math.abs(price - lowerLimit) < 0.000001) return 'limit_down';
  return null;
}

const TWSE_DAILY_URL = 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL';
const TPEX_DAILY_URL = 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes';
const TPEX_ESB_STATS_URL = 'https://www.tpex.org.tw/openapi/v1/tpex_esb_latest_statistics';

function getTaipeiDateTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

function getTwTradedPriceStatus(asOf, now = new Date()) {
  const current = getTaipeiDateTime(now);
  const minutes = Number(current.hour) * 60 + Number(current.minute);
  const isWeekday = !['Sat', 'Sun'].includes(current.weekday);
  const isTradingHours = minutes >= 9 * 60 && minutes <= 13 * 60 + 30;

  // MIS keeps the final traded price in `z` after the market closes. Only call it
  // realtime when both the server clock and the quote timestamp are in today's
  // regular session; otherwise it is the latest completed-session price.
  const timestamp = Number(asOf);
  const quoted = Number.isFinite(timestamp) ? getTaipeiDateTime(new Date(timestamp)) : null;
  const isToday = quoted
    && quoted.year === current.year
    && quoted.month === current.month
    && quoted.day === current.day;

  return isWeekday && isTradingHours && isToday ? 'realtime' : 'daily_close';
}

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
    const opening = toNumberMaybe(row.o);
    const previousClose = toNumberMaybe(row.y);
    const upperLimit = toNumberMaybe(row.u);
    const lowerLimit = toNumberMaybe(row.w);
    if (traded !== null) {
      return { price: traded, previousClose, status: getTwTradedPriceStatus(row.tlong), limitStatus: getLimitStatus(traded, upperLimit, lowerLimit), source: exchange === 'tse' ? 'TWSE' : 'TPEx', asOf: row.tlong || null };
    }
    if (opening !== null) {
      return { price: opening, previousClose, status: 'opening_price', limitStatus: getLimitStatus(opening, upperLimit, lowerLimit), source: exchange === 'tse' ? 'TWSE' : 'TPEx', asOf: row.tlong || null };
    }
    if (previousClose !== null) {
      return { price: previousClose, previousClose, status: 'previous_close', limitStatus: getLimitStatus(previousClose, upperLimit, lowerLimit), source: exchange === 'tse' ? 'TWSE' : 'TPEx', asOf: row.tlong || null };
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
    const change = toNumberMaybe(row.Change);
    const previousClose = change === null ? null : price - change;
    return { price, previousClose, status: 'daily_close', source: exchange, asOf: row.Date || null };
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
    const previousClose = toNumberMaybe(row.PreviousClose ?? row.PreviousAveragePrice);
    return price === null ? null : { price, previousClose, status: 'esb_quote', source: 'TPEx ESB', asOf: row.Date || null };
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
        const marketState = String(result?.meta?.marketState || '').toUpperCase();
        const previousClose = toNumberMaybe(result?.meta?.chartPreviousClose ?? result?.meta?.previousClose);
        return {
          price,
          previousClose,
          status: marketState === 'REGULAR' ? 'realtime' : 'latest_price',
          source: 'Yahoo Finance',
          asOf: result?.meta?.regularMarketTime || null,
        };
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

async function firstAvailableQuote(requests) {
  try {
    return await Promise.any(
      requests.map((request) => request.then((quote) => {
        if (quote) return quote;
        throw new Error('quote_unavailable');
      }))
    );
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
    // 即時上市、上櫃與興櫃並行查詢，避免興櫃股票等待其他市場依序逾時。
    // 官方日收盤資料只在前三者都沒有報價時使用，以維持盤中即時價的優先級。
    quote = await firstAvailableQuote([
      fetchRealtimeTwQuote(symbol, 'tse'),
      fetchRealtimeTwQuote(symbol, 'otc'),
      fetchEsbQuote(symbol),
    ]);
    if (!quote) {
      quote = await firstAvailableQuote([
        fetchDailyClose(symbol, TWSE_DAILY_URL, 'TWSE'),
        fetchDailyClose(symbol, TPEX_DAILY_URL, 'TPEx'),
      ]);
    }
  }

  return Response.json(quote || { price: null, status: 'unavailable', source: null, asOf: null });
}
