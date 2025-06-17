import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  trailingSlash: false,
  poweredByHeader: false,
  compress: true,
  
  // Configure styled-components for SSR
  compiler: {
    styledComponents: true,
  },
  
  // Optimize bundle size
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  
  // Environment variables that should be available on client-side
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
};

export default nextConfig;
