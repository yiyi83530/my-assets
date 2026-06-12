function toNumberMaybe(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).replaceAll(',', '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

const TPEX_ESB_STATS_URL = 'https://www.tpex.org.tw/openapi/v1/tpex_esb_latest_statistics';

async function fetchTwseQuote(symbol) {
  const code = String(symbol || '').trim();
  if (!code) return null;

  const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${code}.tw&_=${Date.now()}`;
  const res = await fetch(url, {
    next: { revalidate: 30 },
  });

  if (!res.ok) return null;

  const json = await res.json();
  const row = Array.isArray(json.msgArray) ? json.msgArray[0] : null;
  if (!row) return null;

  // z=當盤成交價，若為 '-' 則退回昨收 y
  return toNumberMaybe(row.z) ?? toNumberMaybe(row.y);
}

async function fetchEsbQuote(symbol) {
  const code = String(symbol || '').trim();
  if (!code) return null;

  const res = await fetch(TPEX_ESB_STATS_URL, {
    next: { revalidate: 30 },
  });
  if (!res.ok) return null;

  const json = await res.json();
  if (!Array.isArray(json)) return null;

  const row = json.find((item) => String(item.SecuritiesCompanyCode || '').trim() === code);
  if (!row) return null;

  // 興櫃先取買賣中價，取不到則退回前日均價
  return (
    toNumberMaybe(row.LatestPrice) ??
    toNumberMaybe(row.BuyingPrice) ??
    toNumberMaybe(row.SellingPrice) ??
    toNumberMaybe(row.PreviousAveragePrice)
  );
}

async function fetchUsQuote(symbol) {
  const ticker = String(symbol || '').trim().toUpperCase();
  if (!ticker) return null;

  // 主要來源：Yahoo Finance chart API
  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
    const yahooRes = await fetch(yahooUrl, {
      next: { revalidate: 30 },
    });
    if (yahooRes.ok) {
      const yahooJson = await yahooRes.json();
      const price = yahooJson?.chart?.result?.[0]?.meta?.regularMarketPrice;
      const parsed = toNumberMaybe(price);
      if (parsed !== null) return parsed;
    }
  } catch (error) {
    // Fallback to stooq below.
  }

  // Stooq 簡單 CSV quote，免 API key
  const url = `https://stooq.com/q/l/?s=${ticker.toLowerCase()}.us&i=d`;
  const res = await fetch(url, {
    next: { revalidate: 30 },
  });
  if (!res.ok) return null;

  const csv = await res.text();
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return null;

  const parts = lines[1].split(',');
  // Symbol,Date,Time,Open,High,Low,Close,Volume
  const close = parts[6];
  return toNumberMaybe(close);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') || '').trim();
  const marketRaw = (searchParams.get('market') || 'TWSE').trim().toUpperCase();
  const market = marketRaw === 'US' ? 'US' : 'TWSE';

  if (!symbol) {
    return Response.json({ price: null });
  }

  try {
    let price;
    if (market === 'US') {
      price = await fetchUsQuote(symbol);
    } else {
      price = await fetchTwseQuote(symbol);
      if (price === null) {
        price = await fetchEsbQuote(symbol);
      }
    }

    return Response.json({ price });
  } catch (error) {
    return Response.json({ price: null }, { status: 200 });
  }
}

