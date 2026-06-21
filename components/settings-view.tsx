'use client'

import { motion } from 'framer-motion'
import { Cpu, MemoryStick, Save, Terminal, RotateCcw, RadioTower } from 'lucide-react'
import { useEffect, useState } from 'react'

const MIN_RAM = 2
const MAX_RAM = 16

function CyberToggle({
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
      className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 text-left transition-all"
      style={{
        background: '#12121a',
        border: `1px solid ${checked ? 'rgba(0,240,255,0.3)' : '#1a1a2e'}`,
        boxShadow: checked ? '0 0 16px rgba(0,240,255,0.08)' : 'none',
      }}
    >
      <span className="flex flex-col">
        <span className="text-sm font-medium" style={{ color: '#ffffff' }}>{label}</span>
        <span className="text-xs" style={{ color: '#8888aa' }}>{desc}</span>
      </span>
      {/* Toggle track */}
      <span
        className="relative h-6 w-11 shrink-0 rounded-full transition-all duration-300"
        style={{
          background: checked
            ? 'linear-gradient(135deg, #00f0ff, #00a8b3)'
            : '#1a1a2e',
          boxShadow: checked ? '0 0 10px rgba(0,240,255,0.4)' : 'none',
        }}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-0.5 size-5 rounded-full"
          style={{
            left: checked ? 22 : 2,
            background: checked ? '#0a0a0f' : '#8888aa',
          }}
        />
      </span>
    </button>
  )
}

export function SettingsView() {
  const [ram, setRam] = useState(6)
  const [args, setArgs] = useState('-XX:+UseZGC -XX:+ZGenerational -XX:MaxGCPauseMillis=10 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch')
  const [optimize, setOptimize] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [apiBaseUrl, setApiBaseUrl] = useState('http://127.0.0.1:8000/api/v1')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [maxRam, setMaxRam] = useState(MAX_RAM)

  useEffect(() => {
    if (window.electronAPI) {
      Promise.all([
        window.electronAPI.loadSettings(),
        window.electronAPI.getSystemMemory ? window.electronAPI.getSystemMemory() : Promise.resolve(MAX_RAM)
      ]).then(([settings, mem]) => {
        const dynamicMax = mem > MIN_RAM ? mem : MAX_RAM
        setMaxRam(dynamicMax)
        
        if (settings) {
          setRam(Math.min(settings.ram, dynamicMax))
          setArgs(settings.args || '')
          setOptimize(settings.optimize)
          setFullscreen(settings.fullscreen)
          setApiBaseUrl(settings.apiBaseUrl || 'http://127.0.0.1:8000/api/v1')
        }
      })
    }
  }, [])

  const handleSave = async () => {
    if (window.electronAPI) {
      setSaving(true)
      const success = await window.electronAPI.saveSettings({ ram, args, optimize, fullscreen, apiBaseUrl })
      setSaving(false)
      if (success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    }
  }

  const pct = ((ram - MIN_RAM) / (maxRam - MIN_RAM)) * 100

  const sectionStyle = {
    background: '#12121a',
    border: '1px solid #1a1a2e',
    borderRadius: '1rem',
    padding: '1.25rem',
  }

  return (
    <div className="scrollbar-thin flex h-full flex-col overflow-y-auto pr-1">
      {/* Header */}
      <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.25em]" style={{ color: 'rgba(0,240,255,0.7)' }}>
          Ilg'or
        </span>
        <h1 className="font-display text-3xl md:text-4xl" style={{ color: '#ffffff', fontWeight: 900 }}>
          <span style={{ color: '#00f0ff', textShadow: '0 0 16px rgba(0,240,255,0.7)' }}>Soz</span>
          <span>lamalar</span>
        </h1>
        <p className="text-sm" style={{ color: '#8888aa' }}>
          Java ishlashini va parametrlarini sozlang.
        </p>
      </motion.header>

      {/* RAM section */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-6 flex flex-col gap-5"
        style={sectionStyle}
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#00f0ff' }}>
            <MemoryStick className="size-4" /> RAM Hajmi
          </span>
          <motion.span
            key={ram}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="font-mono text-xl font-bold"
            style={{ color: '#00f0ff', textShadow: '0 0 12px rgba(0,240,255,0.6)' }}
          >
            {ram} GB
          </motion.span>
        </div>

        <div className="relative pt-1">
          <div className="relative h-2 w-full rounded-full" style={{ background: '#1a1a2e' }}>
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-200"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #00a8b3, #00f0ff)',
                boxShadow: '0 0 8px rgba(0,240,255,0.5)',
              }}
            />
            <div
              className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
              style={{
                left: `${pct}%`,
                borderColor: '#00f0ff',
                background: '#0a0a0f',
                boxShadow: '0 0 12px rgba(0,240,255,0.8)',
              }}
            />
          </div>
          <input
            type="range"
            min={MIN_RAM}
            max={maxRam}
            value={ram}
            onChange={(e) => setRam(Number(e.target.value))}
            className="absolute inset-x-0 top-1 h-2 w-full cursor-pointer opacity-0"
            aria-label="RAM hajmi (GB)"
          />
          <div className="mt-2 flex justify-between font-mono text-[11px]" style={{ color: '#8888aa' }}>
            <span>{MIN_RAM} GB</span>
            <span>{maxRam} GB</span>
          </div>
        </div>
      </motion.section>

      {/* Java args */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-4 flex flex-col gap-3"
        style={sectionStyle}
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#00f0ff' }}>
            <Terminal className="size-4" /> Java Argumentlari
          </span>
          <button
            onClick={() => setArgs('-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200')}
            className="flex items-center gap-1 text-xs transition-all"
            style={{ color: '#8888aa' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#00f0ff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#8888aa' }}
          >
            <RotateCcw className="size-3" /> Asl holatga qaytarish
          </button>
        </div>
        <textarea
          value={args}
          onChange={(e) => setArgs(e.target.value)}
          rows={4}
          spellCheck={false}
          className="w-full resize-none rounded-xl p-3 font-mono text-sm outline-none transition-all"
          style={{
            background: '#0d0d14',
            border: '1px solid #1a1a2e',
            color: '#00f0ff',
          }}
          placeholder="-Xmx... custom JVM flags"
          onFocus={e => {
            e.target.style.borderColor = '#00f0ff'
            e.target.style.boxShadow = '0 0 0 2px rgba(0,240,255,0.1)'
          }}
          onBlur={e => {
            e.target.style.borderColor = '#1a1a2e'
            e.target.style.boxShadow = 'none'
          }}
        />
        <p className="flex items-center gap-1.5 text-xs" style={{ color: '#8888aa' }}>
          <Cpu className="size-3.5" /> Faqat tajribali foydalanuvchilar uchun — noto&apos;g&apos;ri
          argumentlar o&apos;yinning ishga tushishiga to&apos;sqinlik qilishi mumkin.
        </p>
      </motion.section>

      {/* API URL */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="mt-4 flex flex-col gap-3"
        style={sectionStyle}
      >
        <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#ff0060' }}>
          <RadioTower className="size-4" /> Backend API
        </span>
        <input
          value={apiBaseUrl}
          onChange={(e) => setApiBaseUrl(e.target.value)}
          spellCheck={false}
          className="w-full rounded-xl px-3 py-2.5 font-mono text-sm outline-none transition-all"
          style={{
            background: '#0d0d14',
            border: '1px solid #1a1a2e',
            color: '#00f0ff',
          }}
          placeholder="http://127.0.0.1:8000/api/v1"
          onFocus={e => {
            e.target.style.borderColor = '#ff0060'
            e.target.style.boxShadow = '0 0 0 2px rgba(255,0,96,0.12)'
          }}
          onBlur={e => {
            e.target.style.borderColor = '#1a1a2e'
            e.target.style.boxShadow = 'none'
          }}
        />
        <p className="text-xs" style={{ color: '#8888aa' }}>
          Login, server ro&apos;yxati, manifest sinxronizatsiyasi va launcher sessiyalari ushbu so&apos;nggi nuqtadan foydalanadi.
        </p>
      </motion.section>

      {/* Toggles */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-4 grid gap-3"
      >
        <CyberToggle
          checked={optimize}
          onChange={setOptimize}
          label="Java ishlashini optimallashtirish"
          desc="Sozlangan GC bilan tezroq va barqarorroq ishga tushirish."
        />
        <CyberToggle
          checked={fullscreen}
          onChange={setFullscreen}
          label="To'liq ekran rejimi"
          desc="O'yinni to'liq ekranda ishga tushirish."
        />
      </motion.div>

      {/* Save button */}
      <div className="mt-6 flex justify-end pb-2">
        <motion.button
          whileHover={!saving ? { scale: 1.03 } : {}}
          whileTap={!saving ? { scale: 0.97 } : {}}
          onClick={handleSave}
          disabled={saving}
          className="relative flex items-center gap-2 overflow-hidden rounded-xl px-6 py-2.5 text-sm font-bold disabled:opacity-70 disabled:cursor-not-allowed transition-all"
          style={{
            background: saved
              ? 'linear-gradient(135deg, #00ff88, #00cc66)'
              : 'linear-gradient(135deg, #00f0ff, #00a8b3)',
            color: '#0a0a0f',
            boxShadow: saved
              ? '0 0 24px rgba(0,255,136,0.4)'
              : '0 0 20px rgba(0,240,255,0.35)',
          }}
        >
          {/* Shine sweep */}
          <span
            className="pointer-events-none absolute inset-y-0 -left-full w-full"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
              animation: 'shine 2s ease infinite',
            }}
          />
          {saved ? (
            <span className="flex items-center gap-2 relative">
              <span className="size-2 rounded-full" style={{ background: '#0a0a0f', boxShadow: '0 0 6px #0a0a0f' }} />
              Sozlamalar saqlandi!
            </span>
          ) : (
            <>
              <Save className="size-4 relative" />
              <span className="relative">{saving ? 'Saqlanmoqda...' : 'Sozlamalarni saqlash'}</span>
            </>
          )}
        </motion.button>
      </div>
    </div>
  )
}
