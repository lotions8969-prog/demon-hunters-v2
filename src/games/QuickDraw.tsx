import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '@/lib/types'
import type { AudioEngine } from '@/lib/audio'
import { BackBtn } from '@/components/BackBtn'

interface Props { char:Character; audio:AudioEngine; onEnd:(s:number)=>void; onBack:()=>void }

export function QuickDraw({ char, audio, onEnd, onBack }: Props) {
  const TOTAL = 8
  const [phase, setPhase] = useState<'wait'|'ready'|'go'|'result'|'early'>('wait')
  const [round, setRound] = useState(1)
  const [score, setScore] = useState(0)
  const [reaction, setReaction] = useState<number|null>(null)
  const scoreRef=useRef(0), roundRef=useRef(1), goTime=useRef(0)
  const waitRef=useRef(0), activeRef=useRef(true)

  const nextRound = useCallback(() => {
    if (!activeRef.current) return
    setPhase('ready'); setReaction(null)
    const delay = 1500 + Math.random() * 3000
    waitRef.current = window.setTimeout(() => {
      if (!activeRef.current) return
      setPhase('go'); goTime.current = Date.now(); audio.sfxAppear()
    }, delay)
  }, [audio])

  useEffect(() => {
    audio.start('quickDraw'); setTimeout(nextRound, 800)
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); tap() } }
    window.addEventListener('keydown', onKey)
    return () => { activeRef.current=false; clearTimeout(waitRef.current); window.removeEventListener('keydown', onKey) }
  }, [audio, nextRound])

  function tap() {
    if (phase === 'ready') {
      clearTimeout(waitRef.current); setPhase('early'); audio.sfxMiss()
      setTimeout(() => {
        if (!activeRef.current) return
        const nr = roundRef.current+1
        if (nr > TOTAL) { audio.stop(); setTimeout(()=>{audio.sfxGameOver();onEnd(scoreRef.current)},400); return }
        roundRef.current=nr; setRound(nr); nextRound()
      }, 1500); return
    }
    if (phase !== 'go') return
    const ms = Date.now() - goTime.current
    const pts = Math.round(Math.max(20, Math.min(150, 800/ms*50)))
    scoreRef.current+=pts; setScore(scoreRef.current)
    setReaction(ms); setPhase('result')
    if (ms < 300) audio.sfxSpecial(); else audio.sfxCatch()
    setTimeout(() => {
      if (!activeRef.current) return
      const nr = roundRef.current+1
      if (nr > TOTAL) { audio.stop(); setTimeout(()=>{audio.sfxGameOver();onEnd(scoreRef.current)},400); return }
      roundRef.current=nr; setRound(nr); nextRound()
    }, 1400)
  }

  const bgStyle = phase==='go' ? `radial-gradient(circle,${char.color}55 0%,#000 70%)` : phase==='early' ? 'linear-gradient(160deg,#1c0507,#4c0519)' : char.bg
  return (
    <div onPointerDown={tap} className="fixed inset-0 flex flex-col items-center justify-center gap-5 p-4 transition-all duration-300"
      style={{ background: bgStyle, touchAction:'none' }}>
      <BackBtn onClick={()=>{activeRef.current=false;audio.stop();onBack()}}/>
      <div className="flex gap-6 mt-10">
        <div className="font-black text-2xl" style={{color:'#FFD700'}}>{score}</div>
        <div className="text-sm self-center" style={{color:'rgba(255,255,255,.6)'}}>{round}/{TOTAL}</div>
      </div>
      <div className="rounded-full overflow-hidden transition-all duration-200"
        style={{width:'clamp(150px,40vw,220px)',height:'clamp(150px,40vw,220px)',border:`5px solid ${phase==='go'?'#4ADE80':phase==='early'?'#F87171':phase==='result'?'#FFD700':char.color}`,boxShadow:`0 0 ${phase==='go'?60:24}px ${phase==='go'?'#4ADE80':char.color}`,animation:phase==='go'?'pulse .3s ease-in-out infinite':'none'}}>
        <img src={char.img.profile} className="w-full h-full object-cover" draggable={false}/>
      </div>
      <div className="font-black text-center transition-colors"
        style={{color:phase==='go'?'#4ADE80':phase==='early'?'#F87171':phase==='result'?'#FFD700':'rgba(255,255,255,.7)',fontSize:'clamp(1.2rem,5vw,2rem)',animation:phase==='go'?'pulse .4s ease-in-out infinite':'none'}}>
        {phase==='wait'&&'じゅんびして…'}
        {phase==='ready'&&'⏳ まって...'}
        {phase==='go'&&'⚡ いまだ！タップ！'}
        {phase==='early'&&'😅 はやすぎ！'}
        {phase==='result'&&reaction&&`${reaction}ms ⚡`}
      </div>
      {phase==='result'&&reaction&&(
        <div style={{color:'rgba(255,255,255,.7)',fontSize:'.9rem'}}>
          {reaction<200?'⚡ はやすぎる！':reaction<350?'🏆 すごい！':reaction<500?'✨ グッド！':'👍 OK！'}
        </div>
      )}
      <div style={{color:'rgba(255,255,255,.3)',fontSize:'.8rem'}}>クリック or スペースキー</div>
    </div>
  )
}
