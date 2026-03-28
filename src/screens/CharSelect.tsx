import { useState, useEffect } from 'react'
import { CHARS } from '@/lib/characters'
import type { Character } from '@/lib/types'

interface CharSelectProps { onSelect: (c: Character) => void }

export function CharSelect({ onSelect }: CharSelectProps) {
  const [sel, setSel] = useState(0)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setSel(s => (s - 1 + CHARS.length) % CHARS.length) }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setSel(s => (s + 1) % CHARS.length) }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(CHARS[sel]) }
      if (e.key === '1') onSelect(CHARS[0])
      if (e.key === '2') onSelect(CHARS[1])
      if (e.key === '3') onSelect(CHARS[2])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSelect, sel])

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden" style={{ background: '#040012' }}>
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute rounded-full" style={{ left: '10%', top: '20%', width: 400, height: 400, background: '#C084FC', filter: 'blur(100px)', opacity: 0.12 }} />
        <div className="absolute rounded-full" style={{ right: '10%', bottom: '20%', width: 360, height: 360, background: '#38BDF8', filter: 'blur(100px)', opacity: 0.1 }} />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl px-4">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <h2 className="font-black" style={{ fontSize: 'clamp(1.4rem,5vw,2.2rem)', color: 'white' }}>
            だれといっしょに<span style={{ background: 'linear-gradient(135deg,#C084FC,#38BDF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>あそぶ？</span>
          </h2>
          <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>← → キーで選択・Enter で決定・1/2/3 キーで直接選択</p>
        </div>

        {/* Cards */}
        <div className="flex gap-4 flex-wrap justify-center">
          {CHARS.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              onMouseEnter={() => setSel(idx)}
              className="flex flex-col items-center rounded-3xl cursor-pointer transition-all duration-300 gap-3 relative overflow-hidden animate-pop-in"
              style={{
                padding: 'clamp(1.2rem,3vw,2rem) clamp(1rem,2.5vw,1.6rem)',
                minWidth: 'clamp(150px,26vw,220px)',
                background: sel === idx
                  ? `linear-gradient(160deg, ${c.dark}88, ${c.color}22)`
                  : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${sel === idx ? c.color : 'rgba(255,255,255,0.08)'}`,
                transform: sel === idx ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
                boxShadow: sel === idx ? `0 24px 64px ${c.color}33, 0 0 0 1px ${c.color}22` : '0 4px 24px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(12px)',
                animationDelay: `${idx * 0.08}s`,
              }}
            >
              {/* Key hint badge */}
              <div
                className="absolute top-3 right-3 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black"
                style={{ background: sel === idx ? c.color : 'rgba(255,255,255,0.1)', color: sel === idx ? 'white' : 'rgba(255,255,255,0.4)' }}
              >
                {idx + 1}
              </div>

              {/* Image */}
              <div
                className="rounded-2xl overflow-hidden flex-shrink-0"
                style={{
                  width: 'clamp(110px,22vw,160px)',
                  height: 'clamp(130px,26vw,190px)',
                  border: `1.5px solid ${sel === idx ? c.color + '88' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: sel === idx ? `0 0 24px ${c.color}44` : 'none',
                }}
              >
                <img src={c.img.profile} className="w-full h-full object-cover" draggable={false} />
              </div>

              {/* Info */}
              <div className="text-center">
                <div className="font-black mb-1" style={{ color: sel === idx ? c.color : 'white', fontSize: 'clamp(1.3rem,4vw,1.8rem)' }}>{c.name}</div>
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white mb-2" style={{ background: c.color }}>
                  {c.emoji} {c.role}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{c.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
