import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

export function HigherLower({ char, audio, onEnd, onBack }: Props) {
  const MAX = 5
  const [target] = useState(() => Math.floor(Math.random() * 100) + 1)
  const [guess, setGuess] = useState('')
  const [feedback, setFeedback] = useState<string>('')
  const [guesses, setGuesses] = useState(0)
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [solved, setSolved] = useState(false)
  const [history, setHistory] = useState<{n:number;dir:string}[]>([])

  const targetRef = useRef(target)
  const guessesRef = useRef(0)
  const scoreRef = useRef(0)
  const roundRef = useRef(1)
  const activeRef = useRef(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const TOTAL_ROUNDS = 5

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('higherLower')
    inputRef.current?.focus()
    return () => { activeRef.current = false }
  }, [audio])

  function nextRound() {
    const t = Math.floor(Math.random() * 100) + 1
    targetRef.current = t
    guessesRef.current = 0
    setGuesses(0)
    setHistory([])
    setFeedback('')
    setGuess('')
    setSolved(false)
    const nr = roundRef.current + 1
    roundRef.current = nr
    setRound(nr)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  function submit() {
    const n = parseInt(guess.trim(), 10)
    if (isNaN(n) || n < 1 || n > 100 || solved) return
    const gc = guessesRef.current + 1
    guessesRef.current = gc
    setGuesses(gc)

    if (n === targetRef.current) {
      const pts = Math.max(10, 100 - (gc - 1) * 15)
      scoreRef.current += pts
      setScore(scoreRef.current)
      setFeedback(`🎉 せいかい！ +${pts}pt`)
      setSolved(true)
      audio.sfxSpecial()
      setHistory(h => [...h, { n, dir: '✅' }])
      if (roundRef.current >= TOTAL_ROUNDS) {
        setTimeout(() => endGame(), 1500)
      } else {
        setTimeout(() => nextRound(), 1500)
      }
    } else if (gc >= MAX) {
      setFeedback(`💀 こたえは ${targetRef.current}！`)
      setHistory(h => [...h, { n, dir: n < targetRef.current ? '⬆️' : '⬇️' }])
      audio.sfxMiss()
      setSolved(true)
      if (roundRef.current >= TOTAL_ROUNDS) {
        setTimeout(() => endGame(), 1800)
      } else {
        setTimeout(() => nextRound(), 1800)
      }
    } else {
      const dir = n < targetRef.current ? 'もっとたかい ⬆️' : 'もっとひくい ⬇️'
      setFeedback(dir)
      setHistory(h => [...h, { n, dir: n < targetRef.current ? '⬆️' : '⬇️' }])
      audio.sfxCatch()
    }
    setGuess('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <div className="absolute top-4 left-0 right-0 flex justify-between items-center px-4 mt-10">
        <div className="font-black text-2xl" style={{ color: '#FFD700' }}>{score}</div>
        <div className="text-sm" style={{ color: 'rgba(255,255,255,.6)' }}>ラウンド {round}/{TOTAL_ROUNDS}</div>
        <div className="text-sm" style={{ color: 'rgba(255,255,255,.6)' }}>のこり {MAX - guesses}かい</div>
      </div>
      <div className="flex flex-col items-center gap-4 w-full max-w-xs px-6 mt-10">
        <div className="text-white font-black text-lg">1〜100のかずをあてよう！</div>
        <div className="flex gap-1 flex-wrap justify-center">
          {history.map((h, i) => (
            <div key={i} className="px-2 py-1 rounded-lg text-sm font-bold" style={{ background: 'rgba(255,255,255,.1)', color: 'white' }}>
              {h.n} {h.dir}
            </div>
          ))}
        </div>
        {feedback && (
          <div className="font-black text-xl text-center animate-bounce" style={{ color: solved ? '#4ADE80' : char.color }}>{feedback}</div>
        )}
        <div className="w-full flex gap-2">
          <input
            ref={inputRef}
            type="number" min={1} max={100}
            value={guess}
            onChange={e => setGuess(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
            disabled={solved}
            className="flex-1 rounded-2xl px-4 py-4 text-center font-black text-2xl outline-none"
            style={{ background: 'rgba(255,255,255,.1)', border: `2px solid ${char.color}55`, color: 'white', caretColor: char.color }}
            placeholder="?"
            autoComplete="off"
          />
          <button onClick={submit} disabled={solved} className="rounded-2xl px-5 font-black text-white text-xl"
            style={{ background: solved ? 'rgba(255,255,255,.2)' : char.color, border: 'none', cursor: solved ? 'default' : 'pointer' }}>✓</button>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: MAX }, (_, i) => (
            <div key={i} className="w-4 h-4 rounded-full" style={{ background: i < guesses ? (solved && guesses <= i + 1 ? '#4ADE80' : '#EF4444') : 'rgba(255,255,255,.2)' }} />
          ))}
        </div>
      </div>
    </div>
  )
}
