interface BackBtnProps { onClick: () => void }
export function BackBtn({ onClick }: BackBtnProps) {
  return (
    <button
      onClick={onClick}
      className="absolute top-2 left-2 z-50 px-3 py-1 rounded-full text-sm text-white cursor-pointer backdrop-blur-sm"
      style={{ background: 'rgba(0,0,0,.5)', border: '1.5px solid rgba(255,255,255,.3)' }}
    >
      ← もどる
    </button>
  )
}
