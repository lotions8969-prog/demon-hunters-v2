import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const DEMON_WORDS = [
  'fire', 'dark', 'evil', 'doom', 'rage', 'fear', 'void', 'curse',
  'flame', 'storm', 'ghost', 'blood', 'night', 'death', 'chaos',
  'magic', 'power', 'blade', 'arrow', 'light', 'fight', 'brave',
  'speed', 'dance', 'music', 'stars', 'dream', 'shine', 'spark',
  'flash', 'blast', 'crash', 'smash', 'punch', 'kick',
]

interface DemonWord { id: number; word: string; x: number; y: number; speed: number; emoji: string }
const DEMON_EMOJIS = ['👹', '💀', '😈', '🧟', '🦇', '🔮']

export function TypeRace({ char, audio, onEnd, onBack }: Props) {
  const [words, setWords] = useState<DemonWord[]>([])
  const [typed, setTyped] = useState('')
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [combo, setCombo] = useState(0)

  const wordsRef = useRef<DemonWord[]>([])
  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const timeRef = useRef(60)
  const nextId = useRef(0)
  const activeRef = useRef(true)
  const rafRef = useRef(0)
  const timerRef = useRef(0)
  const spawnRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    cancelAnimationFrame(rafRef.current)
    clearInterval(timerRef.current)
    clearTimeout(spawnRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('typeRace')
    inputRef.current?.focus()

    const H = window.innerHeight
    const W = window.innerWidth

    function loop() {
      if (!activeRef.current) return
      const prog = 1 - timeRef.current / 60
      wordsRef.current = wordsRef.current
        .map(w => ({ ...w, y: w.y + w.speed * (1 + prog * 0.5) }))
        .filter(w => {
          if (w.y > H) {
            comboRef.current = 0
            setCombo(0)
            return false
          }
          return true
        })
      setWords([...wordsRef.current])
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1
      timeRef.current = n
      setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)

    function spawn() {
      if (!activeRef.current) return
      const prog = 1 - timeRef.current / 60
      const word = DEMON_WORDS[Math.floor(Math.random() * DEMON_WORDS.length)]
      wordsRef.current = [...wordsRef.current, {
        id: nextId.current++,
        word,
        x: 60 + Math.random() * (W - 120),
        y: -40,
        speed: 0.8 + prog * 1.5 + Math.random() * 0.5,
        emoji: DEMON_EMOJIS[Math.floor(Math.random() * DEMON_EMOJIS.length)],
      }]
      spawnRef.current = window.setTimeout(spawn, Math.max(800, 2000 - prog * 1200))
    }
    spawnRef.current = window.setTimeout(spawn, 1000)

    return () => {
      activeRef.current = false
      cancelAnimationFrame(rafRef.current)
      clearInterval(timerRef.current)
      clearTimeout(spawnRef.current)
    }
  }, [audio, endGame])

  function handleInput(val: string) {
    setTyped(val)
    const match = wordsRef.current.find(w => w.word === val.trim().toLowerCase())
    if (match) {
      wordsRef.current = wordsRef.current.filter(w => w.id !== match.id)
      setWords([...wordsRef.current])
      comboRef.current++
      setCombo(comboRef.current)
      const pts = 10 * Math.ceil(comboRef.current / 3)
      scoreRef.current += pts
      setScore(scoreRef.current)
      audio.sfxType()
      if (comboRef.current >= 3) audio.sfxCombo()
      setTyped('')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === ' ') {
      const val = typed.trim().toLowerCase()
      const match = wordsRef.current.find(w => w.word === val)
      if (match) {
        wordsRef.current = wordsRef.current.filter(w => w.id !== match.id)
        setWords([...wordsRef.current])
        comboRef.current++
        setCombo(comboRef.current)
        const pts = 10 * Math.ceil(comboRef.current / 3)
        scoreRef.current += pts
        setScore(scoreRef.current)
        audio.sfxType()
        if (comboRef.current >= 3) audio.sfxCombo()
        setTyped('')
        e.preventDefault()
      }
    }
  }

  const urgent = timeLeft <= 15

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} />

      {/* Combo indicator */}
      {combo >= 2 && (
        <div className="absolute top-14 right-4 font-black text-lg z-30 animate-bounce" style={{ color: '#FFD700' }}>
          {combo}コンボ！🔥
        </div>
      )}

      {/* Words */}
      {words.map(w => (
        <div key={w.id} className="absolute pointer-events-none flex flex-col items-center gap-1" style={{ left: w.x - 40, top: w.y, zIndex: 10 }}>
          <div style={{ fontSize: 32, lineHeight: 1 }}>{w.emoji}</div>
          <div className="px-2 py-1 rounded-lg font-mono font-bold text-sm"
            style={{
              background: 'rgba(0,0,0,.7)',
              border: `2px solid ${typed && w.word.startsWith(typed.toLowerCase()) ? char.color : 'rgba(255,255,255,.3)'}`,
              color: typed && w.word.startsWith(typed.toLowerCase()) ? char.color : 'white',
              boxShadow: typed && w.word.startsWith(typed.toLowerCase()) ? `0 0 12px ${char.color}88` : 'none',
            }}
          >
            <span style={{ color: char.color }}>{typed && w.word.startsWith(typed.toLowerCase()) ? w.word.slice(0, typed.length) : ''}</span>
            <span>{typed && w.word.startsWith(typed.toLowerCase()) ? w.word.slice(typed.length) : w.word}</span>
          </div>
        </div>
      ))}

      {/* Input area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-30" style={{ background: 'rgba(0,0,0,.7)' }}>
        <div className="max-w-md mx-auto flex gap-2 items-center">
          <div className="text-white font-bold text-sm mr-2">⌨️</div>
          <input
            ref={inputRef}
            value={typed}
            onChange={e => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 rounded-xl px-4 py-3 font-mono font-bold text-lg outline-none"
            style={{
              background: 'rgba(255,255,255,.1)',
              border: `2px solid ${char.color}`,
              color: 'white',
              caretColor: char.color,
            }}
            placeholder="もじをうって Enterでたおせ！"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  )
}
