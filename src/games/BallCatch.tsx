import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, ScoreParticleData } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'
import { ScoreParticle } from '@/components/ScoreParticle'

const CATCH_ITEMS = [
  {emoji:'⭐',pts:10,glow:'#FFD700'},{emoji:'💜',pts:10,glow:'#C084FC'},
  {emoji:'❤️',pts:10,glow:'#FB7185'},{emoji:'💎',pts:25,glow:'#93C5FD'},
  {emoji:'🌟',pts:15,glow:'#FFD700'},{emoji:'👹',pts:-15,glow:'#FF4500'},
]
interface Ball { id:number;x:number;y:number;size:number;emoji:string;pts:number;glow:string;speed:number }
interface Props { char:Character; audio:AudioEngine; onEnd:(s:number)=>void; onBack:()=>void }

export function BallCatch({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [balls, setBalls] = useState<Ball[]>([])
  const [platX, setPlatX] = useState(50)
  const [particles, setParticles] = useState<ScoreParticleData[]>([])
  const scoreRef=useRef(0),timeRef=useRef(60),platRef=useRef(50)
  const ballsRef=useRef<Ball[]>([]),nextId=useRef(0)
  const rafRef=useRef(0),timerRef=useRef(0),spawnRef=useRef(0)
  const activeRef=useRef(true)
  const PLAT_W=22

  const endGame=useCallback(()=>{
    if(!activeRef.current)return
    activeRef.current=false;audio.stop()
    cancelAnimationFrame(rafRef.current);clearTimeout(spawnRef.current);clearInterval(timerRef.current)
    setTimeout(()=>{audio.sfxGameOver();onEnd(scoreRef.current)},80)
  },[audio,onEnd])

  useEffect(()=>{
    audio.start()
    const H=window.innerHeight,PLAT_Y=H-80
    function loop(){
      if(!activeRef.current)return
      const W=window.innerWidth
      const platLeft=(platRef.current/100)*W-(PLAT_W/200*W)
      const platRight=platLeft+(PLAT_W/100*W)
      const kept:Ball[]=[]
      for(const b of ballsRef.current){
        const nb={...b,y:b.y+b.speed}
        if(nb.y>=PLAT_Y-20&&nb.y<PLAT_Y+30&&nb.x>=platLeft-20&&nb.x<=platRight+20){
          scoreRef.current=Math.max(0,scoreRef.current+nb.pts);setScore(scoreRef.current)
          const pid=Date.now()+Math.random()
          setParticles(p=>[...p,{id:pid,x:nb.x,y:PLAT_Y,text:nb.pts>0?`+${nb.pts}`:`${nb.pts}`,color:nb.pts>0?'#FFD700':'#F87171',big:false}])
          setTimeout(()=>setParticles(p=>p.filter(x=>x.id!==pid)),800)
          if(nb.pts>0)audio.sfxCatch();else audio.sfxMiss()
        }else if(nb.y<H+60){kept.push(nb)}
      }
      ballsRef.current=kept;setBalls([...ballsRef.current])
      rafRef.current=requestAnimationFrame(loop)
    }
    rafRef.current=requestAnimationFrame(loop)
    timerRef.current=window.setInterval(()=>{
      const n=timeRef.current-1;timeRef.current=n;setTimeLeft(n)
      if(n<=0){clearInterval(timerRef.current);endGame()}
    },1000)
    function spawn(){
      if(!activeRef.current)return
      const prog=1-timeRef.current/60,rate=Math.max(600,1400-prog*800),W=window.innerWidth
      const item=CATCH_ITEMS[Math.floor(Math.random()*CATCH_ITEMS.length)]
      const sz=48+Math.random()*16
      ballsRef.current=[...ballsRef.current,{id:nextId.current++,x:sz/2+Math.random()*(W-sz),y:-sz,size:sz,emoji:item.emoji,pts:item.pts,glow:item.glow,speed:2.2+prog*2+Math.random()*.5}]
      spawnRef.current=window.setTimeout(spawn,rate)
    }
    spawnRef.current=window.setTimeout(spawn,400)
    return()=>{activeRef.current=false;cancelAnimationFrame(rafRef.current);clearTimeout(spawnRef.current);clearInterval(timerRef.current)}
  },[audio,endGame])

  function movePlat(e:React.PointerEvent){
    const pct=(e.clientX/window.innerWidth)*100
    platRef.current=Math.max(PLAT_W/2,Math.min(100-PLAT_W/2,pct));setPlatX(platRef.current)
  }

  return(
    <div onPointerMove={movePlat} onPointerDown={movePlat} className="fixed inset-0 overflow-hidden" style={{background:char.bg,touchAction:'none'}}>
      <BackBtn onClick={()=>{activeRef.current=false;audio.stop();onBack()}}/>
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-4 py-2 z-30 backdrop-blur-md" style={{background:'rgba(0,0,0,.45)'}}>
        <div className="font-black" style={{color:'#FFD700',fontSize:'clamp(1.3rem,5vw,2rem)'}}>{score.toLocaleString()}</div>
        <div style={{color:'rgba(255,255,255,.7)',fontSize:'.85rem'}}>🏀 ボールキャッチ</div>
        <div style={{color:timeLeft<=10?'#F87171':'white',fontSize:'clamp(1.3rem,5vw,2rem)',fontWeight:900}}>{timeLeft}s</div>
      </div>
      {balls.map(b=>(
        <div key={b.id} className="absolute pointer-events-none text-center leading-none z-10"
          style={{left:b.x-b.size/2,top:b.y,width:b.size,height:b.size,fontSize:`${b.size*.7}px`,lineHeight:`${b.size}px`,filter:`drop-shadow(0 0 10px ${b.glow})`}}>
          {b.emoji}
        </div>
      ))}
      <div className="absolute z-20 pointer-events-none transition-[left] duration-[50ms]"
        style={{bottom:60,left:`calc(${platX}% - ${PLAT_W/2}%)`,width:`${PLAT_W}%`,height:18,background:`linear-gradient(135deg,${char.color},${char.dark})`,borderRadius:100,boxShadow:`0 0 20px ${char.color}88`}}/>
      <div className="absolute z-[21] pointer-events-none transition-[left] duration-[50ms]"
        style={{bottom:72,left:`calc(${platX}% - 20px)`}}>
        <img src={char.img.profile} className="w-10 h-10 rounded-full object-cover" style={{border:`2px solid ${char.color}`}} draggable={false}/>
      </div>
      {particles.map(p=><ScoreParticle key={p.id} p={p}/>)}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none text-xs" style={{color:'rgba(255,255,255,.4)'}}>ゆびをうごかしてキャッチ！👹をさけて！</div>
    </div>
  )
}
