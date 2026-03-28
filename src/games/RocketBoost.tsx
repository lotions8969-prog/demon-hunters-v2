import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'

interface Obstacle { id: number; y: number; gapY: number; gapH: number; x: number }
interface Star { id: number; x: number; y: number; collected: boolean }
interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

export function RocketBoost({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [rocketY, setRocketY] = useState(0.5)
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const [stars, setStars] = useState<Star[]>([])
  const [boosting, setBoosting] = useState(false)

  const scoreRef = useRef(0)
  const timeRef = useRef(60)
  const rocketYRef = useRef(0.5)
  const velocityRef = useRef(0)
  const obstaclesRef = useRef<Obstacle[]>([])
  const starsRef = useRef<Star[]>([])
  const nextId = useRef(0)
  const activeRef = useRef(true)
  const rafRef = useRef(0)
  const timerRef = useRef(0)
  const boostingRef = useRef(false)
  const scoreTickRef = useRef(0)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    cancelAnimationFrame(rafRef.current); clearInterval(timerRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('rocketBoost')
    const W = window.innerWidth

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        boostingRef.current = true; setBoosting(true); e.preventDefault()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        boostingRef.current = false; setBoosting(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    function loop() {
      if (!activeRef.current) return

      const gravity = 0.008
      const thrust = -0.018
      velocityRef.current += boostingRef.current ? thrust : gravity
      velocityRef.current = Math.max(-0.025, Math.min(0.025, velocityRef.current))
      rocketYRef.current = Math.max(0.05, Math.min(0.95, rocketYRef.current + velocityRef.current))
      setRocketY(rocketYRef.current)

      const prog = 1 - timeRef.current / 60
      const speed = 3 + prog * 2
      obstaclesRef.current = obstaclesRef.current.map(o => ({ ...o, x: o.x - speed })).filter(o => o.x > -80)

      const lastObs = obstaclesRef.current[obstaclesRef.current.length - 1]
      if (!lastObs || lastObs.x < W - 220) {
        const gapH = 0.25 - prog * 0.05
        const gapY = 0.15 + Math.random() * (0.7 - gapH)
        obstaclesRef.current = [...obstaclesRef.current, { id: nextId.current++, y: 0, gapY, gapH, x: W + 20 }]
      }

      starsRef.current = starsRef.current.map(s => ({ ...s, x: s.x - speed })).filter(s => s.x > -30 && !s.collected)

      if (Math.random() < 0.01) {
        starsRef.current = [...starsRef.current, { id: nextId.current++, x: W + 20, y: 0.2 + Math.random() * 0.6, collected: false }]
      }

      const rY = rocketYRef.current
      const rocketX = 0.15
      for (const obs of obstaclesRef.current) {
        const obsXFrac = obs.x / W
        if (Math.abs(obsXFrac - rocketX) < 0.05) {
          const inGap = rY >= obs.gapY && rY <= obs.gapY + obs.gapH
          if (!inGap) { endGame(); return }
        }
      }

      for (const star of starsRef.current) {
        if (star.collected) continue
        const starXFrac = star.x / W
        if (Math.abs(starXFrac - rocketX) < 0.06 && Math.abs(star.y - rY) < 0.06) {
          star.collected = true
          scoreRef.current += 30; setScore(scoreRef.current)
          audio.sfxCatch()
        }
      }

      setObstacles([...obstaclesRef.current])
      setStars([...starsRef.current])

      scoreTickRef.current++
      if (scoreTickRef.current % 60 === 0) { scoreRef.current += 1; setScore(scoreRef.current) }

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1; timeRef.current = n; setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)

    return () => {
      activeRef.current = false
      cancelAnimationFrame(rafRef.current); clearInterval(timerRef.current)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [audio, endGame])

  function startBoost() { boostingRef.current = true; setBoosting(true) }
  function stopBoost() { boostingRef.current = false; setBoosting(false) }

  const urgent = timeLeft <= 10

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: 'linear-gradient(180deg,#050510,#0a0a2e)', touchAction: 'none' }}
      onPointerDown={e => { e.stopPropagation(); startBoost() }}
      onPointerUp={stopBoost}
      onPointerLeave={stopBoost}
    >
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} />
      <div className="absolute top-0 left-0 right-0 h-1 z-30" style={{ background: 'rgba(255,255,255,.1)' }}>
        <div className="h-full transition-all duration-1000" style={{ width: `${(timeLeft / 60) * 100}%`, background: urgent ? '#F87171' : char.color }} />
      </div>

      {obstacles.map(o => (
        <div key={o.id}>
          <div className="absolute" style={{ left: o.x - 20, top: 0, width: 40, height: `${o.gapY * 100}%`, background: `linear-gradient(90deg, ${char.color}44, ${char.color}88)`, border: `2px solid ${char.color}`, borderRadius: '0 0 8px 8px' }} />
          <div className="absolute" style={{ left: o.x - 20, bottom: 0, width: 40, height: `${(1 - o.gapY - o.gapH) * 100}%`, background: `linear-gradient(90deg, ${char.color}44, ${char.color}88)`, border: `2px solid ${char.color}`, borderRadius: '8px 8px 0 0' }} />
        </div>
      ))}

      {stars.filter(s => !s.collected).map(s => (
        <div key={s.id} className="absolute pointer-events-none" style={{ left: s.x - 16, top: `calc(${s.y * 100}% - 16px)`, fontSize: '1.8rem', lineHeight: 1, filter: 'drop-shadow(0 0 6px #FFD700)' }}>⭐</div>
      ))}

      <div className="absolute pointer-events-none" style={{
        left: '15%', top: `${rocketY * 100}%`,
        transform: 'translate(-50%, -50%)',
        fontSize: '2.5rem',
        filter: `drop-shadow(0 0 ${boosting ? '16px' : '6px'} ${char.color})`,
        zIndex: 20, transition: 'filter .1s',
      }}>🚀</div>

      {boosting && (
        <div className="absolute pointer-events-none" style={{ left: 'calc(15% - 60px)', top: `${rocketY * 100}%`, transform: 'translateY(-50%)', fontSize: '1.5rem', opacity: 0.8 }}>🔥</div>
      )}

      <div className="absolute bottom-4 left-0 right-0 text-center text-xs pointer-events-none" style={{ color: 'rgba(255,255,255,.4)' }}>
        クリックホールド or スペースキーでブースト！
      </div>
    </div>
  )
}
