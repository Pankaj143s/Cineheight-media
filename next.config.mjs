/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    qualities: [35, 38, 75],
    formats: ['image/avif', 'image/webp'],
  },
}

export default nextConfig
