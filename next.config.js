const path = require('path');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Covers are plain <img> tags: artwork comes from arbitrary enrichment hosts.
  images: { unoptimized: true },
  headers: async () => [
    {
      // Nothing may be framed except the embed, which exists to be.
      source: '/((?!embed/).*)',
      headers: securityHeaders,
    },
    {
      // frame-ancestors replaces X-Frame-Options here, so DENY is not sent.
      source: '/embed/:path*',
      headers: [
        ...securityHeaders.filter((h) => h.key !== 'X-Frame-Options'),
        { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
      ],
    },
  ],
};

module.exports = nextConfig;
