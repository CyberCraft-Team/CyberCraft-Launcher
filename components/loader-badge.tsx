'use client'

import { LOADER_STYLES, type LoaderType } from '@/lib/launcher-data'
import { Boxes, Hammer, Layers, Sparkles, Gauge, Anvil } from 'lucide-react'

const ICONS: Record<LoaderType, typeof Boxes> = {
  Vanilla: Boxes,
  Forge: Hammer,
  Fabric: Layers,
  NeoForge: Anvil,
  Quilt: Sparkles,
  OptiFine: Gauge,
}

export function LoaderBadge({
  loader,
  size = 'md',
}: {
  loader: LoaderType
  size?: 'sm' | 'md'
}) {
  const s = LOADER_STYLES[loader]
  const Icon = ICONS[loader]
  const isSm = size === 'sm'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${
        isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
      style={{
        color: s.color,
        backgroundColor: s.bg,
        borderColor: s.ring,
      }}
    >
      <Icon className={isSm ? 'size-3' : 'size-3.5'} strokeWidth={2.4} />
      {loader}
    </span>
  )
}
