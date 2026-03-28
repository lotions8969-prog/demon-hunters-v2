import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

function shuffle<T>(a: T[]): T[] {
  const arr = [...a]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function BombDefuse({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(90)
  const [sequence, setSequence] = useState<number[]>([])
  const [nextIdx, setNextIdx] = useState(0)
  const [flash, setFlash] = useState<{idx:number;ok:boolean}|null>(null)
  const [countdown, setCountdown] = useState(10)
  const [round, setRound] = useState(1)
  const [bombFlash, setBombFlash] = useState(false)

  const scoreRef = useRef(0)
  const timeRef = useRef(90)
  const nextIdxRef = useRef(0)
  const countdownRef = useRef(10)
  const activeRef = useRef(true)
  const timerRef = useRef(0)
  const countRef = useRef(0)
  const roundRef = useRef(1)

  function newBomb(r: number) {
    const count = Math.min(6, 3 + Math.floor((r - 1) / 2))
    const nums = shuffle(Array.from({ length: count }, (_, i) => i + 1))
    setSequence(nums)
    nextIdxRef.current = 0
    setNextIdx(0)
    const cd = Math.max(5, 10 - Math.floor((r - 1) / 2))
    countdownRef.current = cd
    setCountdown(cd)
    clearInterval(countRef.current)
    countRef.current = window.setInterval(() => {
      countdownRef.current--
      setCountdown(countdownRef.current)
      if (countdownRef.current <= 0) {
        clearInterval(countRef.current)
        setBombFlash(true)
        setTimeout(() => setBombFlash(false), 400)
        audio.sfxMiss()
        // New bomb with penalty
        scoreRef.current = Math.max(0, scoreRef.current - 20)
        setScore(scoreRef.current)
        setTimeout(() => {
          if (activeRef.current) newBomb(roundRef.current)
        }, 600)
      }
    }, 1000)
  }

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    clearInterval(timerRef.current)
    clearInterval(countRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('bombDefuse')
    newBomb(1)
    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1; timeRef.current = n; setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); clearInterval(countRef.current); endGame() }
    }, 1000)
    return () => { activeRef.current = false; clearInterval(timerRef.current); clearInterval(countRef.current) }
  }, [audio, endGame]) // eslint-disable-line

  function tap(idx: number) {
    if (!activeRef.current) return
    if (sequence[nextIdxRef.current] === sequence[idx]) {
      if (nextIdxRef.current === idx) {
        setFlash({ idx, ok: true })
        setTimeout(() => setFlash(null), 200)
        nextIdxRef.current++
        setNextIdx(nextIdxRef.current)
        audio.sfxCatch()
        if (nextIdxRef.current >= sequence.length) {
          clearInterval(countRef.current)
          const pts = 50 + countdownRef.current * 10
          scoreRef.current += pts
          setScore(scoreRef.current)
          audio.sfxSpecial()
          const nr = roundRef.current + 1
          roundRef.current = nr
          setRound(nr)
          setTimeout(() => { if (activeRef.current) newBomb(nr) }, 800)
        }
      } else {
        setFlash({ idx, ok: false })
        setTimeout(() => setFlash(null), 300)
        audio.sfxMiss()
      }
    } else {
      // wrong order
      setFlash({ idx, ok: false })
      setTimeout(() => setFlash(null), 300)
      audio.sfxMiss()
    }
  }

  const urgent = timeLeft <= 15
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: bombFlash ? 'rgba(239,68,68,.4)' : char.bg, transition: 'background .2s' }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} />
      <div className="mt-14 flex flex-col items-center gap-4 w-full max-w-sm px-4">
        <div className="flex items-center gap-4">
          <div style={{ fontSize: '3rem' }}>💣</div>
          <div className="font-black text-4xl" style={{ color: countdown <= 3 ? '#EF4444' : '#FFD700', animation: countdown <= 3 ? 'pulse .5s infinite' : 'none' }}>{countdown}s</div>
          <div className="text-sm" style={{ color: 'rgba(255,255,255,.5)' }}>ラウンド{round}</div>
        </div>
        <div className="text-white text-sm font-bold">順番に番号をタップしてばくだんをかいじょ！</div>
        <div className="flex gap-2 mb-2">
          {sequence.map((n, i) => (
            <div key={i} className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm"
              style={{ background: i < nextIdx ? '#4ADE80' : i === nextIdx ? char.color : 'rgba(255,255,255,.15)', color: 'white' }}>
              {i < nextIdx ? '✓' : n}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 w-full">
          {sequence.map((n, idx) => {
            const done = idx < nextIdx
            const isNext = idx === nextIdx
            return (
              <button key={idx} onClick={() => !done && tap(idx)} disabled={done}
                className="rounded-2xl font-black text-2xl flex items-center justify-center transition-all duration-150 active:scale-90"
                style={{
                  height: 72,
                  background: done ? 'rgba(74,222,128,.15)' : flash?.idx === idx ? (flash.ok ? `${char.color}55` : 'rgba(239,68,68,.4)') : isNext ? `${char.color}22` : 'rgba(255,255,255,.07)',
                  border: `2px solid ${done ? '#4ADE80' : isNext ? char.color : 'rgba(255,255,255,.15)'}`,
                  color: done ? '#4ADE80' : 'white',
                  cursor: done ? 'default' : 'pointer',
                  boxShadow: isNext ? `0 0 18px ${char.color}66` : 'none',
                }}>
                {done ? '✓' : n}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
