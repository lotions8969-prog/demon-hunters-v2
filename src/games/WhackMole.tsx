import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }
interface Mole { pos: number; emoji: string; timer: number }

const DEMON_EMOJIS = ['👹', '💀', '😈', '🧟', '🔮', '🦇', '🐉', '👺', '🕷️']
const MAX_ACTIVE = 4

export function WhackMole({ char, audio, onEnd, onBack }: Props) {
  const [moles, setMoles] = useState<Mole[]>([])
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [hits, setHits] = useState<number[]>([])
  const [combo, setCombo] = useState(0)

  const molesRef = useRef<Mole[]>([])
  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const timeRef = useRef(60)
  const activeRef = useRef(true)
  const timerRef = useRef(0)
  const spawnRef = useRef(0)
  const moleTimerRef = useRef(0)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    clearInterval(timerRef.current)
    clearInterval(moleTimerRef.current)
    clearTimeout(spawnRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  function whack(pos: number) {
    const mole = molesRef.current.find(m => m.pos === pos)
    if (!mole) {
      comboRef.current = 0; setCombo(0); audio.sfxMiss()
      return
    }
    molesRef.current = molesRef.current.filter(m => m.pos !== pos)
    setMoles([...molesRef.current])
    comboRef.current++
    setCombo(comboRef.current)
    const pts = 10 + (comboRef.current >= 3 ? 5 : 0)
    scoreRef.current += pts
    setScore(scoreRef.current)
    audio.sfxCatch()
    if (comboRef.current >= 3) audio.sfxCombo()
    setHits(h => [...h, pos])
    setTimeout(() => setHits(h => h.filter(p => p !== pos)), 300)
  }

  useEffect(() => {
    audio.start('whackMole')

    function spawn() {
      if (!activeRef.current) return
      const prog = 1 - timeRef.current / 60
      const occupied = new Set(molesRef.current.map(m => m.pos))
      if (molesRef.current.length < MAX_ACTIVE) {
        const free = Array.from({ length: 9 }, (_, i) => i).filter(i => !occupied.has(i))
        if (free.length > 0) {
          const pos = free[Math.floor(Math.random() * free.length)]
          const newMole = { pos, emoji: DEMON_EMOJIS[Math.floor(Math.random() * DEMON_EMOJIS.length)], timer: Math.max(1000, 2500 - prog * 1500) }
          molesRef.current = [...molesRef.current, newMole]
          setMoles([...molesRef.current])
          setTimeout(() => {
            molesRef.current = molesRef.current.filter(m => m.pos !== pos)
            setMoles([...molesRef.current])
          }, newMole.timer)
        }
      }
      spawnRef.current = window.setTimeout(spawn, Math.max(400, 1000 - prog * 600))
    }
    spawnRef.current = window.setTimeout(spawn, 600)

    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1; timeRef.current = n; setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)

    const kd = (e: KeyboardEvent) => {
      const n = parseInt(e.key)
      if (n >= 1 && n <= 9) { e.preventDefault(); whack(n - 1) }
    }
    window.addEventListener('keydown', kd)

    return () => {
      activeRef.current = false
      clearInterval(timerRef.current)
      clearTimeout(spawnRef.current)
      window.removeEventListener('keydown', kd)
    }
  }, [audio, endGame])

  const urgent = timeLeft <= 15
  // activeMoles computed inline

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} combo={combo} />

      <div className="mt-16 flex flex-col items-center gap-4">
        {/* 3x3 grid */}
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3,1fr)', width: 'min(90vw, 340px)' }}>
          {Array.from({ length: 9 }, (_, i) => {
            const mole = moles.find(m => m.pos === i)
            const isHit = hits.includes(i)
            return (
              <button
                key={i}
                onClick={() => whack(i)}
                className="relative rounded-2xl flex flex-col items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer overflow-hidden"
                style={{
                  height: 'min(26vw, 100px)',
                  background: isHit ? `${char.color}44` : mole ? `${char.color}18` : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${isHit ? char.color : mole ? char.color + '66' : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: mole ? `0 0 20px ${char.color}33` : 'none',
                  transform: isHit ? 'scale(0.92)' : mole ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {/* Number key hint */}
                <div className="absolute top-1.5 left-2 text-xs font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>{i + 1}</div>
                {mole ? (
                  <div className="text-4xl animate-bounce" style={{ animationDuration: '0.3s' }}>{mole.emoji}</div>
                ) : (
                  <div className="w-12 h-3 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                )}
              </button>
            )
          })}
        </div>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>数字キー 1〜9 またはタップでたたこう！</p>
      </div>
    </div>
  )
}
