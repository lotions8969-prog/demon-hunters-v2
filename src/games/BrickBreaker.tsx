import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }
interface Brick { row: number; col: number; alive: boolean; color: string }

const ROWS = 5
const COLS = 8
const BALL_R = 9
const PADDLE_H = 14
const BRICK_H = 28

export function BrickBreaker({ char, audio, onEnd, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scoreRef = useRef(0)
  const activeRef = useRef(true)
  const rafRef = useRef(0)
  const timerRef = useRef(0)
  const timeRef = useRef(120)
  const startedRef = useRef(false)
  const [timeLeft, setTimeLeft] = useState(120)
  const [startedUI, setStartedUI] = useState(false)

  const state = useRef({ paddleX: 0, bx: 0, by: 0, vx: 4, vy: -4, bricks: [] as Brick[], W: 0, H: 0, lives: 3 })
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
    audio.start('brickBreaker')
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W; canvas.height = H

    const s = state.current
    s.W = W; s.H = H; s.paddleX = W / 2; s.lives = 3
    s.bx = W / 2; s.by = H - 100
    s.vx = 4 * (Math.random() > 0.5 ? 1 : -1); s.vy = -4

    const PADDLE_W = Math.min(120, W * 0.2)
    const brickW = (W - 20) / COLS
    const colors = [char.color, '#FB7185', '#38BDF8', '#4ADE80', '#FACC15']

    function initBricks() {
      s.bricks = []
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          s.bricks.push({ row: r, col: c, alive: true, color: colors[r % colors.length] })
    }
    initBricks()

    function resetBall() {
      s.bx = W / 2; s.by = H - 100
      s.vx = 4 * (Math.random() > 0.5 ? 1 : -1); s.vy = -4
    }

    function draw() {
      if (!activeRef.current) return
      if (startedRef.current) {
        const step = 6
        if (keyRef.current['ArrowLeft'] || keyRef.current['a'] || keyRef.current['A']) s.paddleX = Math.max(PADDLE_W / 2, s.paddleX - step)
        if (keyRef.current['ArrowRight'] || keyRef.current['d'] || keyRef.current['D']) s.paddleX = Math.min(W - PADDLE_W / 2, s.paddleX + step)
        s.bx += s.vx; s.by += s.vy
        if (s.bx <= BALL_R || s.bx >= W - BALL_R) { s.vx = -s.vx; audio.sfxFlip() }
        if (s.by <= BALL_R) { s.vy = -s.vy; audio.sfxFlip() }
        const paddleY = H - 60
        if (s.by + BALL_R >= paddleY && s.by + BALL_R <= paddleY + PADDLE_H + 4 && s.bx >= s.paddleX - PADDLE_W / 2 && s.bx <= s.paddleX + PADDLE_W / 2) {
          s.vy = -Math.abs(s.vy); s.vx = ((s.bx - s.paddleX) / (PADDLE_W / 2)) * 5; audio.sfxBubble()
        }
        if (s.by > H + BALL_R) { s.lives--; audio.sfxMiss(); if (s.lives <= 0) { endGame(); return } resetBall() }
        const topOffset = 60
        for (const b of s.bricks) {
          if (!b.alive) continue
          const bx1 = 10 + b.col * brickW, by1 = topOffset + b.row * (BRICK_H + 4)
          if (s.bx + BALL_R > bx1 && s.bx - BALL_R < bx1 + brickW - 2 && s.by + BALL_R > by1 && s.by - BALL_R < by1 + BRICK_H) {
            b.alive = false; s.vy = -s.vy; scoreRef.current += 10 * (ROWS - b.row); audio.sfxMatch(); break
          }
        }
        if (s.bricks.every(b => !b.alive)) { scoreRef.current += 200; initBricks(); audio.sfxSpecial() }
      }
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#020008'; ctx.fillRect(0, 0, W, H)
      const topOffset = 60
      for (const b of s.bricks) {
        if (!b.alive) continue
        const bx1 = 10 + b.col * brickW, by1 = topOffset + b.row * (BRICK_H + 4)
        const grad = ctx.createLinearGradient(bx1, by1, bx1, by1 + BRICK_H)
        grad.addColorStop(0, b.color + 'dd'); grad.addColorStop(1, b.color + '88')
        ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(bx1 + 1, by1, brickW - 4, BRICK_H, 5); ctx.fill()
      }
      const paddleY = H - 60
      const pg = ctx.createLinearGradient(s.paddleX - PADDLE_W / 2, 0, s.paddleX + PADDLE_W / 2, 0)
      pg.addColorStop(0, char.dark); pg.addColorStop(0.5, char.color); pg.addColorStop(1, char.dark)
      ctx.fillStyle = pg; ctx.beginPath(); ctx.roundRect(s.paddleX - PADDLE_W / 2, paddleY, PADDLE_W, PADDLE_H, PADDLE_H / 2); ctx.fill()
      const bg2 = ctx.createRadialGradient(s.bx - 2, s.by - 2, 0, s.bx, s.by, BALL_R * 1.5)
      bg2.addColorStop(0, 'white'); bg2.addColorStop(0.4, char.color); bg2.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = bg2; ctx.beginPath(); ctx.arc(s.bx, s.by, BALL_R * 1.5, 0, Math.PI * 2); ctx.fill()
      ctx.font = 'bold 16px system-ui'
      ctx.fillStyle = '#FFD700'; ctx.textAlign = 'left'; ctx.fillText(`${scoreRef.current}`, 10, 22)
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.textAlign = 'center'; ctx.fillText('❤️'.repeat(s.lives), W / 2, 22)
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.textAlign = 'right'; ctx.fillText(`${timeRef.current}s`, W - 10, 22)
      if (!startedRef.current) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, H / 2 - 50, W, 100)
        ctx.fillStyle = 'white'; ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center'
        ctx.fillText('← → キーまたはタッチで操作', W / 2, H / 2 - 5)
        ctx.font = '13px system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.fillText('スペースまたはタップでスタート', W / 2, H / 2 + 22)
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)

    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1; timeRef.current = n; setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)

    const onMove = (e: PointerEvent) => { s.paddleX = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, e.clientX)) }
    const onDown = () => { if (!startedRef.current) { startedRef.current = true; setStartedUI(true) } }
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerdown', onDown)

    const kd = (e: KeyboardEvent) => {
      keyRef.current[e.key] = true
      if ([' ', 'ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); if (!startedRef.current) { startedRef.current = true; setStartedUI(true) } }
    }
    const ku = (e: KeyboardEvent) => { keyRef.current[e.key] = false }
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku)
    return () => {
      activeRef.current = false; cancelAnimationFrame(rafRef.current); clearInterval(timerRef.current)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku)
    }
  }, [audio, endGame, char.color, char.dark])

  return (
    <div className="fixed inset-0" style={{ background: '#020008', touchAction: 'none' }}>
      <canvas ref={canvasRef} className="absolute inset-0" />
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      {!startedUI && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 text-xs text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
          ← → キー / マウスで移動・スペース / タップでスタート
        </div>
      )}
      <div className="absolute top-3 right-4 z-20 text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{timeLeft}s</div>
    </div>
  )
}
