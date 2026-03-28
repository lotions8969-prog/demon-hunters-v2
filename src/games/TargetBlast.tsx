import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'

interface Target { id: number; x: number; y: number; size: number; born: number; emoji: string; pts: number }
interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const EMOJIS = ['👹','💀','😈','🧟','🦇','🔮','🐉','👺']

export function TargetBlast({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [targets, setTargets] = useState<Target[]>([])
  const [particles, setParticles] = useState<ScoreParticleData[]>([])
  const [combo, setCombo] = useState(0)

  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const timeRef = useRef(60)
  const targetsRef = useRef<Target[]>([])
  const nextId = useRef(0)
  const activeRef = useRef(true)
  const rafRef = useRef(0)
  const timerRef = useRef(0)
  const spawnRef = useRef(0)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    cancelAnimationFrame(rafRef.current)
    clearTimeout(spawnRef.current)
    clearInterval(timerRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('targetBlast')
    const W = window.innerWidth, H = window.innerHeight
    const LIFETIME = 2200

    function loop() {
      if (!activeRef.current) return
      const now = Date.now()
      targetsRef.current = targetsRef.current.filter(t => now - t.born < LIFETIME)
      setTargets([...targetsRef.current])
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
      const sz = Math.max(48, 90 - prog * 30)
      const margin = sz + 10
      targetsRef.current = [...targetsRef.current, {
        id: nextId.current++,
        x: margin + Math.random() * (W - margin * 2),
        y: 80 + margin + Math.random() * (H - 80 - margin * 2),
        size: sz,
        born: Date.now(),
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        pts: Math.round(10 + prog * 20),
      }]
      audio.sfxAppear()
      spawnRef.current = window.setTimeout(spawn, Math.max(600, 1500 - prog * 900))
    }
    spawnRef.current = window.setTimeout(spawn, 800)

    return () => {
      activeRef.current = false
      cancelAnimationFrame(rafRef.current)
      clearTimeout(spawnRef.current)
      clearInterval(timerRef.current)
    }
  }, [audio, endGame])

  function tapTarget(id: number, cx: number, cy: number, pts: number) {
    if (!targetsRef.current.find(t => t.id === id)) return
    targetsRef.current = targetsRef.current.filter(t => t.id !== id)
    setTargets([...targetsRef.current])
    comboRef.current++
    setCombo(comboRef.current)
    const earned = pts * (comboRef.current >= 5 ? 3 : comboRef.current >= 3 ? 2 : 1)
    scoreRef.current += earned
    setScore(scoreRef.current)
    audio.sfxCatch()
    if (comboRef.current >= 3) audio.sfxCombo()
    const pid = Date.now() + Math.random()
    setParticles(p => [...p, { id: pid, x: cx, y: cy, text: `+${earned}`, color: char.color, big: comboRef.current >= 3 }])
    setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 800)
  }

  const urgent = timeLeft <= 10
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} combo={combo} />
      <div className="absolute top-0 left-0 right-0 h-1 z-30" style={{ background: 'rgba(255,255,255,.1)' }}>
        <div className="h-full transition-all duration-1000" style={{ width: `${(timeLeft / 60) * 100}%`, background: urgent ? '#F87171' : char.color }} />
      </div>
      {targets.map(t => {
        const age = Math.min(1, (Date.now() - t.born) / 2200)
        return (
          <div key={t.id}
            onPointerDown={e => { e.stopPropagation(); tapTarget(t.id, e.clientX, e.clientY, t.pts) }}
            className="absolute cursor-pointer flex items-center justify-center"
            style={{
              left: t.x - t.size / 2, top: t.y - t.size / 2,
              width: t.size, height: t.size,
              fontSize: t.size * 0.65,
              lineHeight: 1,
              borderRadius: '50%',
              background: `${char.color}22`,
              border: `3px solid ${char.color}`,
              boxShadow: `0 0 ${20 - age * 15}px ${char.color}`,
              opacity: 1 - age * 0.6,
              touchAction: 'none', userSelect: 'none', zIndex: 10,
              transform: `scale(${1 - age * 0.3})`,
            }}>
            {t.emoji}
          </div>
        )
      })}
      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
