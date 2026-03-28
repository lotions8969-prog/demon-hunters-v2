import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }
interface NumItem { n: number; x: number; y: number }

const COUNT = 9

export function CatchOrder({ char, audio, onEnd, onBack }: Props) {
  const [items, setItems] = useState<NumItem[]>([])
  const [next, setNext] = useState(1)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(90)
  const [round, setRound] = useState(0)
  const [flash, setFlash] = useState<number | null>(null)

  const scoreRef = useRef(0)
  const timeRef = useRef(90)
  const nextRef = useRef(1)
  const roundStartRef = useRef(performance.now())
  const activeRef = useRef(true)
  const timerRef = useRef(0)

  function spawnItems() {
    const W = window.innerWidth
    const H = window.innerHeight
    const margin = 60
    const newItems: NumItem[] = []
    const positions: {x:number;y:number}[] = []

    for (let n = 1; n <= COUNT; n++) {
      let x, y, tries = 0
      do {
        x = margin + Math.random() * (W - margin * 2)
        y = margin + 60 + Math.random() * (H - margin * 2 - 60)
        tries++
      } while (tries < 20 && positions.some(p => Math.abs(p.x - x!) < 70 && Math.abs(p.y - y!) < 70))
      positions.push({ x: x!, y: y! })
      newItems.push({ n, x: x!, y: y! })
    }
    setItems(newItems)
    nextRef.current = 1
    setNext(1)
    roundStartRef.current = performance.now()
  }

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    clearInterval(timerRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('catchOrder')
    spawnItems()
    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1; timeRef.current = n; setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)
    return () => { activeRef.current = false; clearInterval(timerRef.current) }
  }, [audio, endGame])

  function handleTap(n: number) {
    if (n !== nextRef.current) {
      audio.sfxMiss()
      return
    }
    setFlash(n)
    setTimeout(() => setFlash(null), 200)

    if (n === COUNT) {
      // Round complete
      const elapsed = (performance.now() - roundStartRef.current) / 1000
      const pts = Math.max(10, Math.round(200 - elapsed * 10))
      scoreRef.current += pts
      setScore(scoreRef.current)
      setRound(r => r + 1)
      audio.sfxSpecial()
      setTimeout(spawnItems, 400)
    } else {
      nextRef.current = n + 1
      setNext(n + 1)
      audio.sfxCatch()
      setItems(prev => prev.filter(it => it.n !== n))
    }
  }

  // Keyboard: 1-9
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const n = parseInt(e.key)
      if (n >= 1 && n <= COUNT) { e.preventDefault(); handleTap(n) }
    }
    window.addEventListener('keydown', kd)
    return () => window.removeEventListener('keydown', kd)
  }, [])

  const urgent = timeLeft <= 20

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: char.bg, touchAction: 'none' }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} />

      <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>つぎ:</span>
        <span className="font-black text-2xl" style={{ color: char.color }}>{next}</span>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>ラウンド {round + 1}</span>
      </div>

      {items.map(item => (
        <button
          key={item.n}
          onClick={() => handleTap(item.n)}
          className="absolute transition-all duration-150 rounded-2xl font-black flex items-center justify-center cursor-pointer"
          style={{
            left: item.x - 35,
            top: item.y - 35,
            width: 70,
            height: 70,
            background: flash === item.n ? char.color : item.n === next ? `${char.color}22` : 'rgba(255,255,255,0.07)',
            border: `2px solid ${item.n === next ? char.color : 'rgba(255,255,255,0.15)'}`,
            color: item.n === next ? char.color : 'rgba(255,255,255,0.6)',
            fontSize: '1.6rem',
            boxShadow: item.n === next ? `0 0 20px ${char.color}44` : 'none',
            transform: flash === item.n ? 'scale(1.15)' : item.n === next ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          {item.n}
        </button>
      ))}

      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
        じゅんばんにタップ！数字キー 1〜9 でも OK
      </p>
    </div>
  )
}
