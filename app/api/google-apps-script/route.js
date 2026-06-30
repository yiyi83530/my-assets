import fs from 'fs';
import path from 'path';

// app/api/google-apps-script/route.js
//
// 這個 API route 優先讀取本機最新版的 docs/google-apps-script.gs 內容，
// 若失敗則去抓 GitHub repo 上的內容，並回傳給前端的 ConfigModal 顯示／複製。
//
// 這樣設計的原因：
// 1. 優先讀取本地檔案，確保本地開發時能即時反應修改，不需要先 push 到 GitHub。
// 2. 避免在瀏覽器端直接打 raw.githubusercontent.com，可能被廣告擋擋套件擋掉，或受 CORS 政策影響。
// 3. 用 Next.js 的 fetch cache（revalidate）作為 GitHub 備援抓取時的快取。

const GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/yiyi83530/my-assets/main/docs/google-apps-script.gs';

// 萬一抓取失敗（GitHub 掛掉、網路問題等），提供一個保底文字，
// 避免 Modal 整個壞掉、使用者完全看不到任何內容
const FALLBACK_MESSAGE = `// 無法自動載入最新版 Apps Script 程式碼。
// 請直接到以下網址查看並複製最新版本：
// https://github.com/yiyi83530/my-assets/blob/main/docs/google-apps-script.gs
`;

export async function GET() {
  // 1. 優先嘗試讀取本地檔案
  try {
    const filePath = path.join(process.cwd(), 'docs', 'google-apps-script.gs');
    if (fs.existsSync(filePath)) {
      const code = fs.readFileSync(filePath, 'utf8');
      return Response.json({ ok: true, code });
    }
  } catch (fsError) {
    console.warn('Failed to read local google-apps-script.gs, falling back to GitHub:', fsError);
  }

  // 2. 本地讀取失敗時，退回到從 GitHub 抓取
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
