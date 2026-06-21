export type LoaderType =
  | 'Vanilla'
  | 'Forge'
  | 'Fabric'
  | 'NeoForge'
  | 'Quilt'
  | 'OptiFine'

export interface GameVersion {
  id: string
  version: string
  loader: LoaderType
  loaderVersion?: string
  releaseType: 'release' | 'snapshot'
}

export interface ModLoader {
  id: LoaderType
  name: string
  tagline: string
  latest: string
  accent: string // oklch color used for glow/badge
}

export const LOADER_STYLES: Record<
  LoaderType,
  { color: string; bg: string; ring: string }
> = {
  Vanilla: {
    color: '#ccbb44',
    bg: 'rgba(200,180,50,0.12)',
    ring: 'rgba(200,180,50,0.35)',
  },
  Forge: {
    color: '#ff8844',
    bg: 'rgba(255,136,68,0.12)',
    ring: 'rgba(255,136,68,0.35)',
  },
  Fabric: {
    color: '#aacc44',
    bg: 'rgba(170,200,68,0.12)',
    ring: 'rgba(170,200,68,0.35)',
  },
  NeoForge: {
    color: '#7777ff',
    bg: 'rgba(119,119,255,0.12)',
    ring: 'rgba(119,119,255,0.35)',
  },
  Quilt: {
    color: '#cc44ff',
    bg: 'rgba(204,68,255,0.12)',
    ring: 'rgba(204,68,255,0.35)',
  },
  OptiFine: {
    color: '#00f0ff',
    bg: 'rgba(0,240,255,0.12)',
    ring: 'rgba(0,240,255,0.35)',
  },
}

export const GAME_VERSIONS: GameVersion[] = [
  {
    id: 'v1',
    version: '1.21.4',
    loader: 'Fabric',
    loaderVersion: '0.16.9',
    releaseType: 'release',
  },
  {
    id: 'v2',
    version: '1.21.1',
    loader: 'Forge',
    loaderVersion: '52.0.16',
    releaseType: 'release',
  },
  {
    id: 'v3',
    version: '1.21.1',
    loader: 'NeoForge',
    loaderVersion: '21.1.90',
    releaseType: 'release',
  },
  {
    id: 'v4',
    version: '1.20.1',
    loader: 'Quilt',
    loaderVersion: '0.27.1',
    releaseType: 'release',
  },
  {
    id: 'v5',
    version: '1.20.4',
    loader: 'OptiFine',
    loaderVersion: 'HD U I7',
    releaseType: 'release',
  },
  {
    id: 'v6',
    version: '1.21.4',
    loader: 'Vanilla',
    releaseType: 'release',
  },
  {
    id: 'v7',
    version: '25w03a',
    loader: 'Vanilla',
    releaseType: 'snapshot',
  },
]

export const MOD_LOADERS: ModLoader[] = [
  {
    id: 'NeoForge',
    name: 'NeoForge',
    tagline: 'Modern Forge-family loader for newer modpacks.',
    latest: '21.1.90',
    accent: LOADER_STYLES.NeoForge.color,
  },
  {
    id: 'Forge',
    name: 'Forge',
    tagline: 'The classic, most-supported mod loader.',
    latest: '52.0.16',
    accent: LOADER_STYLES.Forge.color,
  },
  {
    id: 'Fabric',
    name: 'Fabric',
    tagline: 'Lightweight, fast, and modern.',
    latest: '0.16.9',
    accent: LOADER_STYLES.Fabric.color,
  },
  {
    id: 'Quilt',
    name: 'Quilt',
    tagline: 'Community-driven Fabric fork.',
    latest: '0.27.1',
    accent: LOADER_STYLES.Quilt.color,
  },
  {
    id: 'OptiFine',
    name: 'OptiFine',
    tagline: 'Performance boosts and shader support.',
    latest: 'HD U I7',
    accent: LOADER_STYLES.OptiFine.color,
  },
]
