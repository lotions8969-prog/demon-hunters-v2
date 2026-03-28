import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'
import type { ScoreParticleData } from '@/lib/types'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const COLORS = [
  { name: 'あか', hex: '#EF4444', key: '1', emoji: '🔴' },
  { name: 'あお', hex: '#3B82F6', key: '2', emoji: '🔵' },
  { name: 'きいろ', hex: '#EAB308', key: '3', emoji: '🟡' },
  { name: 'みどり', hex: '#22C55E', key: '4', emoji: '🟢' },
  { name: 'むらさき', hex: '#A855F7', key: '5', emoji: '🟣' },
  { name: 'ピンク', hex: '#EC4899', key: '6', emoji: '🩷' },
]

export function ColorMatch({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [target, setTarget] = useState(0)
  const [options, setOptions] = useState<number[]>([0, 1, 2, 3])
  const [flash, setFlash] = useState<string | null>(null)
  const [particles, setParticles] = useState<ScoreParticleData[]>([])
  const [combo, setCombo] = useState(0)

  const scoreRef = useRef(0)
  const timeRef = useRef(60)
  const comboRef = useRef(0)
  const activeRef = useRef(true)
  const timerRef = useRef(0)
  const nextParticleId = useRef(0)
  const optionsRef = useRef<number[]>([0, 1, 2, 3])
  const targetRef = useRef(0)

  function newRound() {
    const t = Math.floor(Math.random() * COLORS.length)
    setTarget(t)
    targetRef.current = t
    // Options: correct + 3 wrong
    const others = COLORS.map((_, i) => i).filter(i => i !== t)
    const shuffled = others.sort(() => Math.random() - 0.5).slice(0, 3)
    const allOpts = [t, ...shuffled].sort(() => Math.random() - 0.5)
    setOptions(allOpts)
    optionsRef.current = allOpts
  }

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    clearInterval(timerRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('colorMatch')
    newRound()

    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1
      timeRef.current = n
      setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)

    return () => {
      activeRef.current = false
      clearInterval(timerRef.current)
    }
  }, [audio, endGame])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const idx = COLORS.findIndex(c => c.key === e.key)
      if (idx >= 0 && optionsRef.current.includes(idx)) {
        e.preventDefault()
        handleSelect(idx)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function handleSelect(idx: number) {
    if (!activeRef.current) return
    if (idx === targetRef.current) {
      comboRef.current++
      setCombo(comboRef.current)
      const pts = 10 + (comboRef.current >= 3 ? 5 : 0)
      scoreRef.current += pts
      setScore(scoreRef.current)
      setFlash('correct')
      audio.sfxColorMatch()
      const pid = nextParticleId.current++
      setParticles(p => [...p, { id: pid, x: window.innerWidth / 2, y: window.innerHeight / 2, text: `+${pts}${comboRef.current >= 3 ? ' コンボ！' : ''}`, color: COLORS[idx].hex, big: comboRef.current >= 3 }])
      setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 800)
      setTimeout(() => { setFlash(null); newRound() }, 200)
    } else {
      comboRef.current = 0
      setCombo(0)
      setFlash('wrong')
      audio.sfxMiss()
      setTimeout(() => setFlash(null), 300)
    }
  }

  const urgent = timeLeft <= 15
  const targetColor = COLORS[target]

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} />

      {combo >= 3 && (
        <div className="absolute top-16 right-4 font-black text-lg animate-bounce z-30" style={{ color: '#FFD700' }}>
          {combo}コンボ！🔥
        </div>
      )}

      <div className="flex flex-col items-center gap-6 mt-16">
        {/* Target color display */}
        <div className="text-center">
          <div className="text-white text-sm mb-2" style={{ color: 'rgba(255,255,255,.7)' }}>この色をタップ！</div>
          <div
            className="rounded-3xl flex flex-col items-center justify-center gap-2 transition-all duration-150"
            style={{
              width: 'clamp(160px,40vw,220px)',
              height: 'clamp(120px,28vw,160px)',
              background: flash === 'correct' ? '#4ADE80' : flash === 'wrong' ? '#EF4444' : targetColor.hex,
              boxShadow: `0 0 40px ${targetColor.hex}88`,
              border: '4px solid rgba(255,255,255,.3)',
            }}
          >
            <div style={{ fontSize: 'clamp(2rem,8vw,3rem)' }}>{targetColor.emoji}</div>
            <div className="font-black text-white text-xl" style={{ textShadow: '0 2px 8px rgba(0,0,0,.5)' }}>{targetColor.name}</div>
          </div>
        </div>

        {/* Options grid */}
        <div className="grid grid-cols-2 gap-3" style={{ width: 'clamp(280px,70vw,380px)' }}>
          {options.map(optIdx => {
            const c = COLORS[optIdx]
            return (
              <button
                key={optIdx}
                onClick={() => handleSelect(optIdx)}
                className="rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-100 active:scale-95"
                style={{
                  background: c.hex,
                  height: 'clamp(70px,16vw,90px)',
                  border: '3px solid rgba(255,255,255,.3)',
                  boxShadow: `0 4px 16px ${c.hex}66`,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 'clamp(1.5rem,5vw,2rem)' }}>{c.emoji}</div>
                <div className="font-bold text-white text-sm" style={{ textShadow: '0 1px 4px rgba(0,0,0,.6)' }}>{c.name}</div>
                <div className="text-xs text-white/60">[{c.key}]</div>
              </button>
            )
          })}
        </div>

        <div className="text-xs" style={{ color: 'rgba(255,255,255,.4)' }}>数字キー 1〜6 でも選べるよ</div>
      </div>

      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
