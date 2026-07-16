/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  serverExternalPackages: ['typeorm', 'mysql2', 'bcryptjs', 'reflect-metadata'],
  // Keep entity class names so TypeORM metadata resolves in production
  experimental: {
    serverMinification: false,
  },
};

module.exports = nextConfig;
