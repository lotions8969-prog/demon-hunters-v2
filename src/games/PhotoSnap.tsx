import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'
import { ALL_IMAGES } from '@/lib/characters'

interface DriftChar {
  id: number
  x: number
  y: number
  size: number
  img: string
  vx: number
  vy: number
  inFrame: boolean
}

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const TOTAL_PHOTOS = 10
const FRAME_SIZE = 180

export function PhotoSnap({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [photosLeft, setPhotosLeft] = useState(TOTAL_PHOTOS)
  const [chars, setChars] = useState<DriftChar[]>([])
  const [particles, setParticles] = useState<ScoreParticleData[]>([])
  const [flashAnim, setFlashAnim] = useState(false)
  const [lastResult, setLastResult] = useState('')
  const [done, setDone] = useState(false)

  const scoreRef = useRef(0)
  const photosRef = useRef(TOTAL_PHOTOS)
  const charsRef = useRef<DriftChar[]>([])
  const nextId = useRef(0)
  const rafRef = useRef(0)
  const activeRef = useRef(true)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    cancelAnimationFrame(rafRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('photoSnap')
    const W = window.innerWidth
    const H = window.innerHeight

    // spawn initial chars
    const initial: DriftChar[] = Array.from({ length: 4 }, (_) => ({
      id: nextId.current++,
      x: 60 + Math.random() * (W - 120),
      y: 100 + Math.random() * (H - 200),
      size: 70 + Math.random() * 50,
      img: ALL_IMAGES[Math.floor(Math.random() * ALL_IMAGES.length)],
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      inFrame: false,
    }))
    charsRef.current = initial
    setChars([...initial])

    const frameX = W / 2
    const frameY = H / 2

    function loop() {
      if (!activeRef.current) return
      charsRef.current = charsRef.current.map(c => {
        let x = c.x + c.vx
        let y = c.y + c.vy
        let vx = c.vx
        let vy = c.vy
        if (x < c.size / 2 || x > W - c.size / 2) vx = -vx
        if (y < c.size / 2 || y > H - c.size / 2) vy = -vy
        const dx = Math.abs(x - frameX)
        const dy = Math.abs(y - frameY)
        const inFrame = dx < FRAME_SIZE / 2 - 20 && dy < FRAME_SIZE / 2 - 20
        return { ...c, x, y, vx, vy, inFrame }
      })
      setChars([...charsRef.current])
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      activeRef.current = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [audio, endGame])

  const snap = useCallback(() => {
    if (done || !activeRef.current) return
    setFlashAnim(true)
    setTimeout(() => setFlashAnim(false), 300)

    const W = window.innerWidth
    const H = window.innerHeight
    const frameX = W / 2
    const frameY = H / 2

    // Check how many chars are centered in frame
    const inFrame = charsRef.current.filter(c => {
      const dx = Math.abs(c.x - frameX)
      const dy = Math.abs(c.y - frameY)
      return dx < FRAME_SIZE / 3 && dy < FRAME_SIZE / 3
    })

    let pts = 0
    let label = 'ブレてる...'
    let color = '#F87171'

    if (inFrame.length >= 1) {
      pts = 200
      label = '📸 PERFECT SHOT!'
      color = '#FFD700'
      audio.sfxSpecial()
    } else {
      const nearFrame = charsRef.current.filter(c => {
        const dx = Math.abs(c.x - frameX)
        const dy = Math.abs(c.y - frameY)
        return dx < FRAME_SIZE / 2 && dy < FRAME_SIZE / 2
      })
      if (nearFrame.length >= 1) {
        pts = 100
        label = '📷 GOOD!'
        color = char.color
        audio.sfxCatch()
      } else {
        pts = 10
        audio.sfxMiss()
      }
    }

    scoreRef.current += pts
    setScore(scoreRef.current)
    setLastResult(label)

    const pid = Date.now() + Math.random()
    setParticles(p => [...p, { id: pid, x: W / 2, y: H / 2 - 60, text: `+${pts} ${label}`, color, big: pts >= 100 }])
    setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 1000)

    photosRef.current--
    setPhotosLeft(photosRef.current)
    if (photosRef.current <= 0) {
      setDone(true)
      setTimeout(() => endGame(), 1500)
    }
  }, [audio, char.color, done, endGame])

  const W = typeof window !== 'undefined' ? window.innerWidth : 390
  const H = typeof window !== 'undefined' ? window.innerHeight : 844

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#111' }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />

      {/* Camera viewfinder overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(0,0,0,0.3)' }} />

      {/* Drifting chars */}
      {chars.map(c => (
        <div
          key={c.id}
          className="absolute pointer-events-none"
          style={{ left: c.x - c.size / 2, top: c.y - c.size / 2, width: c.size, height: c.size, borderRadius: 8, overflow: 'hidden', zIndex: 5 }}
        >
          <img
            src={c.img}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            draggable={false}
          />
        </div>
      ))}

      {/* Viewfinder frame */}
      <div
        className="absolute pointer-events-none z-20"
        style={{
          left: W / 2 - FRAME_SIZE / 2,
          top: H / 2 - FRAME_SIZE / 2,
          width: FRAME_SIZE,
          height: FRAME_SIZE,
          border: `3px solid ${char.color}`,
          boxShadow: `0 0 0 2000px rgba(0,0,0,0.55)`,
          borderRadius: 4,
        }}
      >
        {/* Corner accents */}
        {[['top-0 left-0','border-t border-l'],['top-0 right-0','border-t border-r'],['bottom-0 left-0','border-b border-l'],['bottom-0 right-0','border-b border-r']].map(([pos, cls], i) => (
          <div key={i} className={`absolute ${pos} w-5 h-5 ${cls}`} style={{ borderColor: 'white', borderWidth: 3 }} />
        ))}
      </div>

      {/* Flash */}
      {flashAnim && <div className="absolute inset-0 bg-white pointer-events-none z-50 opacity-80" />}

      {/* HUD */}
      <div className="absolute top-3 left-0 right-0 flex justify-center gap-8 z-30">
        <div className="text-center">
          <div className="text-white font-black text-2xl">{score.toLocaleString()}</div>
          <div style={{ color: char.color }} className="text-xs">スコア</div>
        </div>
        <div className="text-center">
          <div className="text-white font-black text-2xl">{photosLeft}</div>
          <div style={{ color: char.color }} className="text-xs">のこり</div>
        </div>
      </div>

      {lastResult && (
        <div className="absolute top-20 left-0 right-0 text-center z-30 font-black text-lg pointer-events-none"
          style={{ color: lastResult.includes('PERFECT') ? '#FFD700' : lastResult.includes('GOOD') ? char.color : '#F87171' }}>
          {lastResult}
        </div>
      )}

      {/* Snap button */}
      <button
        onPointerDown={e => { e.stopPropagation(); snap() }}
        disabled={done}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 w-20 h-20 rounded-full font-black text-3xl cursor-pointer flex items-center justify-center"
        style={{
          background: done ? 'rgba(255,255,255,0.2)' : char.color,
          border: '4px solid white',
          boxShadow: `0 0 24px ${char.color}`,
          touchAction: 'none',
        }}
      >
        📸
      </button>

      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
