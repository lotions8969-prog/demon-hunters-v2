import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'
import { CHAR_IMAGES } from '@/lib/characters'

interface Panel {
  id: number
  x: number
  y: number
  visible: boolean
  img: string
  appearedAt: number
  tapped: boolean
}

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const POSITIONS = [
  { x: 15, y: 20 }, { x: 50, y: 20 }, { x: 80, y: 20 },
  { x: 15, y: 50 }, { x: 50, y: 50 }, { x: 80, y: 50 },
  { x: 25, y: 75 }, { x: 60, y: 75 },
]

export function HideSeek({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(45)
  const [panels, setPanels] = useState<Panel[]>([])
  const [particles, setParticles] = useState<ScoreParticleData[]>([])

  const scoreRef = useRef(0)
  const timeRef = useRef(45)
  const panelsRef = useRef<Panel[]>([])
  const nextId = useRef(0)
  const timerRef = useRef(0)
  const spawnRef = useRef(0)
  const activeRef = useRef(true)
  const charImgs = CHAR_IMAGES[char.id] || [char.img.profile]

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    audio.stop()
    clearInterval(timerRef.current)
    clearTimeout(spawnRef.current)
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start()

    function spawnChar() {
      if (!activeRef.current) return
      // hide all current
      panelsRef.current = panelsRef.current.map(p => ({ ...p, visible: false }))
      // pick random position
      const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)]
      const img = charImgs[Math.floor(Math.random() * charImgs.length)]
      const newPanel: Panel = {
        id: nextId.current++,
        x: pos.x,
        y: pos.y,
        visible: true,
        img,
        appearedAt: Date.now(),
        tapped: false,
      }
      panelsRef.current = [...panelsRef.current.filter(p => p.visible), newPanel]
      setPanels([...panelsRef.current])
      audio.sfxAppear()

      // auto-hide after 1.2s
      const hideDelay = 1200
      const hideId = window.setTimeout(() => {
        panelsRef.current = panelsRef.current.map(p => p.id === newPanel.id ? { ...p, visible: false } : p)
        setPanels([...panelsRef.current])
      }, hideDelay)

      const nextDelay = 800 + Math.random() * 800
      spawnRef.current = window.setTimeout(() => {
        clearTimeout(hideId)
        spawnChar()
      }, nextDelay)
    }

    spawnRef.current = window.setTimeout(spawnChar, 1000)

    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1
      timeRef.current = n
      setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)

    return () => {
      activeRef.current = false
      clearInterval(timerRef.current)
      clearTimeout(spawnRef.current)
    }
  }, [audio, endGame, charImgs])

  const tapPanel = useCallback((id: number, cx: number, cy: number) => {
    const p = panelsRef.current.find(p => p.id === id && p.visible && !p.tapped)
    if (!p) return
    panelsRef.current = panelsRef.current.map(p2 => p2.id === id ? { ...p2, tapped: true, visible: false } : p2)
    setPanels([...panelsRef.current])

    const elapsed = Date.now() - p.appearedAt
    let pts = 20
    let label = 'OK!'
    if (elapsed < 200) { pts = 100; label = 'PERFECT!' }
    else if (elapsed < 500) { pts = 50; label = 'GREAT!' }

    scoreRef.current += pts
    setScore(scoreRef.current)
    audio.sfxCatch()

    const pid = Date.now() + Math.random()
    setParticles(prev => [...prev, { id: pid, x: cx, y: cy, text: `+${pts} ${label}`, color: char.color, big: pts >= 50 }])
    setTimeout(() => setParticles(prev => prev.filter(x => x.id !== pid)), 900)
  }, [audio, char.color])

  const urgent = timeLeft <= 10

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: 'linear-gradient(160deg,#0a0a1a 0%,#1a1a2e 50%,#16213e 100%)' }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} />
      <div className="absolute top-0 left-0 right-0 h-1 z-30" style={{ background: 'rgba(255,255,255,.1)' }}>
        <div className="h-full transition-all duration-1000" style={{ width: `${(timeLeft / 45) * 100}%`, background: urgent ? '#F87171' : char.color }} />
      </div>
      {/* Stage backdrop */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.15 }}>
        <div style={{ width: '80%', height: '60%', border: `2px solid ${char.color}`, borderRadius: 12 }} />
      </div>
      {panels.map(p => p.visible && (
        <div
          key={p.id}
          onPointerDown={e => { e.stopPropagation(); tapPanel(p.id, e.clientX, e.clientY) }}
          className="absolute cursor-pointer"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: 'translate(-50%, -50%)',
            width: 90,
            height: 110,
            borderRadius: 12,
            overflow: 'hidden',
            border: `3px solid ${char.color}`,
            boxShadow: `0 0 24px ${char.color}88`,
            touchAction: 'none',
            userSelect: 'none',
            zIndex: 10,
            animation: 'popIn 0.15s ease-out',
          }}
        >
          <img
            src={p.img}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>' }}
            draggable={false}
          />
        </div>
      ))}
      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
      <style>{`@keyframes popIn { from { transform: translate(-50%,-50%) scale(0.3); opacity: 0; } to { transform: translate(-50%,-50%) scale(1); opacity: 1; } }`}</style>
    </div>
  )
}
