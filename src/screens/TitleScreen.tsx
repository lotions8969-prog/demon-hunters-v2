import { useRef, useEffect } from 'react'
import { CHARS } from '@/lib/characters'

interface TitleScreenProps { onStart: () => void }

export function TitleScreen({ onStart }: TitleScreenProps) {
  const orbs = useRef(
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: [15, 80, 50, 20, 75, 40][i],
      y: [20, 15, 70, 80, 65, 45][i],
      size: [280, 220, 200, 180, 240, 160][i],
      color: ['#C084FC', '#38BDF8', '#FB7185', '#818CF8', '#C084FC', '#38BDF8'][i],
      blur: [80, 60, 70, 50, 90, 55][i],
    }))
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStart() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onStart])

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden" style={{ background: '#040012' }}>
      {/* Ambient orbs */}
      {orbs.current.map(o => (
        <div
          key={o.id}
          className="absolute pointer-events-none rounded-full animate-glow"
          style={{
            left: `${o.x}%`, top: `${o.y}%`,
            width: o.size, height: o.size,
            background: o.color,
            filter: `blur(${o.blur}px)`,
            opacity: 0.18,
            transform: 'translate(-50%,-50%)',
            animationDelay: `${o.id * 0.4}s`,
          }}
        />
      ))}

      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Netflix badge */}
      <div className="relative z-10 mb-6 animate-fade-in">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full glass" style={{ border: '1px solid rgba(229,9,20,0.4)' }}>
          <span className="text-xs font-black tracking-[0.2em]" style={{ color: '#E50914' }}>NETFLIX</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>×</span>
          <span className="text-xs font-black tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.7)' }}>KPOP</span>
        </div>
      </div>

      {/* Characters */}
      <div className="relative z-10 flex items-end justify-center mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {CHARS.map((c, i) => (
          <div
            key={c.id}
            className="flex flex-col items-center animate-float"
            style={{
              animationDelay: `${i * 0.3}s`,
              marginLeft: i > 0 ? '-12px' : 0,
              zIndex: i === 1 ? 3 : i === 0 ? 2 : 1,
              transform: i === 1 ? 'scale(1.12)' : 'scale(0.92)',
            }}
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                width: 'clamp(70px,15vw,110px)',
                height: 'clamp(85px,18vw,135px)',
                border: `2px solid ${c.color}66`,
                boxShadow: `0 8px 32px ${c.color}44, inset 0 1px 0 rgba(255,255,255,0.15)`,
              }}
            >
              <img src={c.img.profile} className="w-full h-full object-cover" draggable={false} />
            </div>
          </div>
        ))}
      </div>

      {/* Title */}
      <div className="relative z-10 text-center mb-2 animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <h1
          className="font-black leading-none tracking-tight"
          style={{
            fontSize: 'clamp(2.8rem,10vw,6rem)',
            background: 'linear-gradient(135deg, #F0ABFC 0%, #C084FC 30%, #818CF8 60%, #38BDF8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 40px rgba(192,132,252,0.4))',
          }}
        >
          デーモン
          <br />
          ハンターズ
        </h1>
        <p className="mt-2 text-sm font-semibold tracking-[0.3em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          DEMON HUNTERS
        </p>
      </div>

      {/* Tagline */}
      <p className="relative z-10 text-sm mb-8 animate-fade-in" style={{ color: 'rgba(255,255,255,0.45)', animationDelay: '0.3s' }}>
        32のゲームでデーモンをたおせ！
      </p>

      {/* CTA */}
      <div className="relative z-10 flex flex-col items-center gap-3 animate-slide-up" style={{ animationDelay: '0.25s' }}>
        <button
          onClick={onStart}
          className="relative font-black rounded-2xl cursor-pointer overflow-hidden transition-all duration-200 active:scale-95"
          style={{
            padding: 'clamp(0.85rem,2.5vw,1.1rem) clamp(2.5rem,7vw,4rem)',
            fontSize: 'clamp(1rem,3.5vw,1.3rem)',
            background: 'linear-gradient(135deg, #C084FC 0%, #818CF8 50%, #38BDF8 100%)',
            color: 'white',
            border: 'none',
            boxShadow: '0 8px 40px rgba(129,140,248,0.5), inset 0 1px 0 rgba(255,255,255,0.25)',
            letterSpacing: '0.05em',
          }}
        >
          ▶ あそぼう！
        </button>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Enter / Space でもスタート</p>
      </div>
    </div>
  )
}
