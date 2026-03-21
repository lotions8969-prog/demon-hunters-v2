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
    <div className="absolute top-0 left-0 right-0 z-30 flex items-center gap-3 px-3 py-2 backdrop-blur-md" style={{ background: 'rgba(0,0,0,.5)' }}>
      <div className="flex-1">
        <div className="text-[.65rem]" style={{ color: 'rgba(255,255,255,.5)' }}>スコア</div>
        <div className="font-black leading-none" style={{ color: '#FFD700', fontSize: 'clamp(1.3rem,5vw,2rem)' }}>
          {score.toLocaleString()}
        </div>
      </div>
      <div className="flex-shrink-0 text-center">
        <div style={{ fontSize: '1.5rem' }}>{char.emoji}</div>
        <div className="text-xs font-bold" style={{ color: char.color }}>{char.name}</div>
      </div>
      <div className="flex-1 text-right">
        <div className="text-[.65rem]" style={{ color: 'rgba(255,255,255,.5)' }}>のこり</div>
        <div
          className={`font-black leading-none ${urgent ? 'animate-urgent' : ''}`}
          style={{ color: urgent ? '#F87171' : 'white', fontSize: 'clamp(1.3rem,5vw,2rem)' }}
        >
          {timeLeft}
        </div>
      </div>
      {combo >= 2 && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 px-3 py-[.15rem] rounded-full text-[.85rem] font-bold whitespace-nowrap animate-pulse z-30"
          style={{ background: `${char.color}25`, border: `1.5px solid ${char.color}88`, color: char.color }}
        >
          {combo} コンボ！✨
        </div>
      )}
    </div>
  )
}
