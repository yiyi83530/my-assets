/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  reactStrictMode: true,
  basePath: isGitHubPages ? '/my-assets' : '',
  env: {
    NEXT_PUBLIC_BASE_PATH: isGitHubPages ? '/my-assets' : '',
  },
  output: isGitHubPages ? 'export' : undefined,
  trailingSlash: isGitHubPages,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
