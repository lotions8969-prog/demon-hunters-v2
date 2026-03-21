import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'
import { CHAR_IMAGES } from '@/lib/characters'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const GRID = 3
const TILE_COUNT = GRID * GRID

function shuffle(arr: number[]): number[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function isSolved(tiles: number[]): boolean {
  return tiles.every((v, i) => v === i)
}

export function Puzzle({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(90)
  const [tiles, setTiles] = useState<number[]>([])
  const [imgUrl, setImgUrl] = useState('')
  const [celebrating, setCelebrating] = useState(false)
  const [particles, setParticles] = useState<ScoreParticleData[]>([])

  const scoreRef = useRef(0)
  const timeRef = useRef(90)
  const timerRef = useRef(0)
  const activeRef = useRef(true)
  const charImgs = CHAR_IMAGES[char.id] || [char.img.profile]

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    audio.stop()
    clearInterval(timerRef.current)
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  function newPuzzle() {
    const img = charImgs[Math.floor(Math.random() * charImgs.length)]
    setImgUrl(img)
    // create shuffled tiles with blank at end (index 8)
    let arr: number[]
    do { arr = shuffle([...Array(TILE_COUNT).keys()]) } while (isSolved(arr))
    setTiles(arr)
    setCelebrating(false)
  }

  useEffect(() => {
    audio.start()
    newPuzzle()
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
  }, [audio, endGame]) // eslint-disable-line

  const tapTile = useCallback((idx: number) => {
    setTiles(prev => {
      const blankIdx = prev.indexOf(TILE_COUNT - 1)
      const row = Math.floor(idx / GRID), col = idx % GRID
      const bRow = Math.floor(blankIdx / GRID), bCol = blankIdx % GRID
      const adjacent = (Math.abs(row - bRow) + Math.abs(col - bCol)) === 1
      if (!adjacent) return prev
      audio.sfxFlip()
      const next = [...prev]
      ;[next[idx], next[blankIdx]] = [next[blankIdx], next[idx]]
      if (isSolved(next)) {
        setCelebrating(true)
        audio.sfxMatch()
        scoreRef.current += 1000
        setScore(scoreRef.current)
        const pid = Date.now()
        setParticles(p => [...p, { id: pid, x: window.innerWidth / 2, y: window.innerHeight / 2, text: '+1000 クリア！🎉', color: '#FFD700', big: true }])
        setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 1200)
        setTimeout(() => newPuzzle(), 1500)
      }
      return next
    })
  }, [audio]) // eslint-disable-line

  const urgent = timeLeft <= 10
  const tileSize = Math.min((window.innerWidth - 32) / GRID, 130)

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col items-center justify-center" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} />
      <div className="absolute top-0 left-0 right-0 h-1 z-30" style={{ background: 'rgba(255,255,255,.1)' }}>
        <div className="h-full transition-all duration-1000" style={{ width: `${(timeLeft / 90) * 100}%`, background: urgent ? '#F87171' : char.color }} />
      </div>
      <div className="mt-16 relative" style={{ width: tileSize * GRID, height: tileSize * GRID }}>
        {tiles.map((tileVal, idx) => {
          const isBlank = tileVal === TILE_COUNT - 1
          const srcRow = Math.floor(tileVal / GRID)
          const srcCol = tileVal % GRID
          const dstRow = Math.floor(idx / GRID)
          const dstCol = idx % GRID
          return (
            <div
              key={idx}
              onPointerDown={e => { e.stopPropagation(); if (!isBlank) tapTile(idx) }}
              className="absolute"
              style={{
                left: dstCol * tileSize,
                top: dstRow * tileSize,
                width: tileSize - 2,
                height: tileSize - 2,
                overflow: 'hidden',
                borderRadius: 4,
                border: isBlank ? 'none' : `2px solid ${char.color}44`,
                boxShadow: isBlank ? 'none' : celebrating ? `0 0 16px ${char.color}` : undefined,
                cursor: isBlank ? 'default' : 'pointer',
                touchAction: 'none',
                userSelect: 'none',
                background: isBlank ? 'rgba(0,0,0,0.5)' : undefined,
                transition: 'box-shadow 0.2s',
              }}
            >
              {!isBlank && (
                <div style={{
                  width: tileSize * GRID,
                  height: tileSize * GRID,
                  backgroundImage: `url(${imgUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: `${-srcCol * tileSize}px ${-srcRow * tileSize}px`,
                }} />
              )}
            </div>
          )
        })}
      </div>
      {celebrating && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
          <div className="text-5xl animate-bounce">🎉</div>
        </div>
      )}
      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
