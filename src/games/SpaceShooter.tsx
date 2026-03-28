import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'
import type { ScoreParticleData } from '@/lib/types'
import { ScoreParticle } from '@/components/ScoreParticle'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

interface Enemy { id: number; x: number; y: number; speed: number; emoji: string; hp: number; pts: number }
interface Bullet { id: number; x: number; y: number }

const ENEMY_TYPES = [
  { emoji: '👹', hp: 1, pts: 10, speed: 1.2 },
  { emoji: '💀', hp: 1, pts: 10, speed: 1.5 },
  { emoji: '😈', hp: 2, pts: 20, speed: 1.0 },
  { emoji: '🧟', hp: 2, pts: 20, speed: 0.9 },
  { emoji: '🐉', hp: 3, pts: 40, speed: 0.7 },
]

export function SpaceShooter({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [bullets, setBullets] = useState<Bullet[]>([])
  const [shipX, setShipX] = useState(50)
  const [particles, setParticles] = useState<ScoreParticleData[]>([])
  const [_lives, setLives] = useState(3)

  const scoreRef = useRef(0)
  const timeRef = useRef(60)
  const livesRef = useRef(3)
  const shipXRef = useRef(50)
  const enemiesRef = useRef<Enemy[]>([])
  const bulletsRef = useRef<Bullet[]>([])
  const keyRef = useRef<Record<string, boolean>>({})
  const nextId = useRef(0)
  const activeRef = useRef(true)
  const rafRef = useRef(0)
  const timerRef = useRef(0)
  const spawnRef = useRef(0)
  const shootCooldown = useRef(0)
  const nextPid = useRef(0)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    cancelAnimationFrame(rafRef.current)
    clearInterval(timerRef.current)
    clearTimeout(spawnRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('spaceShooter')
    const W = window.innerWidth
    const H = window.innerHeight

    function loop(ts: number) {
      if (!activeRef.current) return

      // Move ship
      if (keyRef.current['ArrowLeft'] || keyRef.current['a'] || keyRef.current['A']) {
        shipXRef.current = Math.max(5, shipXRef.current - 1.2)
        setShipX(shipXRef.current)
      }
      if (keyRef.current['ArrowRight'] || keyRef.current['d'] || keyRef.current['D']) {
        shipXRef.current = Math.min(95, shipXRef.current + 1.2)
        setShipX(shipXRef.current)
      }

      // Shoot
      if ((keyRef.current[' '] || keyRef.current['Space']) && ts - shootCooldown.current > 300) {
        shootCooldown.current = ts
        bulletsRef.current = [...bulletsRef.current, { id: nextId.current++, x: (shipXRef.current / 100) * W, y: H - 100 }]
        audio.sfxCatch()
      }

      // Move bullets up
      bulletsRef.current = bulletsRef.current
        .map(b => ({ ...b, y: b.y - 12 }))
        .filter(b => b.y > -20)

      // Move enemies down
      const prog = 1 - timeRef.current / 60
      enemiesRef.current = enemiesRef.current.map(e => ({ ...e, y: e.y + e.speed * (1 + prog * 0.5) }))

      // Collision: bullets vs enemies
      const hitEnemies = new Set<number>()
      const hitBullets = new Set<number>()
      const newEnemies = enemiesRef.current.map(e => {
        let newHp = e.hp
        bulletsRef.current.forEach(b => {
          if (hitBullets.has(b.id)) return
          if (Math.abs(b.x - e.x) < 30 && Math.abs(b.y - e.y) < 30) {
            hitBullets.add(b.id)
            newHp--
          }
        })
        if (newHp <= 0) { hitEnemies.add(e.id); return { ...e, hp: 0 } }
        return { ...e, hp: newHp }
      })

      // Score for destroyed enemies
      newEnemies.filter(e => hitEnemies.has(e.id)).forEach(e => {
        scoreRef.current += e.pts
        setScore(scoreRef.current)
        audio.sfxCombo()
        const pid = nextPid.current++
        setParticles(p => [...p, { id: pid, x: e.x, y: e.y, text: `+${e.pts}`, color: char.color, big: e.pts >= 30 }])
        setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 700)
      })

      // Enemy reaches bottom = lose life
      let lostLife = false
      const survived = newEnemies.filter(e => {
        if (e.y > H - 60 && !hitEnemies.has(e.id)) { lostLife = true; return false }
        return !hitEnemies.has(e.id)
      })

      if (lostLife) {
        const nl = livesRef.current - 1
        livesRef.current = nl
        setLives(nl)
        audio.sfxMiss()
        if (nl <= 0) { endGame(); return }
      }

      bulletsRef.current = bulletsRef.current.filter(b => !hitBullets.has(b.id))
      enemiesRef.current = survived
      setEnemies([...survived])
      setBullets([...bulletsRef.current])
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

    function spawn() {
      if (!activeRef.current) return
      const prog = 1 - timeRef.current / 60
      const t = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)]
      const margin = 40
      enemiesRef.current = [...enemiesRef.current, {
        id: nextId.current++,
        x: margin + Math.random() * (W - margin * 2),
        y: -40,
        speed: t.speed,
        emoji: t.emoji,
        hp: t.hp,
        pts: t.pts,
      }]
      spawnRef.current = window.setTimeout(spawn, Math.max(500, 1400 - prog * 900))
    }
    spawnRef.current = window.setTimeout(spawn, 800)

    const kd = (e: KeyboardEvent) => {
      keyRef.current[e.key] = true
      if ([' ','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault()
    }
    const ku = (e: KeyboardEvent) => { keyRef.current[e.key] = false }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)

    return () => {
      activeRef.current = false
      cancelAnimationFrame(rafRef.current)
      clearInterval(timerRef.current)
      clearTimeout(spawnRef.current)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [audio, endGame, char.color])

  // Touch: drag to move ship
  const handlePointer = useCallback((e: React.PointerEvent) => {
    const pct = Math.max(5, Math.min(95, (e.clientX / window.innerWidth) * 100))
    shipXRef.current = pct
    setShipX(pct)
  }, [])

  const urgent = timeLeft <= 15
  const livesStr = '❤️'.repeat(livesRef.current) + '🖤'.repeat(Math.max(0, 3 - livesRef.current))

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: '#020008', touchAction: 'none' }}
      onPointerMove={e => { if (e.buttons > 0) handlePointer(e) }}
      onPointerDown={handlePointer}
    >
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} />
      <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 text-xl">{livesStr}</div>

      {/* Stars background */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} className="absolute rounded-full animate-pulse"
          style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, width: 1 + (i % 3), height: 1 + (i % 3), background: 'white', opacity: 0.2 + (i % 5) * 0.1, animationDelay: `${i * 0.3}s` }} />
      ))}

      {/* Enemies */}
      {enemies.map(e => (
        <div key={e.id} className="absolute pointer-events-none text-center"
          style={{ left: e.x - 22, top: e.y - 22, fontSize: 40, zIndex: 10, lineHeight: 1 }}>
          {e.emoji}
          {e.hp > 1 && <div className="text-xs font-bold text-white" style={{ fontSize: 10 }}>{'❤️'.repeat(e.hp)}</div>}
        </div>
      ))}

      {/* Bullets */}
      {bullets.map(b => (
        <div key={b.id} className="absolute pointer-events-none rounded-full"
          style={{ left: b.x - 3, top: b.y - 8, width: 6, height: 16, background: char.color, boxShadow: `0 0 8px ${char.color}`, zIndex: 15 }} />
      ))}

      {/* Ship */}
      <div className="absolute pointer-events-none" style={{ left: `${shipX}%`, bottom: 30, transform: 'translateX(-50%)', zIndex: 20, width: 52, height: 68, borderRadius: 10, overflow: 'hidden', border: `2px solid ${char.color}`, boxShadow: `0 0 16px ${char.color}88` }}>
        <img src={char.img.profile} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} draggable={false} />
      </div>

      {/* Mobile shoot btn */}
      <button
        className="absolute bottom-6 right-6 z-30 rounded-full font-black text-white text-lg flex items-center justify-center"
        style={{ width: 64, height: 64, background: char.color, boxShadow: `0 0 20px ${char.color}88`, border: 'none', cursor: 'pointer' }}
        onPointerDown={e => { e.stopPropagation(); bulletsRef.current = [...bulletsRef.current, { id: nextId.current++, x: (shipXRef.current / 100) * window.innerWidth, y: window.innerHeight - 100 }]; audio.sfxCatch() }}
      >🔫</button>

      <div className="absolute bottom-8 left-4 z-30 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>← → 移動<br/>スペース で射撃</div>

      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
