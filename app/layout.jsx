import './globals.css';
import RootLayoutClient from './layout-client';

export const metadata = {
  title: '我的小豬存錢筒 - React18 SSR',
  description: '以 Next.js (React 18) + Tailwind 重構的資產管理頁面',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🐷</text></svg>',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
