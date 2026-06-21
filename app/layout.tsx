import type { Metadata } from 'next'
import { Geist, Geist_Mono, Audiowide } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})
const audiowide = Audiowide({
  variable: '--font-audiowide',
  subsets: ['latin'],
  weight: '400',
})

export const metadata: Metadata = {
  title: 'CyberCraft Launcher',
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
      className={`dark ${geistSans.variable} ${geistMono.variable} ${audiowide.variable}`}
    >
      <body className="bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
