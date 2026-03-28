import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const COLORS = ['#C084FC', '#FB7185', '#38BDF8', '#4ADE80', '#FB923C', '#FACC15']
const BASE_W = 240
const BLOCK_H = 32
const MAX_BLOCKS = 14
const CANVAS_W = 340
const CANVAS_H = 520

interface Block { x: number; w: number; color: string }

export function TowerStack({ char, audio, onEnd, onBack }: Props) {
  const [blocks, setBlocks] = useState<Block[]>([{ x: (CANVAS_W - BASE_W) / 2, w: BASE_W, color: char.color }])
  const [moving, setMoving] = useState({ x: 0, w: BASE_W, color: COLORS[1], dir: 1 })
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [perfect, setPerfect] = useState(false)

  const blocksRef = useRef<Block[]>([{ x: (CANVAS_W - BASE_W) / 2, w: BASE_W, color: char.color }])
  const movingRef = useRef({ x: 0, w: BASE_W, color: COLORS[1], dir: 1, speed: 2 })
  const scoreRef = useRef(0)
  const activeRef = useRef(true)
  const rafRef = useRef(0)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    cancelAnimationFrame(rafRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 400)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('towerStack')
    const prog = () => 1 + scoreRef.current * 0.12

    function loop() {
      if (!activeRef.current) return
      const m = movingRef.current
      const newX = m.x + m.dir * prog()
      if (newX + m.w > CANVAS_W || newX < 0) {
        movingRef.current = { ...m, x: newX < 0 ? 0 : CANVAS_W - m.w, dir: -m.dir }
      } else {
        movingRef.current = { ...m, x: newX }
      }
      setMoving({ ...movingRef.current })
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => { activeRef.current = false; cancelAnimationFrame(rafRef.current) }
  }, [audio, endGame])

  function drop() {
    if (!activeRef.current || gameOver) return
    const top = blocksRef.current[blocksRef.current.length - 1]
    const m = movingRef.current

    const overlapStart = Math.max(top.x, m.x)
    const overlapEnd = Math.min(top.x + top.w, m.x + m.w)
    const overlapW = overlapEnd - overlapStart

    if (overlapW <= 0) { setGameOver(true); endGame(); return }

    const isPerfect = Math.abs(overlapW - top.w) < 6
    const newW = isPerfect ? top.w : overlapW
    const newX = isPerfect ? top.x : overlapStart

    const newBlock: Block = { x: newX, w: newW, color: m.color }
    const newBlocks = [...blocksRef.current, newBlock]
    blocksRef.current = newBlocks
    setBlocks([...newBlocks])

    const bonus = isPerfect ? 20 : Math.round(overlapW / top.w * 10)
    scoreRef.current += bonus
    setScore(scoreRef.current)

    if (isPerfect) {
      setPerfect(true)
      setTimeout(() => setPerfect(false), 600)
      audio.sfxStack()
      audio.sfxPerfect()
    } else {
      audio.sfxStack()
    }

    if (newBlocks.length > MAX_BLOCKS) { endGame(); return }

    const nextColor = COLORS[(newBlocks.length) % COLORS.length]
    movingRef.current = { x: 0, w: newW, color: nextColor, dir: 1, speed: movingRef.current.speed }
    setMoving({ ...movingRef.current })
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); drop() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const visibleBlocks = blocks.slice(-MAX_BLOCKS)
  const stackHeight = visibleBlocks.length * BLOCK_H
  const offsetY = Math.max(0, stackHeight - CANVAS_H + 80)

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />

      <div className="mt-16 text-center mb-2">
        <div className="font-black text-2xl" style={{ color: char.color }}>スコア: {score}</div>
        {perfect && <div className="text-yellow-400 font-black text-lg animate-bounce">PERFECT! +20</div>}
      </div>

      <div
        className="relative overflow-hidden cursor-pointer"
        style={{ width: CANVAS_W, height: CANVAS_H, background: 'rgba(0,0,0,.5)', border: `2px solid ${char.color}44`, borderRadius: 8 }}
        onClick={drop}
        onTouchEnd={(e) => { e.preventDefault(); drop() }}
      >
        {/* Moving block */}
        <div className="absolute transition-none"
          style={{
            left: moving.x, top: 20,
            width: moving.w, height: BLOCK_H - 4,
            background: moving.color,
            borderRadius: 6,
            boxShadow: `0 0 12px ${moving.color}88`,
            zIndex: 20,
          }}
        />

        {/* Stacked blocks */}
        {visibleBlocks.map((b, i) => {
          const y = CANVAS_H - (i + 1) * BLOCK_H + offsetY
          return (
            <div key={i} className="absolute flex items-center justify-center overflow-hidden"
              style={{
                left: b.x, top: y,
                width: b.w, height: BLOCK_H - 4,
                background: b.color,
                borderRadius: 6,
                boxShadow: `0 0 8px ${b.color}66`,
              }}
            >
              {i === 0 && b.w > 40 && (
                <img src={char.img.profile} style={{ height: '100%', width: b.w < 80 ? '100%' : 'auto', objectFit: 'cover', objectPosition: 'top', opacity: 0.7 }} draggable={false} />
              )}
            </div>
          )
        })}

        {/* Drop hint */}
        <div className="absolute bottom-4 left-0 right-0 text-center text-xs" style={{ color: 'rgba(255,255,255,.4)' }}>
          タップ / スペースキー でドロップ
        </div>
      </div>

      <div className="mt-3 flex gap-3">
        <div className="text-xs text-center" style={{ color: 'rgba(255,255,255,.5)' }}>
          {visibleBlocks.length}/{MAX_BLOCKS} ブロック
        </div>
      </div>
    </div>
  )
}
