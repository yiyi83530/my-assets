/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const isStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';

const nextConfig = {
  reactStrictMode: true,
  output: isStaticExport ? 'export' : undefined,
  basePath: isProd ? '/my-assets' : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
