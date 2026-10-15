/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Motiq vise une PWA installable (cahier des charges 6.1 point 11).
  // Les en-tetes de securite de base sont poses ici, pas dans les ecrans.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
