export default function manifest() {
  return {
    name: '我的小豬存錢筒',
    short_name: '小豬存錢筒',
    description: '管理個人資產與股票投資',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff7f8',
    theme_color: '#f43f5e',
    icons: [
      {
        src: '/icons/piggy-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/piggy-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}
