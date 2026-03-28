import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'

interface Ghost { id: number; x: number; y: number; born: number; lifetime: number; emoji: string; pts: number; size: number }
interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const GHOST_EMOJIS = ['👻', '💀', '😈', '🧟', '🕷️', '🔮', '🧿', '👁️']

export function GhostChase({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [ghosts, setGhosts] = useState<Ghost[]>([])
  const [particles, setParticles] = useState<ScoreParticleData[]>([])
  const [combo, setCombo] = useState(0)

  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const timeRef = useRef(60)
  const ghostsRef = useRef<Ghost[]>([])
  const nextId = useRef(0)
  const activeRef = useRef(true)
  const rafRef = useRef(0)
  const timerRef = useRef(0)
  const spawnRef = useRef(0)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    cancelAnimationFrame(rafRef.current); clearTimeout(spawnRef.current); clearInterval(timerRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('ghostChase')
    const W = window.innerWidth, H = window.innerHeight

    function loop() {
      if (!activeRef.current) return
      const now = Date.now()
      ghostsRef.current = ghostsRef.current.filter(g => now - g.born < g.lifetime)
      setGhosts([...ghostsRef.current])
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
      const lifetime = Math.max(800, 1800 - prog * 1000)
      const sz = 52 + Math.random() * 28
      ghostsRef.current = [...ghostsRef.current, {
        id: nextId.current++,
        x: sz / 2 + 20 + Math.random() * (W - sz - 40),
        y: 80 + sz / 2 + Math.random() * (H - 80 - sz - 40),
        born: Date.now(),
        lifetime,
        emoji: GHOST_EMOJIS[Math.floor(Math.random() * GHOST_EMOJIS.length)],
        pts: lifetime < 1200 ? 30 : 20,
        size: sz,
      }]
      audio.sfxAppear()
      spawnRef.current = window.setTimeout(spawn, Math.max(500, 1400 - prog * 900))
    }
    spawnRef.current = window.setTimeout(spawn, 700)

    return () => { activeRef.current = false; cancelAnimationFrame(rafRef.current); clearTimeout(spawnRef.current); clearInterval(timerRef.current) }
  }, [audio, endGame])

  function tapGhost(id: number, cx: number, cy: number, pts: number) {
    if (!ghostsRef.current.find(g => g.id === id)) return
    ghostsRef.current = ghostsRef.current.filter(g => g.id !== id)
    setGhosts([...ghostsRef.current])
    comboRef.current++
    setCombo(comboRef.current)
    const earned = pts * (comboRef.current >= 5 ? 3 : comboRef.current >= 3 ? 2 : 1)
    scoreRef.current += earned; setScore(scoreRef.current)
    audio.sfxCatch()
    if (comboRef.current >= 3) audio.sfxCombo()
    const pid = Date.now() + Math.random()
    setParticles(p => [...p, { id: pid, x: cx, y: cy, text: `+${earned}${comboRef.current >= 3 ? ' コンボ！' : ''}`, color: char.color, big: comboRef.current >= 3 }])
    setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 800)
  }

  const urgent = timeLeft <= 10
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: 'linear-gradient(160deg,#0a0a1a 0%,#1a0a2e 50%,#0a1a2e 100%)' }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} combo={combo} />
      <div className="absolute top-0 left-0 right-0 h-1 z-30" style={{ background: 'rgba(255,255,255,.1)' }}>
        <div className="h-full transition-all duration-1000" style={{ width: `${(timeLeft / 60) * 100}%`, background: urgent ? '#F87171' : char.color }} />
      </div>
      {ghosts.map(g => {
        const age = (Date.now() - g.born) / g.lifetime
        return (
          <div key={g.id}
            onPointerDown={e => { e.stopPropagation(); tapGhost(g.id, e.clientX, e.clientY, g.pts) }}
            className="absolute cursor-pointer flex items-center justify-center"
            style={{
              left: g.x - g.size / 2, top: g.y - g.size / 2,
              width: g.size, height: g.size,
              fontSize: g.size * 0.65,
              lineHeight: 1,
              opacity: Math.max(0.2, 1 - age * 0.8),
              touchAction: 'none', userSelect: 'none', zIndex: 10,
              filter: `drop-shadow(0 0 ${12 - age * 10}px ${char.color})`,
              animation: 'float 2s ease-in-out infinite',
            }}>
            {g.emoji}
          </div>
        )
      })}
      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
      <style>{`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }`}</style>
    </div>
  )
}
