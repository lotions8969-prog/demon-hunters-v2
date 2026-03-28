import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

interface Projectile { id: number; x: number; y: number; vx: number; vy: number; emoji: string }
interface Star { id: number; x: number; y: number }

const DEMON_EMOJIS = ['👹', '💀', '😈', '🧟', '🔮', '🦇']

const PLAYER_SIZE = 56
const STEP = 18

export function DashDodge({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [, setLives] = useState(3)
  const [playerPos, setPlayerPos] = useState({ x: 160, y: 400 })
  const [projectiles, setProjectiles] = useState<Projectile[]>([])
  const [stars, setStars] = useState<Star[]>([])
  const [particles, setParticles] = useState<ScoreParticleData[]>([])
  const [invincible, setInvincible] = useState(false)

  const scoreRef = useRef(0)
  const timeRef = useRef(60)
  const livesRef = useRef(3)
  const posRef = useRef({ x: 160, y: 400 })
  const projRef = useRef<Projectile[]>([])
  const starsRef = useRef<Star[]>([])
  const invRef = useRef(false)
  const keyRef = useRef<Record<string, boolean>>({})
  const nextId = useRef(0)
  const activeRef = useRef(true)
  const rafRef = useRef(0)
  const timerRef = useRef(0)
  const spawnRef = useRef(0)
  const starSpawnRef = useRef(0)
  const nextParticleId = useRef(0)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    cancelAnimationFrame(rafRef.current)
    clearInterval(timerRef.current)
    clearTimeout(spawnRef.current)
    clearTimeout(starSpawnRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('dashDodge')
    const W = window.innerWidth
    const H = window.innerHeight

    function loop() {
      if (!activeRef.current) return

      // Move player with keyboard
      const k = keyRef.current
      const step = STEP
      let { x, y } = posRef.current
      if (k['ArrowLeft'] || k['a'] || k['A']) x = Math.max(PLAYER_SIZE / 2, x - step)
      if (k['ArrowRight'] || k['d'] || k['D']) x = Math.min(W - PLAYER_SIZE / 2, x + step)
      if (k['ArrowUp'] || k['w'] || k['W']) y = Math.max(PLAYER_SIZE / 2 + 60, y - step)
      if (k['ArrowDown'] || k['s'] || k['S']) y = Math.min(H - PLAYER_SIZE / 2 - 60, y + step)
      posRef.current = { x, y }
      setPlayerPos({ x, y })

      // Move projectiles
      const prog = 1 - timeRef.current / 60
      const moved = projRef.current.map(p => ({ ...p, x: p.x + p.vx * (1 + prog * 0.5), y: p.y + p.vy * (1 + prog * 0.5) }))
        .filter(p => p.x > -50 && p.x < W + 50 && p.y > -50 && p.y < H + 50)

      // Move stars
      const movedStars = starsRef.current.map(s => ({ ...s, y: s.y + 1.5 })).filter(s => s.y < H + 40)

      // Collision check
      let hitLife = false
      const survived = moved.filter(p => {
        if (invRef.current) return true
        const dx = Math.abs(p.x - posRef.current.x)
        const dy = Math.abs(p.y - posRef.current.y)
        if (dx < 25 && dy < 25) { hitLife = true; return false }
        return true
      })

      let starBonus = 0
      const survivedStars = movedStars.filter(s => {
        const dx = Math.abs(s.x - posRef.current.x)
        const dy = Math.abs(s.y - posRef.current.y)
        if (dx < 30 && dy < 30) { starBonus += 30; return false }
        return true
      })

      if (hitLife) {
        const nl = livesRef.current - 1
        livesRef.current = nl
        setLives(nl)
        audio.sfxMiss()
        invRef.current = true
        setInvincible(true)
        setTimeout(() => { invRef.current = false; setInvincible(false) }, 1500)
        if (nl <= 0) { endGame(); return }
      }

      if (starBonus > 0) {
        scoreRef.current += starBonus
        setScore(scoreRef.current)
        audio.sfxSpecial()
        const pid = nextParticleId.current++
        setParticles(p => [...p, { id: pid, x: posRef.current.x, y: posRef.current.y - 40, text: '+30 ⭐', color: '#FFD700', big: true }])
        setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 800)
      }

      projRef.current = survived
      starsRef.current = survivedStars
      setProjectiles([...survived])
      setStars([...survivedStars])
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1
      timeRef.current = n
      setTimeLeft(n)
      scoreRef.current += 2
      setScore(scoreRef.current)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)

    function spawnProjectile() {
      if (!activeRef.current) return
      const prog = 1 - timeRef.current / 60
      const side = Math.floor(Math.random() * 4)
      let px = 0, py = 0, vx = 0, vy = 0
      const spd = 2 + prog * 3
      if (side === 0) { px = Math.random() * W; py = -20; vx = (Math.random() - 0.5) * 2; vy = spd }
      if (side === 1) { px = W + 20; py = Math.random() * H; vx = -spd; vy = (Math.random() - 0.5) * 2 }
      if (side === 2) { px = Math.random() * W; py = H + 20; vx = (Math.random() - 0.5) * 2; vy = -spd }
      if (side === 3) { px = -20; py = Math.random() * H; vx = spd; vy = (Math.random() - 0.5) * 2 }
      projRef.current = [...projRef.current, { id: nextId.current++, x: px, y: py, vx, vy, emoji: DEMON_EMOJIS[Math.floor(Math.random() * DEMON_EMOJIS.length)] }]
      audio.sfxDash()
      spawnRef.current = window.setTimeout(spawnProjectile, Math.max(400, 1500 - prog * 900))
    }
    spawnRef.current = window.setTimeout(spawnProjectile, 1200)

    function spawnStar() {
      if (!activeRef.current) return
      starsRef.current = [...starsRef.current, { id: nextId.current++, x: 40 + Math.random() * (W - 80), y: -30 }]
      starSpawnRef.current = window.setTimeout(spawnStar, 5000 + Math.random() * 4000)
    }
    starSpawnRef.current = window.setTimeout(spawnStar, 3000)

    const keyDown = (e: KeyboardEvent) => {
      keyRef.current[e.key] = true
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','d','w','s','A','D','W','S'].includes(e.key)) e.preventDefault()
    }
    const keyUp = (e: KeyboardEvent) => { keyRef.current[e.key] = false }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)

    return () => {
      activeRef.current = false
      cancelAnimationFrame(rafRef.current)
      clearInterval(timerRef.current)
      clearTimeout(spawnRef.current)
      clearTimeout(starSpawnRef.current)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
    }
  }, [audio, endGame])

  // Touch/drag for mobile
  const handlePointer = useCallback((e: React.PointerEvent) => {
    const W = window.innerWidth
    const H = window.innerHeight
    const x = Math.max(PLAYER_SIZE / 2, Math.min(W - PLAYER_SIZE / 2, e.clientX))
    const y = Math.max(PLAYER_SIZE / 2 + 60, Math.min(H - PLAYER_SIZE / 2 - 60, e.clientY))
    posRef.current = { x, y }
    setPlayerPos({ x, y })
  }, [])

  const urgent = timeLeft <= 15
  const livesStr = '❤️'.repeat(livesRef.current) + '🖤'.repeat(Math.max(0, 3 - livesRef.current))

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: char.bg, touchAction: 'none' }}
      onPointerMove={(e) => { if (e.buttons > 0) handlePointer(e) }}
      onPointerDown={handlePointer}
    >
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} />
      <div className="absolute top-0 left-0 right-0 h-1 z-30" style={{ background: 'rgba(255,255,255,.1)' }}>
        <div className="h-full transition-all duration-1000" style={{ width: `${(timeLeft / 60) * 100}%`, background: urgent ? '#F87171' : char.color }} />
      </div>
      <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 text-xl">{livesStr}</div>

      {/* Stars */}
      {stars.map(s => (
        <div key={s.id} className="absolute pointer-events-none" style={{ left: s.x - 18, top: s.y - 18, fontSize: 34, zIndex: 10 }}>⭐</div>
      ))}

      {/* Projectiles */}
      {projectiles.map(p => (
        <div key={p.id} className="absolute pointer-events-none" style={{ left: p.x - 20, top: p.y - 20, fontSize: 36, zIndex: 10 }}>{p.emoji}</div>
      ))}

      {/* Player */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: playerPos.x - PLAYER_SIZE / 2,
          top: playerPos.y - PLAYER_SIZE / 2,
          width: PLAYER_SIZE,
          height: PLAYER_SIZE,
          borderRadius: 10,
          overflow: 'hidden',
          border: invincible ? '3px solid #FFD700' : `2px solid ${char.color}`,
          boxShadow: invincible ? '0 0 24px #FFD700' : `0 0 16px ${char.color}88`,
          zIndex: 20,
          opacity: invincible ? 0.6 : 1,
        }}
      >
        <img src={char.img.profile} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} draggable={false} />
      </div>

      {/* Mobile D-pad */}
      <div className="absolute bottom-4 right-4 z-30 flex flex-col items-center gap-1" style={{ touchAction: 'none' }}>
        <button onPointerDown={() => { keyRef.current['ArrowUp'] = true }} onPointerUp={() => { keyRef.current['ArrowUp'] = false }} style={{ width: 52, height: 52, borderRadius: 10, background: 'rgba(255,255,255,.2)', border: `2px solid ${char.color}88`, fontSize: 20, color: 'white', cursor: 'pointer' }}>▲</button>
        <div className="flex gap-1">
          <button onPointerDown={() => { keyRef.current['ArrowLeft'] = true }} onPointerUp={() => { keyRef.current['ArrowLeft'] = false }} style={{ width: 52, height: 52, borderRadius: 10, background: 'rgba(255,255,255,.2)', border: `2px solid ${char.color}88`, fontSize: 20, color: 'white', cursor: 'pointer' }}>◀</button>
          <div style={{ width: 52, height: 52 }} />
          <button onPointerDown={() => { keyRef.current['ArrowRight'] = true }} onPointerUp={() => { keyRef.current['ArrowRight'] = false }} style={{ width: 52, height: 52, borderRadius: 10, background: 'rgba(255,255,255,.2)', border: `2px solid ${char.color}88`, fontSize: 20, color: 'white', cursor: 'pointer' }}>▶</button>
        </div>
        <button onPointerDown={() => { keyRef.current['ArrowDown'] = true }} onPointerUp={() => { keyRef.current['ArrowDown'] = false }} style={{ width: 52, height: 52, borderRadius: 10, background: 'rgba(255,255,255,.2)', border: `2px solid ${char.color}88`, fontSize: 20, color: 'white', cursor: 'pointer' }}>▼</button>
      </div>
      <div className="absolute bottom-4 left-4 z-30 text-xs" style={{ color: 'rgba(255,255,255,.4)' }}>WASD / ↑↓←→ で移動<br/>スマホ：ドラッグで移動</div>

      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
