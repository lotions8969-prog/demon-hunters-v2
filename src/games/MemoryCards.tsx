import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const CARD_BASE = [
  { key:'rumi_p', src:'https://r2.kpopdemon.com/gallery/huntrix/rumi/rumi-profile.jpg', label:'ルミ', color:'#C084FC' },
  { key:'mira_p', src:'https://r2.kpopdemon.com/gallery/huntrix/mira/mira-profile.jpg', label:'ミラ', color:'#FB7185' },
  { key:'zoey_p', src:'https://r2.kpopdemon.com/gallery/huntrix/zoey/zoey-profile.jpg', label:'ゾーイ', color:'#38BDF8' },
  { key:'rumi_s', src:'https://r2.kpopdemon.com/gallery/huntrix/rumi/rumi-holding-saingeom.jpg', label:'ルミ⚔️', color:'#C084FC' },
  { key:'mira_d', src:'https://r2.kpopdemon.com/gallery/huntrix/mira/mira-dance.jpg', label:'ミラ💃', color:'#FB7185' },
  { key:'zoey_s', src:'https://r2.kpopdemon.com/gallery/huntrix/zoey/zoey-singing-on-stage.jpg', label:'ゾーイ🎤', color:'#38BDF8' },
]

interface Card { key:string; src:string; label:string; color:string; uid:number }
interface Props { char:Character; audio:AudioEngine; onEnd:(s:number)=>void; onBack:()=>void }

export function MemoryCards({ char, audio, onEnd, onBack }: Props) {
  const [cards] = useState<Card[]>(() => shuffle(CARD_BASE.flatMap((c,i)=>[{...c,uid:i*2},{...c,uid:i*2+1}])))
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [moves, setMoves] = useState(0)
  const [timeLeft, setTimeLeft] = useState(90)
  const lockRef=useRef(false), timerRef=useRef(0), activeRef=useRef(true)
  const timeRef=useRef(90), moveRef=useRef(0)

  const endGame = useCallback((mc:number) => {
    if (!activeRef.current) return
    activeRef.current=false; clearInterval(timerRef.current); audio.stop()
    const tBonus=timeRef.current*4, mBonus=Math.max(0,300-moveRef.current*8), pBonus=mc*60
    setTimeout(()=>{audio.sfxGameOver();onEnd(tBonus+mBonus+pBonus)},200)
  },[audio,onEnd])

  useEffect(()=>{
    audio.start()
    timerRef.current=window.setInterval(()=>{
      const n=timeRef.current-1;timeRef.current=n;setTimeLeft(n)
      if(n<=0){clearInterval(timerRef.current);endGame(0)}
    },1000)
    return()=>{activeRef.current=false;clearInterval(timerRef.current)}
  },[audio,endGame])

  function flipCard(idx:number){
    if(!activeRef.current||lockRef.current)return
    if(matched.has(cards[idx].uid))return
    if(flipped.includes(idx))return
    const nf=[...flipped,idx];setFlipped(nf);audio.sfxFlip()
    if(nf.length===2){
      lockRef.current=true;moveRef.current+=1;setMoves(moveRef.current)
      const[a,b]=nf
      if(cards[a].key===cards[b].key){
        setTimeout(()=>{
          setMatched(prev=>{
            const nx=new Set(prev);nx.add(cards[a].uid);nx.add(cards[b].uid)
            if(nx.size===cards.length){setTimeout(()=>endGame(nx.size/2),400)}
            return nx
          })
          setFlipped([]);lockRef.current=false;audio.sfxMatch()
        },600)
      }else{
        setTimeout(()=>{setFlipped([]);lockRef.current=false},1100)
      }
    }
  }

  const cols=4, cardW=Math.min(Math.floor((window.innerWidth-32)/(cols+.5)),110), cardH=Math.round(cardW*1.35)
  return(
    <div className="fixed inset-0 flex flex-col items-center overflow-hidden" style={{background:char.bg}}>
      <BackBtn onClick={()=>{activeRef.current=false;audio.stop();onBack()}}/>
      <div className="pt-14 pb-2 flex gap-6 text-white font-bold" style={{fontSize:'clamp(.9rem,3vw,1.1rem)'}}>
        <span>⏱ {timeLeft}s</span>
        <span style={{color:'#FFD700'}}>✅ {matched.size/2}/{cards.length/2}</span>
        <span style={{color:'rgba(255,255,255,.6)'}}>👆 {moves}</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:`repeat(${cols},${cardW}px)`,gap:8,padding:'4px 12px',overflowY:'auto'}}>
        {cards.map((card,idx)=>{
          const isUp=flipped.includes(idx)||matched.has(card.uid)
          const isMatched=matched.has(card.uid)
          return(
            <div key={card.uid} onPointerDown={()=>flipCard(idx)} className="cursor-pointer relative overflow-hidden"
              style={{width:cardW,height:cardH,borderRadius:12,border:`2.5px solid ${isMatched?'#FFD700':isUp?card.color:'rgba(255,255,255,.2)'}`,boxShadow:isMatched?'0 0 16px #FFD700':isUp?`0 0 12px ${card.color}88`:'none',background:'rgba(0,0,0,.5)',transition:'box-shadow .2s',perspective:600}}>
              <div className="w-full h-full transition-transform duration-300" style={{transformStyle:'preserve-3d',transform:isUp?'rotateY(0deg)':'rotateY(180deg)'}}>
                {isUp?(
                  <img src={card.src} className="absolute inset-0 w-full h-full object-cover object-top backface-hidden" draggable={false}/>
                ):(
                  <div className="absolute inset-0 flex items-center justify-center backface-hidden" style={{background:`linear-gradient(135deg,${char.dark},${char.color}66)`,fontSize:cardW*.45,transform:'rotateY(180deg)'}}>
                    {char.emoji}
                  </div>
                )}
              </div>
              {isMatched&&<div className="absolute top-1 right-1 text-base">✅</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
