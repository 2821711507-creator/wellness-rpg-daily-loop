import type { CSSProperties } from 'react'
import { AVATAR_PARTS } from '../data/avatarManifest'
import { AVATAR_PIXEL_LAYERS, type PixelFill, type PixelRect } from '../data/avatarPixelLayers'
import { getAvatarLayerIds, type AvatarSelectionSlot, type AvatarState } from '../domain/avatar'

const SKIN_NAMES = { light:'밝은 피부', medium:'중간 피부', deep:'짙은 피부' } as const
const SKIN_PALETTES = {
  light:['#f9dcc3', '#efb98f', '#cf8569', '#854842'],
  medium:['#efb17f', '#cc8058', '#9d543e', '#64332a'],
  deep:['#b97854', '#8b553c', '#603326', '#381d1d'],
} as const

const FILL:Record<PixelFill,string> = {
  skinLight:'var(--avatar-skin-light)', skin:'var(--avatar-skin)', skinShade:'var(--avatar-skin-shade)', skinDeep:'var(--avatar-skin-deep)',
  hairLight:'var(--avatar-hair-light)', hair:'var(--avatar-hair)', hairShade:'var(--avatar-hair-shade)', hairDeep:'var(--avatar-hair-deep)',
  fabricLight:'var(--avatar-fabric-light)', fabric:'var(--avatar-fabric)', fabricShade:'var(--avatar-fabric-shade)', fabricDeep:'var(--avatar-fabric-deep)',
  shoeLight:'var(--avatar-shoe-light)', shoe:'var(--avatar-shoe)', shoeShade:'var(--avatar-shoe-shade)',
  outline:'var(--avatar-outline)', eye:'var(--avatar-eye)', eyeLight:'var(--avatar-eye-light)', mouth:'var(--avatar-mouth)',
  innerTop:'var(--avatar-inner-top)', innerBottom:'var(--avatar-inner-bottom)',
}

const fabricPalette = (light:string, base:string, shade:string, deep:string) => ({
  '--avatar-fabric-light':light,
  '--avatar-fabric':base,
  '--avatar-fabric-shade':shade,
  '--avatar-fabric-deep':deep,
} as CSSProperties)

const shoePalette = (light:string, base:string, shade:string) => ({
  '--avatar-shoe-light':light,
  '--avatar-shoe':base,
  '--avatar-shoe-shade':shade,
} as CSSProperties)

const LAYER_PALETTES:Partial<Record<string,CSSProperties>> = {
  'top-runner':fabricPalette('#e7f5ff', '#9bcce9', '#6098c1', '#2f5f88'),
  'top-gym':fabricPalette('#ffd6cc', '#de8779', '#aa554f', '#71383e'),
  'top-walk':fabricPalette('#d9ebe1', '#91b9a5', '#5f8b78', '#355e54'),
  'bottom-pants':fabricPalette('#aeb9c9', '#59677b', '#38465c', '#202a3c'),
  'bottom-shorts':fabricPalette('#91a9c8', '#526c91', '#33496d', '#202f4d'),
  'hat-wellness-cap':fabricPalette('#e9f5fa', '#93c5d7', '#598da4', '#315b72'),
  'accessory-bottle-pouch':fabricPalette('#f4d8b7', '#ca9368', '#976449', '#634033'),
  'shoes-trainers':shoePalette('#fffaf0', '#dce9ee', '#82a9bc'),
  'shoes-walk':shoePalette('#edf0e9', '#9da99d', '#647269'),
}

function partName(state:AvatarState, slot:AvatarSelectionSlot) {
  return AVATAR_PARTS.find(part => part.id === state.equipped[slot])?.name ?? ''
}

function Pixels({ pixels }: { pixels:PixelRect[] }) {
  return <>{pixels.map((pixel, index) => <rect key={index} x={pixel.x} y={pixel.y} width={pixel.width} height={pixel.height} fill={FILL[pixel.fill]}/>)}</>
}

export function AvatarRenderer({ state, className = '' }: { state:AvatarState; className?:string }) {
  const [skinLight, skin, skinShade, skinDeep] = SKIN_PALETTES[state.skin]
  const style = {
    '--avatar-skin-light':skinLight,
    '--avatar-skin':skin,
    '--avatar-skin-shade':skinShade,
    '--avatar-skin-deep':skinDeep,
    '--avatar-hair-light':'#71809a',
    '--avatar-hair':'#46536c',
    '--avatar-hair-shade':'#2d394f',
    '--avatar-hair-deep':'#192238',
    '--avatar-fabric-light':'#f7f4ec',
    '--avatar-fabric':'#8fa3b2',
    '--avatar-fabric-shade':'#5d7185',
    '--avatar-fabric-deep':'#34475e',
    '--avatar-shoe-light':'#fffaf0',
    '--avatar-shoe':'#dce9ee',
    '--avatar-shoe-shade':'#82a9bc',
    '--avatar-outline':'#182238',
    '--avatar-eye':'#293451',
    '--avatar-eye-light':'#fffaf0',
    '--avatar-mouth':'#a94f5d',
    '--avatar-inner-top':'#f1ede4',
    '--avatar-inner-bottom':'#46536b',
  } as CSSProperties
  const genderName = state.gender === 'male' ? '남성 캐릭터' : '여성 캐릭터'
  const name = [
    genderName,
    SKIN_NAMES[state.skin],
    ...(['hair', 'top', 'bottom', 'shoes', 'hat', 'accessory'] as AvatarSelectionSlot[]).map(slot => partName(state, slot)),
  ].filter(Boolean).join(', ')
  const hasRunnerTop = state.equipped.top === 'top-runner'
  const hasTrainers = state.equipped.shoes === 'shoes-trainers'
  const rasterBaseSrc = hasTrainers
    ? `/avatar/v2/${state.gender}${hasRunnerTop ? '-top-runner' : ''}-shoes-trainers.png`
    : hasRunnerTop
      ? `/avatar/v2/${state.gender}-top-runner.png`
      : `/avatar/v2/base-${state.gender}.png`

  return <svg className={`avatar-renderer ${className}`.trim()} viewBox="0 0 96 144" role="img" aria-label={name} shapeRendering="crispEdges" style={style}>
    {getAvatarLayerIds(state).map(id => {
      const isBase = id === 'base-male' || id === 'base-female'
      const isLegacyHair = id.startsWith('hair-')
      const isRasterBottom = id === 'bottom-pants'
      return <g key={id} data-layer-id={id} style={LAYER_PALETTES[id]}>
        {isBase
          ? <image data-raster-base href={rasterBaseSrc} width="96" height="144" style={{ imageRendering:'pixelated' }}/>
          : isRasterBottom
            ? <image data-raster-bottom href={`/avatar/v2/${state.gender}-bottom-pants.png`} width="96" height="144" style={{ imageRendering:'pixelated' }}/>
            : !isLegacyHair && id !== 'top-runner' && id !== 'shoes-trainers' && <Pixels pixels={AVATAR_PIXEL_LAYERS[id] ?? []}/>
        }
      </g>
    })}
  </svg>
}
