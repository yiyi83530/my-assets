// app/api/google-apps-script/route.js
//
// 這個 API route 在伺服器端去抓 GitHub repo 上最新版的 docs/google-apps-script.gs 內容，
// 並回傳給前端的 ConfigModal 顯示／複製。
//
// 這樣設計的原因：
// 1. 避免在瀏覽器端直接打 raw.githubusercontent.com，可能被廣告擋擋套件擋掉，或受 CORS 政策影響
// 2. google-apps-script.gs 永遠只有一份內容（在 repo 裡），不需要再手動同步一份到 constants.jsx
// 3. 用 Next.js 的 fetch cache（revalidate）避免每次打開 Modal 都重新打一次 GitHub

const GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/yiyi83530/my-assets/main/docs/google-apps-script.gs';

// 萬一抓取失敗（GitHub 掛掉、網路問題等），提供一個保底文字，
// 避免 Modal 整個壞掉、使用者完全看不到任何內容
const FALLBACK_MESSAGE = `// 無法自動載入最新版 Apps Script 程式碼。
// 請直接到以下網址查看並複製最新版本：
// https://github.com/yiyi83530/my-assets/blob/main/docs/google-apps-script.gs
`;

export async function GET() {
  try {
    const res = await fetch(GITHUB_RAW_URL, {
      // 1 小時內重複請求會使用快取結果，避免一直打 GitHub
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      throw new Error(`GitHub 回應失敗 (${res.status})`);
    }

    const code = await res.text();

    return Response.json({ ok: true, code });
  } catch (error) {
    console.error('Failed to fetch google-apps-script.gs from GitHub:', error);
    return Response.json(
      { ok: false, code: FALLBACK_MESSAGE, message: String(error) },
      { status: 200 } // 故意回 200，讓前端用 fallback 文字正常顯示，而不是整個報錯
    );
  }
}
