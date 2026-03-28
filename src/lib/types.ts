export type CharId = 'rumi' | 'mira' | 'zoey'
export type GameId = 'starCatch' | 'demonShoot' | 'rhythmTap' | 'memoryCards' | 'ballCatch' | 'quickDraw' | 'janken' | 'numberTouch' | 'bubblePop' | 'hideSeek' | 'puzzle' | 'simonSays' | 'slot' | 'speedTap' | 'movingTarget' | 'demonAvoid' | 'photoSnap' | 'snake' | 'towerStack' | 'typeRace' | 'colorMatch' | 'dashDodge' | 'spaceShooter' | 'pongGame' | 'flappyChar' | 'brickBreaker' | 'mathBlitz' | 'whackMole' | 'wordScramble' | 'reflexTest' | 'ticTacToe' | 'catchOrder' | 'higherLower' | 'oddOneOut' | 'targetBlast' | 'gravityFlip' | 'endlessRun' | 'bombDefuse' | 'spinTarget' | 'numberRain' | 'ghostChase' | 'powerShot' | 'tileSweep' | 'laserDodge' | 'demonicSort' | 'shadowMatch' | 'tapRhythm' | 'colorStop' | 'iconFlash' | 'chainBomb' | 'asteroidRun' | 'rocketBoost'
export interface Character {
  id: CharId
  name: string
  nameEn: string
  role: string
  emoji: string
  color: string
  dark: string
  light: string
  bg: string
  img: Record<string, string>
  desc: string
}
export interface GameDef {
  id: GameId
  label: string
  emoji: string
  desc: string
}
export interface ScoreParticleData {
  id: number
  x: number
  y: number
  text: string
  color: string
  big: boolean
}
