const BANKS = [
  '台新銀行 Richart',
  '台新銀行',
  '國泰世華銀行',
  '中國信託商業銀行',
  '玉山商業銀行',
  '台北富邦銀行',
  '兆豐國際商業銀行',
  '第一商業銀行',
  '合作金庫商業銀行',
  '臺灣銀行',
  '彰化商業銀行',
  '華南商業銀行',
  '上海商業儲蓄銀行',
  '永豐商業銀行',
  '元大商業銀行',
  '遠東國際商業銀行',
  '王道商業銀行',
  '將來銀行',
  '連線商業銀行 LINE Bank',
  '樂天國際商業銀行',
  '新光銀行',
  '陽信商業銀行',
  '京城商業銀行',
  '高雄銀行',
  '瑞興銀行',
  '凱基商業銀行',
  '星展銀行',
  '滙豐銀行',
  '渣打銀行',
  '花旗銀行',
];

function searchBanks(keyword, limit) {
  const q = keyword.trim().toLowerCase();
  if (!q) return [];

  const exact = [];
  const startsWith = [];
  const includes = [];

  for (const name of BANKS) {
    const low = name.toLowerCase();
    if (low === q) {
      exact.push(name);
    } else if (low.startsWith(q)) {
      startsWith.push(name);
    } else if (low.includes(q)) {
      includes.push(name);
    }
  }

  return [...exact, ...startsWith, ...includes].slice(0, limit);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const limitParam = Number(searchParams.get('limit') || '8');
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 20)
    : 8;

  return Response.json({ items: searchBanks(q, limit) });
}

