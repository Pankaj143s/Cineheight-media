import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const bebas = localFont({
  src: '../public/fonts/bebas-neue-400.woff2',
  weight: '400',
  variable: '--font-bebas',
  display: 'swap',
  fallback: ['League Gothic', 'Arial Narrow', 'sans-serif'],
  adjustFontFallback: 'Arial',
})

const satoshi = localFont({
  src: [
    { path: '../public/fonts/satoshi-500.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/satoshi-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-satoshi',
  display: 'swap',
})

const poppins = localFont({
  src: [
    { path: '../public/fonts/poppins-400.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/poppins-500.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/poppins-600.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-poppins',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://cineheight.media'),
  title: 'CINEHEIGHT.media — Branding & Digital Growth Agency',
  description:
    'We turn businesses into brands. Strategy, design, content and campaigns built to grow visibility, trust and leads.',
  keywords: ['digital agency', 'branding', 'social media', 'video production', 'content creation', 'brand strategy', 'performance marketing'],
  authors: [{ name: 'Cineheight Media' }],
  creator: 'Cineheight Media',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://cineheight.media',
    siteName: 'CINEHEIGHT.media',
    title: 'CINEHEIGHT.media — We Turn Businesses Into Brands',
    description: 'Strategy, design, content and campaigns built to grow visibility, trust and leads.',
    images: [
      {
        // Real frame from the actual showreel — no generated OG imagery.
        url: '/media/showreel/showreel-poster.webp',
        width: 1600,
        height: 900,
        alt: 'CINEHEIGHT.media — production still from the agency showreel',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CINEHEIGHT.media — We Turn Businesses Into Brands',
    description: 'Strategy, design, content and campaigns built to grow visibility, trust and leads.',
    images: ['/media/showreel/showreel-poster.webp'],
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#020306',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebas.variable} ${satoshi.variable} ${poppins.variable}`}>
      <body>{children}</body>
    </html>
  )
}
