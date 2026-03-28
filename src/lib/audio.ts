// Per-game YouTube music assignments
// Using well-known movie soundtracks and popular YouTube music
export const GAME_MUSIC: Record<string, string> = {
  starCatch:    '-JStINmfSbk',  // GOLDEN (K-pop upbeat)
  demonShoot:   'RxabLA7UQ9k',  // Hans Zimmer - Time (Inception)
  rhythmTap:    'gdZLi9oWNZg',  // BTS - Dynamite
  memoryCards:  'aE9tKi5RNSE',  // Joe Hisaishi - Summer (calm focus)
  ballCatch:    'QGsevnbItdU',  // How It's Done (energetic)
  quickDraw:    '27mB8verLK8',  // Pirates of Caribbean
  janken:       'aNad2Ml2Lfw',  // Soda Pop (playful)
  numberTouch:  '2FS3JAPTKXs',  // Your Idol (focused)
  bubblePop:    'hohuFW0zQUw',  // Golden MV (bubbly)
  hideSeek:     'UDVtMYqUAyw',  // Interstellar Theme (mysterious)
  puzzle:       'LYhMRC4flJA',  // One Summer's Day - Spirited Away
  simonSays:    '8rrWRGkSypc',  // Free (Rumi+Jinu)
  slot:         'tcuW6SdYQSA',  // What It Sounds Like
  speedTap:     '60ItHLz5WEA',  // Alan Walker - Faded
  movingTarget: 'ioNng23DkIM',  // BLACKPINK - How You Like That
  demonAvoid:   'HaF0pRuJXKE',  // Alan Walker - Darkside
  photoSnap:    'aNad2Ml2Lfw',  // Soda Pop (fun/light)
  snake:        'Zi_XLOBDo_Y',  // Star Wars Main Theme
  towerStack:   'ALZHF5UqnU4',  // Marshmello - Alone
  typeRace:     'gdZLi9oWNZg',  // BTS - Dynamite
  colorMatch:   'fFbpzOvMtAo',  // Twice - Feel Special
  dashDodge:    'HaF0pRuJXKE',  // Alan Walker - Darkside
  spaceShooter: 'Zi_XLOBDo_Y',
  pongGame:     'RxabLA7UQ9k',
  flappyChar:   'aNad2Ml2Lfw',
  brickBreaker: 'ioNng23DkIM',
  mathBlitz:    '2FS3JAPTKXs',
  whackMole:    'hohuFW0zQUw',
  wordScramble: 'QGsevnbItdU',
  reflexTest:   'tcuW6SdYQSA',
  ticTacToe:    'aE9tKi5RNSE',
  catchOrder:   'gdZLi9oWNZg',
  higherLower:  '2FS3JAPTKXs',
  oddOneOut:    'hohuFW0zQUw',
  targetBlast:  'ioNng23DkIM',
  gravityFlip:  'aNad2Ml2Lfw',
  endlessRun:   '60ItHLz5WEA',
  bombDefuse:   'RxabLA7UQ9k',
  spinTarget:   'ALZHF5UqnU4',
  numberRain:   '2FS3JAPTKXs',
  ghostChase:   'UDVtMYqUAyw',
  powerShot:    'ioNng23DkIM',
  tileSweep:    'fFbpzOvMtAo',
  laserDodge:   'HaF0pRuJXKE',
  demonicSort:  'gdZLi9oWNZg',
  shadowMatch:  'aE9tKi5RNSE',
  tapRhythm:    'gdZLi9oWNZg',
  colorStop:    'fFbpzOvMtAo',
  iconFlash:    '8rrWRGkSypc',
  chainBomb:    'RxabLA7UQ9k',
  asteroidRun:  'Zi_XLOBDo_Y',
  rocketBoost:  'ALZHF5UqnU4',
}

export const YT_PLAYLIST = Object.values(GAME_MUSIC).filter((v, i, a) => a.indexOf(v) === i)

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

  function ytPlayGame(gameId?: string) {
    try {
      const p = getYtPlayer()
      if (!p?.loadVideoById) return
      const state = p.getPlayerState?.()
      if (state === 1) {
        // Already playing - only switch if different video
        const currentId = p.getVideoData?.()?.video_id
        const targetId = gameId ? (GAME_MUSIC[gameId] || GAME_MUSIC.starCatch) : GAME_MUSIC.starCatch
        if (currentId === targetId) return
      }
      p.setVolume(38)
      if (gameId && GAME_MUSIC[gameId]) {
        p.loadVideoById({ videoId: GAME_MUSIC[gameId], startSeconds: 0 })
        p.setLoop(true)
      } else {
        const ids = Object.values(GAME_MUSIC).filter((v, i, a) => a.indexOf(v) === i)
        p.loadPlaylist({ listType: 'playlist', list: ids, index: Math.floor(Math.random() * ids.length) })
        p.setLoop(true)
      }
    } catch {}
  }

  function ytStop() {
    try { getYtPlayer()?.stopVideo?.() } catch {}
  }

  return {
    start(gameId?: string) { init(); if (ctx!.state === 'suspended') ctx!.resume(); ytPlayGame(gameId) },
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
    sfxType()      { sfx([660, 880, 1100], [0, 0.04, 0.08], [0.2, 0.2, 0.2]) },
    sfxStack()     { sfx([440, 550, 660], [0, 0.05, 0.1], [0.3, 0.3, 0.3]) },
    sfxEat()       { sfx([880, 1100], [0, 0.06], [0.3, 0.3]) },
    sfxColorMatch(){ sfx([1046.5, 1318.5, 1568], [0, 0.06, 0.12], [0.3, 0.3, 0.3]) },
    sfxDash()      { sfx([440, 330], [0, 0.08], [0.3, 0.3]) },
  }
}

export type AudioEngine = ReturnType<typeof makeAudio>
