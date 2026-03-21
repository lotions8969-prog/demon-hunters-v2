import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'
import { ALL_IMAGES } from '@/lib/characters'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const REEL_IMAGES = ALL_IMAGES.slice(0, Math.min(15, ALL_IMAGES.length))

export function Slot({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [spinsLeft, setSpinsLeft] = useState(10)
  const [spinning, setSpinning] = useState(false)
  const [reels, setReels] = useState([0, 1, 2])
  const [spinningReels, setSpinningReels] = useState([false, false, false])
  const [particles, setParticles] = useState<ScoreParticleData[]>([])
  const [result, setResult] = useState<string | null>(null)
  const [gameOver, setGameOver] = useState(false)

  const scoreRef = useRef(0)
  const spinsRef = useRef(10)
  const activeRef = useRef(true)
  const reelVals = useRef([0, 1, 2])
  const intervalRefs = useRef<number[]>([0, 0, 0])

  useEffect(() => {
    audio.start()
    return () => { activeRef.current = false }
  }, [audio])

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  const spin = useCallback(() => {
    if (spinning || spinsRef.current <= 0 || !activeRef.current) return
    setSpinning(true)
    setResult(null)
    setSpinningReels([true, true, true])

    // spin all reels
    const intervals: number[] = []
    for (let r = 0; r < 3; r++) {
      intervals[r] = window.setInterval(() => {
        reelVals.current[r] = Math.floor(Math.random() * REEL_IMAGES.length)
        setReels([...reelVals.current])
      }, 60)
    }
    intervalRefs.current = intervals

    // stop reels one by one
    const stopTimes = [1000, 1500, 2000]
    stopTimes.forEach((t, r) => {
      setTimeout(() => {
        clearInterval(intervalRefs.current[r])
        reelVals.current[r] = Math.floor(Math.random() * REEL_IMAGES.length)
        setReels([...reelVals.current])
        setSpinningReels(prev => {
          const next = [...prev]
          next[r] = false
          return next
        })

        if (r === 2) {
          // all stopped - check result
          setTimeout(() => {
            if (!activeRef.current) return
            const [a, b, c] = reelVals.current
            let pts = 0
            let label = ''
            if (a === b && b === c) {
              pts = 1000
              label = '🎰 JACKPOT！+1000'
              audio.sfxSpecial()
            } else if (a === b || b === c || a === c) {
              pts = 200
              label = '✨ ペア！+200'
              audio.sfxCombo()
            } else {
              audio.sfxMiss()
              label = 'はずれ...'
            }

            if (pts > 0) {
              scoreRef.current += pts
              setScore(scoreRef.current)
              const pid = Date.now()
              setParticles(p => [...p, { id: pid, x: window.innerWidth / 2, y: window.innerHeight * 0.35, text: label, color: '#FFD700', big: pts >= 500 }])
              setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 1200)
            }
            setResult(label)

            spinsRef.current--
            setSpinsLeft(spinsRef.current)
            setSpinning(false)

            if (spinsRef.current <= 0) {
              setTimeout(() => endGame(), 1500)
              setGameOver(true)
            }
          }, 200)
        }
      }, t)
    })
  }, [spinning, audio, endGame])

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col items-center justify-center" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />

      <div className="text-center mb-4 mt-10">
        <div className="text-white font-black text-4xl">{score.toLocaleString()}</div>
        <div style={{ color: char.color }} className="text-sm font-bold">のこり {spinsLeft} スピン</div>
      </div>

      {/* Slot machine */}
      <div
        className="flex gap-2 p-4 rounded-2xl mb-4"
        style={{ background: 'rgba(0,0,0,0.6)', border: `3px solid ${char.color}`, boxShadow: `0 0 30px ${char.color}44` }}
      >
        {reels.map((val, i) => (
          <div
            key={i}
            style={{
              width: 90,
              height: 90,
              borderRadius: 12,
              overflow: 'hidden',
              border: `2px solid ${char.color}88`,
              filter: spinningReels[i] ? 'blur(3px)' : 'none',
              transition: spinningReels[i] ? 'none' : 'filter 0.2s',
            }}
          >
            <img
              src={REEL_IMAGES[val % REEL_IMAGES.length]}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {result && (
        <div className="text-center font-black text-xl mb-3" style={{ color: result.includes('はずれ') ? '#F87171' : '#FFD700' }}>
          {result}
        </div>
      )}

      <button
        onPointerDown={e => { e.stopPropagation(); spin() }}
        disabled={spinning || gameOver}
        className="px-10 py-4 rounded-full font-black text-xl text-white cursor-pointer"
        style={{
          background: spinning || gameOver ? 'rgba(255,255,255,0.2)' : char.color,
          boxShadow: spinning || gameOver ? 'none' : `0 0 20px ${char.color}`,
          border: 'none',
          touchAction: 'none',
          transition: 'all 0.2s',
        }}
      >
        {gameOver ? 'ゲームオーバー' : spinning ? 'スピン中...' : '🎰 スピン！'}
      </button>

      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
