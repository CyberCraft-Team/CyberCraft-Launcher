'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import {
  CheckCircle2,
  Cpu,
  FolderOpen,
  HardDrive,
  Loader2,
  MemoryStick,
  RotateCcw,
  Save,
  Server,
  ShieldCheck,
  Terminal,
  ToggleRight,
  Palette,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { useUiVersion } from '@/lib/ui-version'

const MIN_RAM = 2
const MAX_RAM = 16
const DEFAULT_ARGS = '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200'

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof MemoryStick
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-3">
          <Icon className="size-5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function ToggleRow({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  desc: string
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-lg border border-border bg-surface-2 p-4 text-left transition hover:border-strong"
    >
      <span>
        <span className="block text-sm font-bold text-foreground">{label}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{desc}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-primary/30' : 'bg-surface-3'}`}>
        <motion.span
          animate={{ x: checked ? 22 : 3 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={`absolute top-1 size-5 rounded-full ${checked ? 'bg-primary' : 'bg-subtle-foreground'}`}
        />
      </span>
    </button>
  )
}

function PathRow({
  label,
  value,
  action = 'Tanlash',
  onClick,
}: {
  label: string
  value: string
  action?: string
  onClick?: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-4">
      <FolderOpen className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-foreground">{label}</div>
        <div className="mt-1 truncate font-mono text-xs text-muted-foreground">{value}</div>
      </div>
      <button
        onClick={onClick}
        className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground transition hover:border-strong cursor-pointer"
      >
        {action}
      </button>
    </div>
  )
}

export function SettingsView() {
  const { uiVersion, setUiVersion } = useUiVersion()
  const [ram, setRam] = useState(6)
  const [args, setArgs] = useState(DEFAULT_ARGS)
  const [optimize, setOptimize] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [autoClose, setAutoClose] = useState(true)
  const [apiBaseUrl, setApiBaseUrl] = useState('http://127.0.0.1:8000/api/v1')
  const [gamePath, setGamePath] = useState('')
  const [modsPath, setModsPath] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [maxRam, setMaxRam] = useState(MAX_RAM)
  const [javaInfo, setJavaInfo] = useState<JavaInfo | null>(null)
  const [detectingJava, setDetectingJava] = useState(false)

  useEffect(() => {
    if (!window.electronAPI) return

    Promise.all([
      window.electronAPI.loadSettings(),
      window.electronAPI.getSystemMemory ? window.electronAPI.getSystemMemory() : Promise.resolve(MAX_RAM),
    ]).then(([settings, mem]) => {
      const dynamicMax = mem > MIN_RAM ? mem : MAX_RAM
      setMaxRam(dynamicMax)

      if (settings) {
        setRam(Math.min(settings.ram, dynamicMax))
        setArgs(settings.args || DEFAULT_ARGS)
        setOptimize(settings.optimize)
        setFullscreen(settings.fullscreen)
        setAutoClose(settings.autoClose ?? true)
        setApiBaseUrl(settings.apiBaseUrl || 'http://127.0.0.1:8000/api/v1')
        setGamePath(settings.gamePath || '')
        setModsPath(settings.modsPath || '')
      }
    })

    detectJava()
  }, [])

  async function detectJava() {
    if (!window.electronAPI?.detectJava) return
    setDetectingJava(true)
    try {
      const result = await window.electronAPI.detectJava()
      setJavaInfo(result.best)
    } finally {
      setDetectingJava(false)
    }
  }

  async function handleSelectGamePath() {
    if (!window.electronAPI?.selectDirectory) return
    const path = await window.electronAPI.selectDirectory(gamePath)
    if (path) setGamePath(path)
  }

  async function handleSelectModsPath() {
    if (!window.electronAPI?.selectDirectory) return
    const path = await window.electronAPI.selectDirectory(modsPath)
    if (path) setModsPath(path)
  }

  async function handleSave() {
    if (!window.electronAPI) return

    setSaving(true)
    const success = await window.electronAPI.saveSettings({ ram, args, optimize, fullscreen, autoClose, apiBaseUrl, gamePath, modsPath })
    setSaving(false)
    if (success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  const pct = useMemo(() => ((ram - MIN_RAM) / Math.max(maxRam - MIN_RAM, 1)) * 100, [maxRam, ram])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              <span className="text-primary">Soz</span>lamalar
            </h1>
          </div>
          <motion.button
            onClick={handleSave}
            disabled={saving}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            className={`flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors disabled:opacity-70 ${
              saved
                ? 'bg-primary text-primary-foreground'
                : 'bg-primary text-primary-foreground hover:bg-primary-hover'
            }`}
          >
            {saved ? <CheckCircle2 className="size-4" /> : saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saved ? 'Saqlandi' : saving ? 'Saqlanmoqda' : 'Saqlash'}
          </motion.button>
        </div>
      </motion.header>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-thin mt-2">
        <div className="max-w-[700px] mx-auto space-y-5 pb-6">
          <SettingsCard icon={Palette} title="Dizayn" description="Ikkala ko‘rinish ham to‘liq ishlaydi — bu faqat qaysi biri chizilishini tanlaydi.">
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: 'v1' as const, name: 'Klassik', hint: 'Zumrad, yumaloq burchaklar' },
                { id: 'v2' as const, name: 'Voxel', hint: 'Kislotali yashil, bloklar' },
              ]).map((option) => {
                const active = uiVersion === option.id
                return (
                  <button
                    key={option.id}
                    onClick={() => setUiVersion(option.id)}
                    aria-pressed={active}
                    className={`flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors ${
                      active
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-surface hover:border-strong'
                    }`}
                  >
                    <span className={`text-sm font-semibold ${active ? 'text-primary' : 'text-foreground'}`}>
                      {option.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{option.hint}</span>
                  </button>
                )
              })}
            </div>
          </SettingsCard>

          <SettingsCard icon={MemoryStick} title="RAM ajratish" description="Minecraft jarayoni uchun ajratiladigan xotira hajmi.">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Launcher tavsiyasi: 6-8 GB</span>
              <span className="font-mono text-2xl font-semibold text-foreground">{ram} GB</span>
            </div>
            <div className="relative mt-5">
              <div className="h-3 rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <input
                type="range"
                min={MIN_RAM}
                max={maxRam}
                value={ram}
                onChange={(event) => setRam(Number(event.target.value))}
                className="absolute inset-x-0 top-0 h-3 w-full cursor-pointer opacity-0"
                aria-label="RAM hajmi"
              />
              <div className="mt-3 flex justify-between font-mono text-[11px] text-muted-foreground">
                <span>{MIN_RAM} GB</span>
                <span>{maxRam} GB</span>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard icon={HardDrive} title="Game va mods path" description="Launcher o‘yin fayllari va mod cache joylashuvini shu yerda ko‘rsatadi.">
            <div className="space-y-3">
              <PathRow label="Game path" value={gamePath || 'Tanlanmagan'} onClick={handleSelectGamePath} />
              <PathRow label="Mods cache" value={modsPath || 'Tanlanmagan'} onClick={handleSelectModsPath} />
            </div>
          </SettingsCard>

          <SettingsCard icon={Cpu} title="Java path/version" description="Launcher topgan eng mos Java runtime.">
            <div className="rounded-lg border border-border bg-surface-2 p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-surface-3">
                  <ShieldCheck className="size-5 text-primary" />
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-foreground">
                    {javaInfo ? `Java ${javaInfo.version}` : detectingJava ? 'Aniqlanmoqda...' : 'Java aniqlanmagan'}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{javaInfo?.vendor || 'Detect tugmasini bosing'}</div>
                </div>
              </div>
              <div className="mt-3 truncate font-mono text-[11px] text-muted-foreground">{javaInfo?.path || 'Path mavjud emas'}</div>
              <button
                onClick={detectJava}
                disabled={detectingJava}
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border text-xs font-semibold text-foreground transition hover:border-strong disabled:opacity-70 cursor-pointer"
              >
                {detectingJava ? <Loader2 className="size-4 animate-spin" /> : <RefreshIcon />}
                Qayta aniqlash
              </button>
            </div>
          </SettingsCard>

          <SettingsCard icon={ToggleRight} title="Launcher xatti-harakati" description="O‘yin ochilganda oynaning ishlashini boshqarish.">
            <div className="space-y-3">
              <ToggleRow
                checked={autoClose}
                onChange={setAutoClose}
                label="Launcher auto-close"
                desc="O‘yin ochilganda launcherni avtomatik yopish."
              />
              <ToggleRow
                checked={fullscreen}
                onChange={setFullscreen}
                label="To‘liq ekran"
                desc="Minecraft oynasini fullscreen rejimida ishga tushirish."
              />
              <ToggleRow
                checked={optimize}
                onChange={setOptimize}
                label="Java optimizatsiya"
                desc="Tavsiya etilgan GC flaglar bilan barqaror launch."
              />
            </div>
          </SettingsCard>

          <SettingsCard icon={Server} title="Server manzili" description="Launcher qaysi backend serverga ulanishini belgilaydi.">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-muted-foreground">API base URL</span>
              <input
                value={apiBaseUrl}
                onChange={(event) => setApiBaseUrl(event.target.value)}
                className="h-12 w-full rounded-lg border border-border bg-surface-2 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="http://127.0.0.1:8000/api/v1"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
            </label>
            <p className="mt-2 text-xs text-muted-foreground">O‘zgartirilgach qayta tizimga kirish talab qilinishi mumkin.</p>
          </SettingsCard>
        </div>
      </div>
    </div>
  )
}

function RefreshIcon() {
  return <RotateCcw className="size-4" />
}
