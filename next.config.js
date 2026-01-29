const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      // Primary sources - most reliable
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'static.wikia.nocookie.net',
      },
      // Secondary sources - reliable media
      {
        protocol: 'https',
        hostname: 'cdn.britannica.com',
      },
      {
        protocol: 'https',
        hostname: 'media.d3.nhle.com',
      },
      {
        protocol: 'https',
        hostname: 'files.eliteprospects.com',
      },
      // WordPress-hosted images
      {
        protocol: 'https',
        hostname: 'i0.wp.com',
      },
      {
        protocol: 'https',
        hostname: 'i1.wp.com',
      },
      {
        protocol: 'https',
        hostname: 'i2.wp.com',
      },
    ],
  },
  // PWA Configuration for offline-first architecture
  headers: async () => [
    {
      // Service Worker header for PWA
      source: '/sw.js',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=0, must-revalidate',
        },
        {
          key: 'Service-Worker-Allowed',
          value: '/',
        },
      ],
    },
    {
      // Manifest file
      source: '/manifest.json',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],
};

module.exports = nextConfig;
