import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'

interface Demon {
  id: number
  x: number
  y: number
  speed: number
  emoji: string
  size: number
}

interface Star {
  id: number
  x: number
  y: number
}

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const DEMON_EMOJIS = ['👺', '🧟', '🔮', '🐉']

export function DemonAvoid({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [_lives, setLives] = useState(3)
  const [playerX, setPlayerX] = useState(50)
  const [demons, setDemons] = useState<Demon[]>([])
  const [stars, setStars] = useState<Star[]>([])
  const [invincible, setInvincible] = useState(false)
  const [particles, setParticles] = useState<ScoreParticleData[]>([])

  const scoreRef = useRef(0)
  const timeRef = useRef(60)
  const livesRef = useRef(3)
  const playerXRef = useRef(50)
  const demonsRef = useRef<Demon[]>([])
  const starsRef = useRef<Star[]>([])
  const invincibleRef = useRef(false)
  const nextId = useRef(0)
  const rafRef = useRef(0)
  const timerRef = useRef(0)
  const spawnRef = useRef(0)
  const starSpawnRef = useRef(0)
  const activeRef = useRef(true)
  const dragRef = useRef(false)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    audio.stop()
    cancelAnimationFrame(rafRef.current)
    clearInterval(timerRef.current)
    clearTimeout(spawnRef.current)
    clearTimeout(starSpawnRef.current)
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start()
    const H = window.innerHeight
    const W = window.innerWidth

    function loop() {
      if (!activeRef.current) return

      const prog = 1 - timeRef.current / 60
      const moved = demonsRef.current.map(d => ({ ...d, y: d.y + d.speed * (1 + prog) })).filter(d => d.y < H + 80)
      const movedStars = starsRef.current.map(s => ({ ...s, y: s.y + 2 })).filter(s => s.y < H + 40)

      // collision check
      const px = (playerXRef.current / 100) * W
      const py = H - 80
      let hitLife = false

      const survivedDemons = moved.filter(d => {
        if (invincibleRef.current) return true
        const dx = Math.abs(d.x - px)
        const dy = Math.abs(d.y - py)
        if (dx < 35 && dy < 45) { hitLife = true; return false }
        return true
      })

      let starBonus = 0
      const survivedStars = movedStars.filter(s => {
        const dx = Math.abs(s.x - px)
        const dy = Math.abs(s.y - py)
        if (dx < 35 && dy < 35) { starBonus += 50; return false }
        return true
      })

      if (hitLife) {
        const nl = livesRef.current - 1
        livesRef.current = nl
        setLives(nl)
        audio.sfxMiss()
        if (nl <= 0) { endGame(); return }
      }

      if (starBonus > 0) {
        scoreRef.current += starBonus
        setScore(scoreRef.current)
        audio.sfxSpecial()
        invincibleRef.current = true
        setInvincible(true)
        setTimeout(() => { invincibleRef.current = false; setInvincible(false) }, 3000)
        const pid = Date.now()
        setParticles(p => [...p, { id: pid, x: px, y: py - 40, text: '+50 ⭐無敵！', color: '#FFD700', big: true }])
        setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 1000)
      }

      demonsRef.current = survivedDemons
      starsRef.current = survivedStars
      setDemons([...survivedDemons])
      setStars([...survivedStars])
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1
      timeRef.current = n
      setTimeLeft(n)
      scoreRef.current += 1
      setScore(scoreRef.current)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)

    function spawnDemon() {
      if (!activeRef.current) return
      demonsRef.current = [...demonsRef.current, {
        id: nextId.current++,
        x: 30 + Math.random() * (W - 60),
        y: -40,
        speed: 2 + Math.random() * 2,
        emoji: DEMON_EMOJIS[Math.floor(Math.random() * DEMON_EMOJIS.length)],
        size: 40 + Math.random() * 20,
      }]
      const prog = 1 - timeRef.current / 60
      spawnRef.current = window.setTimeout(spawnDemon, Math.max(600, 1800 - prog * 1200))
    }
    spawnRef.current = window.setTimeout(spawnDemon, 1000)

    function spawnStar() {
      if (!activeRef.current) return
      starsRef.current = [...starsRef.current, {
        id: nextId.current++,
        x: 30 + Math.random() * (W - 60),
        y: -30,
      }]
      starSpawnRef.current = window.setTimeout(spawnStar, 8000 + Math.random() * 5000)
    }
    starSpawnRef.current = window.setTimeout(spawnStar, 5000)

    return () => {
      activeRef.current = false
      cancelAnimationFrame(rafRef.current)
      clearInterval(timerRef.current)
      clearTimeout(spawnRef.current)
      clearTimeout(starSpawnRef.current)
    }
  }, [audio, endGame])

  const handlePointer = useCallback((e: React.PointerEvent) => {
    dragRef.current = true
    const pct = Math.max(5, Math.min(95, (e.clientX / window.innerWidth) * 100))
    playerXRef.current = pct
    setPlayerX(pct)
  }, [])

  const urgent = timeLeft <= 10
  const livesStr = '❤️'.repeat(livesRef.current) + '🖤'.repeat(Math.max(0, 3 - livesRef.current))

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: char.bg, touchAction: 'none' }}
      onPointerMove={handlePointer}
      onPointerDown={handlePointer}
    >
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} />
      <div className="absolute top-0 left-0 right-0 h-1 z-30" style={{ background: 'rgba(255,255,255,.1)' }}>
        <div className="h-full transition-all duration-1000" style={{ width: `${(timeLeft / 60) * 100}%`, background: urgent ? '#F87171' : char.color }} />
      </div>
      <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 text-2xl">{livesStr}</div>

      {/* Demons */}
      {demons.map(d => (
        <div
          key={d.id}
          className="absolute pointer-events-none text-center"
          style={{ left: d.x - d.size / 2, top: d.y - d.size / 2, fontSize: d.size, lineHeight: 1, zIndex: 10 }}
        >
          {d.emoji}
        </div>
      ))}

      {/* Stars */}
      {stars.map(s => (
        <div
          key={s.id}
          className="absolute pointer-events-none text-center"
          style={{ left: s.x - 20, top: s.y - 20, fontSize: 36, lineHeight: 1, zIndex: 10 }}
        >
          ⭐
        </div>
      ))}

      {/* Player */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${playerX}%`,
          bottom: 20,
          transform: 'translateX(-50%)',
          width: 60,
          height: 80,
          borderRadius: 10,
          overflow: 'hidden',
          border: invincible ? '3px solid #FFD700' : `2px solid ${char.color}`,
          boxShadow: invincible ? '0 0 20px #FFD700' : `0 0 12px ${char.color}66`,
          zIndex: 20,
        }}
      >
        <img
          src={char.img.profile}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
          draggable={false}
        />
      </div>

      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
