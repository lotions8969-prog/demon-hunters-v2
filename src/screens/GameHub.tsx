import { useState } from 'react'
import { GAMES } from '@/lib/characters'
import type { Character, GameId } from '@/lib/types'
import { BackBtn } from '@/components/BackBtn'
import { Badge } from '@/components/ui/badge'

interface GameHubProps {
  char: Character
  highScores: Partial<Record<GameId, number>>
  onSelectGame: (id: GameId) => void
  onBack: () => void
}

export function GameHub({ char, highScores, onSelectGame, onBack }: GameHubProps) {
  const [hov, setHov] = useState<string | null>(null)
  return (
    <div className="fixed inset-0 flex flex-col items-center overflow-y-auto p-3" style={{ background: char.bg }}>
      <BackBtn onClick={onBack} />
      <div className="flex items-center gap-3 mt-10 mb-3">
        <div className="rounded-full overflow-hidden w-14 h-14 flex-shrink-0" style={{ border: `2.5px solid ${char.color}`, boxShadow: `0 0 16px ${char.color}88` }}>
          <img src={char.img.profile} className="w-full h-full object-cover" draggable={false} />
        </div>
        <div>
          <div className="font-black text-xl" style={{ color: char.color }}>{char.name}</div>
          <div className="text-sm" style={{ color: 'rgba(255,255,255,.6)' }}>といっしょにあそぼう！</div>
        </div>
      </div>
      <h2 className="text-white font-bold text-center mb-3" style={{ fontSize: 'clamp(1rem,4vw,1.6rem)' }}>🎮 ゲームをえらんでね！</h2>
      <div className="grid gap-3 w-full max-w-2xl pb-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(clamp(140px,28vw,200px),1fr))' }}>
        {GAMES.map(g => (
          <button
            key={g.id}
            onClick={() => onSelectGame(g.id)}
            onMouseEnter={() => setHov(g.id)}
            onMouseLeave={() => setHov(null)}
            className="rounded-2xl p-3 cursor-pointer transition-all duration-200 flex flex-col items-center gap-1"
            style={{
              background: hov === g.id ? `${char.color}25` : 'rgba(255,255,255,.06)',
              border: `2px solid ${hov === g.id ? char.color : 'rgba(255,255,255,.12)'}`,
              transform: hov === g.id ? 'translateY(-4px) scale(1.03)' : 'scale(1)',
              boxShadow: hov === g.id ? `0 12px 32px ${char.color}33` : 'none',
            }}
          >
            <div style={{ fontSize: '2.5rem' }}>{g.emoji}</div>
            <div className="text-white font-bold text-center" style={{ fontSize: 'clamp(.85rem,3vw,1rem)' }}>{g.label}</div>
            <div className="text-center text-xs" style={{ color: 'rgba(255,255,255,.55)' }}>{g.desc}</div>
            {(highScores[g.id] ?? 0) > 0 && (
              <Badge variant="outline" className="text-xs mt-1" style={{ color: char.color, borderColor: char.color }}>
                ベスト: {highScores[g.id]!.toLocaleString()}
              </Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
