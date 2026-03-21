import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const BUTTONS = [
  { emoji: '⭐', label: 'A' },
  { emoji: '🌸', label: 'B' },
  { emoji: '💎', label: 'C' },
  { emoji: '🔥', label: 'D' },
]

type Phase = 'showing' | 'input' | 'correct' | 'wrong' | 'done'

export function SimonSays({ char, audio, onEnd, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('showing')
  const [round, setRound] = useState(1)
  const [_sequence, setSequence] = useState<number[]>([])
  const [highlighted, setHighlighted] = useState<number | null>(null)
  const [playerIdx, setPlayerIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [particles, setParticles] = useState<ScoreParticleData[]>([])

  const scoreRef = useRef(0)
  const activeRef = useRef(true)
  const sequenceRef = useRef<number[]>([])
  const playerIdxRef = useRef(0)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  function showSequence(seq: number[]) {
    setPhase('showing')
    let i = 0
    function showNext() {
      if (!activeRef.current) return
      if (i >= seq.length) {
        setTimeout(() => { setPhase('input'); setPlayerIdx(0); playerIdxRef.current = 0 }, 400)
        return
      }
      setHighlighted(seq[i])
      setTimeout(() => {
        setHighlighted(null)
        i++
        setTimeout(showNext, 200)
      }, 500)
    }
    setTimeout(showNext, 600)
  }

  useEffect(() => {
    audio.start()
    const seq = [Math.floor(Math.random() * 4)]
    sequenceRef.current = seq
    setSequence(seq)
    showSequence(seq)
    return () => { activeRef.current = false }
  }, [audio]) // eslint-disable-line

  const tapButton = useCallback((btnIdx: number) => {
    if (phase !== 'input' || !activeRef.current) return
    const expected = sequenceRef.current[playerIdxRef.current]
    if (btnIdx !== expected) {
      audio.sfxMiss()
      setPhase('wrong')
      setTimeout(() => endGame(), 1200)
      return
    }
    audio.sfxCatch()
    const nextIdx = playerIdxRef.current + 1
    playerIdxRef.current = nextIdx
    setPlayerIdx(nextIdx)

    if (nextIdx >= sequenceRef.current.length) {
      // round complete
      const pts = round * 100
      scoreRef.current += pts
      setScore(scoreRef.current)
      setPhase('correct')

      if (round % 5 === 0) audio.sfxSpecial()
      else audio.sfxCombo()

      const pid = Date.now()
      setParticles(p => [...p, { id: pid, x: window.innerWidth / 2, y: window.innerHeight * 0.4, text: `+${pts} ラウンド${round}クリア！`, color: '#FFD700', big: true }])
      setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 1000)

      setTimeout(() => {
        if (!activeRef.current) return
        const newRound = round + 1
        setRound(newRound)
        const newSeq = [...sequenceRef.current, Math.floor(Math.random() * 4)]
        sequenceRef.current = newSeq
        setSequence(newSeq)
        showSequence(newSeq)
      }, 1200)
    }
  }, [phase, round, endGame, audio]) // eslint-disable-line

  const colors = [char.color, `${char.color}88`, `${char.color}44`, char.dark]

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col items-center" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <div className="pt-4 pb-2 text-center mt-12">
        <div className="text-white font-black text-3xl">{score.toLocaleString()}</div>
        <div style={{ color: char.color }} className="font-bold text-sm">ラウンド {round}</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 w-full px-8">
        {phase === 'showing' && (
          <div className="text-white text-lg font-bold animate-pulse">じゅんばんをおぼえよう！</div>
        )}
        {phase === 'input' && (
          <div style={{ color: char.color }} className="font-bold">
            {playerIdx + 1} / {sequenceRef.current.length} タップ！
          </div>
        )}
        {phase === 'correct' && (
          <div className="text-yellow-300 font-black text-xl animate-bounce">すばらしい！🎉</div>
        )}
        {phase === 'wrong' && (
          <div className="text-red-400 font-black text-xl animate-pulse">まちがい！😱</div>
        )}

        <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
          {BUTTONS.map((btn, i) => (
            <button
              key={i}
              onPointerDown={e => { e.stopPropagation(); tapButton(i) }}
              className="aspect-square rounded-2xl flex flex-col items-center justify-center text-4xl font-black cursor-pointer select-none"
              style={{
                background: colors[i],
                border: highlighted === i ? `4px solid white` : `2px solid ${char.color}44`,
                boxShadow: highlighted === i ? `0 0 30px white` : `0 4px 12px rgba(0,0,0,0.4)`,
                transform: highlighted === i ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.1s',
                touchAction: 'none',
                opacity: phase === 'showing' ? 0.7 : 1,
              }}
            >
              <span>{btn.emoji}</span>
            </button>
          ))}
        </div>

        {/* Sequence dots */}
        <div className="flex gap-1 flex-wrap justify-center mt-2">
          {sequenceRef.current.map((_v, i) => (
            <div
              key={i}
              style={{
                width: 10, height: 10, borderRadius: '50%',
                background: i < playerIdx ? char.color : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </div>
      </div>
      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
    </div>
  )
}
