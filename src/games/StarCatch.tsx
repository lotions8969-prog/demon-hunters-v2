import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'

const DROP_ITEMS = [
  { emoji:'⭐', pts:10, glow:'#FFD700' }, { emoji:'💜', pts:10, glow:'#C084FC' },
  { emoji:'❤️', pts:10, glow:'#FB7185' }, { emoji:'💙', pts:10, glow:'#38BDF8' },
  { emoji:'🌟', pts:15, glow:'#FFD700' }, { emoji:'💫', pts:15, glow:'#F0ABFC' },
  { emoji:'✨', pts:10, glow:'#E0F2FE' }, { emoji:'🎵', pts:10, glow:'#A78BFA' },
  { emoji:'💎', pts:20, glow:'#93C5FD' }, { emoji:'🌸', pts:10, glow:'#FBB6CE' },
]
const SPECIAL = [
  { emoji:'🌈', pts:50, glow:'#FFD700' }, { emoji:'🏆', pts:50, glow:'#FFD700' }, { emoji:'🎊', pts:40, glow:'#FB923C' },
]

interface Item { id:number; x:number; y:number; size:number; emoji:string; pts:number; glow:string; speed:number; special:boolean; rotation:number }
interface Props { char:Character; audio:AudioEngine; onEnd:(s:number)=>void; onBack:()=>void }

export function StarCatch({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [items, setItems] = useState<Item[]>([])
  const [combo, setCombo] = useState(0)
  const [particles, setParticles] = useState<ScoreParticleData[]>([])
  const [showTip, setShowTip] = useState(true)

  const scoreRef = useRef(0), comboRef = useRef(0), timeRef = useRef(60)
  const itemsRef = useRef<Item[]>([]), nextId = useRef(0)
  const rafRef = useRef(0), timerRef = useRef(0), spawnRef = useRef(0)
  const activeRef = useRef(true)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false; audio.stop()
    cancelAnimationFrame(rafRef.current); clearTimeout(spawnRef.current); clearInterval(timerRef.current)
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    setTimeout(() => setShowTip(false), 3000)
    audio.start()
    const H = window.innerHeight
    function loop() {
      if (!activeRef.current) return
      itemsRef.current = itemsRef.current.map(i => ({ ...i, y: i.y + i.speed, rotation: i.rotation + 2 })).filter(i => i.y < H + 80)
      setItems([...itemsRef.current])
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    timerRef.current = window.setInterval(() => {
      const n = timeRef.current - 1; timeRef.current = n; setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)
    function spawn() {
      if (!activeRef.current) return
      const prog = 1 - timeRef.current / 60
      const rate = Math.max(450, 1400 - prog * 950)
      const sp = Math.random() < 0.08 ? SPECIAL : DROP_ITEMS
      const pk = sp[Math.floor(Math.random() * sp.length)]
      const sz = 70 + Math.random() * 16
      itemsRef.current = [...itemsRef.current, {
        id: nextId.current++, x: Math.max(sz/2, Math.random() * (window.innerWidth - sz)), y: -sz - 10,
        size: sz, emoji: pk.emoji, pts: pk.pts, glow: pk.glow,
        speed: 1.6 + prog * 2.6 + Math.random() * 0.4, special: sp === SPECIAL, rotation: 0,
      }]
      spawnRef.current = window.setTimeout(spawn, rate)
    }
    spawnRef.current = window.setTimeout(spawn, 600)
    return () => { activeRef.current = false; cancelAnimationFrame(rafRef.current); clearTimeout(spawnRef.current); clearInterval(timerRef.current) }
  }, [audio, endGame])

  const catchItem = useCallback((id: number, pts: number, cx: number, cy: number, special: boolean) => {
    if (!itemsRef.current.find(i => i.id === id)) return
    itemsRef.current = itemsRef.current.filter(i => i.id !== id)
    setItems([...itemsRef.current])
    const nc = comboRef.current + 1; comboRef.current = nc; setCombo(nc)
    const mult = nc >= 5 ? 3 : nc >= 3 ? 2 : 1; const earned = pts * mult
    scoreRef.current += earned; setScore(scoreRef.current)
    const pid = Date.now() + Math.random()
    setParticles(p => [...p, { id: pid, x: cx, y: cy, text: nc >= 3 ? `+${earned} コンボ！！` : `+${earned}`, color: special ? '#FFD700' : nc >= 3 ? '#FB923C' : 'white', big: nc >= 3 }])
    setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 900)
    if (special) audio.sfxSpecial(); else if (nc >= 3) audio.sfxCombo(); else audio.sfxCatch()
  }, [audio])

  const urgent = timeLeft <= 10
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: char.bg }}>
      <BackBtn onClick={() => { activeRef.current = false; audio.stop(); onBack() }} />
      <HUD char={char} score={score} timeLeft={timeLeft} combo={combo} urgent={urgent} />
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 z-30" style={{ background: 'rgba(255,255,255,.1)' }}>
        <div className="h-full transition-all duration-1000" style={{ width: `${(timeLeft / 60) * 100}%`, background: urgent ? '#F87171' : char.color, boxShadow: `0 0 10px ${char.color}` }} />
      </div>
      {showTip && (
        <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-black text-center pointer-events-none z-25 animate-pulse" style={{ fontSize: 'clamp(1.4rem,5vw,2.2rem)', textShadow: `0 0 20px ${char.color}` }}>
          ⬇ タップして！ ⬇
        </div>
      )}
      {items.map(item => (
        <div
          key={item.id}
          onPointerDown={e => { e.stopPropagation(); catchItem(item.id, item.pts, e.clientX, e.clientY, item.special) }}
          className="absolute cursor-pointer text-center leading-none"
          style={{
            left: item.x - item.size / 2, top: item.y, width: item.size, height: item.size,
            fontSize: `${item.size * 0.7}px`, lineHeight: `${item.size}px`,
            filter: `drop-shadow(0 0 12px ${item.glow})`,
            transform: `rotate(${item.rotation}deg)`,
            touchAction: 'none', userSelect: 'none', zIndex: 10,
          }}
        >
          {item.emoji}
        </div>
      ))}
      {particles.map(p => <ScoreParticle key={p.id} p={p} />)}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-5 pointer-events-none" style={{ filter: `drop-shadow(0 0 20px ${char.color}88)` }}>
        <img src={char.img.profile} className="object-cover object-top" style={{ width: 'clamp(80px,18vw,130px)', height: 'clamp(90px,22vw,160px)', borderRadius: '12px 12px 0 0' }} draggable={false} />
      </div>
    </div>
  )
}
