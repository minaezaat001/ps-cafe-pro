import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Dev origins ──────────────────────────────────────────
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.1.4', '192.168.1.6'],

  // ── Performance optimizations ────────────────────────────
  compress: true, // Enable gzip/brotli compression

  // Tree-shake large icon/component libraries — only import what's used
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts', 'date-fns'],
  },
};

export default nextConfig;
