import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Disable static optimization for auth-protected pages
  trailingSlash: false,
  poweredByHeader: false,
  compress: true,
  // Enable SWC minification
  swcMinify: true,
  // Configure styled-components for SSR
  compiler: {
    styledComponents: true,
  },
  // Environment variables that should be available on client-side
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
};

export default nextConfig;
