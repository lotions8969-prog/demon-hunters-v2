import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const TOTAL_ROUNDS = 20
const TARGET_ARC = 0.25 // 25% of circle = target zone

export function SpinTarget({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [roundsLeft, setRoundsLeft] = useState(TOTAL_ROUNDS)
  const [angle, setAngle] = useState(0)
  const [particles, setParticles] = useState<ScoreParticleData[]>([])
  const [lastLabel, setLastLabel] = useState('')
  const [done, setDone] = useState(false)
  const [targetStart, setTargetStart] = useState(Math.PI * 0.5)
  const [_speed, setSpeed] = useState(0.03)

  const scoreRef = useRef(0)
  const roundsRef = useRef(TOTAL_ROUNDS)
  const angleRef = useRef(0)
  const targetStartRef = useRef(Math.PI * 0.5)
  const speedRef = useRef(0.03)
  const dirRef = useRef(1)
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
    audio.start('spinTarget')
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); tap() } }
    window.addEventListener('keydown', onKey)
    function loop() {
      if (!activeRef.current) return
      angleRef.current = (angleRef.current + speedRef.current * dirRef.current + Math.PI * 2) % (Math.PI * 2)
      setAngle(angleRef.current)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { activeRef.current = false; cancelAnimationFrame(rafRef.current); window.removeEventListener('keydown', onKey) }
  }, [audio, endGame])

  function tap() {
    if (done || !activeRef.current) return
    const a = angleRef.current
    const ts = targetStartRef.current
    const te = (ts + TARGET_ARC * Math.PI * 2) % (Math.PI * 2)
    // Check if angle is within target zone
    let inZone: boolean
    if (ts < te) {
      inZone = a >= ts && a <= te
    } else {
      inZone = a >= ts || a <= te
    }

    const dist = (() => {
      const mid = (ts + TARGET_ARC * Math.PI) % (Math.PI * 2)
      let d = Math.abs(a - mid)
      if (d > Math.PI) d = Math.PI * 2 - d
      return d
    })()

    let pts = 0, label = ''
    if (dist < TARGET_ARC * Math.PI * 0.3) { pts = 100; label = '🎯 PERFECT!' }
    else if (inZone) { pts = 50; label = '✨ GOOD!' }
    else { pts = 0; label = '❌ はずれ' }

    scoreRef.current += pts
    setScore(scoreRef.current)
    setLastLabel(label)
    if (pts > 0) { audio.sfxPerfect() } else audio.sfxMiss()

    const pid = Date.now()
    setParticles(p => [...p, { id: pid, x: window.innerWidth / 2, y: window.innerHeight * 0.4, text: pts > 0 ? `+${pts}` : label, color: pts >= 100 ? '#FFD700' : pts > 0 ? char.color : '#F87171', big: pts >= 100 }])
    setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 800)

    const nr = roundsRef.current - 1
    roundsRef.current = nr
    setRoundsLeft(nr)
    // New target position
    targetStartRef.current = Math.random() * Math.PI * 2
    setTargetStart(targetStartRef.current)
    // Increase speed and maybe flip direction
    speedRef.current = Math.min(0.08, speedRef.current + 0.003)
    setSpeed(speedRef.current)
    if (Math.random() > 0.7) dirRef.current = -dirRef.current

    if (nr <= 0) { setDone(true); setTimeout(() => endGame(), 1200) }
  }

  const R = 110
  const ts = targetStart, te = (ts + TARGET_ARC * Math.PI * 2)

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={roundsLeft} urgent={roundsLeft <= 5} />
      <div className="mt-14 flex flex-col items-center gap-4">
        {lastLabel && <div className="font-black text-xl" style={{ color: lastLabel.includes('PERFECT') ? '#FFD700' : lastLabel.includes('GOOD') ? char.color : '#F87171' }}>{lastLabel}</div>}
        <svg width={R * 2 + 40} height={R * 2 + 40} style={{ overflow: 'visible' }}>
          <circle cx={R + 20} cy={R + 20} r={R} fill="rgba(255,255,255,.05)" stroke={`${char.color}33`} strokeWidth={3} />
          {/* Target zone */}
          <path
            d={`M ${R + 20 + R * Math.cos(ts)} ${R + 20 + R * Math.sin(ts)} A ${R} ${R} 0 ${TARGET_ARC > 0.5 ? 1 : 0} 1 ${R + 20 + R * Math.cos(te)} ${R + 20 + R * Math.sin(te)}`}
            fill="none" stroke="#4ADE80" strokeWidth={20} strokeLinecap="round" opacity={0.7}
          />
          {/* Spinning arrow */}
          <line
            x1={R + 20} y1={R + 20}
            x2={R + 20 + (R - 10) * Math.cos(angle)} y2={R + 20 + (R - 10) * Math.sin(angle)}
            stroke="white" strokeWidth={4} strokeLinecap="round"
          />
          <circle cx={R + 20} cy={R + 20} r={8} fill={char.color} />
        </svg>
        <button
          onPointerDown={e => { e.stopPropagation(); tap() }}
          disabled={done}
          className="px-12 py-5 rounded-full font-black text-2xl text-white"
          style={{ background: done ? 'rgba(255,255,255,.2)' : char.color, boxShadow: done ? 'none' : `0 0 30px ${char.color}`, border: 'none', touchAction: 'none', cursor: done ? 'default' : 'pointer' }}>
          🎯 ストップ！
        </button>
        <div className="text-xs" style={{ color: 'rgba(255,255,255,.4)' }}>クリック or スペースキーで止める！</div>
      </div>
      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
