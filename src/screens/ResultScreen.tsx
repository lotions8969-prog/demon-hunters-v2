import { useEffect, useRef } from 'react'
import type { Character } from '@/lib/types'

interface ResultProps {
  char: Character
  score: number
  highScore: number
  gameLabel: string
  onReplay: () => void
  onHub: () => void
}

export function ResultScreen({ char, score, highScore, gameLabel, onReplay, onHub }: ResultProps) {
  const isNew = score > 0 && score >= highScore
  const stars = score >= 700 ? 3 : score >= 300 ? 2 : 1
  const msgs = ['グッジョブ！', 'すごい！！', 'かんぺき！✨']

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onReplay() }
      if (e.key === 'Escape') { e.preventDefault(); onHub() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onReplay, onHub])

  // Confetti particles
  const confetti = useRef(
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: ['#C084FC','#FB7185','#38BDF8','#FFD700','#4ADE80'][i % 5],
      size: 5 + Math.random() * 8,
      dur: 2.5 + Math.random() * 2,
      delay: Math.random() * 1.5,
    }))
  )

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden animate-fade-in" style={{ background: '#040012' }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute rounded-full" style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, background: char.color, filter: 'blur(140px)', opacity: 0.12 }} />
      </div>

      {/* Confetti */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {confetti.current.map(c => (
          <div
            key={c.id}
            className="absolute animate-bounce"
            style={{ left: `${c.x}%`, top: -16, width: c.size, height: c.size, background: c.color, borderRadius: Math.random() > 0.5 ? '50%' : 3, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s`, opacity: 0.8 }}
          />
        ))}
      </div>

      {/* Main card */}
      <div
        className="relative z-10 flex flex-col items-center text-center gap-5 rounded-3xl p-6 mx-4 animate-bounce-in"
        style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(32px)',
          border: `1px solid ${char.color}33`,
          boxShadow: `0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)`,
          maxWidth: 380,
          width: '100%',
        }}
      >
        {/* Character image */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            width: 'clamp(90px,22vw,130px)',
            height: 'clamp(110px,27vw,160px)',
            border: `2px solid ${char.color}`,
            boxShadow: `0 0 32px ${char.color}55`,
          }}
        >
          <img src={char.img.performance || char.img.profile} className="w-full h-full object-cover" draggable={false} />
        </div>

        {/* Stars */}
        <div className="flex gap-2">
          {[0,1,2].map(i => (
            <span
              key={i}
              className="text-3xl transition-all duration-300"
              style={{
                opacity: i < stars ? 1 : 0.15,
                filter: i < stars ? 'drop-shadow(0 0 8px #FFD700)' : 'none',
                animationDelay: `${i * 0.15}s`,
              }}
            >⭐</span>
          ))}
        </div>

        {/* Message */}
        <div>
          <div className="font-black animate-float" style={{ color: 'white', fontSize: 'clamp(1.4rem,5vw,2rem)' }}>
            {msgs[stars - 1]}
          </div>
          <div className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{gameLabel}</div>
        </div>

        {/* Score */}
        <div
          className="w-full rounded-2xl p-4"
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>SCORE</div>
          <div className="font-black tabular-nums" style={{ color: '#FFD700', fontSize: 'clamp(2.2rem,9vw,3.5rem)', letterSpacing: '-0.03em' }}>
            {score.toLocaleString()}
          </div>
          {isNew && (
            <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: '#FFD70022', color: '#FFD700', border: '1px solid #FFD70044' }}>
              🏆 新記録！
            </div>
          )}
          {!isNew && highScore > 0 && (
            <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>ハイスコア: {highScore.toLocaleString()}</div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 w-full">
          <button
            onClick={onReplay}
            className="flex-1 font-black rounded-2xl py-3 text-white cursor-pointer transition-all duration-200 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${char.color}, ${char.dark})`,
              border: 'none',
              fontSize: 'clamp(0.9rem,3vw,1.05rem)',
              boxShadow: `0 4px 20px ${char.color}44`,
            }}
          >
            🔄 もう一度
          </button>
          <button
            onClick={onHub}
            className="flex-1 font-black rounded-2xl py-3 cursor-pointer transition-all duration-200 active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${char.color}44`,
              color: char.color,
              fontSize: 'clamp(0.9rem,3vw,1.05rem)',
            }}
          >
            🎮 ゲームえらぶ
          </button>
        </div>

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Enter でリプレイ・Esc でもどる</p>
      </div>
    </div>
  )
}
