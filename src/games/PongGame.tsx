import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

const PADDLE_H = 80
const PADDLE_W = 12
const BALL_R = 10
const SPEED = 5

export function PongGame({ char, audio, onEnd, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scoreRef = useRef(0)
  const activeRef = useRef(true)
  const rafRef = useRef(0)
  const timerRef = useRef(0)
  const timeRef = useRef(90)
  const [_score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(90)

  const state = useRef({
    playerY: 0, aiY: 0,
    bx: 0, by: 0, vx: SPEED, vy: SPEED * 0.8,
    W: 0, H: 0,
  })
  const keyRef = useRef<Record<string, boolean>>({})

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    cancelAnimationFrame(rafRef.current)
    clearInterval(timerRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('pongGame')
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W; canvas.height = H

    const s = state.current
    s.W = W; s.H = H
    s.playerY = H / 2 - PADDLE_H / 2
    s.aiY = H / 2 - PADDLE_H / 2
    s.bx = W / 2; s.by = H / 2

    function draw() {
      if (!activeRef.current) return

      // Move player
      const step = 5
      if (keyRef.current['ArrowUp'] || keyRef.current['w'] || keyRef.current['W'])
        s.playerY = Math.max(0, s.playerY - step)
      if (keyRef.current['ArrowDown'] || keyRef.current['s'] || keyRef.current['S'])
        s.playerY = Math.min(H - PADDLE_H, s.playerY + step)

      // AI: follow ball
      const aiCenter = s.aiY + PADDLE_H / 2
      if (aiCenter < s.by - 10) s.aiY = Math.min(H - PADDLE_H, s.aiY + 3.5)
      if (aiCenter > s.by + 10) s.aiY = Math.max(0, s.aiY - 3.5)

      // Move ball
      s.bx += s.vx; s.by += s.vy

      // Wall bounce
      if (s.by <= BALL_R || s.by >= H - BALL_R) { s.vy = -s.vy; audio.sfxFlip() }

      // Player paddle (left side)
      const pw = 30
      if (s.bx - BALL_R <= pw + PADDLE_W && s.bx - BALL_R >= pw && s.by >= s.playerY && s.by <= s.playerY + PADDLE_H) {
        s.vx = Math.abs(s.vx) + 0.2
        const rel = (s.by - (s.playerY + PADDLE_H / 2)) / (PADDLE_H / 2)
        s.vy = rel * 5
        audio.sfxBubble()
      }

      // AI paddle (right side)
      const aw = W - 30 - PADDLE_W
      if (s.bx + BALL_R >= aw && s.bx + BALL_R <= aw + PADDLE_W && s.by >= s.aiY && s.by <= s.aiY + PADDLE_H) {
        s.vx = -(Math.abs(s.vx) + 0.1)
        audio.sfxFlip()
      }

      // Score: ball passes AI
      if (s.bx > W + BALL_R) {
        scoreRef.current += 50
        setScore(scoreRef.current)
        audio.sfxSpecial()
        s.bx = W / 2; s.by = H / 2
        s.vx = -SPEED; s.vy = (Math.random() - 0.5) * 8
      }

      // Ball passes player
      if (s.bx < -BALL_R) {
        audio.sfxMiss()
        s.bx = W / 2; s.by = H / 2
        s.vx = SPEED; s.vy = (Math.random() - 0.5) * 8
      }

      // Clamp speed
      const spd = Math.sqrt(s.vx * s.vx + s.vy * s.vy)
      if (spd > 14) { s.vx = (s.vx / spd) * 14; s.vy = (s.vy / spd) * 14 }

      // Draw
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#020008'
      ctx.fillRect(0, 0, W, H)

      // Center line
      ctx.setLineDash([8, 8])
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke()
      ctx.setLineDash([])

      // Paddles
      const grad1 = ctx.createLinearGradient(pw, s.playerY, pw + PADDLE_W, s.playerY + PADDLE_H)
      grad1.addColorStop(0, char.color); grad1.addColorStop(1, char.dark)
      ctx.fillStyle = grad1
      ctx.beginPath(); ctx.roundRect(pw, s.playerY, PADDLE_W, PADDLE_H, 6); ctx.fill()

      ctx.fillStyle = 'rgba(255,100,100,0.8)'
      ctx.beginPath(); ctx.roundRect(aw, s.aiY, PADDLE_W, PADDLE_H, 6); ctx.fill()

      // Ball glow
      const ballGrad = ctx.createRadialGradient(s.bx, s.by, 0, s.bx, s.by, BALL_R * 2)
      ballGrad.addColorStop(0, 'rgba(255,255,255,1)')
      ballGrad.addColorStop(0.5, char.color)
      ballGrad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = ballGrad
      ctx.beginPath(); ctx.arc(s.bx, s.by, BALL_R * 2, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'white'
      ctx.beginPath(); ctx.arc(s.bx, s.by, BALL_R, 0, Math.PI * 2); ctx.fill()

      // Score
      ctx.font = 'bold 18px system-ui'
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.textAlign = 'center'
      ctx.fillText(`${scoreRef.current}`, W / 2, 36)

      ctx.font = 'bold 14px system-ui'
      ctx.fillStyle = char.color
      ctx.textAlign = 'left'
      ctx.fillText('あなた', pw + PADDLE_W + 8, 24)
      ctx.fillStyle = 'rgba(255,100,100,0.9)'
      ctx.textAlign = 'right'
      ctx.fillText('AI', aw - 8, 24)

      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)

    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1; timeRef.current = n; setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)

    // Touch drag for player paddle
    const onTouch = (e: TouchEvent) => {
      s.playerY = Math.max(0, Math.min(H - PADDLE_H, e.touches[0].clientY - PADDLE_H / 2))
    }
    canvas.addEventListener('touchmove', onTouch, { passive: true })

    const kd = (e: KeyboardEvent) => { keyRef.current[e.key] = true; if (['ArrowUp','ArrowDown'].includes(e.key)) e.preventDefault() }
    const ku = (e: KeyboardEvent) => { keyRef.current[e.key] = false }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)

    return () => {
      activeRef.current = false
      cancelAnimationFrame(rafRef.current)
      clearInterval(timerRef.current)
      canvas.removeEventListener('touchmove', onTouch)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [audio, endGame, char.color, char.dark])

  return (
    <div className="fixed inset-0" style={{ background: '#020008', touchAction: 'none' }}>
      <canvas ref={canvasRef} className="absolute inset-0" />
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <div className="absolute top-10 left-4 z-30 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>W/S or ↑↓ で移動<br/>タッチ：ドラッグ</div>
      <div className="absolute top-10 right-4 z-30 text-xs text-right" style={{ color: 'rgba(255,255,255,0.35)' }}>残り {timeLeft}秒</div>
    </div>
  )
}
