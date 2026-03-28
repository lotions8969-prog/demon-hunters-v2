import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const WORDS = [
  'demon','hunter','magic','sword','power','dance','music','light','night','brave',
  'flame','storm','ghost','blade','dream','shine','spark','speed','super','ultra',
  'hero','star','moon','fire','wind','earth','water','space','cloud','river',
  'tiger','eagle','shark','wolf','bear','lion','fox','deer','bird','fish',
]

function scramble(word: string): string {
  const arr = word.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.join('') === word ? scramble(word) : arr.join('')
}

export function WordScramble({ char, audio, onEnd, onBack }: Props) {
  const [word, setWord] = useState(() => WORDS[0])
  const [scrambled, setScrambled] = useState(() => scramble(WORDS[0]))
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [combo, setCombo] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [showHint, setShowHint] = useState(false)

  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const timeRef = useRef(60)
  const activeRef = useRef(true)
  const timerRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const wordRef = useRef(word)

  function nextWord() {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)]
    wordRef.current = w
    setWord(w)
    setScrambled(scramble(w))
    setInput('')
    setShowHint(false)
  }

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    clearInterval(timerRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)]
    wordRef.current = w
    setWord(w)
    setScrambled(scramble(w))
    audio.start('wordScramble')
    inputRef.current?.focus()
    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1; timeRef.current = n; setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)
    return () => { activeRef.current = false; clearInterval(timerRef.current) }
  }, [audio, endGame])

  function submit() {
    const val = input.trim().toLowerCase()
    if (!val) return
    if (val === wordRef.current) {
      comboRef.current++
      setCombo(comboRef.current)
      const pts = 10 + wordRef.current.length * 3 + (comboRef.current >= 3 ? 10 : 0)
      scoreRef.current += pts
      setScore(scoreRef.current)
      setFeedback('correct')
      audio.sfxMatch()
      setTimeout(() => { setFeedback(null); nextWord() }, 400)
    } else {
      comboRef.current = 0; setCombo(0)
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
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} combo={combo} />

      <div className="flex flex-col items-center gap-6 mt-14 w-full max-w-sm px-6">
        {/* Scrambled word */}
        <div
          className="w-full rounded-3xl p-8 text-center transition-all duration-200"
          style={{
            background: feedback === 'correct' ? 'rgba(74,222,128,0.15)' : feedback === 'wrong' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)',
            border: `2px solid ${feedback === 'correct' ? '#4ADE80' : feedback === 'wrong' ? '#EF4444' : char.color + '33'}`,
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>ならべかえよう</div>
          <div className="font-black tracking-widest" style={{ fontSize: 'clamp(2rem,10vw,3.5rem)', color: 'white', letterSpacing: '0.2em' }}>
            {scrambled.toUpperCase()}
          </div>
          {showHint && (
            <div className="mt-2 text-sm" style={{ color: char.color }}>ヒント: {word.length}文字の英単語</div>
          )}
          {feedback === 'correct' && <div className="text-2xl mt-2">✅ {word.toUpperCase()}!</div>}
        </div>

        {/* Input */}
        <div className="w-full flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value.replace(/[^a-zA-Z]/g, ''))}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
            className="flex-1 rounded-2xl px-4 py-4 text-center font-black text-xl tracking-widest uppercase outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', border: `2px solid ${char.color}55`, color: 'white', caretColor: char.color }}
            placeholder="ならべて入力"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          <button onClick={submit} className="rounded-2xl px-5 font-black text-white" style={{ background: char.color, border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✓</button>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setShowHint(true)} className="text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}>
            💡 ヒント
          </button>
          <button onClick={nextWord} className="text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}>
            ⏭ スキップ
          </button>
        </div>
      </div>
    </div>
  )
}
