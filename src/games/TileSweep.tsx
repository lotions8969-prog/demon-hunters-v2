import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const GRID = 4

export function TileSweep({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [flipped, setFlipped] = useState<boolean[]>(() => Array(GRID * GRID).fill(false))
  const [particles, setParticles] = useState<ScoreParticleData[]>([])
  const [round, setRound] = useState(1)
  const [done, _setDone] = useState(false)
  const [bonusActive, setBonusActive] = useState(false)

  const scoreRef = useRef(0)
  const flippedRef = useRef<boolean[]>(Array(GRID * GRID).fill(false))
  const roundRef = useRef(1)
  const activeRef = useRef(true)
  const startTimeRef = useRef(Date.now())
  const timerRef = useRef(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const timeRef = useRef(60)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    clearInterval(timerRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  function startRound(r: number) {
    flippedRef.current = Array(GRID * GRID).fill(false)
    setFlipped([...flippedRef.current])
    roundRef.current = r
    setRound(r)
    startTimeRef.current = Date.now()
    setBonusActive(true)
    setTimeout(() => setBonusActive(false), 3000)
  }

  useEffect(() => {
    audio.start('tileSweep')
    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1; timeRef.current = n; setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)
    return () => { activeRef.current = false; clearInterval(timerRef.current) }
  }, [audio, endGame])

  function tapTile(idx: number, ex: number, ey: number) {
    if (done || !activeRef.current || flippedRef.current[idx]) return
    flippedRef.current[idx] = true
    setFlipped([...flippedRef.current])
    audio.sfxFlip()

    const allFlipped = flippedRef.current.every(f => f)
    if (allFlipped) {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const bonus = elapsed < 3 ? 200 : elapsed < 5 ? 100 : 50
      const pts = bonus + roundRef.current * 10
      scoreRef.current += pts
      setScore(scoreRef.current)
      audio.sfxSpecial()
      const pid = Date.now()
      setParticles(q => [...q, { id: pid, x: ex, y: ey, text: `+${pts} クリア！`, color: '#FFD700', big: true }])
      setTimeout(() => setParticles(q => q.filter(x => x.id !== pid)), 900)
      const nr = roundRef.current + 1
      setTimeout(() => { if (activeRef.current) startRound(nr) }, 800)
    }
  }

  const urgent = timeLeft <= 10
  const EMOJIS = ['👹', '💀', '😈', '🧟', '👻', '🕷️', '🔮', '🧿', '👁️', '🐉', '💣', '🗡️', '⚔️', '🔥', '🌟', '💥']

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <div className="absolute top-4 left-0 right-0 flex justify-between items-center px-4 mt-10">
        <div className="font-black text-2xl" style={{ color: '#FFD700' }}>{score}</div>
        <div className="font-black text-xl" style={{ color: urgent ? '#F87171' : 'white' }}>{timeLeft}s</div>
        <div className="text-sm" style={{ color: 'rgba(255,255,255,.6)' }}>ラウンド {round}</div>
      </div>
      <div className="absolute top-0 left-0 right-0 h-1 z-30" style={{ background: 'rgba(255,255,255,.1)' }}>
        <div className="h-full transition-all duration-1000" style={{ width: `${(timeLeft / 60) * 100}%`, background: urgent ? '#F87171' : char.color }} />
      </div>
      <div className="mt-16 flex flex-col items-center gap-4">
        {bonusActive && <div className="font-black text-sm animate-pulse" style={{ color: '#FFD700' }}>⚡ はやくめくるとボーナス！</div>}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}>
          {Array.from({ length: GRID * GRID }, (_, i) => (
            <button
              key={i}
              onPointerDown={e => { e.stopPropagation(); tapTile(i, e.clientX, e.clientY) }}
              className="rounded-xl flex items-center justify-center font-black transition-all duration-200"
              style={{
                width: 68, height: 68,
                background: flipped[i] ? `${char.color}33` : char.color,
                border: `2px solid ${flipped[i] ? `${char.color}44` : char.color}`,
                fontSize: flipped[i] ? '1.8rem' : '0',
                opacity: flipped[i] ? 0.5 : 1,
                boxShadow: flipped[i] ? 'none' : `0 0 12px ${char.color}66`,
                touchAction: 'none',
                transform: flipped[i] ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}>
              {flipped[i] ? EMOJIS[i % EMOJIS.length] : ''}
            </button>
          ))}
        </div>
        <div className="text-xs" style={{ color: 'rgba(255,255,255,.4)' }}>全てのタイルをめくろう！</div>
      </div>
      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
