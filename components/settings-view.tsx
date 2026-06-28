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
  ShieldCheck,
  Terminal,
  ToggleRight,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

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
    <section className="rounded-3xl border border-[#263246] bg-[#101822]/92 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.16)]">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10">
          <Icon className="size-5 text-cyan-300" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black text-white">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-[#8ba0b8]">{description}</p>
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
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-[#263246] bg-[#0d1219]/95 p-4 text-left transition hover:border-cyan-300/35"
    >
      <span>
        <span className="block text-sm font-bold text-white">{label}</span>
        <span className="mt-1 block text-xs text-[#8ba0b8]">{desc}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-cyan-300/25' : 'bg-[#263246]'}`}>
        <motion.span
          animate={{ x: checked ? 22 : 3 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={`absolute top-1 size-5 rounded-full ${checked ? 'bg-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.65)]' : 'bg-[#8ba0b8]'}`}
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
    <div className="flex items-center gap-3 rounded-2xl border border-[#263246] bg-[#0d1219]/95 p-4">
      <FolderOpen className="size-5 shrink-0 text-cyan-300" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-white">{label}</div>
        <div className="mt-1 truncate font-mono text-xs text-[#8ba0b8]">{value}</div>
      </div>
      <button 
        onClick={onClick}
        className="rounded-xl border border-[#2b3950] px-3 py-2 text-xs font-bold text-[#dfeaff] transition hover:border-cyan-300/40 cursor-pointer"
      >
        {action}
      </button>
    </div>
  )
}

export function SettingsView() {
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
    const success = await window.electronAPI.saveSettings({ ram, args, optimize, fullscreen, apiBaseUrl, gamePath, modsPath })
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
            <h1 className="text-4xl font-black text-white">
              <span className="text-cyan-300 text-glow">Soz</span>lamalar
            </h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex h-11 items-center gap-2 rounded-2xl px-5 text-sm font-black transition disabled:opacity-70 ${
              saved
                ? 'bg-gradient-to-br from-emerald-300 to-green-500 text-[#071017]'
                : 'bg-gradient-to-br from-cyan-300 to-emerald-300 text-[#071017] shadow-[0_0_24px_rgba(0,240,255,0.28)]'
            }`}
          >
            {saved ? <CheckCircle2 className="size-4" /> : saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saved ? 'Saqlandi' : saving ? 'Saqlanmoqda' : 'Saqlash'}
          </button>
        </div>
      </motion.header>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-thin mt-2">
        <div className="max-w-[700px] mx-auto space-y-5 pb-6">
          <SettingsCard icon={MemoryStick} title="RAM ajratish" description="Minecraft jarayoni uchun ajratiladigan xotira hajmi.">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#8ba0b8]">Launcher tavsiyasi: 6-8 GB</span>
              <span className="font-mono text-2xl font-black text-cyan-300 text-glow">{ram} GB</span>
            </div>
            <div className="relative mt-5">
              <div className="h-3 rounded-full bg-[#1c2738]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 shadow-[0_0_14px_rgba(0,240,255,0.45)]"
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
              <div className="mt-3 flex justify-between font-mono text-[11px] text-[#8ba0b8]">
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
            <div className="rounded-2xl border border-[#263246] bg-[#0d1219]/95 p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-300/10">
                  <ShieldCheck className="size-5 text-emerald-300" />
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-white">
                    {javaInfo ? `Java ${javaInfo.version}` : detectingJava ? 'Aniqlanmoqda...' : 'Java aniqlanmagan'}
                  </div>
                  <div className="truncate text-xs text-[#8ba0b8]">{javaInfo?.vendor || 'Detect tugmasini bosing'}</div>
                </div>
              </div>
              <div className="mt-3 truncate font-mono text-[11px] text-[#8ba0b8]">{javaInfo?.path || 'Path mavjud emas'}</div>
              <button
                onClick={detectJava}
                disabled={detectingJava}
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#2b3950] text-xs font-black text-[#dfeaff] transition hover:border-cyan-300/40 disabled:opacity-70 cursor-pointer"
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
        </div>
      </div>
    </div>
  )
}

function RefreshIcon() {
  return <RotateCcw className="size-4" />
}
