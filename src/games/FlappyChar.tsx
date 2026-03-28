import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }
interface Pipe { id: number; x: number; gapY: number; passed: boolean }

const GRAVITY = 0.4
const JUMP = -8
const PIPE_W = 60
const GAP = 160
const BIRD_SIZE = 48

export function FlappyChar({ char, audio, onEnd, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [displayScore, setDisplayScore] = useState(0)
  const scoreRef = useRef(0)
  const activeRef = useRef(true)
  const rafRef = useRef(0)
  const startedRef = useRef(false)
  const [startedUI, setStartedUI] = useState(false)
  const state = useRef({ y: 0, vy: 0, pipes: [] as Pipe[], nextPipeId: 0, W: 0, H: 0 })
  const imgRef = useRef<HTMLImageElement | null>(null)
  const jumpRef = useRef<() => void>(() => {})

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    cancelAnimationFrame(rafRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 600)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('flappyChar')
    const img = new Image()
    img.src = char.img.profile
    imgRef.current = img

    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W; canvas.height = H

    const s = state.current
    s.W = W; s.H = H; s.y = H / 2; s.vy = 0; s.pipes = []

    jumpRef.current = () => {
      if (!startedRef.current) { startedRef.current = true; setStartedUI(true) }
      s.vy = JUMP
      audio.sfxBubble()
    }

    let pipeTimer = 0
    const PIPE_INTERVAL = 90

    function draw() {
      if (!activeRef.current) return
      if (startedRef.current) {
        s.vy += GRAVITY; s.y += s.vy
        pipeTimer++
        if (pipeTimer >= PIPE_INTERVAL) {
          pipeTimer = 0
          s.pipes.push({ id: s.nextPipeId++, x: W + PIPE_W, gapY: 100 + Math.random() * (H - 200 - GAP), passed: false })
        }
        const speed = 3 + scoreRef.current * 0.1
        s.pipes = s.pipes.map(p => ({ ...p, x: p.x - speed })).filter(p => p.x > -PIPE_W - 10)
        s.pipes.forEach(p => {
          if (!p.passed && p.x + PIPE_W < W / 2 - BIRD_SIZE / 2) {
            p.passed = true; scoreRef.current++; setDisplayScore(scoreRef.current); audio.sfxCatch()
          }
        })
        if (s.y > H - BIRD_SIZE || s.y < 0) { endGame(); return }
        const bx = W / 2 - BIRD_SIZE / 2, by = s.y - BIRD_SIZE / 2
        for (const p of s.pipes) {
          if (bx + BIRD_SIZE > p.x && bx < p.x + PIPE_W) {
            if (by < p.gapY || by + BIRD_SIZE > p.gapY + GAP) { endGame(); return }
          }
        }
      }
      ctx.clearRect(0, 0, W, H)
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#020008'); bg.addColorStop(1, '#0a0025')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.2 + (i % 3) * 0.1})`
        ctx.beginPath(); ctx.arc((i * 137) % W, (i * 97) % (H * 0.7), 1 + i % 2, 0, Math.PI * 2); ctx.fill()
      }
      for (const p of s.pipes) {
        const topH = p.gapY, botY = p.gapY + GAP, botH = H - botY
        ctx.fillStyle = char.dark; ctx.fillRect(p.x, 0, PIPE_W, topH)
        ctx.fillStyle = char.color; ctx.fillRect(p.x - 4, topH - 24, PIPE_W + 8, 24)
        ctx.fillStyle = char.dark; ctx.fillRect(p.x, botY, PIPE_W, botH)
        ctx.fillStyle = char.color; ctx.fillRect(p.x - 4, botY, PIPE_W + 8, 24)
      }
      ctx.save()
      ctx.translate(W / 2, s.y); ctx.rotate(Math.max(-0.5, Math.min(0.5, s.vy * 0.05)))
      ctx.beginPath(); ctx.roundRect(-BIRD_SIZE / 2, -BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE, 10); ctx.clip()
      if (imgRef.current?.complete) ctx.drawImage(imgRef.current, -BIRD_SIZE / 2, -BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE)
      ctx.restore()
      ctx.strokeStyle = char.color; ctx.lineWidth = 2; ctx.beginPath()
      ctx.roundRect(W / 2 - BIRD_SIZE / 2, s.y - BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE, 10); ctx.stroke()
      ctx.font = 'bold 28px system-ui'; ctx.fillStyle = 'white'; ctx.textAlign = 'center'
      ctx.fillText(`${scoreRef.current}`, W / 2, 50)
      if (!startedRef.current) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, H / 2 - 70, W, 140)
        ctx.fillStyle = 'white'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center'
        ctx.fillText('タップ / スペースで飛ぼう！', W / 2, H / 2 - 10)
        ctx.font = '14px system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.fillText('パイプのすきまを通りぬけろ', W / 2, H / 2 + 20)
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)

    const kd = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); jumpRef.current() } }
    window.addEventListener('keydown', kd)
    return () => { activeRef.current = false; cancelAnimationFrame(rafRef.current); window.removeEventListener('keydown', kd) }
  }, [audio, endGame, char])

  return (
    <div className="fixed inset-0" style={{ background: '#020008', touchAction: 'none' }} onPointerDown={() => jumpRef.current()}>
      <canvas ref={canvasRef} className="absolute inset-0" />
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      {startedUI && <div className="absolute top-3 right-4 font-black text-2xl z-20" style={{ color: '#FFD700' }}>{displayScore}</div>}
    </div>
  )
}
