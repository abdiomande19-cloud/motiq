import type { Metadata, Viewport } from 'next'
import Link from 'next/link'

import './globals.css'

export const metadata: Metadata = {
  title: 'Motiq — création de vidéos motion design',
  description:
    'Motiq transforme une idée, des images ou une note vocale en vidéo motion design prête à publier. LAB 04 — Phase 2 (socle).',
  applicationName: 'Motiq',
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b0f14',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="dark">
      <body>
        <header className="bandeau">
          <Link href="/" className="marque">
            Motiq
          </Link>
          <nav className="bandeau-liens">
            <Link href="/ecrans">Les 13 écrans</Link>
            <Link href="/etat">État du socle</Link>
          </nav>
        </header>
        <main className="contenu">{children}</main>
        <footer className="pied">
          Motiq — LAB 04 HACKTUALIZ | ACADEMY-CÔTE D&apos;IVOIRE · Phase 2, socle en construction
        </footer>
      </body>
    </html>
  )
}
