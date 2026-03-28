import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'

interface BombNode { id: number; x: number; y: number; defused: boolean; exploding: boolean }
interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

export function ChainBomb({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [bombs, setBombs] = useState<BombNode[]>([])
  const [particles, setParticles] = useState<ScoreParticleData[]>([])
  const [round, setRound] = useState(1)
  const [chainActive, setChainActive] = useState(false)

  const scoreRef = useRef(0)
  const timeRef = useRef(60)
  const bombsRef = useRef<BombNode[]>([])
  const roundRef = useRef(1)
  const activeRef = useRef(true)
  const timerRef = useRef(0)
  const chainRef = useRef<number[]>([])
  const lastTapRef = useRef(0)

  function spawnRound(r: number) {
    const count = Math.min(8, 3 + r)
    const W = window.innerWidth, H = window.innerHeight
    const newBombs: BombNode[] = []
    for (let i = 0; i < count; i++) {
      let x: number, y: number, ok = false
      let attempts = 0
      do {
        x = 60 + Math.random() * (W - 120)
        y = 120 + Math.random() * (H - 240)
        ok = newBombs.every(b => Math.hypot(b.x - x, b.y - y) > 80)
        attempts++
      } while (!ok && attempts < 50)
      newBombs.push({ id: i, x, y, defused: false, exploding: false })
    }
    bombsRef.current = newBombs
    setBombs([...newBombs])
    chainRef.current = []
    setChainActive(false)
  }

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    clearInterval(timerRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('chainBomb')
    spawnRound(1)
    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1; timeRef.current = n; setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)
    return () => { activeRef.current = false; clearInterval(timerRef.current) }
  }, [audio, endGame])

  function tapBomb(id: number, ex: number, ey: number) {
    if (!activeRef.current) return
    const bomb = bombsRef.current.find(b => b.id === id)
    if (!bomb || bomb.defused) return

    const now = Date.now()
    const timeSinceLast = now - lastTapRef.current
    lastTapRef.current = now

    // Chain: must tap within 800ms of last tap
    if (chainRef.current.length > 0 && timeSinceLast > 800) {
      chainRef.current = []
      setChainActive(false)
    }

    chainRef.current.push(id)
    const chainLen = chainRef.current.length
    setChainActive(chainLen > 1)

    // Explode animation
    bombsRef.current = bombsRef.current.map(b => b.id === id ? { ...b, exploding: true } : b)
    setBombs([...bombsRef.current])
    setTimeout(() => {
      bombsRef.current = bombsRef.current.map(b => b.id === id ? { ...b, defused: true, exploding: false } : b)
      setBombs([...bombsRef.current])
    }, 200)

    const pts = 20 * chainLen
    scoreRef.current += pts; setScore(scoreRef.current)
    audio.sfxSpecial()
    const pid = Date.now() + Math.random()
    setParticles(p => [...p, { id: pid, x: ex, y: ey, text: chainLen > 1 ? `+${pts} チェーン${chainLen}！` : `+${pts}`, color: chainLen > 1 ? '#FFD700' : char.color, big: chainLen > 1 }])
    setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 900)

    // Check if all defused
    const remaining = bombsRef.current.filter(b => !b.defused).length - 1
    if (remaining <= 0) {
      const bonus = 100
      scoreRef.current += bonus; setScore(scoreRef.current)
      audio.sfxCombo()
      const nr = roundRef.current + 1
      roundRef.current = nr
      setRound(nr)
      setTimeout(() => { if (activeRef.current) spawnRound(nr) }, 800)
    }
  }

  const urgent = timeLeft <= 10
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} />
      <div className="absolute top-0 left-0 right-0 h-1 z-30" style={{ background: 'rgba(255,255,255,.1)' }}>
        <div className="h-full transition-all duration-1000" style={{ width: `${(timeLeft / 60) * 100}%`, background: urgent ? '#F87171' : char.color }} />
      </div>

      {chainActive && (
        <div className="absolute top-16 left-0 right-0 text-center font-black text-xl animate-pulse" style={{ color: '#FFD700', zIndex: 25 }}>
          ⛓️ チェーン中！はやくタップ！
        </div>
      )}

      {/* Chain lines */}
      <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }} width="100%" height="100%">
        {chainRef.current.length > 1 && chainRef.current.slice(0, -1).map((id, i) => {
          const b1 = bombsRef.current.find(b => b.id === id)
          const b2 = bombsRef.current.find(b => b.id === chainRef.current[i + 1])
          if (!b1 || !b2) return null
          return <line key={i} x1={b1.x} y1={b1.y} x2={b2.x} y2={b2.y} stroke={char.color} strokeWidth={3} strokeDasharray="6 4" opacity={0.6} />
        })}
      </svg>

      {bombs.map(b => (
        <div
          key={b.id}
          onPointerDown={e => { e.stopPropagation(); tapBomb(b.id, e.clientX, e.clientY) }}
          className="absolute flex items-center justify-center"
          style={{
            left: b.x - 36, top: b.y - 36, width: 72, height: 72,
            fontSize: b.defused ? '1.5rem' : '2.5rem',
            background: b.defused ? 'rgba(74,222,128,.15)' : b.exploding ? '#FFD700' : `${char.color}22`,
            border: `3px solid ${b.defused ? '#4ADE80' : b.exploding ? '#FFD700' : char.color}`,
            borderRadius: '50%',
            boxShadow: b.exploding ? '0 0 30px #FFD700' : b.defused ? 'none' : `0 0 12px ${char.color}44`,
            touchAction: 'none', userSelect: 'none', zIndex: 10,
            cursor: b.defused ? 'default' : 'pointer',
            transition: 'all .15s',
          }}>
          {b.defused ? '✓' : b.exploding ? '💥' : '💣'}
        </div>
      ))}
      <div className="absolute bottom-4 left-0 right-0 text-center text-xs" style={{ color: 'rgba(255,255,255,.4)' }}>
        すばやくタップしてチェーン！ラウンド{round}
      </div>
      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
