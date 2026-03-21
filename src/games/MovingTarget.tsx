import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const TOTAL_ROUNDS = 20
const PERFECT_ZONE = 0.12 // ±12% from center = perfect
const GOOD_ZONE = 0.25    // ±25% from center = good

export function MovingTarget({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [roundsLeft, setRoundsLeft] = useState(TOTAL_ROUNDS)
  const [meterPos, setMeterPos] = useState(0) // 0 to 1
  const [particles, setParticles] = useState<ScoreParticleData[]>([])
  const [lastLabel, setLastLabel] = useState('')
  const [done, setDone] = useState(false)

  const scoreRef = useRef(0)
  const roundsRef = useRef(TOTAL_ROUNDS)
  const meterRef = useRef(0)
  const dirRef = useRef(1)
  const speedRef = useRef(0.012)
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
    audio.start()
    function loop() {
      if (!activeRef.current) return
      meterRef.current += dirRef.current * speedRef.current
      if (meterRef.current >= 1) { meterRef.current = 1; dirRef.current = -1 }
      if (meterRef.current <= 0) { meterRef.current = 0; dirRef.current = 1 }
      setMeterPos(meterRef.current)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { activeRef.current = false; cancelAnimationFrame(rafRef.current) }
  }, [audio, endGame])

  const tapMeter = useCallback(() => {
    if (done || !activeRef.current) return
    const pos = meterRef.current
    const dist = Math.abs(pos - 0.5)
    let pts = 10
    let label = 'OK'
    let color = 'rgba(255,255,255,0.7)'

    if (dist < PERFECT_ZONE) {
      pts = 100
      label = '🎯 PERFECT!'
      color = '#FFD700'
      audio.sfxPerfect()
    } else if (dist < GOOD_ZONE) {
      pts = 50
      label = '✨ GOOD!'
      color = char.color
      audio.sfxRhythm()
    } else {
      pts = 10
      label = 'OK'
      audio.sfxCatch()
    }

    scoreRef.current += pts
    setScore(scoreRef.current)
    setLastLabel(label)

    const pid = Date.now() + Math.random()
    setParticles(p => [...p, { id: pid, x: window.innerWidth / 2, y: window.innerHeight * 0.55, text: `+${pts} ${label}`, color, big: pts >= 50 }])
    setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 800)

    const newRounds = roundsRef.current - 1
    roundsRef.current = newRounds
    setRoundsLeft(newRounds)

    // speed up slightly
    speedRef.current = Math.min(0.03, speedRef.current + 0.001)

    if (newRounds <= 0) {
      setDone(true)
      setTimeout(() => endGame(), 1200)
    }
  }, [audio, char.color, done, endGame])

  const meterPct = meterPos * 100
  const perfectLeft = (0.5 - PERFECT_ZONE) * 100
  const perfectWidth = PERFECT_ZONE * 2 * 100
  const goodLeft = (0.5 - GOOD_ZONE) * 100
  const goodWidth = GOOD_ZONE * 2 * 100

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col items-center justify-center" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />

      <div className="absolute top-4 left-0 right-0 flex justify-center gap-8 mt-2">
        <div className="text-center">
          <div className="text-white font-black text-3xl">{score.toLocaleString()}</div>
          <div style={{ color: char.color }} className="text-xs">スコア</div>
        </div>
        <div className="text-center">
          <div className="text-white font-black text-3xl">{roundsLeft}</div>
          <div style={{ color: char.color }} className="text-xs">のこり</div>
        </div>
      </div>

      {lastLabel && (
        <div className="font-black text-2xl mb-4" style={{ color: lastLabel.includes('PERFECT') ? '#FFD700' : lastLabel.includes('GOOD') ? char.color : 'white' }}>
          {lastLabel}
        </div>
      )}

      {/* Meter */}
      <div className="relative w-4/5 max-w-sm mb-8" style={{ touchAction: 'none' }}>
        {/* Track */}
        <div className="relative h-10 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)', border: `2px solid ${char.color}44` }}>
          {/* Good zone */}
          <div className="absolute top-0 bottom-0" style={{ left: `${goodLeft}%`, width: `${goodWidth}%`, background: `${char.color}44` }} />
          {/* Perfect zone */}
          <div className="absolute top-0 bottom-0" style={{ left: `${perfectLeft}%`, width: `${perfectWidth}%`, background: '#FFD70066' }} />
          {/* Marker */}
          <div
            className="absolute top-1 bottom-1 w-6 rounded-full"
            style={{
              left: `calc(${meterPct}% - 12px)`,
              background: 'white',
              boxShadow: '0 0 16px white',
              transition: 'none',
            }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <span>← 端</span>
          <span style={{ color: '#FFD700' }}>PERFECT</span>
          <span>端 →</span>
        </div>
      </div>

      <button
        onPointerDown={e => { e.stopPropagation(); tapMeter() }}
        disabled={done}
        className="px-12 py-5 rounded-full font-black text-2xl text-white cursor-pointer"
        style={{
          background: done ? 'rgba(255,255,255,0.2)' : char.color,
          boxShadow: done ? 'none' : `0 0 30px ${char.color}`,
          border: 'none',
          touchAction: 'none',
        }}
      >
        🎯 タップ！
      </button>

      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
