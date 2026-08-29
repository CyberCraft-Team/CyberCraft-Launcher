import type { Metadata } from 'next'
import { Press_Start_2P, Chakra_Petch, JetBrains_Mono } from 'next/font/google'
import './v2.css'

/*
 * v2 loads its own type stack so the shipped v1 layout stays untouched.
 *
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
  title: 'CyberCraft v2',
  description: 'Voxel and cyberpunk visual direction for the CyberCraft launcher.',
}

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${pixel.variable} ${chakra.variable} ${jbMono.variable}`}>
      {children}
    </div>
  )
}
