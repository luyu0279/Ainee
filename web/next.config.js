/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['markmap-lib', 'markmap-view', 'antd', 'react-pdf'],
  reactStrictMode: true,
  output: "standalone",
  images: {
    unoptimized: true
  },
  webpack: (config, { isServer }) => {
    // 解决 pdfjs-dist 的 canvas 问题
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
      };
    }
    
    // Add canvas to externals to prevent build issues
    if (isServer) {
      config.externals = [...config.externals, 'canvas'];
    }
    
    return config;
  },
}

module.exports = nextConfig 