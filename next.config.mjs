/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        appDir: true,
    },
    images: {
        domains: ['placehold.co', 'lh3.googleusercontent.com'],
    },
}

export default nextConfig;
