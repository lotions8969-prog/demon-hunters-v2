import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

function genQuestion(): { q: string; a: number } {
  const ops = ['+', '-', '×', '÷'] as const
  const op = ops[Math.floor(Math.random() * ops.length)]
  if (op === '+') { const a = Math.floor(Math.random() * 50) + 1, b = Math.floor(Math.random() * 50) + 1; return { q: `${a} + ${b}`, a: a + b } }
  if (op === '-') { const a = Math.floor(Math.random() * 50) + 20, b = Math.floor(Math.random() * a) + 1; return { q: `${a} - ${b}`, a: a - b } }
  if (op === '×') { const a = Math.floor(Math.random() * 12) + 1, b = Math.floor(Math.random() * 12) + 1; return { q: `${a} × ${b}`, a: a * b } }
  const b = [2,3,4,5,6,7,8,9,10][Math.floor(Math.random() * 9)]
  const a = b * (Math.floor(Math.random() * 10) + 1)
  return { q: `${a} ÷ ${b}`, a: a / b }
}

export function MathBlitz({ char, audio, onEnd, onBack }: Props) {
  const [question, setQuestion] = useState(() => genQuestion())
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [combo, setCombo] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)

  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const timeRef = useRef(60)
  const activeRef = useRef(true)
  const timerRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    clearInterval(timerRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('mathBlitz')
    inputRef.current?.focus()
    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1; timeRef.current = n; setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)
    return () => { activeRef.current = false; clearInterval(timerRef.current) }
  }, [audio, endGame])

  function submit() {
    const val = parseInt(input.trim(), 10)
    if (isNaN(val)) return
    if (val === question.a) {
      comboRef.current++
      setCombo(comboRef.current)
      const pts = 10 * Math.ceil(comboRef.current / 2)
      scoreRef.current += pts
      setScore(scoreRef.current)
      setFeedback('correct')
      audio.sfxMatch()
      setInput('')
      setQuestion(genQuestion())
      setTimeout(() => setFeedback(null), 300)
    } else {
      comboRef.current = 0
      setCombo(0)
      setFeedback('wrong')
      audio.sfxMiss()
      setInput('')
      setTimeout(() => setFeedback(null), 400)
    }
  }

  const urgent = timeLeft <= 15

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} />

      {combo >= 3 && (
        <div className="absolute top-16 right-4 z-30 font-black text-lg animate-bounce" style={{ color: '#FFD700' }}>
          {combo}コンボ！⚡
        </div>
      )}

      <div className="flex flex-col items-center gap-6 mt-14 w-full max-w-sm px-6">
        {/* Question card */}
        <div
          className="w-full rounded-3xl p-8 text-center transition-all duration-150"
          style={{
            background: feedback === 'correct' ? 'rgba(74,222,128,0.15)' : feedback === 'wrong' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)',
            border: `2px solid ${feedback === 'correct' ? '#4ADE80' : feedback === 'wrong' ? '#EF4444' : char.color + '44'}`,
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="text-sm font-semibold tracking-widest uppercase mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>もんだい</div>
          <div className="font-black" style={{ fontSize: 'clamp(2.5rem,10vw,4rem)', color: 'white', letterSpacing: '-0.03em' }}>
            {question.q} = <span style={{ color: char.color }}>?</span>
          </div>
          {feedback === 'correct' && <div className="mt-2 text-2xl">✅</div>}
          {feedback === 'wrong' && <div className="mt-2 text-sm font-bold" style={{ color: '#EF4444' }}>こたえ: {question.a}</div>}
        </div>

        {/* Input */}
        <div className="w-full flex gap-2">
          <input
            ref={inputRef}
            type="number"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
            className="flex-1 rounded-2xl px-4 py-4 text-center font-black text-xl outline-none"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: `2px solid ${char.color}55`,
              color: 'white',
              caretColor: char.color,
            }}
            placeholder="こたえをいれてね"
            autoComplete="off"
          />
          <button
            onClick={submit}
            className="rounded-2xl px-5 font-black text-white transition-all duration-150 active:scale-95"
            style={{ background: char.color, border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            ✓
          </button>
        </div>

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>数字を入力して Enter を押そう</p>
      </div>
    </div>
  )
}
