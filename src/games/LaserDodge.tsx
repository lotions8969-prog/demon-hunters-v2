import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'

interface Laser { id: number; y: number; active: boolean; warn: boolean; warnAt: number; fireAt: number; duration: number }
interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

export function LaserDodge({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [lasers, setLasers] = useState<Laser[]>([])
  const [playerY, setPlayerY] = useState(0.5)
  const [hit, setHit] = useState(false)
  const [particles] = useState<ScoreParticleData[]>([])

  const scoreRef = useRef(0)
  const timeRef = useRef(60)
  const lasersRef = useRef<Laser[]>([])
  const playerYRef = useRef(0.5)
  const nextId = useRef(0)
  const activeRef = useRef(true)
  const rafRef = useRef(0)
  const timerRef = useRef(0)
  const spawnRef = useRef(0)
  const hitRef = useRef(false)
  const scoreTickRef = useRef(0)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    cancelAnimationFrame(rafRef.current); clearInterval(timerRef.current); clearTimeout(spawnRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('laserDodge')
    const H = window.innerHeight

    function loop() {
      if (!activeRef.current) return
      const now = Date.now()
      // Check laser hits
      lasersRef.current = lasersRef.current.map(l => {
        const active = now >= l.fireAt && now < l.fireAt + l.duration
        const warn = now >= l.warnAt && now < l.fireAt
        const laserYFrac = l.y / H
        const dist = Math.abs(playerYRef.current - laserYFrac)
        if (active && dist < 0.07 && !hitRef.current) {
          hitRef.current = true
          setHit(true)
          audio.sfxMiss()
          scoreRef.current = Math.max(0, scoreRef.current - 30)
          setScore(scoreRef.current)
          setTimeout(() => { hitRef.current = false; setHit(false) }, 500)
        }
        return { ...l, active, warn }
      })
      // Remove expired lasers
      lasersRef.current = lasersRef.current.filter(l => now < l.fireAt + l.duration + 200)
      setLasers([...lasersRef.current])

      // Score per second survived
      scoreTickRef.current++
      if (scoreTickRef.current % 60 === 0) {
        scoreRef.current += 2
        setScore(scoreRef.current)
      }

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1; timeRef.current = n; setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)

    function spawn() {
      if (!activeRef.current) return
      const prog = 1 - timeRef.current / 60
      const now = Date.now()
      const numLasers = 1 + Math.floor(prog * 2)
      const usedYs: number[] = []
      for (let i = 0; i < numLasers; i++) {
        let y: number
        do { y = 80 + Math.floor(Math.random() * (H - 160)) } while (usedYs.some(u => Math.abs(u - y) < 80))
        usedYs.push(y)
        lasersRef.current = [...lasersRef.current, {
          id: nextId.current++,
          y,
          active: false,
          warn: false,
          warnAt: now + 100,
          fireAt: now + 800,
          duration: 600,
        }]
      }
      const interval = Math.max(1200, 2500 - prog * 1300)
      spawnRef.current = window.setTimeout(spawn, interval)
    }
    spawnRef.current = window.setTimeout(spawn, 1000)

    return () => { activeRef.current = false; cancelAnimationFrame(rafRef.current); clearInterval(timerRef.current); clearTimeout(spawnRef.current) }
  }, [audio, endGame])

  function movePlayer(e: React.PointerEvent) {
    const frac = e.clientY / window.innerHeight
    playerYRef.current = Math.max(0.05, Math.min(0.95, frac))
    setPlayerY(playerYRef.current)
  }

  const urgent = timeLeft <= 10
  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: hit ? 'rgba(239,68,68,.3)' : 'linear-gradient(180deg,#0a0a1a,#1a0a2e)', transition: 'background .15s', touchAction: 'none' }}
      onPointerMove={movePlayer}
      onPointerDown={movePlayer}
    >
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} />
      <div className="absolute top-0 left-0 right-0 h-1 z-30" style={{ background: 'rgba(255,255,255,.1)' }}>
        <div className="h-full transition-all duration-1000" style={{ width: `${(timeLeft / 60) * 100}%`, background: urgent ? '#F87171' : char.color }} />
      </div>

      {/* Player */}
      <div className="absolute transition-none" style={{
        left: '15%',
        top: `${playerY * 100}%`,
        transform: 'translate(-50%, -50%)',
        fontSize: '2.5rem',
        filter: `drop-shadow(0 0 8px ${char.color})`,
        zIndex: 20,
        pointerEvents: 'none',
      }}>🏃</div>

      {/* Lasers */}
      {lasers.map(l => (
        <div key={l.id}>
          {l.warn && !l.active && (
            <div className="absolute left-0 right-0 flex items-center" style={{
              top: l.y - 2, height: 4,
              background: 'rgba(239,68,68,.3)',
              zIndex: 10,
              animation: 'pulse .3s infinite',
            }} />
          )}
          {l.active && (
            <div className="absolute left-0 right-0" style={{
              top: l.y - 4, height: 8,
              background: 'linear-gradient(90deg, transparent, #EF4444, #FF6B6B, #EF4444, transparent)',
              boxShadow: '0 0 20px #EF4444, 0 0 40px #EF444466',
              zIndex: 15,
            }} />
          )}
        </div>
      ))}

      <div className="absolute bottom-8 left-0 right-0 text-center text-xs" style={{ color: 'rgba(255,255,255,.4)' }}>
        スクリーンをタッチして移動！レーザーをよけろ！
      </div>
      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
