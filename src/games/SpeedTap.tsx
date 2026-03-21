import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const TOTAL_TAPS = 20

export function SpeedTap({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [tapsLeft, setTapsLeft] = useState(TOTAL_TAPS)
  const [circlePos, setCirclePos] = useState({ x: 50, y: 50 })
  const [_times, setTimes] = useState<number[]>([])
  const [particles, setParticles] = useState<ScoreParticleData[]>([])
  const [done, setDone] = useState(false)
  const [avgTime, setAvgTime] = useState(0)

  const scoreRef = useRef(0)
  const tapsRef = useRef(TOTAL_TAPS)
  const timesRef = useRef<number[]>([])
  const appearedAt = useRef(Date.now())
  const activeRef = useRef(true)

  function randomPos() {
    const margin = 12
    return {
      x: margin + Math.random() * (100 - margin * 2),
      y: 15 + Math.random() * 70,
    }
  }

  useEffect(() => {
    audio.start()
    setCirclePos(randomPos())
    appearedAt.current = Date.now()
    return () => { activeRef.current = false }
  }, [audio])

  const tap = useCallback((cx: number, cy: number) => {
    if (!activeRef.current || done) return
    const elapsed = Date.now() - appearedAt.current
    timesRef.current = [...timesRef.current, elapsed]
    setTimes([...timesRef.current])

    let pts = 10
    let label = `+10 (${elapsed}ms)`
    let color = 'white'
    if (elapsed < 200) { pts = 100; label = `⚡ +100 (${elapsed}ms)`; color = '#FFD700'; audio.sfxSpecial() }
    else if (elapsed < 400) { pts = 50; label = `+50 (${elapsed}ms)`; color = char.color; audio.sfxCatch() }
    else { audio.sfxCatch() }

    scoreRef.current += pts
    setScore(scoreRef.current)

    const pid = Date.now() + Math.random()
    setParticles(p => [...p, { id: pid, x: cx, y: cy, text: label, color, big: pts >= 50 }])
    setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 900)

    const newTaps = tapsRef.current - 1
    tapsRef.current = newTaps
    setTapsLeft(newTaps)

    if (newTaps <= 0) {
      setDone(true)
      const avg = Math.round(timesRef.current.reduce((a, b) => a + b, 0) / timesRef.current.length)
      setAvgTime(avg)
      audio.stop()
      setTimeout(() => { audio.sfxGameOver(); activeRef.current = false; onEnd(scoreRef.current) }, 2500)
      return
    }

    // reposition
    setCirclePos(randomPos())
    appearedAt.current = Date.now()
  }, [audio, char.color, done, onEnd])

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: char.bg }}
      onPointerDown={_e => { /* only circle should be tapped */ }}
    >
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <div className="absolute top-3 left-0 right-0 flex justify-center gap-6 z-20 mt-10">
        <div className="text-center">
          <div className="text-white font-black text-2xl">{score.toLocaleString()}</div>
          <div style={{ color: char.color }} className="text-xs">スコア</div>
        </div>
        <div className="text-center">
          <div className="text-white font-black text-2xl">{tapsLeft}</div>
          <div style={{ color: char.color }} className="text-xs">のこり</div>
        </div>
      </div>

      {!done && (
        <div
          onPointerDown={e => { e.stopPropagation(); tap(e.clientX, e.clientY) }}
          className="absolute cursor-pointer"
          style={{
            left: `${circlePos.x}%`,
            top: `${circlePos.y}%`,
            transform: 'translate(-50%, -50%)',
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: char.color,
            boxShadow: `0 0 40px ${char.color}, 0 0 80px ${char.color}44`,
            border: '4px solid white',
            touchAction: 'none',
            userSelect: 'none',
            zIndex: 10,
            animation: 'pulse-glow 0.8s ease-in-out infinite alternate',
          }}
        />
      )}

      {done && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-3">
          <div className="text-white font-black text-3xl">おわり！🎉</div>
          <div style={{ color: char.color }} className="font-bold text-xl">平均 {avgTime}ms</div>
          <div className="text-white font-black text-4xl">{score.toLocaleString()} pt</div>
          {avgTime < 200 && <div className="text-yellow-300 font-bold">⚡ すごくはやい！</div>}
          {avgTime >= 200 && avgTime < 400 && <div style={{ color: char.color }} className="font-bold">いいはやさ！</div>}
          {avgTime >= 400 && <div className="text-white font-bold">もっとはやく！</div>}
        </div>
      )}

      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
      <style>{`@keyframes pulse-glow { from { box-shadow: 0 0 20px ${char.color}; } to { box-shadow: 0 0 60px ${char.color}, 0 0 100px ${char.color}44; } }`}</style>
    </div>
  )
}
