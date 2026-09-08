import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'node:path';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: 'standalone',
  // Monorepo: để bản standalone gom cả packages/shared
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
