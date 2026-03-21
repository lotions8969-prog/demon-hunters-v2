import { useRef } from 'react'
import { CHARS } from '@/lib/characters'

interface TitleScreenProps { onStart: () => void }

export function TitleScreen({ onStart }: TitleScreenProps) {
  const stars = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: 10 + Math.random() * 16,
      color: ['#C084FC', '#FB7185', '#38BDF8', '#FFD700'][i % 4],
      dur: 1.8 + Math.random() * 2.8, delay: Math.random() * 3,
    }))
  )

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden p-4"
      style={{ background: 'linear-gradient(160deg,#0a0320 0%,#180840 45%,#0d1535 100%)' }}>
      {stars.current.map(s => (
        <div key={s.id} className="absolute pointer-events-none animate-pulse"
          style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: `${s.size}px`, color: s.color, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }}>✦</div>
      ))}

      {/* Character trio */}
      <div className="flex gap-4 items-end mb-6 z-10">
        {CHARS.map((c, i) => (
          <div key={c.id} className="text-center animate-float" style={{ animationDelay: `${i * 0.2}s` }}>
            <div className="rounded-full overflow-hidden mx-auto" style={{ width: 'clamp(80px,18vw,120px)', height: 'clamp(80px,18vw,120px)', border: `3px solid ${c.color}`, boxShadow: `0 0 24px ${c.color}88` }}>
              <img src={c.img.profile} className="w-full h-full object-cover" draggable={false} />
            </div>
            <div className="text-sm font-bold mt-1" style={{ color: c.color }}>{c.name}</div>
          </div>
        ))}
      </div>

      <div className="text-sm tracking-[.15em] font-black mb-1 z-10" style={{ color: '#E50914' }}>NETFLIX ✦ KPOP</div>
      <div className="animate-float text-center z-10 mb-6">
        <h1 className="font-black leading-tight" style={{ fontSize: 'clamp(2rem,9vw,4.5rem)', background: 'linear-gradient(135deg,#F0ABFC 0%,#818CF8 40%,#38BDF8 70%,#C084FC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          デーモン<br />ハンターズ
        </h1>
        <div className="tracking-[.3em] mt-1 text-sm" style={{ color: '#94A3B8' }}>★ DEMON HUNTERS ★</div>
      </div>

      <button
        onClick={onStart}
        className="font-black rounded-full cursor-pointer z-10 animate-pulse"
        style={{ padding: 'clamp(.9rem,3vw,1.2rem) clamp(2rem,6vw,3.5rem)', fontSize: 'clamp(1.2rem,4vw,1.6rem)', background: 'linear-gradient(135deg,#C084FC 0%,#818CF8 50%,#38BDF8 100%)', color: 'white', border: 'none', boxShadow: '0 8px 32px rgba(192,132,252,.5)', letterSpacing: '.08em' }}
      >
        ▶ あそぼう！
      </button>
    </div>
  )
}
