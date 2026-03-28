import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }
type Cell = 'X' | 'O' | null
const WIN = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]

function checkWinner(b: Cell[]): Cell | 'draw' | null {
  for (const [a,c,d] of WIN) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a]
  if (b.every(Boolean)) return 'draw'
  return null
}

function aiMove(b: Cell[]): number {
  // Minimax
  function minimax(board: Cell[], isMax: boolean): number {
    const w = checkWinner(board)
    if (w === 'O') return 10
    if (w === 'X') return -10
    if (w === 'draw') return 0
    let best = isMax ? -Infinity : Infinity
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = isMax ? 'O' : 'X'
        const v = minimax(board, !isMax)
        board[i] = null
        best = isMax ? Math.max(best, v) : Math.min(best, v)
      }
    }
    return best
  }
  let best = -Infinity, move = -1
  for (let i = 0; i < 9; i++) {
    if (!b[i]) {
      b[i] = 'O'
      const v = minimax([...b], false)
      b[i] = null
      if (v > best) { best = v; move = i }
    }
  }
  return move
}

export function TicTacToe({ char, audio, onEnd, onBack }: Props) {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null))
  const [status, setStatus] = useState<'playing' | 'win' | 'lose' | 'draw'>('playing')
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(90)
  const [rounds, setRounds] = useState(0)

  const scoreRef = useRef(0)
  const timeRef = useRef(90)
  const boardRef = useRef<Cell[]>(Array(9).fill(null))
  const activeRef = useRef(true)
  const timerRef = useRef(0)
  const statusRef = useRef<'playing' | 'win' | 'lose' | 'draw'>('playing')

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    clearInterval(timerRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  function reset() {
    boardRef.current = Array(9).fill(null)
    setBoard([...boardRef.current])
    statusRef.current = 'playing'
    setStatus('playing')
  }

  function play(i: number) {
    if (!activeRef.current) return
    if (statusRef.current !== 'playing') { reset(); return }
    if (boardRef.current[i]) return

    boardRef.current[i] = 'X'
    setBoard([...boardRef.current])

    const r = checkWinner(boardRef.current)
    if (r) {
      const result = r === 'X' ? 'win' : r === 'draw' ? 'draw' : 'lose'
      statusRef.current = result
      setStatus(result)
      setRounds(rr => rr + 1)
      if (result === 'win') { scoreRef.current += 100; setScore(scoreRef.current); audio.sfxSpecial() }
      else if (result === 'draw') { scoreRef.current += 30; setScore(scoreRef.current); audio.sfxFlip() }
      else { audio.sfxMiss() }
      return
    }

    // AI move
    const aiI = aiMove([...boardRef.current])
    if (aiI >= 0) {
      boardRef.current[aiI] = 'O'
      setBoard([...boardRef.current])
      audio.sfxFlip()
      const r2 = checkWinner(boardRef.current)
      if (r2) {
        const result = r2 === 'X' ? 'win' : r2 === 'draw' ? 'draw' : 'lose'
        statusRef.current = result
        setStatus(result)
        setRounds(rr => rr + 1)
        if (result === 'win') { scoreRef.current += 100; setScore(scoreRef.current); audio.sfxSpecial() }
        else if (result === 'draw') { scoreRef.current += 30; setScore(scoreRef.current); audio.sfxFlip() }
        else { audio.sfxMiss() }
      } else {
        audio.sfxCatch()
      }
    }
  }

  useEffect(() => {
    audio.start('ticTacToe')
    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1; timeRef.current = n; setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)
    const kd = (e: KeyboardEvent) => {
      const n = parseInt(e.key)
      if (n >= 1 && n <= 9) { e.preventDefault(); play(n - 1) }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (statusRef.current !== 'playing') reset() }
    }
    window.addEventListener('keydown', kd)
    return () => { activeRef.current = false; clearInterval(timerRef.current); window.removeEventListener('keydown', kd) }
  }, [audio, endGame])

  const urgent = timeLeft <= 20
  const statusMsg = { win: '🎉 かった！+100', lose: '😢 まけた...', draw: '🤝 ひきわけ +30' }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} urgent={urgent} />

      <div className="mt-16 flex flex-col items-center gap-5">
        <div className="flex gap-6 text-sm font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <span style={{ color: char.color }}>あなた: X</span>
          <span>ラウンド {rounds}</span>
          <span style={{ color: '#EF4444' }}>AI: O</span>
        </div>

        {/* Board */}
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3,1fr)', width: 'min(80vw, 280px)' }}>
          {board.map((cell, i) => (
            <button
              key={i}
              onClick={() => play(i)}
              className="relative rounded-2xl flex items-center justify-center font-black transition-all duration-150 active:scale-90 cursor-pointer"
              style={{
                height: 'min(25vw, 88px)',
                background: cell === 'X' ? `${char.color}22` : cell === 'O' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${cell === 'X' ? char.color + '88' : cell === 'O' ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
                fontSize: 'clamp(1.8rem,8vw,2.5rem)',
                color: cell === 'X' ? char.color : cell === 'O' ? '#EF4444' : 'rgba(255,255,255,0.25)',
              }}
            >
              <span className="absolute top-1 left-2 text-[10px] font-normal" style={{ color: 'rgba(255,255,255,0.25)' }}>{i + 1}</span>
              {cell || '·'}
            </button>
          ))}
        </div>

        {/* Status */}
        {status !== 'playing' && (
          <div
            className="px-6 py-3 rounded-2xl text-center font-black text-lg animate-pop-in cursor-pointer"
            style={{ background: status === 'win' ? 'rgba(74,222,128,0.2)' : status === 'lose' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)', border: `2px solid ${status === 'win' ? '#4ADE80' : status === 'lose' ? '#EF4444' : 'rgba(255,255,255,0.3)'}`, color: 'white' }}
            onClick={reset}
          >
            {statusMsg[status]}<br /><span className="text-sm font-normal opacity-70">タップで次のラウンド</span>
          </div>
        )}

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>数字キー 1〜9 でうて / Enterで次へ</p>
      </div>
    </div>
  )
}
