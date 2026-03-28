import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }
interface Obstacle { id: number; x: number; w: number; h: number; type: 'wall' | 'pit' }
interface Coin { id: number; x: number; y: number }

const GROUND = 0.75
const CHAR_W = 40, CHAR_H = 52
const JUMP_V = -13
const GRAV = 0.65

export function EndlessRun({ char, audio, onEnd, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [displayScore, setDisplayScore] = useState(0)
  const [started, setStarted] = useState(false)
  const scoreRef = useRef(0)
  const activeRef = useRef(true)
  const rafRef = useRef(0)
  const startedRef = useRef(false)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const jumpRef = useRef<() => void>(() => {})
  const state = useRef({ y: 0, vy: 0, grounded: false, obstacles: [] as Obstacle[], coins: [] as Coin[], nextId: 0, frame: 0, W: 0, H: 0 })

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    cancelAnimationFrame(rafRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 400)
  }, [audio, onEnd])

  useEffect(() => {
    audio.start('endlessRun')
    const img = new Image(); img.src = char.img.profile; imgRef.current = img
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const W = window.innerWidth, H = window.innerHeight
    canvas.width = W; canvas.height = H
    const s = state.current
    s.W = W; s.H = H; s.frame = 0
    const groundY = H * GROUND
    s.y = groundY - CHAR_H; s.vy = 0; s.grounded = true

    jumpRef.current = () => {
      if (!startedRef.current) { startedRef.current = true; setStarted(true) }
      if (s.grounded) { s.vy = JUMP_V; s.grounded = false; audio.sfxBubble() }
    }

    const speed = () => 3.5 + scoreRef.current * 0.01

    function draw() {
      if (!activeRef.current) return
      if (startedRef.current) {
        s.frame++
        s.vy += GRAV; s.y += s.vy
        if (s.y >= groundY - CHAR_H) { s.y = groundY - CHAR_H; s.vy = 0; s.grounded = true }

        // Spawn obstacles
        if (s.frame % Math.max(50, 90 - Math.floor(scoreRef.current / 5)) === 0) {
          const type = Math.random() > 0.4 ? 'wall' : 'pit'
          s.obstacles.push({ id: s.nextId++, x: W + 20, w: type === 'wall' ? 28 : 60, h: type === 'wall' ? 50 + Math.random() * 50 : 8, type })
          if (Math.random() > 0.5) s.coins.push({ id: s.nextId++, x: W + 80, y: groundY - CHAR_H - 60 - Math.random() * 80 })
        }

        s.obstacles = s.obstacles.map(o => ({ ...o, x: o.x - speed() })).filter(o => o.x > -80)
        s.coins = s.coins.map(c => ({ ...c, x: c.x - speed() })).filter(c => c.x > -20)

        // Score
        if (s.frame % 30 === 0) { scoreRef.current++; setDisplayScore(scoreRef.current) }

        // Collect coins
        s.coins = s.coins.filter(c => {
          if (Math.abs(c.x - (60 + CHAR_W / 2)) < 25 && Math.abs(c.y - (s.y + CHAR_H / 2)) < 30) {
            scoreRef.current += 5; setDisplayScore(scoreRef.current); audio.sfxEat(); return false
          }
          return true
        })

        // Collision with obstacles
        const cx = 60, cy = s.y
        for (const o of s.obstacles) {
          if (o.type === 'wall') {
            const obsY = groundY - o.h
            if (cx + CHAR_W - 6 > o.x && cx + 6 < o.x + o.w && cy + CHAR_H - 6 > obsY && cy + 4 < groundY) { endGame(); return }
          } else {
            // pit: check if falling into it - not used for now
          }
        }
      }

      const groundY2 = H * GROUND
      ctx.clearRect(0, 0, W, H)
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#040012'); bg.addColorStop(1, '#0d1b2a')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

      // Ground
      ctx.fillStyle = char.dark; ctx.fillRect(0, groundY2, W, H - groundY2)
      ctx.fillStyle = char.color; ctx.fillRect(0, groundY2, W, 3)

      // Obstacles
      s.obstacles.forEach(o => {
        if (o.type === 'wall') {
          ctx.fillStyle = '#EF4444'
          ctx.fillRect(o.x, groundY2 - o.h, o.w, o.h)
          ctx.fillStyle = '#FF6B6B'
          ctx.fillRect(o.x, groundY2 - o.h, o.w, 6)
        }
      })

      // Coins
      s.coins.forEach(c => {
        ctx.fillStyle = '#FFD700'
        ctx.font = '24px system-ui'; ctx.textAlign = 'center'
        ctx.fillText('⭐', c.x, c.y)
      })

      // Character
      ctx.save()
      ctx.translate(60 + CHAR_W / 2, s.y + CHAR_H / 2)
      if (!s.grounded) ctx.rotate(Math.min(0.3, s.vy * 0.02))
      ctx.beginPath(); ctx.roundRect(-CHAR_W / 2, -CHAR_H / 2, CHAR_W, CHAR_H, 8); ctx.clip()
      if (imgRef.current?.complete) ctx.drawImage(imgRef.current, -CHAR_W / 2, -CHAR_H / 2, CHAR_W, CHAR_H)
      ctx.restore()
      ctx.strokeStyle = char.color; ctx.lineWidth = 2
      ctx.beginPath(); ctx.roundRect(60, s.y, CHAR_W, CHAR_H, 8); ctx.stroke()

      if (!startedRef.current) {
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, H / 2 - 60, W, 120)
        ctx.fillStyle = 'white'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center'
        ctx.fillText('タップでジャンプ！', W / 2, H / 2)
        ctx.font = '14px system-ui'; ctx.fillStyle = 'rgba(255,255,255,.5)'
        ctx.fillText('⭐をあつめて かべをさけろ！', W / 2, H / 2 + 30)
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)

    const kd = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); jumpRef.current() } }
    window.addEventListener('keydown', kd)
    return () => { activeRef.current = false; cancelAnimationFrame(rafRef.current); window.removeEventListener('keydown', kd) }
  }, [audio, endGame, char])

  return (
    <div className="fixed inset-0" style={{ background: '#040012', touchAction: 'none' }} onPointerDown={() => jumpRef.current()}>
      <canvas ref={canvasRef} className="absolute inset-0" />
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      {started && <div className="absolute top-3 left-1/2 -translate-x-1/2 font-black text-2xl z-20" style={{ color: '#FFD700' }}>{displayScore}</div>}
    </div>
  )
}
