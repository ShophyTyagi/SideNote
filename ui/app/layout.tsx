import type { Metadata } from 'next'
import { Kalam, Comic_Neue } from 'next/font/google'
import './globals.css'

const kalam = Kalam({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['300', '400', '700'],
})

const comicNeue = Comic_Neue({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-ui',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SideNote',
  description: 'RAG-powered document question & answer with citations.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${kalam.variable} ${comicNeue.variable}`}>
      <body>
        <div className="grain-overlay" aria-hidden="true" />
        {children}
      </body>
    </html>
  )
}
