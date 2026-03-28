import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const TOTAL = 12

function hslToHex(h: number): string {
  const s = 1, l = 0.55
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function ColorStop({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [shotsLeft, setShotsLeft] = useState(TOTAL)
  const [hue, setHue] = useState(0)
  const [targetHue, setTargetHue] = useState(0)
  const [lastLabel, setLastLabel] = useState('')
  const [particles, setParticles] = useState<ScoreParticleData[]>([])
  const [done, setDone] = useState(false)

  const scoreRef = useRef(0)
  const shotsRef = useRef(TOTAL)
  const hueRef = useRef(0)
  const dirRef = useRef(1)
  const speedRef = useRef(1.5)
  const activeRef = useRef(true)
  const rafRef = useRef(0)

  const targetHueRef = useRef(0)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    cancelAnimationFrame(rafRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('colorStop')
    targetHueRef.current = Math.floor(Math.random() * 360)
    setTargetHue(targetHueRef.current)

    function loop() {
      if (!activeRef.current) return
      hueRef.current = (hueRef.current + dirRef.current * speedRef.current + 360) % 360
      setHue(hueRef.current)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { activeRef.current = false; cancelAnimationFrame(rafRef.current) }
  }, [audio, endGame])

  function stop() {
    if (done || !activeRef.current) return
    const h = hueRef.current
    const t = targetHueRef.current
    let diff = Math.abs(h - t)
    if (diff > 180) diff = 360 - diff

    let pts = 0, label = ''
    if (diff < 10) { pts = 150; label = '🎨 PERFECT!' }
    else if (diff < 25) { pts = 80; label = '✨ GREAT!' }
    else if (diff < 50) { pts = 30; label = '👍 OK' }
    else { pts = 5; label = 'ちがう...' }

    scoreRef.current += pts; setScore(scoreRef.current)
    setLastLabel(label)
    if (pts >= 80) audio.sfxSpecial(); else if (pts >= 30) audio.sfxCatch(); else audio.sfxMiss()

    const pid = Date.now()
    setParticles(q => [...q, { id: pid, x: window.innerWidth / 2, y: window.innerHeight * 0.5, text: pts > 0 ? `+${pts} ${label}` : label, color: pts >= 150 ? '#FFD700' : pts >= 80 ? char.color : '#F87171', big: pts >= 80 }])
    setTimeout(() => setParticles(q => q.filter(x => x.id !== pid)), 900)

    const ns = shotsRef.current - 1
    shotsRef.current = ns; setShotsLeft(ns)
    speedRef.current = Math.min(3.5, speedRef.current + 0.15)
    if (Math.random() > 0.6) dirRef.current = -dirRef.current

    // New target
    targetHueRef.current = Math.floor(Math.random() * 360)
    setTargetHue(targetHueRef.current)

    if (ns <= 0) { setDone(true); setTimeout(() => endGame(), 1200) }
  }

  const currentColor = hslToHex(hue)
  const targetColor = hslToHex(targetHue)

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <div className="absolute top-4 left-0 right-0 flex justify-between items-center px-4 mt-10">
        <div className="font-black text-2xl" style={{ color: '#FFD700' }}>{score}</div>
        <div className="text-sm" style={{ color: 'rgba(255,255,255,.6)' }}>のこり {shotsLeft}かい</div>
      </div>

      <div className="flex flex-col items-center gap-6 mt-16 w-full max-w-sm px-6">
        {lastLabel && <div className="font-black text-xl" style={{ color: lastLabel.includes('PERFECT') ? '#FFD700' : lastLabel.includes('GREAT') ? char.color : lastLabel.includes('OK') ? 'white' : '#F87171' }}>{lastLabel}</div>}

        {/* Target color */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs font-bold" style={{ color: 'rgba(255,255,255,.5)' }}>もくひょうのいろ</div>
          <div className="w-20 h-20 rounded-full border-4 border-white/20" style={{ background: targetColor }} />
        </div>

        {/* Color wheel display */}
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {Array.from({ length: 36 }, (_, i) => {
              const a = (i * 10 * Math.PI) / 180
              const a2 = ((i + 1) * 10 * Math.PI) / 180
              const r = 45
              const x1 = 50 + r * Math.cos(a), y1 = 50 + r * Math.sin(a)
              const x2 = 50 + r * Math.cos(a2), y2 = 50 + r * Math.sin(a2)
              return <path key={i} d={`M 50 50 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`} fill={hslToHex(i * 10)} />
            })}
            {/* Indicator */}
            <line
              x1={50} y1={50}
              x2={50 + 42 * Math.cos((hue * Math.PI) / 180)}
              y2={50 + 42 * Math.sin((hue * Math.PI) / 180)}
              stroke="white" strokeWidth={3} strokeLinecap="round"
            />
            <circle cx={50} cy={50} r={8} fill={currentColor} stroke="white" strokeWidth={2} />
          </svg>
        </div>

        <button
          onPointerDown={e => { e.stopPropagation(); stop() }}
          disabled={done}
          className="px-14 py-5 rounded-full font-black text-2xl text-white"
          style={{ background: done ? 'rgba(255,255,255,.2)' : char.color, boxShadow: done ? 'none' : `0 0 30px ${char.color}`, border: 'none', touchAction: 'none', cursor: done ? 'default' : 'pointer' }}>
          🎨 ストップ！
        </button>
        <div className="text-xs" style={{ color: 'rgba(255,255,255,.4)' }}>もくひょうのいろでとめよう！</div>
      </div>
      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
