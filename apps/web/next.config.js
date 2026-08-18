/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@electric-sql/pglite'],
  },
  async redirects() {
    return [
      {
        source: '/index',
        destination: '/records',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
