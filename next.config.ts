import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.1.4', '192.168.1.6'], // Allowing local IPs for development
};

export default nextConfig;
