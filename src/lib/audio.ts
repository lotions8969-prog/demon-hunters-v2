export const YT_PLAYLIST = [
  '-JStINmfSbk',  // GOLDEN (full performance)
  'hohuFW0zQUw',  // Golden MV (Netflix Philippines)
  'QGsevnbItdU',  // How It's Done (Official Lyric Video)
  'tcuW6SdYQSA',  // What It Sounds Like
  '8rrWRGkSypc',  // Free (Rumi + Jinu duet)
  'aNad2Ml2Lfw',  // Soda Pop (Saja Boys)
  '2FS3JAPTKXs',  // Your Idol (Saja Boys)
]

export function makeAudio(getYtPlayer: () => any) {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null

  function init() {
    if (ctx) return
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    master = ctx.createGain()
    master.gain.value = 0.35
    master.connect(ctx.destination)
  }

  function tone(t: number, freq: number, dur: number, vol = 0.2) {
    if (!freq || !ctx || !master) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.connect(g)
    g.connect(master)
    o.frequency.value = freq
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.04)
    g.gain.setValueAtTime(vol, t + dur * 0.82)
    g.gain.linearRampToValueAtTime(0.001, t + dur)
    o.start(t)
    o.stop(t + dur)
  }

  function sfx(freqs: number[], durs: number[], vols?: number[]) {
    if (!ctx || ctx.state !== 'running') return
    const t = ctx.currentTime
    freqs.forEach((f, i) => tone(t + (durs[i] || 0), f, 0.18 + (durs[i] || 0), vols ? vols[i] : 0.4))
  }

  function ytPlay() {
    try {
      const p = getYtPlayer()
      if (!p?.loadPlaylist) return
      const state = p.getPlayerState?.()
      if (state === 1) return // already playing
      p.setVolume(38)
      p.loadPlaylist({ listType: 'playlist', list: YT_PLAYLIST, index: Math.floor(Math.random() * YT_PLAYLIST.length) })
      p.setLoop(true)
    } catch {}
  }

  function ytStop() {
    try { getYtPlayer()?.stopVideo?.() } catch {}
  }

  return {
    start() { init(); if (ctx!.state === 'suspended') ctx!.resume(); ytPlay() },
    stop()  { ytStop(); ctx?.suspend() },
    sfxCatch()     { sfx([880, 1760], [0, 0.1]) },
    sfxCombo()     { sfx([880, 1046.5, 1318.5], [0, 0.09, 0.18]) },
    sfxSpecial()   { sfx([523.25, 659.25, 783.99, 1046.5], [0, 0.07, 0.14, 0.21]) },
    sfxMiss()      { sfx([160, 110], [0, 0.1], [0.5, 0.5]) },
    sfxFlip()      { sfx([600, 800], [0, 0.05], [0.25, 0.2]) },
    sfxMatch()     { sfx([880, 1046.5, 1318.5, 1760], [0, 0.06, 0.12, 0.18], [0.35, 0.35, 0.35, 0.35]) },
    sfxBubble()    { sfx([1200, 800], [0, 0.08], [0.3, 0.25]) },
    sfxAppear()    { sfx([660, 880], [0, 0.08]) },
    sfxRhythm()    { sfx([880, 1046.5], [0, 0.08]) },
    sfxPerfect()   { sfx([880, 1046.5, 1318.5], [0, 0.06, 0.12]) },
    sfxGameOver()  {
      init()
      if (ctx!.state === 'suspended') ctx!.resume()
      const t = ctx!.currentTime + 0.1
      ;[[523.25, 0], [659.25, 0.18], [783.99, 0.36], [1046.5, 0.54]].forEach(([f, d]) => tone(t + d, f, 0.4, 0.3))
    },
  }
}

export type AudioEngine = ReturnType<typeof makeAudio>
