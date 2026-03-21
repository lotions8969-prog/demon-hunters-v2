import { useState } from 'react'
import { CHARS } from '@/lib/characters'
import type { Character } from '@/lib/types'

interface CharSelectProps { onSelect: (c: Character) => void }

export function CharSelect({ onSelect }: CharSelectProps) {
  const [hov, setHov] = useState<string | null>(null)
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-4 overflow-hidden"
      style={{ background: 'linear-gradient(160deg,#0a0320 0%,#180840 100%)' }}>
      <h2 className="font-bold text-center animate-float mb-6" style={{ color: '#F0ABFC', fontSize: 'clamp(1.2rem,5vw,2.2rem)' }}>
        ✨ だれといっしょにあそぶ？ ✨
      </h2>
      <div className="flex gap-3 flex-wrap justify-center max-w-3xl">
        {CHARS.map(c => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            onMouseEnter={() => setHov(c.id)}
            onMouseLeave={() => setHov(null)}
            className="flex flex-col items-center rounded-3xl cursor-pointer transition-all duration-300 gap-2"
            style={{
              padding: 'clamp(1rem,3vw,1.8rem) clamp(.8rem,2vw,1.4rem)',
              minWidth: 'clamp(140px,25vw,220px)',
              background: hov === c.id ? `linear-gradient(160deg,${c.dark}cc,${c.color}33)` : 'rgba(255,255,255,.04)',
              border: `2.5px solid ${hov === c.id ? c.color : 'rgba(255,255,255,.1)'}`,
              transform: hov === c.id ? 'translateY(-10px) scale(1.04)' : 'scale(1)',
              boxShadow: hov === c.id ? `0 20px 56px ${c.color}44` : '0 4px 20px rgba(0,0,0,.3)',
            }}
          >
            <div className="rounded-2xl overflow-hidden" style={{ width: 'clamp(110px,22vw,160px)', height: 'clamp(130px,26vw,190px)', border: `2px solid ${c.color}55`, boxShadow: `0 0 ${hov === c.id ? '20px' : '8px'} ${c.color}55` }}>
              <img src={c.img.profile} className="w-full h-full object-cover" draggable={false} />
            </div>
            <div className="font-black" style={{ color: c.color, fontSize: 'clamp(1.4rem,5vw,2rem)' }}>{c.name}</div>
            <div className="rounded-full px-3 py-1 text-sm font-bold text-white" style={{ background: c.color }}>{c.emoji} {c.role}</div>
            <div className="text-sm text-center" style={{ color: 'rgba(255,255,255,.65)' }}>{c.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
