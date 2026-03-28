import { useState, useEffect, useRef } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'

const HANDS = [{e:'✊',label:'グー'},{e:'✌️',label:'チョキ'},{e:'✋',label:'パー'}]
interface Props { char:Character; audio:AudioEngine; onEnd:(s:number)=>void; onBack:()=>void }

export function Janken({ char, audio, onEnd, onBack }: Props) {
  const ROUNDS=7
  const [round,setRound]=useState(0)
  const [phase,setPhase]=useState<'choose'|'reveal'>('choose')
  const [player,setPlayer]=useState<number|null>(null)
  const [charHand,setCharHand]=useState<number|null>(null)
  const [result,setResult]=useState<'win'|'lose'|'draw'|null>(null)
  const winsRef=useRef(0), activeRef=useRef(true)

  useEffect(()=>{ audio.start('janken'); return()=>{ activeRef.current=false } },[audio])

  function choose(idx:number){
    if(phase!=='choose')return
    const c=Math.floor(Math.random()*3)
    setPlayer(idx);setCharHand(c)
    const diff=(idx-c+3)%3
    const r:'win'|'lose'|'draw'=diff===0?'draw':diff===1?'win':'lose'
    setResult(r);setPhase('reveal')
    if(r==='win'){winsRef.current++;audio.sfxCombo()}
    else if(r==='lose')audio.sfxMiss()
    else audio.sfxFlip()
    setTimeout(()=>{
      if(!activeRef.current)return
      const nr=round+1
      if(nr>=ROUNDS){audio.stop();setTimeout(()=>{audio.sfxGameOver();onEnd(winsRef.current*150)},200)}
      else{setRound(nr);setPhase('choose');setPlayer(null);setCharHand(null);setResult(null)}
    },1500)
  }

  const resColor=result==='win'?'#4ADE80':result==='lose'?'#F87171':'#FFD700'
  const resText=result==='win'?'かった！🎉':result==='lose'?'まけた…':'あいこ！'
  return(
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 p-4" style={{background:char.bg}}>
      <BackBtn onClick={()=>{activeRef.current=false;audio.stop();onBack()}}/>
      <div className="flex gap-1.5 mt-10">
        {Array.from({length:ROUNDS},(_,i)=>(
          <div key={i} className="w-3 h-3 rounded-full transition-all" style={{background:i<round?char.color:i===round?'white':'rgba(255,255,255,.2)'}}/>
        ))}
      </div>
      <div className="font-black text-lg" style={{color:char.color}}>{winsRef.current}かち / {ROUNDS}せん</div>
      <div className="rounded-full overflow-hidden w-24 h-24" style={{border:`3px solid ${char.color}`,boxShadow:`0 0 24px ${char.color}88`}}>
        <img src={char.img.profile} className="w-full h-full object-cover" draggable={false}/>
      </div>
      <div className="flex gap-8 items-center min-h-[80px]">
        <div className="text-center">
          <div style={{fontSize:'3.5rem'}}>{charHand!==null?HANDS[charHand].e:'❓'}</div>
          <div className="text-sm" style={{color:'rgba(255,255,255,.6)'}}>{char.name}</div>
        </div>
        <div className="text-xl font-bold" style={{color:'rgba(255,255,255,.5)'}}>VS</div>
        <div className="text-center">
          <div style={{fontSize:'3.5rem'}}>{player!==null?HANDS[player].e:'❓'}</div>
          <div className="text-sm" style={{color:'rgba(255,255,255,.6)'}}>きみ</div>
        </div>
      </div>
      {result&&<div className="text-3xl font-black animate-pulse" style={{color:resColor}}>{resText}</div>}
      <div className="flex gap-4">
        {HANDS.map((h,i)=>(
          <button key={i} onPointerDown={()=>choose(i)} disabled={phase!=='choose'} className="rounded-full flex flex-col items-center justify-center gap-1 transition-all"
            style={{width:'clamp(72px,20vw,96px)',height:'clamp(72px,20vw,96px)',fontSize:'2.2rem',border:`3px solid ${phase==='choose'?char.color:'rgba(255,255,255,.2)'}`,background:phase==='choose'?`${char.color}25`:'rgba(255,255,255,.05)',cursor:phase==='choose'?'pointer':'default'}}>
            <span>{h.e}</span>
            <span className="text-xs font-bold" style={{color:char.color,fontSize:'.6rem'}}>{h.label}</span>
          </button>
        ))}
      </div>
      <div style={{color:'rgba(255,255,255,.4)',fontSize:'.8rem'}}>{phase==='choose'?'てをえらんでね！':'つぎのラウンドまでまって…'}</div>
    </div>
  )
}
