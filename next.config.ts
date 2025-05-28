import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    allowedDevOrigins: ['https://ddev.yuxuanize.com'],
    /* config options here */ eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
