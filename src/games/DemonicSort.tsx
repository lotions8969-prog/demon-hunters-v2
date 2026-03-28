import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'

interface Demon { id: number; x: number; y: number; speed: number; emoji: string; type: 'evil' | 'good'; sorted: boolean }
interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const EVIL = ['👹', '💀', '😈', '🧟', '🕷️']
const GOOD = ['👼', '⭐', '🌸', '🍀', '💎']

export function DemonicSort({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [demons, setDemons] = useState<Demon[]>([])
  const [particles, setParticles] = useState<ScoreParticleData[]>([])
  const [combo, setCombo] = useState(0)

  const scoreRef = useRef(0)
  const timeRef = useRef(60)
  const demonsRef = useRef<Demon[]>([])
  const comboRef = useRef(0)
  const nextId = useRef(0)
  const activeRef = useRef(true)
  const rafRef = useRef(0)
  const timerRef = useRef(0)
  const spawnRef = useRef(0)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    cancelAnimationFrame(rafRef.current); clearInterval(timerRef.current); clearTimeout(spawnRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('demonicSort')
    const H = window.innerHeight

    function loop() {
      if (!activeRef.current) return
      demonsRef.current = demonsRef.current
        .map(d => ({ ...d, y: d.y + d.speed }))
        .filter(d => {
          if (d.y > H + 40 && !d.sorted) {
            // Missed - reset combo
            comboRef.current = 0
            setCombo(0)
            scoreRef.current = Math.max(0, scoreRef.current - 10)
            setScore(scoreRef.current)
          }
          return d.y <= H + 60
        })
      setDemons([...demonsRef.current])
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
      const isEvil = Math.random() > 0.5
      const W = window.innerWidth
      demonsRef.current = [...demonsRef.current, {
        id: nextId.current++,
        x: 60 + Math.random() * (W - 120),
        y: -40,
        speed: 1.5 + prog * 1.5 + Math.random() * 0.5,
        emoji: isEvil ? EVIL[Math.floor(Math.random() * EVIL.length)] : GOOD[Math.floor(Math.random() * GOOD.length)],
        type: isEvil ? 'evil' : 'good',
        sorted: false,
      }]
      audio.sfxAppear()
      spawnRef.current = window.setTimeout(spawn, Math.max(700, 1600 - prog * 900))
    }
    spawnRef.current = window.setTimeout(spawn, 600)

    const onKey = (e: KeyboardEvent) => {
      if (!activeRef.current) return
      const dir: 'left' | 'right' | null =
        e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' ? 'left' :
        e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' ? 'right' : null
      if (!dir) return
      e.preventDefault()
      const target = demonsRef.current.sort((a, b) => b.y - a.y)[0]
      if (target) sortDemon(target.id, dir, target.x, target.y)
    }
    window.addEventListener('keydown', onKey)
    return () => { activeRef.current = false; cancelAnimationFrame(rafRef.current); clearInterval(timerRef.current); clearTimeout(spawnRef.current); window.removeEventListener('keydown', onKey) }
  }, [audio, endGame])

  function sortDemon(id: number, direction: 'left' | 'right', cx: number, cy: number) {
    const demon = demonsRef.current.find(d => d.id === id)
    if (!demon || demon.sorted) return
    const correct = (demon.type === 'evil' && direction === 'left') || (demon.type === 'good' && direction === 'right')
    demonsRef.current = demonsRef.current.filter(d => d.id !== id)
    setDemons([...demonsRef.current])

    if (correct) {
      comboRef.current++
      setCombo(comboRef.current)
      const mult = comboRef.current >= 5 ? 3 : comboRef.current >= 3 ? 2 : 1
      const pts = 20 * mult
      scoreRef.current += pts; setScore(scoreRef.current)
      audio.sfxCatch()
      if (comboRef.current >= 3) audio.sfxCombo()
      const pid = Date.now() + Math.random()
      setParticles(p => [...p, { id: pid, x: cx, y: cy, text: `+${pts}${comboRef.current >= 3 ? ' コンボ！' : ''}`, color: char.color, big: comboRef.current >= 3 }])
      setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 800)
    } else {
      comboRef.current = 0; setCombo(0)
      audio.sfxMiss()
      const pid = Date.now() + Math.random()
      setParticles(p => [...p, { id: pid, x: cx, y: cy, text: 'まちがい！', color: '#F87171', big: false }])
      setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 800)
    }
  }

  const urgent = timeLeft <= 10
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} combo={combo} />
      <div className="absolute top-0 left-0 right-0 h-1 z-30" style={{ background: 'rgba(255,255,255,.1)' }}>
        <div className="h-full transition-all duration-1000" style={{ width: `${(timeLeft / 60) * 100}%`, background: urgent ? '#F87171' : char.color }} />
      </div>

      {/* Zone labels */}
      <div className="absolute bottom-16 left-0 right-0 flex justify-between px-4 z-20">
        <div className="flex flex-col items-center gap-1">
          <div className="font-black text-2xl" style={{ color: '#EF4444' }}>👹 あく</div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,.4)' }}>← / A キー</div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="font-black text-2xl" style={{ color: '#4ADE80' }}>👼 ぜん</div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,.4)' }}>D / → キー</div>
        </div>
      </div>

      {/* Divider */}
      <div className="absolute top-0 bottom-0 left-1/2 w-px" style={{ background: 'rgba(255,255,255,.1)' }} />

      {demons.map(d => (
        <div key={d.id} className="absolute flex gap-3" style={{ left: d.x - 60, top: d.y - 30, zIndex: 10, touchAction: 'none' }}>
          <button
            onPointerDown={e => { e.stopPropagation(); sortDemon(d.id, 'left', e.clientX, e.clientY) }}
            className="rounded-full font-black text-sm px-2 py-1"
            style={{ background: 'rgba(239,68,68,.3)', border: '1px solid #EF4444', color: '#EF4444', touchAction: 'none' }}>←</button>
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>{d.emoji}</div>
          <button
            onPointerDown={e => { e.stopPropagation(); sortDemon(d.id, 'right', e.clientX, e.clientY) }}
            className="rounded-full font-black text-sm px-2 py-1"
            style={{ background: 'rgba(74,222,128,.3)', border: '1px solid #4ADE80', color: '#4ADE80', touchAction: 'none' }}>→</button>
        </div>
      ))}
      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
