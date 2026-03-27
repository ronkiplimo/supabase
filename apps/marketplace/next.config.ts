import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['ui', 'ui-patterns', 'common', 'shared-data', 'icons', 'tsconfig'],
}

export default nextConfig
