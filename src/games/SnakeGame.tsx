import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const GRID = 20
const CELL = Math.min(Math.floor(Math.min(window.innerWidth, window.innerHeight - 120) / GRID), 24)
const W = GRID * CELL
const H = GRID * CELL

type Dir = 'up' | 'down' | 'left' | 'right'
type Point = { x: number; y: number }

const FOOD_EMOJIS = ['⭐', '💎', '🍎', '🍊', '🍋', '🍇', '🌟']
const DEMON_EMOJIS = ['👹', '💀', '😈', '🧟']

export function SnakeGame({ char, audio, onEnd, onBack }: Props) {
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }])
  const [food, setFood] = useState<Point>({ x: 15, y: 10 })
  const [foodEmoji, setFoodEmoji] = useState('⭐')
  const [demons, setDemons] = useState<Point[]>([])
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(90)
  const [started, setStarted] = useState(false)

  const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }])
  const dirRef = useRef<Dir>('right')
  const nextDirRef = useRef<Dir>('right')
  const foodRef = useRef<Point>({ x: 15, y: 10 })
  const scoreRef = useRef(0)
  const timeRef = useRef(90)
  const activeRef = useRef(false)
  const startedRef = useRef(false)   // ref copy to avoid re-registering keydown
  const loopRef = useRef(0)
  const timerRef = useRef(0)
  const demonsRef = useRef<Point[]>([])
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const startGameRef = useRef<() => void>(() => {})

  const spawnFood = useCallback((sn: Point[]) => {
    let pos: Point
    do { pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) } }
    while (sn.some(p => p.x === pos.x && p.y === pos.y))
    foodRef.current = pos
    setFood(pos)
    setFoodEmoji(FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)])
  }, [])

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    clearInterval(loopRef.current)
    clearInterval(timerRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 600)
  }, [audio, onEnd])

  // Restart game loop with updated speed
  const restartLoop = useCallback(() => {
    clearInterval(loopRef.current)
    const speed = Math.max(80, 180 - snakeRef.current.length * 8)
    loopRef.current = window.setInterval(() => {
      if (!activeRef.current) return
      dirRef.current = nextDirRef.current

      const head = snakeRef.current[0]
      let nx = head.x, ny = head.y
      if (dirRef.current === 'right') nx++
      if (dirRef.current === 'left')  nx--
      if (dirRef.current === 'up')    ny--
      if (dirRef.current === 'down')  ny++

      if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) { endGame(); return }
      if (snakeRef.current.some(p => p.x === nx && p.y === ny)) { endGame(); return }
      if (demonsRef.current.some(p => p.x === nx && p.y === ny)) { endGame(); return }

      const newSnake = [{ x: nx, y: ny }, ...snakeRef.current]
      const ate = nx === foodRef.current.x && ny === foodRef.current.y
      if (!ate) {
        newSnake.pop()
      } else {
        scoreRef.current += 10 + Math.floor(snakeRef.current.length / 3)
        setScore(scoreRef.current)
        audio.sfxEat()
        spawnFood(newSnake)
        if (newSnake.length % 5 === 0) {
          let dp: Point
          do { dp = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) } }
          while (newSnake.some(p => p.x === dp.x && p.y === dp.y))
          demonsRef.current = [...demonsRef.current, dp]
          setDemons([...demonsRef.current])
        }
        // Restart loop at new (faster) speed
        setTimeout(restartLoop, 0)
      }

      snakeRef.current = newSnake
      setSnake([...newSnake])
    }, speed)
  }, [endGame, spawnFood, audio])

  useEffect(() => {
    startGameRef.current = () => {
      if (startedRef.current) return
      startedRef.current = true
      activeRef.current = true
      setStarted(true)
      audio.start('snake')
      restartLoop()
      timerRef.current = window.setInterval(() => {
        const n = timeRef.current - 1
        timeRef.current = n
        setTimeLeft(n)
        if (n <= 0) { clearInterval(timerRef.current); endGame() }
      }, 1000)
    }
  }, [audio, endGame, restartLoop])

  // Single keydown listener, no re-registration
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const d = dirRef.current
      if ((e.key === 'ArrowUp'    || e.key === 'w') && d !== 'down')  { e.preventDefault(); nextDirRef.current = 'up' }
      if ((e.key === 'ArrowDown'  || e.key === 's') && d !== 'up')    { e.preventDefault(); nextDirRef.current = 'down' }
      if ((e.key === 'ArrowLeft'  || e.key === 'a') && d !== 'right') { e.preventDefault(); nextDirRef.current = 'left' }
      if ((e.key === 'ArrowRight' || e.key === 'd') && d !== 'left')  { e.preventDefault(); nextDirRef.current = 'right' }
      if ((e.key === 'Enter' || e.key === ' ') && !startedRef.current) { e.preventDefault(); startGameRef.current() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, []) // empty deps: registered once only

  useEffect(() => {
    return () => {
      activeRef.current = false
      clearInterval(loopRef.current)
      clearInterval(timerRef.current)
    }
  }, [])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    const d = dirRef.current
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 20 && d !== 'left') nextDirRef.current = 'right'
      if (dx < -20 && d !== 'right') nextDirRef.current = 'left'
    } else {
      if (dy > 20 && d !== 'up') nextDirRef.current = 'down'
      if (dy < -20 && d !== 'down') nextDirRef.current = 'up'
    }
    touchStartRef.current = null
  }

  const urgent = timeLeft <= 15

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: char.bg, touchAction: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} />

      <div className="relative mt-14" style={{ width: W, height: H, border: `2px solid ${char.color}44`, borderRadius: 4, background: 'rgba(0,0,0,.4)' }}>
        {Array.from({ length: GRID + 1 }).map((_, i) => (
          <div key={`h${i}`} className="absolute" style={{ left: 0, right: 0, top: i * CELL, height: 1, background: 'rgba(255,255,255,.04)' }} />
        ))}
        {Array.from({ length: GRID + 1 }).map((_, i) => (
          <div key={`v${i}`} className="absolute" style={{ top: 0, bottom: 0, left: i * CELL, width: 1, background: 'rgba(255,255,255,.04)' }} />
        ))}

        {snake.map((p, i) => (
          <div key={i} className="absolute"
            style={{
              left: p.x * CELL + 1, top: p.y * CELL + 1,
              width: CELL - 2, height: CELL - 2,
              borderRadius: i === 0 ? 6 : 4,
              background: i === 0 ? char.color : `${char.color}${Math.round(255 * (1 - i / snake.length * 0.7)).toString(16).padStart(2, '0')}`,
              overflow: 'hidden', zIndex: 10,
            }}
          >
            {i === 0 && <img src={char.img.profile} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} draggable={false} />}
          </div>
        ))}

        <div className="absolute flex items-center justify-center" style={{ left: food.x * CELL, top: food.y * CELL, width: CELL, height: CELL, fontSize: CELL * 0.8, zIndex: 11, lineHeight: 1 }}>
          {foodEmoji}
        </div>

        {demons.map((d, i) => (
          <div key={i} className="absolute flex items-center justify-center" style={{ left: d.x * CELL, top: d.y * CELL, width: CELL, height: CELL, fontSize: CELL * 0.8, zIndex: 11, lineHeight: 1 }}>
            {DEMON_EMOJIS[i % DEMON_EMOJIS.length]}
          </div>
        ))}

        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded z-20 gap-3">
            <div style={{ fontSize: '3rem' }}>🐍</div>
            <div className="text-white font-bold text-lg">スネーク</div>
            <div className="text-sm text-center px-4" style={{ color: 'rgba(255,255,255,.7)' }}>えさをたべてながくなれ！<br/>デーモンと壁はNG！</div>
            <button onClick={() => startGameRef.current()} className="mt-2 font-black rounded-full px-6 py-2 text-white" style={{ background: char.color, border: 'none', cursor: 'pointer' }}>
              スタート！
            </button>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,.4)' }}>← → ↑ ↓ キー / スワイプ で操作</div>
          </div>
        )}
      </div>

      {started && (
        <div className="flex flex-col items-center gap-1 mt-4" style={{ touchAction: 'none' }}>
          <button onPointerDown={() => { if (dirRef.current !== 'down') nextDirRef.current = 'up' }} style={{ width: 56, height: 56, borderRadius: 10, background: 'rgba(255,255,255,.15)', border: `2px solid ${char.color}66`, fontSize: 22, color: 'white', cursor: 'pointer' }}>▲</button>
          <div className="flex gap-1">
            <button onPointerDown={() => { if (dirRef.current !== 'right') nextDirRef.current = 'left' }} style={{ width: 56, height: 56, borderRadius: 10, background: 'rgba(255,255,255,.15)', border: `2px solid ${char.color}66`, fontSize: 22, color: 'white', cursor: 'pointer' }}>◀</button>
            <div style={{ width: 56, height: 56 }} />
            <button onPointerDown={() => { if (dirRef.current !== 'left') nextDirRef.current = 'right' }} style={{ width: 56, height: 56, borderRadius: 10, background: 'rgba(255,255,255,.15)', border: `2px solid ${char.color}66`, fontSize: 22, color: 'white', cursor: 'pointer' }}>▶</button>
          </div>
          <button onPointerDown={() => { if (dirRef.current !== 'up') nextDirRef.current = 'down' }} style={{ width: 56, height: 56, borderRadius: 10, background: 'rgba(255,255,255,.15)', border: `2px solid ${char.color}66`, fontSize: 22, color: 'white', cursor: 'pointer' }}>▼</button>
        </div>
      )}
    </div>
  )
}
