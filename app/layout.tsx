import type { Metadata } from 'next'
import {
  Geist,
  Geist_Mono,
  Press_Start_2P,
  Chakra_Petch,
  JetBrains_Mono,
} from 'next/font/google'
import './globals.css'
import './v2/v2.css'

/*
 * Both visual directions load here because the shell switches between them
 * at runtime from Settings, not by navigating to a different route. v2's
 * tokens are scoped under .v2-root, so importing its sheet globally cannot
 * reach v1.
 */
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

/*
 * Press Start 2P carries the Minecraft read. It is extremely wide and
 * unreadable in paragraphs, so it is restricted to the wordmark, section
 * labels, and single-token values. Chakra Petch does the actual UI work:
 * its clipped corners echo the blocky geometry without costing legibility.
 */
const pixel = Press_Start_2P({
  variable: '--font-pixel',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
})

const chakra = Chakra_Petch({
  variable: '--font-chakra',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const jbMono = JetBrains_Mono({
  variable: '--font-jbmono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CyberCraft',
  description:
    'A premium, animation-rich Minecraft launcher — play, install mod loaders, and tune advanced settings.',
}

export const viewport = {
  themeColor: '#0b1622',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${pixel.variable} ${chakra.variable} ${jbMono.variable}`}
    >
      <body className="bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
