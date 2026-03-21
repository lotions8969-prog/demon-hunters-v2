import type { Character, GameDef } from './types'

const IMG = {
  rumi: {
    profile: 'https://r2.kpopdemon.com/gallery/huntrix/rumi/rumi-profile.jpg',
    performance: 'https://r2.kpopdemon.com/gallery/huntrix/rumi/rumi-performance.jpg',
    demon: 'https://r2.kpopdemon.com/gallery/huntrix/rumi/rumi-demon-form.jpg',
    roof: 'https://r2.kpopdemon.com/gallery/huntrix/rumi/rumi-on-roof.jpg',
    sword: 'https://r2.kpopdemon.com/gallery/huntrix/rumi/rumi-holding-saingeom.jpg',
  },
  mira: {
    profile: 'https://r2.kpopdemon.com/gallery/huntrix/mira/mira-profile.jpg',
    dance: 'https://r2.kpopdemon.com/gallery/huntrix/mira/mira-dance.jpg',
    weapon: 'https://r2.kpopdemon.com/gallery/huntrix/mira/mira-holding-woldo.jpg',
    stool: 'https://r2.kpopdemon.com/gallery/huntrix/mira/mira-dancing-on-stool.jpg',
  },
  zoey: {
    profile: 'https://r2.kpopdemon.com/gallery/huntrix/zoey/zoey-profile.jpg',
    performance: 'https://r2.kpopdemon.com/gallery/huntrix/zoey/zoey-performance.jpg',
    stage: 'https://r2.kpopdemon.com/gallery/huntrix/zoey/zoey-singing-on-stage.jpg',
    closeup: 'https://r2.kpopdemon.com/gallery/huntrix/zoey/zoey-face-close-up.jpg',
    determined: 'https://r2.kpopdemon.com/gallery/huntrix/zoey/zoey-looks-forward-with-determined-look.jpg',
  },
}

export const CHARS: Character[] = [
  { id:'rumi', name:'ルミ', nameEn:'RUMI', role:'リーダー', emoji:'👑', color:'#C084FC', dark:'#6D28D9', light:'#F3E8FF', bg:'linear-gradient(160deg,#0f0720 0%,#2a0855 55%,#5b21b6 100%)', img:IMG.rumi, desc:'つよくてやさしいリーダー！' },
  { id:'mira', name:'ミラ', nameEn:'MIRA', role:'ダンサー', emoji:'🔥', color:'#FB7185', dark:'#BE123C', light:'#FFF1F2', bg:'linear-gradient(160deg,#1c0507 0%,#4c0519 55%,#9f1239 100%)', img:IMG.mira, desc:'おどりのてんさいダンサー！' },
  { id:'zoey', name:'ゾーイ', nameEn:'ZOEY', role:'ラッパー', emoji:'🎤', color:'#38BDF8', dark:'#0369A1', light:'#E0F2FE', bg:'linear-gradient(160deg,#020c1a 0%,#0c2d4c 55%,#075985 100%)', img:IMG.zoey, desc:'クールでかわいいラッパー！' },
]

export const GAMES: GameDef[] = [
  { id:'starCatch',   label:'スターキャッチ', emoji:'⭐', desc:'落ちてくる星をタップ！' },
  { id:'demonShoot',  label:'デーモンシュート',emoji:'🗡️', desc:'悪魔をたおせ！キャラはさけて' },
  { id:'rhythmTap',   label:'リズムタップ',   emoji:'🎵', desc:'ビートにのってタップ！' },
  { id:'memoryCards', label:'メモリーカード', emoji:'🃏', desc:'おなじカードをさがそう！' },
  { id:'ballCatch',   label:'ボールキャッチ', emoji:'🏀', desc:'ゆびをうごかしてキャッチ！' },
  { id:'quickDraw',   label:'クイックドロー', emoji:'🔔', desc:'シグナルがでたらすぐタップ！' },
  { id:'janken',      label:'じゃんけん',     emoji:'✊', desc:'キャラクターとじゃんけん勝負！' },
  { id:'numberTouch', label:'ナンバータッチ', emoji:'🔢', desc:'1からじゅんにタップ！' },
]
