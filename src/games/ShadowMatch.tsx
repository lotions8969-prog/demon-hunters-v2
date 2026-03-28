import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const SHAPES = [
  { emoji: '🌟', label: 'ほし' },
  { emoji: '🔥', label: 'ほのお' },
  { emoji: '💎', label: 'きらり' },
  { emoji: '🌙', label: 'つき' },
  { emoji: '⚡', label: 'いなずま' },
  { emoji: '🌊', label: 'なみ' },
  { emoji: '🍄', label: 'きのこ' },
  { emoji: '🌸', label: 'はな' },
]

export function ShadowMatch({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [targetIdx, setTargetIdx] = useState(0)
  const [choices, setChoices] = useState<number[]>([])
  const [particles, setParticles] = useState<ScoreParticleData[]>([])
  const [flash, setFlash] = useState<{ idx: number; ok: boolean } | null>(null)
  const [combo, setCombo] = useState(0)

  const scoreRef = useRef(0)
  const timeRef = useRef(60)
  const comboRef = useRef(0)
  const activeRef = useRef(true)
  const timerRef = useRef(0)

  function newRound() {
    const target = Math.floor(Math.random() * SHAPES.length)
    const others = Array.from({ length: SHAPES.length }, (_, i) => i).filter(i => i !== target)
    const shuffled = others.sort(() => Math.random() - 0.5).slice(0, 3)
    const all = [...shuffled, target].sort(() => Math.random() - 0.5)
    setTargetIdx(target)
    setChoices(all)
  }

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    clearInterval(timerRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('shadowMatch')
    newRound()
    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1; timeRef.current = n; setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)
    return () => { activeRef.current = false; clearInterval(timerRef.current) }
  }, [audio, endGame])

  function pick(_idx: number, choiceIdx: number, ex: number, ey: number) {
    if (!activeRef.current) return
    const correct = choices[choiceIdx] === targetIdx
    setFlash({ idx: choiceIdx, ok: correct })
    setTimeout(() => setFlash(null), 300)

    if (correct) {
      comboRef.current++; setCombo(comboRef.current)
      const pts = 50 * (comboRef.current >= 3 ? 2 : 1)
      scoreRef.current += pts; setScore(scoreRef.current)
      audio.sfxMatch()
      if (comboRef.current >= 3) audio.sfxCombo()
      const pid = Date.now()
      setParticles(p => [...p, { id: pid, x: ex, y: ey, text: `+${pts}${comboRef.current >= 3 ? ' コンボ！' : ''}`, color: '#FFD700', big: comboRef.current >= 3 }])
      setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 800)
      setTimeout(() => newRound(), 400)
    } else {
      comboRef.current = 0; setCombo(0)
      audio.sfxMiss()
      const pid = Date.now()
      setParticles(p => [...p, { id: pid, x: ex, y: ey, text: 'ちがう！', color: '#F87171', big: false }])
      setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 800)
    }
  }

  const urgent = timeLeft <= 10
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <div className="absolute top-4 left-0 right-0 flex justify-between items-center px-4 mt-10">
        <div className="font-black text-2xl" style={{ color: '#FFD700' }}>{score}</div>
        <div className="font-black text-xl" style={{ color: urgent ? '#F87171' : 'white' }}>{timeLeft}s</div>
        {combo >= 2 && <div className="font-black text-sm animate-pulse" style={{ color: char.color }}>{combo}コンボ！</div>}
      </div>
      <div className="absolute top-0 left-0 right-0 h-1 z-30" style={{ background: 'rgba(255,255,255,.1)' }}>
        <div className="h-full transition-all duration-1000" style={{ width: `${(timeLeft / 60) * 100}%`, background: urgent ? '#F87171' : char.color }} />
      </div>
      <div className="mt-16 flex flex-col items-center gap-8 w-full max-w-sm px-6">
        <div className="text-sm font-bold" style={{ color: 'rgba(255,255,255,.6)' }}>このかげはどれ？</div>
        {/* Shadow (target shown as silhouette) */}
        <div className="flex flex-col items-center gap-2">
          <div style={{
            fontSize: '5rem',
            filter: 'brightness(0) saturate(0) opacity(0.6)',
            lineHeight: 1,
          }}>{SHAPES[targetIdx].emoji}</div>
        </div>
        {/* Choices */}
        <div className="grid grid-cols-2 gap-4 w-full">
          {choices.map((shapeIdx, ci) => (
            <button
              key={ci}
              onPointerDown={e => { e.stopPropagation(); pick(shapeIdx, ci, e.clientX, e.clientY) }}
              className="rounded-2xl flex flex-col items-center justify-center gap-2 py-4"
              style={{
                background: flash?.idx === ci ? (flash.ok ? `${char.color}44` : 'rgba(239,68,68,.4)') : `${char.color}15`,
                border: `2px solid ${flash?.idx === ci ? (flash.ok ? char.color : '#EF4444') : `${char.color}44`}`,
                touchAction: 'none',
              }}>
              <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>{SHAPES[shapeIdx].emoji}</span>
              <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,.6)' }}>{SHAPES[shapeIdx].label}</span>
            </button>
          ))}
        </div>
      </div>
      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
