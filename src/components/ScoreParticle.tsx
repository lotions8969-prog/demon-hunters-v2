import type { ScoreParticleData } from '@/lib/types'

export function ScoreParticle({ p }: { p: ScoreParticleData }) {
  return (
    <div
      className="fixed pointer-events-none animate-float-up font-black z-[200] whitespace-nowrap"
      style={{
        left: p.x - 40,
        top: p.y - 20,
        color: p.color,
        fontSize: p.big ? '1.9rem' : '1.4rem',
        textShadow: '0 2px 10px rgba(0,0,0,.9)',
      }}
    >
      {p.text}
    </div>
  )
}
