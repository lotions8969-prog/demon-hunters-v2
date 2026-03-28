import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { CHARS } from '@/lib/characters'
import { HUD } from '@/components/HUD'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'

const DEMONS = [
  { emoji:'👹', pts:15, glow:'#FF4500', hp:1 },
  { emoji:'💀', pts:15, glow:'#9CA3AF', hp:1 },
  { emoji:'😈', pts:20, glow:'#8B5CF6', hp:1 },
  { emoji:'🧟', pts:15, glow:'#4ADE80', hp:2 },
  { emoji:'🦇', pts:10, glow:'#6B7280', hp:1 },
  { emoji:'🔮', pts:25, glow:'#7C3AED', hp:2 },
  { emoji:'🕷️', pts:10, glow:'#374151', hp:1 },
  { emoji:'🐉', pts:40, glow:'#EF4444', hp:3 },
]
const CHAR_DROPS = CHARS.flatMap(c => [
  { src: c.img.profile, color: c.color },
  { src: (c.img as any).dance || (c.img as any).performance || c.img.profile, color: c.color },
])

interface DropItem { id:number; x:number; y:number; size:number; type:'demon'|'char'; emoji?:string; src?:string; color:string; pts:number; glow:string; speed:number; hp:number; maxHp:number }
interface Props { char:Character; audio:AudioEngine; onEnd:(s:number)=>void; onBack:()=>void }

export function DemonShoot({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [items, setItems] = useState<DropItem[]>([])
  const [combo, setCombo] = useState(0)
  const [particles, setParticles] = useState<ScoreParticleData[]>([])
  const [danger, setDanger] = useState(false)
  const [showTip, setShowTip] = useState(true)

  const scoreRef=useRef(0),comboRef=useRef(0),timeRef=useRef(60)
  const itemsRef=useRef<DropItem[]>([]),nextId=useRef(0)
  const rafRef=useRef(0),timerRef=useRef(0),spawnRef=useRef(0)
  const activeRef=useRef(true)

  const endGame = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current=false; audio.stop()
    cancelAnimationFrame(rafRef.current); clearTimeout(spawnRef.current); clearInterval(timerRef.current)
    setTimeout(() => { audio.sfxGameOver(); onEnd(scoreRef.current) }, 80)
  }, [audio, onEnd])

  useEffect(() => {
    setTimeout(() => setShowTip(false), 3500)
    audio.start('demonShoot')
    const H = window.innerHeight
    function loop() {
      if (!activeRef.current) return
      itemsRef.current = itemsRef.current.map(i => ({ ...i, y: i.y + i.speed })).filter(i => i.y < H + 100)
      setItems([...itemsRef.current])
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    timerRef.current = window.setInterval(() => {
      const n = timeRef.current-1; timeRef.current=n; setTimeLeft(n)
      if (n <= 0) { clearInterval(timerRef.current); endGame() }
    }, 1000)
    function spawn() {
      if (!activeRef.current) return
      const prog = 1 - timeRef.current/60, rate = Math.max(480,1250-prog*770), W = window.innerWidth
      if (Math.random() < 0.68) {
        const d = DEMONS[Math.floor(Math.random()*DEMONS.length)]
        const sz = 60 + Math.random()*18
        itemsRef.current = [...itemsRef.current, { id:nextId.current++, type:'demon', x:Math.max(sz/2,Math.random()*(W-sz)), y:-sz-10, size:sz, emoji:d.emoji, pts:d.pts, glow:d.glow, color:d.glow, speed:1.5+prog*2.3+Math.random()*0.4, hp:d.hp, maxHp:d.hp }]
      } else {
        const c = CHAR_DROPS[Math.floor(Math.random()*CHAR_DROPS.length)]
        const sz = 68 + Math.random()*14
        itemsRef.current = [...itemsRef.current, { id:nextId.current++, type:'char', src:c.src, x:Math.max(sz/2,Math.random()*(W-sz)), y:-sz-10, size:sz, pts:0, glow:c.color, color:c.color, speed:1.2+prog*1.4+Math.random()*0.3, hp:1, maxHp:1 }]
      }
      spawnRef.current = window.setTimeout(spawn, rate)
    }
    spawnRef.current = window.setTimeout(spawn, 600)
    return () => { activeRef.current=false; cancelAnimationFrame(rafRef.current); clearTimeout(spawnRef.current); clearInterval(timerRef.current) }
  }, [audio, endGame])

  const tapItem = useCallback((id:number, type:'demon'|'char', pts:number, cx:number, cy:number, glow:string) => {
    const item = itemsRef.current.find(i => i.id === id)
    if (!item) return
    if (type === 'demon') {
      const newHp = item.hp - 1
      if (newHp > 0) {
        itemsRef.current = itemsRef.current.map(i => i.id === id ? {...i, hp: newHp} : i)
        setItems([...itemsRef.current])
        audio.sfxCatch()
        return
      }
      itemsRef.current = itemsRef.current.filter(i => i.id !== id)
      setItems([...itemsRef.current])
      const nc = comboRef.current+1; comboRef.current=nc; setCombo(nc)
      const mult = nc>=5?3:nc>=3?2:1; const earned = pts*mult
      scoreRef.current+=earned; setScore(scoreRef.current)
      const pid = Date.now()+Math.random()
      setParticles(p=>[...p,{id:pid,x:cx,y:cy,text:nc>=3?`+${earned} コンボ！！`:`+${earned}`,color:nc>=3?'#FFD700':glow,big:nc>=3}])
      setTimeout(()=>setParticles(p=>p.filter(x=>x.id!==pid)),900)
      if(nc>=3)audio.sfxCombo();else audio.sfxCatch()
    } else {
      itemsRef.current = itemsRef.current.filter(i => i.id !== id)
      setItems([...itemsRef.current])
      comboRef.current=0; setCombo(0)
      scoreRef.current=Math.max(0,scoreRef.current-20); setScore(scoreRef.current)
      const pid=Date.now()+Math.random()
      setParticles(p=>[...p,{id:pid,x:cx,y:cy,text:'-20 まちがい！',color:'#F87171',big:false}])
      setTimeout(()=>setParticles(p=>p.filter(x=>x.id!==pid)),900)
      setDanger(true); setTimeout(()=>setDanger(false),500)
      audio.sfxMiss()
    }
  }, [audio])

  const urgent = timeLeft <= 10
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: char.bg }}>
      {danger && <div className="fixed inset-0 z-[100] pointer-events-none animate-danger-flash" style={{background:'rgba(220,38,38,.35)'}}/>}
      <BackBtn onClick={()=>{activeRef.current=false;audio.stop();onBack()}}/>
      <HUD char={char} score={score} timeLeft={timeLeft} combo={combo} urgent={urgent}/>
      <div className="absolute top-0 left-0 right-0 h-1 z-30" style={{background:'rgba(255,255,255,.1)'}}>
        <div className="h-full transition-all duration-1000" style={{width:`${(timeLeft/60)*100}%`,background:urgent?'#F87171':'#FF4500',boxShadow:'0 0 10px #FF4500'}}/>
      </div>
      {showTip && (
        <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 font-black text-white text-center pointer-events-none z-25 animate-pulse leading-relaxed" style={{fontSize:'clamp(1rem,3.8vw,1.6rem)',textShadow:`0 0 20px ${char.color}`}}>
          👹 デーモンをたおせ！<br/>
          <span className="text-red-300" style={{fontSize:'.8em'}}>⚠️ キャラクターはタップしないで！</span>
        </div>
      )}
      {items.map(item => (
        <div key={item.id} onPointerDown={e=>{e.stopPropagation();tapItem(item.id,item.type,item.pts,e.clientX,e.clientY,item.color)}}
          className="absolute cursor-pointer" style={{left:item.x-item.size/2,top:item.y,width:item.size,height:item.size,touchAction:'none',userSelect:'none',zIndex:10}}>
          {item.type==='demon'?(
            <div className="relative w-full h-full">
              <div style={{width:'100%',height:'100%',fontSize:`${item.size*.75}px`,lineHeight:`${item.size}px`,textAlign:'center',filter:`drop-shadow(0 0 12px ${item.glow})`,animation:'spin 2s linear infinite'}}>{item.emoji}</div>
              {item.maxHp > 1 && (
                <div className="absolute bottom-0 left-0 right-0 h-2 rounded-full overflow-hidden" style={{background:'rgba(0,0,0,.5)'}}>
                  <div className="h-full rounded-full transition-all" style={{width:`${(item.hp/item.maxHp)*100}%`,background:item.glow}}/>
                </div>
              )}
            </div>
          ):(
            <div className="w-full h-full rounded-full overflow-hidden animate-pulse" style={{border:`3px solid ${item.color}`,boxShadow:`0 0 18px ${item.color}88`}}>
              <img src={item.src} className="w-full h-full object-cover object-top" draggable={false}/>
            </div>
          )}
        </div>
      ))}
      {particles.map(p=><ScoreParticle key={p.id} p={p}/>)}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-5 pointer-events-none" style={{filter:`drop-shadow(0 0 20px ${char.color}88)`}}>
        <img src={char.img.profile} className="object-cover object-top" style={{width:'clamp(80px,18vw,130px)',height:'clamp(90px,22vw,160px)',borderRadius:'12px 12px 0 0'}} draggable={false}/>
      </div>
    </div>
  )
}
