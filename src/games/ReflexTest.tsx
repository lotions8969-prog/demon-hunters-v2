import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }
type Phase = 'waiting' | 'ready' | 'go' | 'result' | 'early'

export function ReflexTest({ char, audio, onEnd, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('waiting')
  const [reactionMs, setReactionMs] = useState<number | null>(null)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [totalRounds] = useState(8)

  const goTimeRef = useRef(0)
  const timerRef = useRef(0)
  const activeRef = useRef(true)
  const phaseRef = useRef<Phase>('waiting')
  const scoreRef = useRef(0)
  const roundRef = useRef(0)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    clearTimeout(timerRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 300)
  }, [audio, onEnd])

  function startRound() {
    phaseRef.current = 'ready'
    setPhase('ready')
    const delay = 1500 + Math.random() * 3000
    timerRef.current = window.setTimeout(() => {
      if (!activeRef.current) return
      phaseRef.current = 'go'
      setPhase('go')
      goTimeRef.current = performance.now()
      audio.sfxSpecial()
    }, delay)
  }

  function handlePress() {
    if (!activeRef.current) return
    if (phaseRef.current === 'waiting') {
      startRound()
    } else if (phaseRef.current === 'ready') {
      clearTimeout(timerRef.current)
      phaseRef.current = 'early'
      setPhase('early')
      audio.sfxMiss()
      setTimeout(() => {
        if (!activeRef.current) return
        const nextRound = roundRef.current + 1
        roundRef.current = nextRound
        setRound(nextRound)
        if (nextRound >= totalRounds) endGame()
        else startRound()
      }, 1200)
    } else if (phaseRef.current === 'go') {
      const ms = Math.round(performance.now() - goTimeRef.current)
      setReactionMs(ms)
      phaseRef.current = 'result'
      setPhase('result')
      const pts = Math.max(0, Math.round(1000 - ms))
      scoreRef.current += pts
      setScore(scoreRef.current)
      audio.sfxCatch()
      setTimeout(() => {
        if (!activeRef.current) return
        const nextRound = roundRef.current + 1
        roundRef.current = nextRound
        setRound(nextRound)
        if (nextRound >= totalRounds) endGame()
        else startRound()
      }, 1400)
    }
  }

  useEffect(() => {
    audio.start('reflexTest')
    const kd = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handlePress() } }
    window.addEventListener('keydown', kd)
    return () => { activeRef.current = false; clearTimeout(timerRef.current); window.removeEventListener('keydown', kd) }
  }, [audio])

  const bg = phase === 'go' ? '#16a34a' : phase === 'ready' ? '#b45309' : phase === 'early' ? '#dc2626' : '#040012'
  const emoji = phase === 'go' ? '🟢' : phase === 'ready' ? '🟡' : phase === 'early' ? '❌' : phase === 'result' ? '⚡' : '⏸️'

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center cursor-pointer transition-colors duration-150"
      style={{ background: bg, touchAction: 'none' }}
      onClick={handlePress}
    >
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />

      <div className="absolute top-4 right-4 text-sm font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>{round}/{totalRounds}</div>
      <div className="absolute top-4 left-16 font-black text-lg" style={{ color: '#FFD700' }}>{score.toLocaleString()}</div>

      <div className="flex flex-col items-center gap-6 text-center px-8">
        <div style={{ fontSize: 'clamp(4rem,15vw,7rem)' }}>{emoji}</div>

        {phase === 'waiting' && (
          <>
            <h2 className="font-black text-white" style={{ fontSize: 'clamp(1.5rem,6vw,2.5rem)' }}>リフレックステスト</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(0.9rem,3vw,1.1rem)' }}>🟢 みどりになったらすぐおして！</p>
            <button onClick={handlePress} className="font-black rounded-2xl px-8 py-4 text-white text-xl" style={{ background: char.color, border: 'none', cursor: 'pointer' }}>
              スタート！
            </button>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>スペースキーまたはタップ</p>
          </>
        )}

        {phase === 'ready' && (
          <div className="font-black text-white text-3xl animate-pulse">まって...</div>
        )}

        {phase === 'go' && (
          <div className="font-black text-white animate-bounce" style={{ fontSize: 'clamp(3rem,12vw,5rem)', textShadow: '0 0 40px white' }}>いまだ！</div>
        )}

        {phase === 'result' && reactionMs !== null && (
          <>
            <div className="font-black text-white" style={{ fontSize: 'clamp(2rem,8vw,3.5rem)' }}>{reactionMs}ms</div>
            <div className="text-lg font-bold" style={{ color: reactionMs < 250 ? '#4ADE80' : reactionMs < 400 ? '#FACC15' : '#FB7185' }}>
              {reactionMs < 250 ? '⚡ はやすぎ！' : reactionMs < 400 ? '👍 グッド！' : '🐢 おそい...'}
            </div>
            <div className="font-bold text-xl" style={{ color: '#FFD700' }}>+{Math.max(0, Math.round(1000 - reactionMs))}pts</div>
          </>
        )}

        {phase === 'early' && (
          <div className="font-black text-white text-2xl">はやすぎ！😅<br/><span className="text-lg">もうすこし まって</span></div>
        )}
      </div>
    </div>
  )
}
