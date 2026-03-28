import { useState, useEffect, useRef } from 'react'
import { GAMES } from '@/lib/characters'
import type { Character, GameId } from '@/lib/types'
import { BackBtn } from '@/components/BackBtn'

interface GameHubProps {
  char: Character
  highScores: Partial<Record<GameId, number>>
  onSelectGame: (id: GameId) => void
  onBack: () => void
}

// Games added recently (show NEW badge)
const NEW_GAMES = new Set(['higherLower','oddOneOut','targetBlast','gravityFlip','endlessRun','bombDefuse','spinTarget','numberRain','ghostChase','powerShot','tileSweep','laserDodge','demonicSort','shadowMatch','tapRhythm','colorStop','iconFlash','chainBomb','asteroidRun','rocketBoost'])

const COLS = 3

export function GameHub({ char, highScores, onSelectGame, onBack }: GameHubProps) {
  const [sel, setSel] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); setSel(s => Math.min(s + 1, GAMES.length - 1)) }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
      if (e.key === 'ArrowDown')  { e.preventDefault(); setSel(s => Math.min(s + COLS, GAMES.length - 1)) }
      if (e.key === 'ArrowUp')    { e.preventDefault(); setSel(s => Math.max(s - COLS, 0)) }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectGame(GAMES[sel].id) }
      if (e.key === 'Escape') { e.preventDefault(); onBack() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSelectGame, onBack, sel])

  // Scroll selected item into view
  useEffect(() => {
    const el = gridRef.current?.children[sel] as HTMLElement
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [sel])

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#040012' }}>
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full" style={{ left: '-10%', top: '-20%', width: 500, height: 500, background: char.color, filter: 'blur(120px)', opacity: 0.1 }} />
        <div className="absolute rounded-full" style={{ right: '-5%', bottom: '-10%', width: 400, height: 400, background: '#38BDF8', filter: 'blur(100px)', opacity: 0.08 }} />
      </div>

      {/* Header */}
      <div
        className="relative z-20 flex-shrink-0 flex items-center gap-3 px-4 py-3"
        style={{ background: 'rgba(4,0,18,0.8)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <BackBtn onClick={onBack} />
        <div className="flex items-center gap-2.5 ml-14">
          <div
            className="rounded-full overflow-hidden flex-shrink-0"
            style={{ width: 36, height: 36, border: `2px solid ${char.color}`, boxShadow: `0 0 12px ${char.color}55` }}
          >
            <img src={char.img.profile} className="w-full h-full object-cover" draggable={false} />
          </div>
          <div>
            <div className="font-black text-sm leading-none" style={{ color: char.color }}>{char.name}</div>
            <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>といっしょにあそぼう！</div>
          </div>
        </div>
        <div className="ml-auto text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>↑↓←→ / Enter / Esc</div>
      </div>

      {/* Title */}
      <div className="relative z-10 flex-shrink-0 px-4 pt-4 pb-2">
        <h2 className="font-black" style={{ fontSize: 'clamp(1.1rem,4vw,1.5rem)', color: 'white' }}>
          🎮 <span style={{ background: `linear-gradient(135deg, ${char.color}, #38BDF8)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>ゲームをえらんで</span>
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{GAMES.length}ゲーム収録</p>
      </div>

      {/* Games grid */}
      <div
        ref={gridRef}
        className="relative z-10 flex-1 overflow-y-auto px-3 pb-4 scroll-area"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(130px,26vw,185px),1fr))', gap: '10px', alignContent: 'start' }}
      >
        {GAMES.map((g, idx) => (
          <button
            key={g.id}
            onClick={() => onSelectGame(g.id)}
            onMouseEnter={() => setSel(idx)}
            className="relative rounded-2xl p-3 cursor-pointer transition-all duration-200 flex flex-col items-center gap-1.5 text-left group active:scale-95"
            style={{
              background: sel === idx ? `${char.color}18` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${sel === idx ? char.color + '88' : 'rgba(255,255,255,0.07)'}`,
              transform: sel === idx ? 'translateY(-3px)' : 'none',
              boxShadow: sel === idx ? `0 8px 32px ${char.color}22` : 'none',
              backdropFilter: 'blur(8px)',
              outline: 'none',
            }}
          >
            {/* NEW badge */}
            {NEW_GAMES.has(g.id) && (
              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider" style={{ background: '#4ADE80', color: 'white' }}>
                NEW
              </div>
            )}

            {/* Emoji */}
            <div
              className="rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
              style={{ width: 48, height: 48, background: sel === idx ? `${char.color}22` : 'rgba(255,255,255,0.06)', fontSize: '1.8rem' }}
            >
              {g.emoji}
            </div>

            {/* Label */}
            <div className="w-full text-center">
              <div className="font-bold leading-tight text-white" style={{ fontSize: 'clamp(0.75rem,2.5vw,0.9rem)' }}>{g.label}</div>
              <div className="text-[10px] mt-0.5 leading-tight" style={{ color: 'rgba(255,255,255,0.45)' }}>{g.desc}</div>
            </div>

            {/* High score */}
            {(highScores[g.id] ?? 0) > 0 && (
              <div className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${char.color}22`, color: char.color }}>
                ベスト: {highScores[g.id]!.toLocaleString()}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
