import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { CHARS } from '@/lib/characters'
import { BackBtn } from '@/components/BackBtn'

interface Note { id:number; col:number; y:number; speed:number }
interface Props { char:Character; audio:AudioEngine; onEnd:(s:number)=>void; onBack:()=>void }

export function RhythmTap({ char, audio, onEnd, onBack }: Props) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [notes, setNotes] = useState<Note[]>([])
  const [feedback, setFeedback] = useState<{col:number;text:string;color:string}|null>(null)
  const [colFlash, setColFlash] = useState<number|null>(null)

  const scoreRef=useRef(0),timeRef=useRef(60),notesRef=useRef<Note[]>([])
  const nextId=useRef(0),rafRef=useRef(0),timerRef=useRef(0),spawnRef=useRef(0)
  const activeRef=useRef(true),fbTimer=useRef(0)
  const TARGET_Y=useRef(0)

  const endGame = useCallback(()=>{
    if(!activeRef.current)return
    activeRef.current=false;audio.stop()
    cancelAnimationFrame(rafRef.current);clearTimeout(spawnRef.current);clearInterval(timerRef.current)
    setTimeout(()=>{audio.sfxGameOver();onEnd(scoreRef.current)},80)
  },[audio,onEnd])

  useEffect(()=>{
    TARGET_Y.current = window.innerHeight - 130
    audio.start()
    function loop(){
      if(!activeRef.current)return
      notesRef.current=notesRef.current.map(n=>({...n,y:n.y+n.speed})).filter(n=>n.y<window.innerHeight+20)
      setNotes([...notesRef.current]);rafRef.current=requestAnimationFrame(loop)
    }
    rafRef.current=requestAnimationFrame(loop)
    timerRef.current=window.setInterval(()=>{const n=timeRef.current-1;timeRef.current=n;setTimeLeft(n);if(n<=0){clearInterval(timerRef.current);endGame()}},1000)
    function spawn(){
      if(!activeRef.current)return
      const prog=1-timeRef.current/60,rate=Math.max(400,1100-prog*700)
      notesRef.current=[...notesRef.current,{id:nextId.current++,col:Math.floor(Math.random()*3),y:-50,speed:2.2+prog*2.4+Math.random()*.4}]
      spawnRef.current=window.setTimeout(spawn,rate)
    }
    spawnRef.current=window.setTimeout(spawn,600)
    return()=>{activeRef.current=false;cancelAnimationFrame(rafRef.current);clearTimeout(spawnRef.current);clearInterval(timerRef.current)}
  },[audio,endGame])

  function tapCol(col:number){
    setColFlash(col);setTimeout(()=>setColFlash(null),150)
    const TY=TARGET_Y.current
    const inZone=notesRef.current.filter(n=>n.col===col&&n.y>TY-70&&n.y<TY+60)
    if(!inZone.length)return
    const closest=inZone.reduce((a,b)=>Math.abs(a.y-TY)<Math.abs(b.y-TY)?a:b)
    const off=Math.abs(closest.y-TY)
    const type=off<22?'かんぺき！':off<50?'グッド！':'OK'
    const pts=off<22?30:off<50?20:10
    notesRef.current=notesRef.current.filter(n=>n.id!==closest.id)
    scoreRef.current+=pts;setScore(scoreRef.current)
    clearTimeout(fbTimer.current)
    setFeedback({col,text:type,color:off<22?'#FFD700':off<50?CHARS[col].color:'rgba(255,255,255,.7)'})
    fbTimer.current=window.setTimeout(()=>setFeedback(null),500)
    if(off<22)audio.sfxPerfect();else audio.sfxRhythm()
  }

  const colW=Math.floor((window.innerWidth-24)/3)
  const urgent=timeLeft<=10
  return(
    <div className="fixed inset-0 overflow-hidden" style={{background:char.bg}}>
      <BackBtn onClick={()=>{activeRef.current=false;audio.stop();onBack()}}/>
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-4 py-2 z-30 backdrop-blur-md" style={{background:'rgba(0,0,0,.45)'}}>
        <div className="font-black" style={{color:'#FFD700',fontSize:'clamp(1.3rem,5vw,2rem)'}}>{score.toLocaleString()}</div>
        <div style={{color:'rgba(255,255,255,.7)',fontSize:'.9rem'}}>🎵 リズムタップ</div>
        <div className={urgent?'animate-urgent':''} style={{color:urgent?'#F87171':'white',fontSize:'clamp(1.3rem,5vw,2rem)',fontWeight:900}}>{timeLeft}s</div>
      </div>
      {/* Lane headers */}
      <div className="absolute top-14 left-0 right-0 flex z-20">
        {CHARS.map((c)=>(
          <div key={c.id} className="flex-1 text-center py-1" style={{borderBottom:`2px solid ${c.color}44`,background:`${c.color}10`}}>
            <div className="w-9 h-9 rounded-full overflow-hidden mx-auto" style={{border:`2px solid ${c.color}`}}>
              <img src={c.img.profile} className="w-full h-full object-cover object-top" draggable={false}/>
            </div>
          </div>
        ))}
      </div>
      {/* Lane dividers */}
      {[1,2].map(i=>(
        <div key={i} className="absolute top-14 bottom-0 w-px z-10" style={{left:`${(100/3)*i}%`,background:'rgba(255,255,255,.1)'}}/>
      ))}
      {/* Notes */}
      {notes.map(n=>(
        <div key={n.id} className="absolute pointer-events-none z-10 rounded-full flex items-center justify-center"
          style={{left:n.col*(colW+8)+12,top:n.y,width:colW-8,height:44,background:`linear-gradient(135deg,${CHARS[n.col].dark},${CHARS[n.col].color})`,boxShadow:`0 0 16px ${CHARS[n.col].color}88`}}>
          <img src={CHARS[n.col].img.profile} className="w-9 h-9 object-cover object-top rounded-full border-2 border-white" draggable={false}/>
        </div>
      ))}
      {/* Hit zone */}
      <div className="absolute left-0 right-0 h-0.5 z-5" style={{bottom:120,background:'rgba(255,255,255,.25)',boxShadow:'0 0 8px rgba(255,255,255,.3)'}}/>
      {/* Feedback */}
      {feedback&&(
        <div className="absolute font-black text-xl animate-bounce pointer-events-none z-20 whitespace-nowrap"
          style={{left:`calc(${feedback.col*(100/3)}% + ${(100/3)/2}% - 40px)`,bottom:160,color:feedback.color}}>
          {feedback.text}
        </div>
      )}
      {/* Tap buttons */}
      <div className="absolute bottom-4 left-0 right-0 flex gap-2 px-3 z-20">
        {CHARS.map((c,i)=>(
          <button key={c.id} onPointerDown={()=>tapCol(i)} className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
            style={{height:90,border:`3px solid ${c.color}`,background:colFlash===i?`${c.color}55`:`${c.color}20`,touchAction:'none',boxShadow:colFlash===i?`0 0 24px ${c.color}`:'none'}}>
            <div className="w-11 h-11 rounded-full overflow-hidden" style={{border:`2px solid ${c.color}`,boxShadow:`0 0 12px ${c.color}88`}}>
              <img src={c.img.profile} className="w-full h-full object-cover object-top" draggable={false}/>
            </div>
            <div className="text-xs font-bold" style={{color:c.color}}>{c.name}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
