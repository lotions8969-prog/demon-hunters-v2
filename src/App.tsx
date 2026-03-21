import { useState, useEffect, useRef } from 'react'
import { TitleScreen } from '@/screens/TitleScreen'
import { CharSelect } from '@/screens/CharSelect'
import { GameHub } from '@/screens/GameHub'
import { ResultScreen } from '@/screens/ResultScreen'
import { StarCatch } from '@/games/StarCatch'
import { DemonShoot } from '@/games/DemonShoot'
import { RhythmTap } from '@/games/RhythmTap'
import { MemoryCards } from '@/games/MemoryCards'
import { BallCatch } from '@/games/BallCatch'
import { QuickDraw } from '@/games/QuickDraw'
import { Janken } from '@/games/Janken'
import { NumberTouch } from '@/games/NumberTouch'
import { makeAudio } from '@/lib/audio'
import { GAMES } from '@/lib/characters'
import type { Character, GameId } from '@/lib/types'

const YT_VIDEO_ID = '-JStINmfSbk'

type Screen = 'title' | 'select' | 'hub' | 'game' | 'result'

export default function App() {
  const [screen, setScreen] = useState<Screen>('title')
  const [char, setChar] = useState<Character | null>(null)
  const [gameId, setGameId] = useState<GameId | null>(null)
  const [lastScore, setLastScore] = useState(0)
  const [highScores, setHighScores] = useState<Partial<Record<GameId, number>>>({})

  const audioRef = useRef<ReturnType<typeof makeAudio> | null>(null)
  const ytPlayerRef = useRef<any>(null)
  const ytReadyRef = useRef(false)

  useEffect(() => {
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
    ;(window as any).onYouTubeIframeAPIReady = () => {
      ytPlayerRef.current = new (window as any).YT.Player('yt-audio', {
        height: '1', width: '1', videoId: YT_VIDEO_ID,
        playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: YT_VIDEO_ID },
        events: { onReady: () => { ytReadyRef.current = true } },
      })
    }
    audioRef.current = makeAudio(() => ytReadyRef.current ? ytPlayerRef.current : null)
    return () => audioRef.current?.stop()
  }, [])

  function selectChar(c: Character) { setChar(c); setScreen('hub') }
  function selectGame(gid: GameId) { setGameId(gid); setScreen('game') }
  function gameEnd(score: number) {
    setLastScore(score)
    setHighScores(prev => ({ ...prev, [gameId!]: Math.max(prev[gameId!] || 0, score) }))
    setScreen('result')
  }
  function backToHub() { audioRef.current?.stop(); setScreen('hub') }

  const game = GAMES.find(g => g.id === gameId)
  const audio = audioRef.current!

  return (
    <>
      <div id="yt-audio" style={{ position:'fixed', width:1, height:1, bottom:-10, left:-10, opacity:0, pointerEvents:'none' }} />
      {screen === 'title' && <TitleScreen onStart={() => setScreen('select')} />}
      {screen === 'select' && <CharSelect onSelect={selectChar} />}
      {screen === 'hub' && char && <GameHub char={char} highScores={highScores} onSelectGame={selectGame} onBack={() => setScreen('select')} />}
      {screen === 'game' && char && audio && gameId === 'starCatch' && <StarCatch char={char} audio={audio} onEnd={gameEnd} onBack={backToHub} />}
      {screen === 'game' && char && audio && gameId === 'demonShoot' && <DemonShoot char={char} audio={audio} onEnd={gameEnd} onBack={backToHub} />}
      {screen === 'game' && char && audio && gameId === 'rhythmTap' && <RhythmTap char={char} audio={audio} onEnd={gameEnd} onBack={backToHub} />}
      {screen === 'game' && char && audio && gameId === 'memoryCards' && <MemoryCards char={char} audio={audio} onEnd={gameEnd} onBack={backToHub} />}
      {screen === 'game' && char && audio && gameId === 'ballCatch' && <BallCatch char={char} audio={audio} onEnd={gameEnd} onBack={backToHub} />}
      {screen === 'game' && char && audio && gameId === 'quickDraw' && <QuickDraw char={char} audio={audio} onEnd={gameEnd} onBack={backToHub} />}
      {screen === 'game' && char && audio && gameId === 'janken' && <Janken char={char} audio={audio} onEnd={gameEnd} onBack={backToHub} />}
      {screen === 'game' && char && audio && gameId === 'numberTouch' && <NumberTouch char={char} audio={audio} onEnd={gameEnd} onBack={backToHub} />}
      {screen === 'result' && char && game && (
        <ResultScreen char={char} score={lastScore} highScore={highScores[gameId!] || 0} gameLabel={`${game.emoji} ${game.label}`} onReplay={() => setScreen('game')} onHub={backToHub} />
      )}
    </>
  )
}
