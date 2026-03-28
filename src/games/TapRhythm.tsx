import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'

interface Note { id: number; x: number; y: number; spawnTime: number; hitTime: number }
interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const BPM = 120
const BEAT_MS = 60000 / BPM
const TRAVEL_TIME = 1200

export function TapRhythm({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [notes, setNotes] = useState<Note[]>([])
  const [particles, setParticles] = useState<ScoreParticleData[]>([])
  const [combo, setCombo] = useState(0)

  const scoreRef = useRef(0)
  const timeRef = useRef(60)
  const notesRef = useRef<Note[]>([])
  const comboRef = useRef(0)
  const nextId = useRef(0)
  const activeRef = useRef(true)
  const rafRef = useRef(0)
  const timerRef = useRef(0)
  const spawnRef = useRef(0)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    cancelAnimationFrame(rafRef.current); clearInterval(timerRef.current); clearTimeout(spawnRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('tapRhythm')
    const W = window.innerWidth
    const H = window.innerHeight
    const HIT_Y = H * 0.8
    const LANES = 3
    const laneW = W / LANES

    function loop() {
      if (!activeRef.current) return
      const now = Date.now()
      // Expire missed notes
      notesRef.current = notesRef.current.filter(n => {
        if (now > n.hitTime + 300) {
          comboRef.current = 0; setCombo(0)
          return false
        }
        return true
      })
      setNotes([...notesRef.current])
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1; timeRef.current = n; setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)

    function spawnBeat() {
      if (!activeRef.current) return
      const lane = Math.floor(Math.random() * LANES)
      const now = Date.now()
      notesRef.current = [...notesRef.current, {
        id: nextId.current++,
        x: laneW * lane + laneW / 2,
        y: HIT_Y - H * 0.6,
        spawnTime: now,
        hitTime: now + TRAVEL_TIME,
      }]
      audio.sfxRhythm()
      const prog = 1 - timeRef.current / 60
      const interval = Math.max(BEAT_MS * 0.5, BEAT_MS - prog * BEAT_MS * 0.3)
      spawnRef.current = window.setTimeout(spawnBeat, interval)
    }
    spawnRef.current = window.setTimeout(spawnBeat, 500)

    return () => { activeRef.current = false; cancelAnimationFrame(rafRef.current); clearInterval(timerRef.current); clearTimeout(spawnRef.current) }
  }, [audio, endGame])

  function tapNote(id: number, ex: number, ey: number) {
    const note = notesRef.current.find(n => n.id === id)
    if (!note) return
    const now = Date.now()
    const diff = Math.abs(now - note.hitTime)
    notesRef.current = notesRef.current.filter(n => n.id !== id)
    setNotes([...notesRef.current])

    let pts = 0; let label = ''
    if (diff < 80) { pts = 100; label = '🎵 PERFECT!' }
    else if (diff < 180) { pts = 60; label = '✨ GREAT!' }
    else if (diff < 300) { pts = 30; label = '👍 OK' }
    else { pts = 5; label = 'おそい' }

    comboRef.current++; setCombo(comboRef.current)
    const mult = comboRef.current >= 10 ? 3 : comboRef.current >= 5 ? 2 : 1
    const earned = pts * mult
    scoreRef.current += earned; setScore(scoreRef.current)
    audio.sfxCatch()
    if (pts >= 60) audio.sfxSpecial()

    const pid = Date.now() + Math.random()
    setParticles(p => [...p, { id: pid, x: ex, y: ey, text: `+${earned} ${label}`, color: pts >= 100 ? '#FFD700' : char.color, big: pts >= 60 }])
    setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 800)
  }

  const H = typeof window !== 'undefined' ? window.innerHeight : 800
  const HIT_Y = H * 0.8
  const urgent = timeLeft <= 10

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} combo={combo} />
      <div className="absolute top-0 left-0 right-0 h-1 z-30" style={{ background: 'rgba(255,255,255,.1)' }}>
        <div className="h-full transition-all duration-1000" style={{ width: `${(timeLeft / 60) * 100}%`, background: urgent ? '#F87171' : char.color }} />
      </div>

      {/* Hit line */}
      <div className="absolute left-0 right-0 h-1 z-20" style={{ top: HIT_Y, background: `${char.color}44` }} />

      {/* Notes */}
      {notes.map(n => {
        const now = Date.now()
        const progress = (now - n.spawnTime) / TRAVEL_TIME
        const yPos = n.y + (HIT_Y - n.y) * progress
        const nearHit = Math.abs(now - n.hitTime) < 200
        return (
          <div
            key={n.id}
            onPointerDown={e => { e.stopPropagation(); tapNote(n.id, e.clientX, e.clientY) }}
            className="absolute flex items-center justify-center font-black rounded-full"
            style={{
              left: n.x - 32, top: yPos - 32,
              width: 64, height: 64,
              background: nearHit ? char.color : `${char.color}44`,
              border: `3px solid ${char.color}`,
              boxShadow: nearHit ? `0 0 20px ${char.color}` : 'none',
              fontSize: '1.5rem',
              touchAction: 'none', userSelect: 'none', zIndex: 10,
              transition: 'background .1s, box-shadow .1s',
            }}>
            🎵
          </div>
        )
      })}

      <div className="absolute bottom-4 left-0 right-0 text-center text-xs" style={{ color: 'rgba(255,255,255,.4)' }}>
        ラインに来たらタップ！
      </div>
      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
