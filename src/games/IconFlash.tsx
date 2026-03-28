import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const ICONS = ['👹', '💀', '😈', '🧟', '🕷️', '🔮', '🧿', '👁️', '🐉', '💣', '⚔️', '🔥', '🌟', '💎', '🌙', '⚡']
type Phase = 'show' | 'pick' | 'result'

export function IconFlash({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [phase, setPhase] = useState<Phase>('show')
  const [sequence, setSequence] = useState<number[]>([])
  const [showIdx, setShowIdx] = useState(0)
  const [choices, setChoices] = useState<number[]>([])
  const [answerIdx, setAnswerIdx] = useState(0)
  const [flash, setFlash] = useState<{ idx: number; ok: boolean } | null>(null)
  const [particles, setParticles] = useState<ScoreParticleData[]>([])
  const [timeLeft, setTimeLeft] = useState(60)

  const scoreRef = useRef(0)
  const timeRef = useRef(60)
  const roundRef = useRef(1)
  const activeRef = useRef(true)
  const timerRef = useRef(0)
  const answerRef = useRef(0)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    clearInterval(timerRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  function startRound(r: number) {
    const seqLen = Math.min(3 + Math.floor((r - 1) / 2), 6)
    const seq = Array.from({ length: seqLen }, () => Math.floor(Math.random() * ICONS.length))
    // Pick one to ask about
    const askIdx = Math.floor(Math.random() * seqLen)
    answerRef.current = seq[askIdx]
    setAnswerIdx(askIdx)
    setSequence(seq)
    setShowIdx(0)
    setPhase('show')
    setRound(r)

    // Show sequence one by one
    let i = 0
    function showNext() {
      if (!activeRef.current) return
      if (i < seq.length) {
        setShowIdx(i)
        audio.sfxAppear()
        i++
        setTimeout(showNext, 700)
      } else {
        // Ask question
        setPhase('pick')
        // Generate choices
        const wrong = Array.from({ length: ICONS.length }, (_, j) => j)
          .filter(j => j !== seq[askIdx])
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
        const all = [...wrong, seq[askIdx]].sort(() => Math.random() - 0.5)
        setChoices(all)
      }
    }
    setTimeout(showNext, 500)
  }

  useEffect(() => {
    audio.start('iconFlash')
    startRound(1)
    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1; timeRef.current = n; setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)
    return () => { activeRef.current = false; clearInterval(timerRef.current) }
  }, [audio, endGame])

  function pick(iconIdx: number, choicePos: number, ex: number, ey: number) {
    if (phase !== 'pick' || !activeRef.current) return
    const correct = iconIdx === answerRef.current
    setFlash({ idx: choicePos, ok: correct })
    setTimeout(() => setFlash(null), 400)

    if (correct) {
      const pts = 50 + roundRef.current * 10
      scoreRef.current += pts; setScore(scoreRef.current)
      audio.sfxSpecial()
      const pid = Date.now()
      setParticles(p => [...p, { id: pid, x: ex, y: ey, text: `+${pts} せいかい！`, color: '#FFD700', big: true }])
      setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 800)
    } else {
      audio.sfxMiss()
      const pid = Date.now()
      setParticles(p => [...p, { id: pid, x: ex, y: ey, text: 'まちがい！', color: '#F87171', big: false }])
      setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 800)
    }
    setPhase('result')
    const nr = roundRef.current + 1
    roundRef.current = nr
    setTimeout(() => { if (activeRef.current) startRound(nr) }, 1000)
  }

  const urgent = timeLeft <= 10
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <div className="absolute top-4 left-0 right-0 flex justify-between items-center px-4 mt-10">
        <div className="font-black text-2xl" style={{ color: '#FFD700' }}>{score}</div>
        <div className="font-black text-xl" style={{ color: urgent ? '#F87171' : 'white' }}>{timeLeft}s</div>
        <div className="text-sm" style={{ color: 'rgba(255,255,255,.6)' }}>ラウンド {round}</div>
      </div>
      <div className="absolute top-0 left-0 right-0 h-1 z-30" style={{ background: 'rgba(255,255,255,.1)' }}>
        <div className="h-full transition-all duration-1000" style={{ width: `${(timeLeft / 60) * 100}%`, background: urgent ? '#F87171' : char.color }} />
      </div>

      <div className="mt-16 flex flex-col items-center gap-6 w-full max-w-sm px-6">
        {phase === 'show' && (
          <>
            <div className="text-sm font-bold" style={{ color: 'rgba(255,255,255,.6)' }}>おぼえよう！</div>
            <div className="flex gap-3 flex-wrap justify-center">
              {sequence.map((iconIdx, i) => (
                <div key={i} className="rounded-xl flex items-center justify-center"
                  style={{
                    width: 64, height: 64,
                    background: i === showIdx ? char.color : i < showIdx ? `${char.color}44` : 'rgba(255,255,255,.1)',
                    fontSize: i <= showIdx ? '2.2rem' : '0',
                    border: `2px solid ${i === showIdx ? char.color : 'rgba(255,255,255,.1)'}`,
                    boxShadow: i === showIdx ? `0 0 20px ${char.color}` : 'none',
                    transition: 'all .3s',
                  }}>{i <= showIdx ? ICONS[iconIdx] : ''}</div>
              ))}
            </div>
          </>
        )}

        {(phase === 'pick' || phase === 'result') && (
          <>
            <div className="text-sm font-bold" style={{ color: 'rgba(255,255,255,.7)' }}>
              {answerIdx + 1}ばんめはなに？
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
              {sequence.map((_, i) => (
                <div key={i} className="rounded-xl flex items-center justify-center font-black text-sm"
                  style={{
                    width: 48, height: 48,
                    background: i === answerIdx ? char.color : 'rgba(255,255,255,.1)',
                    border: `2px solid ${i === answerIdx ? char.color : 'rgba(255,255,255,.15)'}`,
                    color: 'white',
                  }}>{i === answerIdx ? '?' : `${i + 1}`}</div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              {choices.map((iconIdx, ci) => (
                <button key={ci}
                  onPointerDown={e => { e.stopPropagation(); pick(iconIdx, ci, e.clientX, e.clientY) }}
                  disabled={phase === 'result'}
                  className="rounded-2xl flex items-center justify-center py-4"
                  style={{
                    background: flash?.idx === ci ? (flash.ok ? `${char.color}55` : 'rgba(239,68,68,.4)') : `${char.color}15`,
                    border: `2px solid ${flash?.idx === ci ? (flash.ok ? char.color : '#EF4444') : `${char.color}33`}`,
                    fontSize: '2.5rem',
                    touchAction: 'none',
                  }}>
                  {ICONS[iconIdx]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
