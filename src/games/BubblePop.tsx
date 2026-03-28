import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'
import { ALL_IMAGES } from '@/lib/characters'

interface Bubble {
  id: number
  x: number
  y: number
  size: number
  img: string
  speed: number
  wobble: number
  wobblePhase: number
}

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

export function BubblePop({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [_lives, setLives] = useState(3)
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [particles, setParticles] = useState<ScoreParticleData[]>([])

  const scoreRef = useRef(0)
  const timeRef = useRef(60)
  const livesRef = useRef(3)
  const bubblesRef = useRef<Bubble[]>([])
  const nextId = useRef(0)
  const rafRef = useRef(0)
  const timerRef = useRef(0)
  const spawnRef = useRef(0)
  const activeRef = useRef(true)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    audio.stop()
    cancelAnimationFrame(rafRef.current)
    clearTimeout(spawnRef.current)
    clearInterval(timerRef.current)
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('bubblePop')
    const W = window.innerWidth
    const H = window.innerHeight

    function loop() {
      if (!activeRef.current) return
      const prog = 1 - timeRef.current / 60
      const speedMult = 1 + prog * 1.5
      const newBubbles: Bubble[] = []
      let missedCount = 0
      for (const b of bubblesRef.current) {
        const newY = b.y - b.speed * speedMult
        if (newY < -b.size - 20) {
          missedCount++
        } else {
          newBubbles.push({ ...b, y: newY, wobblePhase: b.wobblePhase + 0.05 })
        }
      }
      if (missedCount > 0) {
        const newLives = Math.max(0, livesRef.current - missedCount)
        livesRef.current = newLives
        setLives(newLives)
        if (newLives <= 0) { endGame(); return }
      }
      bubblesRef.current = newBubbles
      setBubbles([...newBubbles])
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1
      timeRef.current = n
      setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)

    function spawn() {
      if (!activeRef.current) return
      const size = 64 + Math.random() * 32
      const img = ALL_IMAGES[Math.floor(Math.random() * ALL_IMAGES.length)]
      bubblesRef.current = [...bubblesRef.current, {
        id: nextId.current++,
        x: Math.max(size / 2, Math.random() * (W - size)),
        y: H + size,
        size,
        img,
        speed: 1.2 + Math.random() * 0.8,
        wobble: 1.5 + Math.random() * 2,
        wobblePhase: Math.random() * Math.PI * 2,
      }]
      const prog = 1 - timeRef.current / 60
      const rate = Math.max(500, 1600 - prog * 1100)
      spawnRef.current = window.setTimeout(spawn, rate)
    }
    spawnRef.current = window.setTimeout(spawn, 800)

    return () => {
      activeRef.current = false
      cancelAnimationFrame(rafRef.current)
      clearTimeout(spawnRef.current)
      clearInterval(timerRef.current)
    }
  }, [audio, endGame])

  const popBubble = useCallback((id: number, cx: number, cy: number) => {
    const b = bubblesRef.current.find(b => b.id === id)
    if (!b) return
    bubblesRef.current = bubblesRef.current.filter(b => b.id !== id)
    setBubbles([...bubblesRef.current])
    scoreRef.current += 10
    setScore(scoreRef.current)
    audio.sfxBubble()
    const pid = Date.now() + Math.random()
    setParticles(p => [...p, { id: pid, x: cx, y: cy, text: '+10', color: char.color, big: false }])
    setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 800)
  }, [audio, char.color])

  const urgent = timeLeft <= 10
  const livesStr = '❤️'.repeat(livesRef.current) + '🖤'.repeat(Math.max(0, 3 - livesRef.current))

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} />
      <div className="absolute top-0 left-0 right-0 h-1 z-30" style={{ background: 'rgba(255,255,255,.1)' }}>
        <div className="h-full transition-all duration-1000" style={{ width: `${(timeLeft / 60) * 100}%`, background: urgent ? '#F87171' : char.color }} />
      </div>
      <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 text-2xl">{livesStr}</div>
      {bubbles.map(b => (
        <div
          key={b.id}
          onPointerDown={e => { e.stopPropagation(); popBubble(b.id, e.clientX, e.clientY) }}
          className="absolute cursor-pointer"
          style={{
            left: b.x - b.size / 2 + Math.sin(b.wobblePhase) * b.wobble,
            top: b.y - b.size / 2,
            width: b.size,
            height: b.size,
            borderRadius: '50%',
            overflow: 'hidden',
            border: `3px solid ${char.color}88`,
            boxShadow: `0 0 16px ${char.color}66, inset 0 0 8px rgba(255,255,255,0.3)`,
            touchAction: 'none',
            userSelect: 'none',
            zIndex: 10,
          }}
        >
          <img
            src={b.img}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            draggable={false}
          />
        </div>
      ))}
      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
