import type { Character } from '@/lib/types'

interface HUDProps {
  char: Character
  score: number
  timeLeft: number
  combo?: number
  urgent?: boolean
}

export function HUD({ char, score, timeLeft, combo = 0, urgent = false }: HUDProps) {
  return (
    <div
      className="absolute top-0 left-0 right-0 z-30 flex items-center px-4 py-2.5"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Score */}
      <div className="flex-1 flex flex-col">
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>SCORE</span>
        <span className="font-black leading-none tabular-nums" style={{ color: '#FFD700', fontSize: 'clamp(1.1rem,4vw,1.6rem)', letterSpacing: '-0.02em' }}>
          {score.toLocaleString()}
        </span>
      </div>

      {/* Center: char */}
      <div className="flex flex-col items-center mx-4 flex-shrink-0">
        <div className="rounded-full overflow-hidden" style={{ width: 32, height: 32, border: `2px solid ${char.color}`, boxShadow: `0 0 12px ${char.color}66` }}>
          <img src={char.img.profile} className="w-full h-full object-cover" draggable={false} />
        </div>
        <span className="text-[10px] font-bold mt-0.5" style={{ color: char.color }}>{char.name}</span>
      </div>

      {/* Timer */}
      <div className="flex-1 flex flex-col items-end">
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>TIME</span>
        <span
          className={`font-black leading-none tabular-nums ${urgent ? 'animate-urgent' : ''}`}
          style={{ color: urgent ? '#F87171' : 'rgba(255,255,255,0.9)', fontSize: 'clamp(1.1rem,4vw,1.6rem)', letterSpacing: '-0.02em' }}
        >
          {timeLeft}
        </span>
      </div>

      {/* Combo badge */}
      {combo >= 2 && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-3 py-0.5 rounded-full text-xs font-bold whitespace-nowrap animate-pop-in"
          style={{ background: `${char.color}22`, border: `1px solid ${char.color}55`, color: char.color, backdropFilter: 'blur(8px)' }}
        >
          {combo}× COMBO ⚡
        </div>
      )}
    </div>
  )
}
