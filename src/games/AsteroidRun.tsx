import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'

interface Props { char: Character; audio: AudioEngine; onEnd: (s: number) => void; onBack: () => void }

export function AsteroidRun({ char, audio, onEnd, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scoreUI, setScoreUI] = useState(0)
  const [startedUI, setStartedUI] = useState(false)

  const activeRef = useRef(true)
  const rafRef = useRef(0)

  const endGame = useCallback((score: number) => {
    if (!activeRef.current) return
    activeRef.current = false
    cancelAnimationFrame(rafRef.current)
    audio.stop()
    setTimeout(() => { audio.sfxGameOver(); onEnd(score) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    audio.start('asteroidRun')

    let W = window.innerWidth, H = window.innerHeight
    canvas.width = W; canvas.height = H

    // Player ship
    let px = W / 2, py = H * 0.75
    let targetPX = px
    let vx = 0
    let lives = 3
    let score = 0
    let started = false
    let invincible = 0
    let speed = 2

    interface Asteroid { x: number; y: number; r: number; vx: number; vy: number; rot: number; drot: number; pts: number }
    interface Star { x: number; y: number; s: number; br: number }
    interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }

    const asteroids: Asteroid[] = []
    const stars: Star[] = Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 2 + 0.5, br: Math.random() }))
    const particles: Particle[] = []
    let lastSpawn = 0
    let spawnInterval = 1200
    let frameCount = 0

    function spawnAsteroid() {
      const edge = Math.floor(Math.random() * 3) // top, left, right
      let x: number, y: number, vxA: number, vyA: number
      if (edge === 0) { x = Math.random() * W; y = -40; vxA = (Math.random() - 0.5) * 2; vyA = 1 + Math.random() * speed }
      else if (edge === 1) { x = -40; y = Math.random() * H * 0.6; vxA = 1 + Math.random() * speed; vyA = (Math.random() - 0.5) * 1.5 }
      else { x = W + 40; y = Math.random() * H * 0.6; vxA = -(1 + Math.random() * speed); vyA = (Math.random() - 0.5) * 1.5 }
      const r = 18 + Math.random() * 22
      asteroids.push({ x, y, r, vx: vxA, vy: vyA, rot: 0, drot: (Math.random() - 0.5) * 0.05, pts: Math.round(30 / r * 20) })
    }

    function explode(x: number, y: number, color: string) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        particles.push({ x, y, vx: Math.cos(a) * (2 + Math.random() * 3), vy: Math.sin(a) * (2 + Math.random() * 3), life: 1, color })
      }
    }

    function onTouch(e: PointerEvent) {
      if (!started) { started = true; setStartedUI(true) }
      targetPX = e.clientX
    }
    canvas.addEventListener('pointerdown', onTouch)
    canvas.addEventListener('pointermove', (e) => { if (started) targetPX = e.clientX })

    let lastTime = performance.now()
    function loop(now: number) {
      if (!activeRef.current) return
      const dt = Math.min((now - lastTime) / 16.67, 3)
      lastTime = now
      frameCount++

      // Resize
      if (canvas!.width !== window.innerWidth || canvas!.height !== window.innerHeight) {
        W = window.innerWidth; H = window.innerHeight
        canvas!.width = W; canvas!.height = H
        py = H * 0.75
      }

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#050510'
      ctx.fillRect(0, 0, W, H)

      // Stars
      stars.forEach(s => {
        s.y += 0.3 * dt
        if (s.y > H) { s.y = 0; s.x = Math.random() * W }
        ctx.globalAlpha = 0.3 + s.br * 0.7
        ctx.fillStyle = 'white'
        ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2); ctx.fill()
      })
      ctx.globalAlpha = 1

      if (!started) {
        ctx.fillStyle = 'white'
        ctx.font = 'bold 20px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('タップしてスタート！', W / 2, H / 2)
        ctx.font = '16px sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,.5)'
        ctx.fillText('タップ/ドラッグで移動', W / 2, H / 2 + 36)
        // Draw ship
        ctx.save(); ctx.translate(px, py)
        ctx.fillStyle = char.color; ctx.beginPath()
        ctx.moveTo(0, -24); ctx.lineTo(16, 18); ctx.lineTo(-16, 18); ctx.closePath(); ctx.fill()
        ctx.restore()
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      // Difficulty
      speed = 2 + score / 500
      if (frameCount % 300 === 0) spawnInterval = Math.max(600, spawnInterval - 50)
      if (now - lastSpawn > spawnInterval) { spawnAsteroid(); lastSpawn = now }

      // Move player
      if (invincible > 0) invincible -= dt
      vx += (targetPX - px) * 0.08 * dt
      vx *= 0.85
      px += vx * dt
      px = Math.max(24, Math.min(W - 24, px))

      // Update asteroids
      for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i]
        a.x += a.vx * dt; a.y += a.vy * dt; a.rot += a.drot * dt
        if (a.x < -80 || a.x > W + 80 || a.y > H + 80) { asteroids.splice(i, 1); continue }
        // Collision with player
        if (invincible <= 0 && Math.hypot(a.x - px, a.y - py) < a.r + 18) {
          lives--; invincible = 120
          explode(px, py, '#EF4444')
          audio.sfxMiss()
          asteroids.splice(i, 1)
          if (lives <= 0) { endGame(score); return }
          continue
        }
        // Draw
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot)
        ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = 2; ctx.fillStyle = '#374151'
        ctx.beginPath()
        const sides = 7
        for (let j = 0; j < sides; j++) {
          const ang = (j / sides) * Math.PI * 2
          const r2 = a.r * (0.8 + 0.2 * Math.sin(j * 3.7))
          j === 0 ? ctx.moveTo(r2 * Math.cos(ang), r2 * Math.sin(ang)) : ctx.lineTo(r2 * Math.cos(ang), r2 * Math.sin(ang))
        }
        ctx.closePath(); ctx.fill(); ctx.stroke()
        ctx.restore()
      }

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= 0.03 * dt
        if (p.life <= 0) { particles.splice(i, 1); continue }
        ctx.globalAlpha = p.life
        ctx.fillStyle = p.color
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1

      // Draw player ship
      ctx.save(); ctx.translate(px, py)
      if (invincible > 0 && Math.floor(invincible / 6) % 2 === 0) {
        ctx.globalAlpha = 0.3
      }
      ctx.fillStyle = char.color
      ctx.shadowColor = char.color; ctx.shadowBlur = 12
      ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(16, 18); ctx.lineTo(0, 10); ctx.lineTo(-16, 18); ctx.closePath(); ctx.fill()
      ctx.restore(); ctx.globalAlpha = 1

      // Score (increment over time)
      if (frameCount % 30 === 0) { score += 1; setScoreUI(score) }

      // HUD
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'left'
      ctx.fillText(`${score}`, 16, 40)
      ctx.textAlign = 'center'
      ctx.fillStyle = '#EF4444'; ctx.font = 'bold 20px sans-serif'
      ctx.fillText('❤️'.repeat(lives), W / 2, 40)

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      activeRef.current = false
      cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener('pointerdown', onTouch)
    }
  }, [audio, char, endGame])

  return (
    <div className="fixed inset-0">
      <canvas ref={canvasRef} className="absolute inset-0" style={{ touchAction: 'none' }} />
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      {!startedUI && (
        <div className="absolute bottom-8 left-0 right-0 text-center text-xs" style={{ color: 'rgba(255,255,255,.4)' }}>
          スコア: {scoreUI}
        </div>
      )}
    </div>
  )
}
