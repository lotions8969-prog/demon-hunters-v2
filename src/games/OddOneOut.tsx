import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const SETS = [
  { items: ['🍎','🍎','🍎','🍊','🍎','🍎','🍎','🍎','🍎'], odd: 3 },
  { items: ['🐱','🐱','🐱','🐱','🐶','🐱','🐱','🐱','🐱'], odd: 4 },
  { items: ['⭐','⭐','⭐','⭐','⭐','⭐','💫','⭐','⭐'], odd: 6 },
  { items: ['🔴','🔴','🔴','🔴','🔴','🔵','🔴','🔴','🔴'], odd: 5 },
  { items: ['🎵','🎵','🎵','🎵','🎵','🎵','🎵','🎸','🎵'], odd: 7 },
  { items: ['🌸','🌸','🌸','🌸','🌸','🌸','🌸','🌸','🌺'], odd: 8 },
  { items: ['👹','👹','👹','😈','👹','👹','👹','👹','👹'], odd: 3 },
  { items: ['💎','💎','💎','💎','💎','💎','💎','💜','💎'], odd: 7 },
  { items: ['🔥','🔥','🔥','🔥','❄️','🔥','🔥','🔥','🔥'], odd: 4 },
  { items: ['🎮','🎮','🎮','🎮','🎮','🎮','🕹️','🎮','🎮'], odd: 6 },
  { items: ['🌙','🌙','🌙','🌙','🌙','☀️','🌙','🌙','🌙'], odd: 5 },
  { items: ['🏆','🏆','🏆','🥇','🏆','🏆','🏆','🏆','🏆'], odd: 3 },
]

function newPuzzle(scoreVal: number) {
  const idx = Math.floor(Math.random() * SETS.length)
  const base = SETS[idx]
  // Shuffle positions
  const positions = Array.from({ length: 9 }, (_, i) => i)
  for (let i = 8; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]]
  }
  const items = Array(9).fill('')
  const shuffledOdd = positions[base.odd]
  for (let i = 0; i < 9; i++) {
    items[positions[i]] = base.items[i]
  }
  return { items, odd: shuffledOdd, level: Math.min(3, Math.floor(scoreVal / 100) + 1) }
}

export function OddOneOut({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [puzzle, setPuzzle] = useState(() => newPuzzle(0))
  const [flash, setFlash] = useState<number | null>(null)
  const [combo, setCombo] = useState(0)

  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const timeRef = useRef(60)
  const activeRef = useRef(true)
  const timerRef = useRef(0)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    clearInterval(timerRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('oddOneOut')
    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1; timeRef.current = n; setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)
    return () => { activeRef.current = false; clearInterval(timerRef.current) }
  }, [audio, endGame])

  function tap(idx: number) {
    if (!activeRef.current) return
    setFlash(idx)
    setTimeout(() => setFlash(null), 250)
    if (idx === puzzle.odd) {
      comboRef.current++
      setCombo(comboRef.current)
      const pts = 10 * (comboRef.current >= 3 ? 2 : 1)
      scoreRef.current += pts
      setScore(scoreRef.current)
      audio.sfxCatch()
      if (comboRef.current >= 3) audio.sfxCombo()
      setPuzzle(newPuzzle(scoreRef.current))
    } else {
      comboRef.current = 0
      setCombo(0)
      audio.sfxMiss()
    }
  }

  const urgent = timeLeft <= 10
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} combo={combo} />
      <div className="mt-16 flex flex-col items-center gap-4">
        <div className="text-white font-bold text-sm" style={{ color: 'rgba(255,255,255,.6)' }}>なかまはずれをさがせ！</div>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3,1fr)', width: 'min(88vw, 320px)' }}>
          {puzzle.items.map((item, i) => (
            <button key={i} onClick={() => tap(i)}
              className="aspect-square rounded-2xl flex items-center justify-center text-4xl transition-all duration-150 cursor-pointer active:scale-90"
              style={{
                background: flash === i ? (i === puzzle.odd ? `${char.color}44` : 'rgba(239,68,68,.3)') : 'rgba(255,255,255,.07)',
                border: `2px solid ${flash === i ? char.color : 'rgba(255,255,255,.12)'}`,
                fontSize: 'clamp(1.8rem,7vw,2.5rem)',
              }}>
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
