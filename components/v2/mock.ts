/**
 * Sample data for the v2 visual preview. The route renders without a
 * backend, so these stand in for the real API payloads. Shapes match the
 * LauncherServer / LauncherUser globals so v2 can be wired to the real
 * IPC layer unchanged if it wins the comparison.
 */

export type V2Server = {
  id: string
  name: string
  server_type: string
  minecraft_version: string
  loader: string
  status: 'online' | 'offline' | 'starting'
  current_players: number
  max_players: number
  ping: number
  description: string
  whitelist_enabled: boolean
}

export const V2_SERVERS: V2Server[] = [
  {
    id: 'obsidian',
    name: 'OBSIDIAN VALLEY',
    server_type: 'Survival',
    minecraft_version: '1.21.4',
    loader: 'Fabric',
    status: 'online',
    current_players: 847,
    max_players: 1200,
    ping: 23,
    description:
      "Uzun muddatli survival dunyosi. Yer uchastkalari himoyalangan, iqtisodiyot o'yinchilar qo'lida.",
    whitelist_enabled: true,
  },
  {
    id: 'neon-drift',
    name: 'NEON DRIFT',
    server_type: 'PvP Arena',
    minecraft_version: '1.21.1',
    loader: 'NeoForge',
    status: 'online',
    current_players: 312,
    max_players: 500,
    ping: 41,
    description: "Tezkor janglar, har 8 daqiqada yangi raund. Reyting bo'yicha juftlashtirish.",
    whitelist_enabled: false,
  },
  {
    id: 'skyforge',
    name: 'SKYFORGE',
    server_type: 'OneBlock',
    minecraft_version: '1.20.4',
    loader: 'Quilt',
    status: 'starting',
    current_players: 0,
    max_players: 300,
    ping: 68,
    description: "Bitta blokdan butun orol quring. Har bosqichda yangi resurslar ochiladi.",
    whitelist_enabled: false,
  },
  {
    id: 'deepcore',
    name: 'DEEPCORE',
    server_type: 'Modded',
    minecraft_version: '1.20.1',
    loader: 'Forge',
    status: 'offline',
    current_players: 0,
    max_players: 250,
    ping: -1,
    description: "218 ta mod bilan sanoat modpaki. Texnik o'yin uchun.",
    whitelist_enabled: true,
  },
]

export const V2_USER = {
  username: 'lxz_404',
  rank: 'Operator',
  cc_balance: 4820,
}

export const V2_MANIFEST = {
  version: '2.4.1',
  mods: 218,
  resourcepacks: 6,
  shaders: 3,
}
