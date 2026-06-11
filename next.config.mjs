/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: '/my-assets',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
