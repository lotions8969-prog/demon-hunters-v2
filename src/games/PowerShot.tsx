import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const TOTAL = 15
const TARGET_MIN = 0.35
const TARGET_MAX = 0.65

export function PowerShot({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [shotsLeft, setShotsLeft] = useState(TOTAL)
  const [power, setPower] = useState(0)
  const [lastLabel, setLastLabel] = useState('')
  const [particles, setParticles] = useState<ScoreParticleData[]>([])
  const [done, setDone] = useState(false)
  const [_holding, _setHolding] = useState(false)
  const [targetMin] = useState(TARGET_MIN)
  const [targetMax] = useState(TARGET_MAX)

  const scoreRef = useRef(0)
  const shotsRef = useRef(TOTAL)
  const powerRef = useRef(0)
  const dirRef = useRef(1)
  const speedRef = useRef(0.018)
  const rafRef = useRef(0)
  const activeRef = useRef(true)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    cancelAnimationFrame(rafRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('powerShot')
    function loop() {
      if (!activeRef.current) return
      powerRef.current += dirRef.current * speedRef.current
      if (powerRef.current >= 1) { powerRef.current = 1; dirRef.current = -1 }
      if (powerRef.current <= 0) { powerRef.current = 0; dirRef.current = 1 }
      setPower(powerRef.current)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { activeRef.current = false; cancelAnimationFrame(rafRef.current) }
  }, [audio, endGame])

  function shoot() {
    if (done || !activeRef.current) return
    const p = powerRef.current
    let pts = 0, label = ''
    const dist = Math.abs(p - 0.5)
    if (dist < 0.05) { pts = 150; label = '💥 PERFECT!' }
    else if (p >= targetMin && p <= targetMax) { pts = 80; label = '⚡ GREAT!' }
    else if (dist < 0.25) { pts = 30; label = '👍 OK' }
    else { pts = 5; label = 'ミス...' }

    scoreRef.current += pts; setScore(scoreRef.current)
    setLastLabel(label)
    if (pts >= 80) audio.sfxSpecial(); else if (pts >= 30) audio.sfxCatch(); else audio.sfxMiss()

    const pid = Date.now()
    setParticles(q => [...q, { id: pid, x: window.innerWidth / 2, y: window.innerHeight * 0.55, text: pts > 0 ? `+${pts} ${label}` : label, color: pts >= 150 ? '#FFD700' : pts >= 80 ? char.color : '#F87171', big: pts >= 80 }])
    setTimeout(() => setParticles(q => q.filter(x => x.id !== pid)), 900)

    const ns = shotsRef.current - 1
    shotsRef.current = ns; setShotsLeft(ns)
    speedRef.current = Math.min(0.04, speedRef.current + 0.002)

    if (ns <= 0) { setDone(true); setTimeout(() => endGame(), 1200) }
  }

  const pct = power * 100
  const inZone = power >= targetMin && power <= targetMax
  const tMin = targetMin * 100
  const tMax = targetMax * 100

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <div className="absolute top-4 left-0 right-0 flex justify-between items-center px-4 mt-10">
        <div className="font-black text-2xl" style={{ color: '#FFD700' }}>{score}</div>
        <div className="text-sm" style={{ color: 'rgba(255,255,255,.6)' }}>のこり {shotsLeft}かい</div>
      </div>
      <div className="flex flex-col items-center gap-6 mt-16 w-full max-w-sm px-6">
        {lastLabel && <div className="font-black text-xl" style={{ color: lastLabel.includes('PERFECT') ? '#FFD700' : lastLabel.includes('GREAT') ? char.color : lastLabel.includes('OK') ? 'white' : '#F87171' }}>{lastLabel}</div>}
        {/* Power meter */}
        <div className="relative w-full h-12 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.1)', border: `2px solid ${char.color}44` }}>
          {/* Target zone */}
          <div className="absolute top-0 bottom-0" style={{ left: `${tMin}%`, width: `${tMax - tMin}%`, background: '#4ADE8055' }} />
          {/* Perfect zone */}
          <div className="absolute top-0 bottom-0" style={{ left: '47.5%', width: '5%', background: '#FFD70088' }} />
          {/* Power indicator */}
          <div className="absolute top-1 bottom-1 w-8 rounded-full transition-none"
            style={{ left: `calc(${pct}% - 16px)`, background: inZone ? '#4ADE80' : char.color, boxShadow: `0 0 16px ${inZone ? '#4ADE80' : char.color}` }} />
        </div>
        <div className="flex justify-between w-full text-xs" style={{ color: 'rgba(255,255,255,.4)' }}>
          <span>弱</span>
          <span style={{ color: '#4ADE80' }}>ZONE</span>
          <span>強</span>
        </div>
        <div className="w-full rounded-full overflow-hidden h-3" style={{ background: 'rgba(255,255,255,.1)' }}>
          <div className="h-full rounded-full" style={{ width: `${(1 - shotsLeft / TOTAL) * 100}%`, background: char.color }} />
        </div>
        <button
          onPointerDown={e => { e.stopPropagation(); shoot() }}
          disabled={done}
          className="px-14 py-5 rounded-full font-black text-2xl text-white"
          style={{ background: done ? 'rgba(255,255,255,.2)' : char.color, boxShadow: done ? 'none' : `0 0 30px ${char.color}`, border: 'none', touchAction: 'none', cursor: done ? 'default' : 'pointer' }}>
          🔫 シュート！
        </button>
        <div className="text-xs" style={{ color: 'rgba(255,255,255,.4)' }}>みどりのゾーンでとめよう！まんなかで PERFECT！</div>
      </div>
      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
