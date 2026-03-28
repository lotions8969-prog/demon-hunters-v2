import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'

interface Num { id: number; x: number; y: number; n: number; speed: number; selected: boolean }
interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

export function NumberRain({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [nums, setNums] = useState<Num[]>([])
  const [target, setTarget] = useState(10)
  const [current, setCurrent] = useState(0)
  const [particles, setParticles] = useState<ScoreParticleData[]>([])

  const scoreRef = useRef(0)
  const timeRef = useRef(60)
  const numsRef = useRef<Num[]>([])
  const targetRef = useRef(10)
  const currentRef = useRef(0)
  const nextId = useRef(0)
  const activeRef = useRef(true)
  const rafRef = useRef(0)
  const timerRef = useRef(0)
  const spawnRef = useRef(0)

  function newTarget() {
    const t = 5 + Math.floor(Math.random() * 20)
    targetRef.current = t
    setTarget(t)
    currentRef.current = 0
    setCurrent(0)
  }

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    cancelAnimationFrame(rafRef.current); clearTimeout(spawnRef.current); clearInterval(timerRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('numberRain')
    newTarget()
    const H = window.innerHeight
    function loop() {
      if (!activeRef.current) return
      numsRef.current = numsRef.current.map(n => ({ ...n, y: n.y + n.speed })).filter(n => n.y < H + 60)
      setNums([...numsRef.current])
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
      numsRef.current = [...numsRef.current, {
        id: nextId.current++,
        x: 40 + Math.random() * (window.innerWidth - 80),
        y: -40,
        n: 1 + Math.floor(Math.random() * 9),
        speed: 1.5 + prog * 1.5 + Math.random() * 0.5,
        selected: false,
      }]
      spawnRef.current = window.setTimeout(spawn, Math.max(600, 1400 - prog * 800))
    }
    spawnRef.current = window.setTimeout(spawn, 600)
    return () => { activeRef.current = false; cancelAnimationFrame(rafRef.current); clearTimeout(spawnRef.current); clearInterval(timerRef.current) }
  }, [audio, endGame])

  function tapNum(id: number, n: number, cx: number, cy: number) {
    if (numsRef.current.find(x => x.id === id)?.selected) return
    const newCurrent = currentRef.current + n
    if (newCurrent > targetRef.current) {
      // Overshoot - penalty
      audio.sfxMiss()
      const pid = Date.now() + Math.random()
      setParticles(p => [...p, { id: pid, x: cx, y: cy, text: 'オーバー！', color: '#F87171', big: false }])
      setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 800)
      currentRef.current = 0; setCurrent(0)
      numsRef.current = numsRef.current.map(x => ({ ...x, selected: false }))
      return
    }
    numsRef.current = numsRef.current.map(x => x.id === id ? { ...x, selected: true } : x)
    currentRef.current = newCurrent
    setCurrent(newCurrent)
    audio.sfxCatch()
    if (newCurrent === targetRef.current) {
      const pts = 50
      scoreRef.current += pts; setScore(scoreRef.current)
      audio.sfxSpecial()
      const pid = Date.now() + Math.random()
      setParticles(p => [...p, { id: pid, x: cx, y: cy, text: `+${pts} ぴったり！`, color: '#FFD700', big: true }])
      setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 900)
      numsRef.current = numsRef.current.filter(x => !x.selected)
      newTarget()
    }
  }

  const urgent = timeLeft <= 10
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} />
      <div className="absolute top-0 left-0 right-0 h-1 z-30" style={{ background: 'rgba(255,255,255,.1)' }}>
        <div className="h-full transition-all duration-1000" style={{ width: `${(timeLeft / 60) * 100}%`, background: urgent ? '#F87171' : char.color }} />
      </div>
      <div className="absolute top-14 left-0 right-0 flex justify-center items-center gap-3 z-20">
        <div className="font-black text-lg" style={{ color: 'rgba(255,255,255,.7)' }}>もくひょう:</div>
        <div className="font-black text-3xl" style={{ color: '#FFD700' }}>{target}</div>
        <div className="font-black text-lg" style={{ color: 'rgba(255,255,255,.5)' }}>いま:</div>
        <div className="font-black text-2xl" style={{ color: current > 0 ? char.color : 'rgba(255,255,255,.3)' }}>{current}</div>
      </div>
      {/* Progress bar toward target */}
      <div className="absolute top-24 left-4 right-4 h-2 rounded-full z-20" style={{ background: 'rgba(255,255,255,.1)' }}>
        <div className="h-full rounded-full transition-all duration-200" style={{ width: `${Math.min(100, (current / target) * 100)}%`, background: char.color }} />
      </div>
      {nums.map(n => (
        <div key={n.id}
          onPointerDown={e => { e.stopPropagation(); if (!n.selected) tapNum(n.id, n.n, e.clientX, e.clientY) }}
          className="absolute flex items-center justify-center font-black cursor-pointer"
          style={{
            left: n.x - 28, top: n.y - 28, width: 56, height: 56,
            borderRadius: '50%',
            background: n.selected ? '#4ADE8044' : `${char.color}22`,
            border: `3px solid ${n.selected ? '#4ADE80' : char.color}`,
            color: n.selected ? '#4ADE80' : 'white',
            fontSize: '1.4rem',
            touchAction: 'none', userSelect: 'none', zIndex: 10,
            opacity: n.selected ? 0.5 : 1,
          }}>{n.n}</div>
      ))}
      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
