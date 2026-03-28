import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'

interface Props { char:Character; audio:AudioEngine; onEnd:(s:number)=>void; onBack:()=>void }

export function NumberTouch({ char, audio, onEnd, onBack }: Props) {
  const TOTAL=15
  const [numbers]=useState(()=>Array.from({length:TOTAL},(_,i)=>({n:i+1,x:40+Math.random()*(window.innerWidth-100),y:90+Math.random()*(window.innerHeight-190)})))
  const [next,setNext]=useState(1)
  const [cleared,setCleared]=useState(new Set<number>())
  const [timeLeft,setTimeLeft]=useState(60)
  const [flash,setFlash]=useState<{n:number;ok:boolean}|null>(null)
  const nextRef=useRef(1),timeRef=useRef(60),activeRef=useRef(true)
  const timerRef=useRef(0)

  const endGame=useCallback((t:number)=>{
    if(!activeRef.current)return
    activeRef.current=false;clearInterval(timerRef.current);audio.stop()
    setTimeout(()=>{audio.sfxGameOver();onEnd(t*15+200)},200)
  },[audio,onEnd])

  useEffect(()=>{
    audio.start('numberTouch')
    timerRef.current=window.setInterval(()=>{const n=timeRef.current-1;timeRef.current=n;setTimeLeft(n);if(n<=0)endGame(0)},1000)
    return()=>{activeRef.current=false;clearInterval(timerRef.current)}
  },[audio,endGame])

  function tapNumber(n:number){
    if(n!==nextRef.current){audio.sfxMiss();setFlash({n,ok:false});setTimeout(()=>setFlash(null),400);return}
    audio.sfxCatch();setFlash({n,ok:true});setTimeout(()=>setFlash(null),300)
    setCleared(prev=>new Set([...prev,n]))
    const nn=n+1;nextRef.current=nn;setNext(nn)
    if(n===TOTAL)endGame(timeRef.current)
  }

  return(
    <div className="fixed inset-0 overflow-hidden" style={{background:char.bg}}>
      <BackBtn onClick={()=>{activeRef.current=false;audio.stop();onBack()}}/>
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-4 py-2 z-30 backdrop-blur-md" style={{background:'rgba(0,0,0,.45)'}}>
        <div className="font-black" style={{color:char.color,fontSize:'1.1rem'}}>つぎ: <span style={{fontSize:'1.6rem',color:'#FFD700'}}>{next<=TOTAL?next:'✅'}</span></div>
        <div style={{color:'rgba(255,255,255,.7)',fontSize:'.85rem'}}>🔢 ナンバータッチ</div>
        <div style={{color:timeLeft<=10?'#F87171':'white',fontSize:'clamp(1.3rem,5vw,2rem)',fontWeight:900}}>{timeLeft}s</div>
      </div>
      {numbers.map(({n,x,y})=>{
        const done=cleared.has(n),isFlash=flash?.n===n
        return(
          <div key={n} onPointerDown={()=>!done&&tapNumber(n)} className="absolute flex items-center justify-center font-black transition-all duration-200"
            style={{left:x,top:y,width:54,height:54,borderRadius:'50%',background:done?'rgba(255,255,255,.08)':isFlash?(flash!.ok?'#4ADE80':'#F87171'):`${char.color}30`,border:`3px solid ${done?'rgba(255,255,255,.15)':char.color}`,fontSize:'1.4rem',color:done?'rgba(255,255,255,.2)':'white',cursor:done?'default':'pointer',touchAction:'none',userSelect:'none',boxShadow:!done&&n===next?`0 0 20px ${char.color}`:'none',animation:n===next&&!done?'pulse 1.5s ease-in-out infinite':'none',transform:done?'scale(.85)':'scale(1)'}}>
            {done?'✓':n}
          </div>
        )
      })}
    </div>
  )
}
