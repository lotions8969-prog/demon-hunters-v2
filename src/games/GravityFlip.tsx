import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }
interface Obstacle { id: number; x: number; topH: number; gap: number }

const GRAVITY = 0.45
const CHAR_SIZE = 44
const OBS_W = 48

export function GravityFlip({ char, audio, onEnd, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [displayScore, setDisplayScore] = useState(0)
  const [started, setStarted] = useState(false)
  const scoreRef = useRef(0)
  const activeRef = useRef(true)
  const rafRef = useRef(0)
  const startedRef = useRef(false)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const state = useRef({ y: 0, vy: 0, flipped: false, obstacles: [] as Obstacle[], nextId: 0, W: 0, H: 0, frame: 0 })
  const flipRef = useRef<() => void>(() => {})

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    cancelAnimationFrame(rafRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 400)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('gravityFlip')
    const img = new Image(); img.src = char.img.profile; imgRef.current = img
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const W = window.innerWidth, H = window.innerHeight
    canvas.width = W; canvas.height = H
    const s = state.current
    s.W = W; s.H = H; s.y = H / 2; s.vy = 0; s.obstacles = []; s.frame = 0

    const GAP = Math.min(H * 0.38, 220)
    const speed = () => 3 + scoreRef.current * 0.008

    flipRef.current = () => {
      if (!startedRef.current) { startedRef.current = true; setStarted(true) }
      s.flipped = !s.flipped
      s.vy = s.flipped ? GRAVITY * 2 : -GRAVITY * 2
      audio.sfxBubble()
    }

    function draw() {
      if (!activeRef.current) return
      if (startedRef.current) {
        s.frame++
        const grav = s.flipped ? GRAVITY : -GRAVITY
        s.vy += grav; s.y += s.vy
        s.vy = Math.max(-10, Math.min(10, s.vy))

        // Spawn obstacles
        if (s.frame % Math.max(60, 110 - scoreRef.current) === 0) {
          const topH = 40 + Math.random() * (H - GAP - 80)
          s.obstacles.push({ id: s.nextId++, x: W + OBS_W, topH, gap: GAP })
        }

        // Move obstacles
        s.obstacles = s.obstacles.map(o => ({ ...o, x: o.x - speed() })).filter(o => o.x > -OBS_W - 10)

        // Score passed obstacles
        s.obstacles.forEach(o => {
          if (o.x + OBS_W / 2 < W / 4 && o.x + OBS_W / 2 > W / 4 - speed()) {
            scoreRef.current++; setDisplayScore(scoreRef.current)
            audio.sfxCatch()
          }
        })

        // Collision
        const cx = W / 4, cy = s.y
        if (cy < CHAR_SIZE / 2 || cy > H - CHAR_SIZE / 2) { endGame(); return }
        for (const o of s.obstacles) {
          if (cx + CHAR_SIZE / 2 - 4 > o.x && cx - CHAR_SIZE / 2 + 4 < o.x + OBS_W) {
            if (cy - CHAR_SIZE / 2 + 4 < o.topH || cy + CHAR_SIZE / 2 - 4 > o.topH + GAP) { endGame(); return }
          }
        }
      }

      ctx.clearRect(0, 0, W, H)
      // bg
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#040012'); bg.addColorStop(1, '#0a0025')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

      // Obstacles
      s.obstacles.forEach(o => {
        ctx.fillStyle = char.dark
        ctx.fillRect(o.x, 0, OBS_W, o.topH)
        ctx.fillRect(o.x, o.topH + o.gap, OBS_W, H - o.topH - o.gap)
        ctx.fillStyle = char.color
        ctx.fillRect(o.x - 4, o.topH - 18, OBS_W + 8, 18)
        ctx.fillRect(o.x - 4, o.topH + o.gap, OBS_W + 8, 18)
      })

      // Character
      ctx.save()
      ctx.translate(W / 4, s.y)
      ctx.rotate(s.flipped ? Math.PI : 0)
      ctx.beginPath(); ctx.roundRect(-CHAR_SIZE / 2, -CHAR_SIZE / 2, CHAR_SIZE, CHAR_SIZE, 8); ctx.clip()
      if (imgRef.current?.complete) ctx.drawImage(imgRef.current, -CHAR_SIZE / 2, -CHAR_SIZE / 2, CHAR_SIZE, CHAR_SIZE)
      ctx.restore()
      ctx.strokeStyle = char.color; ctx.lineWidth = 2
      ctx.beginPath(); ctx.roundRect(W / 4 - CHAR_SIZE / 2, s.y - CHAR_SIZE / 2, CHAR_SIZE, CHAR_SIZE, 8); ctx.stroke()

      // Gravity indicator
      ctx.fillStyle = char.color; ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'left'
      ctx.fillText(s.flipped ? '⬆️ 逆重力' : '⬇️ 重力', 16, H - 20)

      if (!startedRef.current) {
        ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, H / 2 - 60, W, 120)
        ctx.fillStyle = 'white'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center'
        ctx.fillText('タップで重力反転！', W / 2, H / 2)
        ctx.font = '14px system-ui'; ctx.fillStyle = 'rgba(255,255,255,.5)'
        ctx.fillText('かべとパイプにぶつからないで', W / 2, H / 2 + 30)
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)

    const kd = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); flipRef.current() } }
    window.addEventListener('keydown', kd)
    return () => { activeRef.current = false; cancelAnimationFrame(rafRef.current); window.removeEventListener('keydown', kd) }
  }, [audio, endGame, char])

  return (
    <div className="fixed inset-0" style={{ background: '#040012', touchAction: 'none' }} onPointerDown={() => flipRef.current()}>
      <canvas ref={canvasRef} className="absolute inset-0" />
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      {started && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 font-black text-2xl z-20" style={{ color: '#FFD700' }}>{displayScore}</div>
      )}
    </div>
  )
}
