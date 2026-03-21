import type { Character } from '@/lib/types'
import { Button } from '@/components/ui/button'

interface ResultProps {
  char: Character
  score: number
  highScore: number
  gameLabel: string
  onReplay: () => void
  onHub: () => void
}

function Confetti() {
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i, x: Math.random() * 100,
    color: ['#C084FC','#FB7185','#38BDF8','#FFD700','#4ADE80','#FB923C'][i % 6],
    size: 7 + Math.random() * 10, dur: 2.2 + Math.random() * 2.8, delay: Math.random() * 1.8,
    round: Math.random() > 0.5,
  }))
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {pieces.map(c => (
        <div key={c.id} className="absolute animate-bounce"
          style={{ left: `${c.x}%`, top: -20, width: c.size, height: c.size, background: c.color, borderRadius: c.round ? '50%' : 2, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }} />
      ))}
    </div>
  )
}

export function ResultScreen({ char, score, highScore, gameLabel, onReplay, onHub }: ResultProps) {
  const stars = score >= 700 ? 3 : score >= 300 ? 2 : 1
  const msgs = ['がんばった！', 'すごい！！', 'かんぺき！✨']
  const isNew = highScore > 0 && score >= highScore

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden z-10 animate-slide-up" style={{ background: char.bg }}>
      <Confetti />
      <div className="relative z-10 flex flex-col items-center text-center gap-3 p-4">
        <div className="rounded-2xl overflow-hidden" style={{ width: 'clamp(100px,25vw,160px)', height: 'clamp(120px,30vw,200px)', border: `3px solid ${char.color}`, boxShadow: `0 0 32px ${char.color}99` }}>
          <img src={char.img.performance || char.img.profile} className="w-full h-full object-cover" draggable={false} />
        </div>
        <div style={{ fontSize: 'clamp(1.8rem,7vw,3rem)', letterSpacing: '.3rem' }}>
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} style={{ opacity: i < stars ? 1 : 0.18, filter: i < stars ? 'drop-shadow(0 0 8px #FFD700)' : 'none' }}>⭐</span>
          ))}
        </div>
        <div className="font-black animate-float" style={{ color: 'white', fontSize: 'clamp(1.6rem,6vw,2.5rem)', textShadow: `0 0 24px ${char.color}` }}>
          {msgs[stars - 1]}
        </div>
        <div className="rounded-3xl p-4 backdrop-blur-md" style={{ background: 'rgba(255,255,255,.08)', border: `2px solid ${char.color}44` }}>
          <div className="text-sm mb-1" style={{ color: 'rgba(255,255,255,.55)' }}>{gameLabel}</div>
          <div className="font-black leading-none" style={{ color: '#FFD700', fontSize: 'clamp(2rem,9vw,3.5rem)' }}>{score.toLocaleString()}</div>
          {highScore > 0 && (
            <div className="text-sm mt-1" style={{ color: char.color }}>
              {isNew ? '🏆 新記録！' : `ハイスコア: ${highScore.toLocaleString()}`}
            </div>
          )}
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button onClick={onReplay} className="font-black rounded-full text-white" style={{ background: `linear-gradient(135deg,${char.color},${char.dark})`, border: 'none', fontSize: 'clamp(1rem,3.5vw,1.2rem)', padding: '.85rem 1.8rem', boxShadow: `0 8px 32px ${char.color}55` }}>
            🔄 もう一度！
          </Button>
          <Button variant="outline" onClick={onHub} className="font-black rounded-full" style={{ color: char.color, borderColor: char.color, fontSize: 'clamp(1rem,3.5vw,1.2rem)', padding: '.85rem 1.8rem', background: 'transparent' }}>
            🎮 ゲームえらぶ
          </Button>
        </div>
      </div>
    </div>
  )
}
