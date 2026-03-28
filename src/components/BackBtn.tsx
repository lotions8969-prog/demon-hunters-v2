interface BackBtnProps { onClick: () => void; label?: string }
export function BackBtn({ onClick, label = '← もどる' }: BackBtnProps) {
  return (
    <button
      onClick={onClick}
      className="absolute top-3 left-3 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-white/70 cursor-pointer transition-all duration-200 hover:text-white hover:bg-white/10 active:scale-95"
      style={{ backdropFilter: 'blur(12px)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
    >
      {label}
    </button>
  )
}
