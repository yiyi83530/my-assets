const TWSE_STOCK_ALL_URL = 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL';
const TPEX_ESB_STATS_URL = 'https://www.tpex.org.tw/openapi/v1/tpex_esb_latest_statistics';
const SEC_TICKER_URL = 'https://www.sec.gov/files/company_tickers.json';

let stockCache = {
  updatedAt: 0,
  items: [],
};

let usStockCache = {
  updatedAt: 0,
  items: [],
};

function toNumberMaybe(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).replaceAll(',', '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeItem(raw) {
  const symbol = String(raw.Code || raw.code || '').trim();
  const name = String(raw.Name || raw.name || '').trim();
  if (!symbol || !name) return null;

  return {
    symbol,
    name,
    market: 'TWSE',
    closePrice: toNumberMaybe(raw.ClosingPrice || raw.Close || raw.close),
  };
}

function normalizeEsbItem(raw) {
  const symbol = String(raw.SecuritiesCompanyCode || raw.Code || '').trim();
  const name = String(raw.CompanyName || raw.Name || '').trim();
  if (!symbol || !name) return null;

  return {
    symbol,
    name,
    market: 'ESB',
    closePrice: toNumberMaybe(raw.ClosingPrice || raw.Close || raw.PreviousAveragePrice),
  }
}

async function loadStockList() {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (stockCache.items.length > 0 && now - stockCache.updatedAt < oneDayMs) {
    return stockCache.items;
  }

  const res = await fetch(TWSE_STOCK_ALL_URL, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error('Unable to fetch TWSE stock list');
  }

  const json = await res.json();
  const twseItems = Array.isArray(json)
    ? json.map(normalizeItem).filter(Boolean)
    : [];

  // 興櫃清單與前日均價
  let esbItems = [];
  try {
    const esbRes = await fetch(TPEX_ESB_STATS_URL, {
      next: { revalidate: 3600 },
    });
    if (esbRes.ok) {
      const esbJson = await esbRes.json();
      esbItems = Array.isArray(esbJson)
        ? esbJson.map(normalizeEsbItem).filter(Boolean)
        : [];
    }
  } catch (error) {
    // ESB source is best-effort; keep TWSE results available.
  }

  // 同代號優先保留上市/上櫃，再補興櫃
  const merged = [...twseItems];
  const seen = new Set(twseItems.map((item) => item.symbol));
  for (const item of esbItems) {
    if (!seen.has(item.symbol)) {
      merged.push(item);
      seen.add(item.symbol);
    }
  }

  stockCache = {
    updatedAt: now,
    items: merged,
  };

  return merged;
}

async function loadUsStockList() {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (usStockCache.items.length > 0 && now - usStockCache.updatedAt < oneDayMs) {
    return usStockCache.items;
  }

  const res = await fetch(SEC_TICKER_URL, {
    next: { revalidate: 3600 },
    headers: {
      // SEC API 建議帶 UA，避免被拒絕。
      'User-Agent': 'my-assets-my-assets/1.0 (stock-search)',
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error('Unable to fetch US stock list');
  }

  const json = await res.json();
  const items = Object.values(json || {})
    .map((row) => {
      const symbol = String(row.ticker || '').trim().toUpperCase();
      const name = String(row.title || '').trim();
      if (!symbol || !name) return null;
      return {
        symbol,
        name,
        market: 'US',
        closePrice: null,
      };
    })
    .filter(Boolean);

  usStockCache = {
    updatedAt: now,
    items,
  };

  return items;
}

function filterStocks(items, query, limit) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);

  const exactCode = [];
  const codePrefix = [];
  const tokenMatch = [];
  const nameIncludes = [];

  for (const item of items) {
    const code = item.symbol.toLowerCase();
    const name = item.name.toLowerCase();

    if (code === q) {
      exactCode.push(item);
    } else if (code.startsWith(q)) {
      codePrefix.push(item);
    } else if (tokens.length > 1) {
      const haystack = `${code} ${name}`;
      const hitAll = tokens.every((token) => haystack.includes(token));
      if (hitAll) tokenMatch.push(item);
    } else if (name.includes(q)) {
      nameIncludes.push(item);
    }

    if (exactCode.length + codePrefix.length + nameIncludes.length >= limit * 2) {
      // Avoid scanning the entire list when enough matches are found.
      continue;
    }
  }

  return [...exactCode, ...codePrefix, ...tokenMatch, ...nameIncludes].slice(0, limit);
}

export async function GET(request) {
  if (process.env.GITHUB_PAGES === 'true') {
    return Response.json({ items: [] });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const marketRaw = (searchParams.get('market') || 'TWSE').trim().toUpperCase();
  const market = marketRaw === 'US' ? 'US' : 'TWSE';
  const limitParam = Number(searchParams.get('limit') || '10');
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 20)
    : 10;

  if (!q) {
    return Response.json({ items: [] });
  }

  try {
    const allStocks = market === 'US' ? await loadUsStockList() : await loadStockList();
    const matched = filterStocks(allStocks, q, limit);

    return Response.json({
      items: matched.map((item) => ({
        ...item,
        display: `${item.symbol} ${item.name}`,
      })),
    });
  } catch (error) {
    return Response.json(
      {
        items: [],
        error: 'stock_api_unavailable',
      },
      { status: 200 }
    );
  }
}

