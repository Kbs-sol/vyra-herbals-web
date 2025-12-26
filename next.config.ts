import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vyraherbals.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Styled components configuration
  compiler: {
    styledComponents: true,
  },
  
  // Caching and compression headers
  async headers() {
    return [
      // Cache static assets for 1 year
      {
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache fonts for 1 year
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Compression for HTML/CSS/JS
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  
  // Optimize bundle size
  webpack: (config, { isServer }) => {
    if (!isServer && config.optimization && config.optimization.splitChunks) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        // Separate vendor chunks
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        // Common chunks used across pages
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      };
    }
    return config;
  },
  
  // ESLint configuration
  eslint: {
    // Allow build to succeed even with ESLint warnings
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
