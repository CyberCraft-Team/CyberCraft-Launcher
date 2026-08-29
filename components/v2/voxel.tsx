'use client'

import { memo } from 'react'

/**
 * The brand mark: a real isometric cube built from three transformed
 * faces. A Minecraft launcher's logo should be a block, and a block
 * drawn with actual 3D transforms beats a flat square pretending.
 */
export const VoxelMark = memo(function VoxelMark({ size = 22 }: { size?: number }) {
  const half = size / 2
  return (
    <span
      className="v2-cube"
      style={{
        width: size,
        height: size,
        // The face offsets have to track the cube size, so they are set
        // here rather than hard-coded in CSS.
        ['--half' as string]: `${half}px`,
      }}
      aria-hidden
    >
      <i className="cube-top" style={{ transform: `translateZ(${half}px)` }} />
      <i
        className="cube-side-a"
        style={{ transform: `rotateY(90deg) translateX(${half}px) translateZ(${-half}px)` }}
      />
      <i
        className="cube-side-b"
        style={{ transform: `rotateX(-90deg) translateY(${-half}px) translateZ(${-half}px)` }}
      />
    </span>
  )
})

/** Bracket ticks that mark a panel without boxing it in. */
export function Ticks({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`v2-ticks relative ${className}`}>{children}</div>
}
