import './globals.css';
import RootLayoutClient from './layout-client';

export const metadata = {
  title: '我的小豬存錢筒 - React18 SSR',
  description: '以 Next.js (React 18) + Tailwind 重構的資產管理頁面',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
