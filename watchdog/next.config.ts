/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // 모든 외부 사이트의 HTTPS 이미지 허용
      },
      {
        protocol: 'http',
        hostname: '**', // 모든 외부 사이트의 HTTP 이미지 허용
      },
    ],
  },
};

export default nextConfig;