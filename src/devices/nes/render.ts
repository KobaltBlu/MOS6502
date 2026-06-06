export const NES_PALETTE_RGB: readonly number[] = [
  0x666666, 0x002a88, 0x1412a7, 0x3b00a4, 0x5c007e, 0x6e0040, 0x6c0600, 0x561d00,
  0x333500, 0x0b4800, 0x005200, 0x004f08, 0x00404d, 0x000000, 0x000000, 0x000000,
  0xadadad, 0x155fd9, 0x4240ff, 0x7527fe, 0x9840fe, 0xb720a0, 0xb71c1c, 0x933b00,
  0x6e6e00, 0x388800, 0x009800, 0x009a6b, 0x009ccc, 0x000000, 0x000000, 0x000000,
  0xfffeff, 0x64b0ff, 0x9290ff, 0xc676ff, 0xda88ff, 0xff6acd, 0xff6c6c, 0xff9248,
  0xffda00, 0xe8e800, 0x76ff76, 0x64ffb4, 0x64daff, 0x000000, 0x000000, 0x000000,
  0xfffeff, 0xc4daff, 0xd4d2ff, 0xe8c8ff, 0xf0c0ff, 0xffb8ff, 0xffc4c4, 0xffd8a8,
  0xffec8c, 0xfff888, 0xd8ff9c, 0xc8ffb8, 0xc4ffff, 0x000000, 0x000000, 0x000000,
];

export function nesColorToRgb(paletteIndex: number): number {
  const idx = paletteIndex & 0x3f;
  return NES_PALETTE_RGB[idx] ?? 0;
}

export interface PpuRenderState {
  ctrl: number;
  mask: number;
  vram: Uint8Array;
  oam: Uint8Array;
  palette: Uint8Array;
  chrRead: (address: number) => number;
  mirroring: "horizontal" | "vertical";
  sprite0Hit: boolean;
}

const PPUMASK_SHOW_BG = 0x08;
const PPUMASK_SHOW_SPRITES = 0x10;
const PPUMASK_SHOW_BG_LEFT = 0x02;
const PPUMASK_SHOW_SPRITES_LEFT = 0x04;
const SPRITE_PRIORITY_BACK = 0x20;
const SPRITES_PER_SCANLINE = 8;
const SCREEN_WIDTH = 256;
const SCREEN_HEIGHT = 240;
const NAMETABLE_WIDTH = 256;
const NAMETABLE_HEIGHT = 240;

function mirrorNametableAddress(
  address: number,
  mirroring: "horizontal" | "vertical"
): number {
  const offset = address & 0x03ff;
  const table = (address >> 10) & 0x03;
  if (mirroring === "horizontal") {
    const mapped = table < 2 ? 0 : 1;
    return mapped * 0x400 + offset;
  }
  const mapped = table & 1;
  return mapped * 0x400 + offset;
}

function readVram(state: PpuRenderState, address: number): number {
  const addr = address & 0x3fff;
  if (addr >= 0x3f00) {
    const paletteIndex = addr & 0x1f;
    const value = state.palette[paletteIndex] & 0x3f;
    if (paletteIndex >= 0x10 && (paletteIndex & 0x03) === 0) {
      return state.palette[paletteIndex - 0x10] & 0x3f;
    }
    return value;
  }
  if (addr < 0x2000) {
    return state.chrRead(addr);
  }
  const mirrored = mirrorNametableAddress(addr, state.mirroring);
  return state.vram[mirrored] ?? 0;
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function renderBackgroundPixel(
  state: PpuRenderState,
  scanline: number,
  dot: number,
  scrollX: number,
  scrollY: number
): number | null {
  if ((state.mask & PPUMASK_SHOW_BG) === 0) {
    return null;
  }
  if (dot < 8 && (state.mask & PPUMASK_SHOW_BG_LEFT) === 0) {
    return null;
  }

  const baseTable = 0;
  const baseTableX = baseTable & 1;
  const baseTableY = (baseTable >> 1) & 1;
  const x = positiveModulo(dot + scrollX, NAMETABLE_WIDTH * 2);
  const y = positiveModulo(scanline + scrollY, NAMETABLE_HEIGHT * 2);
  const tableX = (baseTableX + Math.floor(x / NAMETABLE_WIDTH)) & 1;
  const tableY = (baseTableY + Math.floor(y / NAMETABLE_HEIGHT)) & 1;
  const tileX = (x % NAMETABLE_WIDTH) >> 3;
  const tileY = (y % NAMETABLE_HEIGHT) >> 3;
  const fineY = y & 0x07;
  const fineX = x & 0x07;

  const nametableBase = (tableY * 2 + tableX) * 0x400;
  const nameAddr = nametableBase + tileY * 32 + tileX;
  const tileIndex = readVram(state, 0x2000 + nameAddr);

  const attrTableBase = nametableBase + 0x3c0;
  const attrX = tileX >> 2;
  const attrY = tileY >> 2;
  const attrAddr = attrTableBase + attrY * 8 + attrX;
  const attr = readVram(state, 0x2000 + attrAddr);
  const shift = ((tileY & 2) << 1) | (tileX & 2);
  const paletteIndex = (attr >> shift) & 0x03;

  const bgTable = ((state.ctrl >> 4) & 1) * 0x1000;
  const patternAddr = bgTable + tileIndex * 16 + fineY;
  const plane0 = state.chrRead(patternAddr);
  const plane1 = state.chrRead(patternAddr + 8);
  const bit = 7 - fineX;
  const colorBit0 = (plane0 >> bit) & 1;
  const colorBit1 = (plane1 >> bit) & 1;
  const colorIndex = colorBit0 | (colorBit1 << 1);
  if (colorIndex === 0) {
    return null;
  }

  return readVram(state, 0x3f00 + paletteIndex * 4 + colorIndex);
}

interface SpriteEntry {
  index: number;
  y: number;
  tile: number;
  attr: number;
  x: number;
}

function collectSprites(state: PpuRenderState, scanline: number): SpriteEntry[] {
  const sprites: SpriteEntry[] = [];
  const height = (state.ctrl & 0x20) ? 16 : 8;

  for (let i = 0; i < 64; i++) {
    const base = i * 4;
    const y = state.oam[base];
    const tile = state.oam[base + 1];
    const attr = state.oam[base + 2];
    const x = state.oam[base + 3];
    const row = scanline - (y + 1);
    if (row >= 0 && row < height) {
      sprites.push({ index: i, y, tile, attr, x });
      if (sprites.length >= SPRITES_PER_SCANLINE) {
        break;
      }
    }
  }

  return sprites;
}

function renderSpritePixel(
  state: PpuRenderState,
  scanline: number,
  dot: number,
  sprite: SpriteEntry
): number | null {
  const height = (state.ctrl & 0x20) ? 16 : 8;
  const row = scanline - (sprite.y + 1);
  const col = dot - sprite.x;
  if (col < 0 || col >= 8) {
    return null;
  }

  const flipY = (sprite.attr & 0x80) !== 0;
  const flipX = (sprite.attr & 0x40) !== 0;
  const spriteRow = flipY ? height - 1 - row : row;
  let table = ((state.ctrl >> 3) & 1) * 0x1000;
  let tileIndex = sprite.tile;
  let fineY = spriteRow;

  if (height === 16) {
    table = (sprite.tile & 1) * 0x1000;
    tileIndex = (sprite.tile & 0xfe) + (spriteRow >= 8 ? 1 : 0);
    fineY = spriteRow & 0x07;
  }

  const fineX = flipX ? col : 7 - col;

  const patternAddr = table + tileIndex * 16 + fineY;
  const plane0 = state.chrRead(patternAddr);
  const plane1 = state.chrRead(patternAddr + 8);
  const colorIndex = ((plane0 >> fineX) & 1) | (((plane1 >> fineX) & 1) << 1);
  if (colorIndex === 0) {
    return null;
  }

  const paletteIndex = 0x10 | ((sprite.attr & 0x03) << 2) | colorIndex;
  return readVram(state, 0x3f00 + paletteIndex);
}

export function renderScanline(
  state: PpuRenderState,
  scanline: number,
  framebuffer: Uint32Array,
  scrollX = 0,
  scrollY = 0
): void {
  const rowOffset = scanline * SCREEN_WIDTH;
  const sprites = collectSprites(state, scanline);

  for (let dot = 0; dot < SCREEN_WIDTH; dot++) {
    let color = 0;
    const bgColor = renderBackgroundPixel(state, scanline, dot, scrollX, scrollY);
    let spriteColor: number | null = null;
    let spriteIndex = -1;
    let spritePriorityBack = false;

    if ((state.mask & PPUMASK_SHOW_SPRITES) !== 0 && (dot >= 8 || (state.mask & PPUMASK_SHOW_SPRITES_LEFT) !== 0)) {
      for (const sprite of sprites) {
        const pixel = renderSpritePixel(state, scanline, dot, sprite);
        if (pixel !== null) {
          spriteColor = pixel;
          spriteIndex = sprite.index;
          spritePriorityBack = (sprite.attr & SPRITE_PRIORITY_BACK) !== 0;
          break;
        }
      }
    }

    if (spriteIndex === 0 && spriteColor !== null && bgColor !== null && dot >= 1 && dot < 255) {
      state.sprite0Hit = true;
    }

    if (spriteColor !== null && (bgColor === null || !spritePriorityBack)) {
      color = nesColorToRgb(spriteColor);
    } else if (bgColor !== null) {
      color = nesColorToRgb(bgColor);
    } else {
      color = nesColorToRgb(readVram(state, 0x3f00));
    }

    framebuffer[rowOffset + dot] = packRgba8888(color);
  }
}

function packRgba8888(rgb: number): number {
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = rgb & 0xff;

  return (0xff << 24) | (b << 16) | (g << 8) | r;
}

export function renderFrame(
  state: PpuRenderState,
  framebuffer: Uint32Array,
  scrollX = 0,
  scrollY = 0
): void {
  state.sprite0Hit = false;
  for (let scanline = 0; scanline < SCREEN_HEIGHT; scanline++) {
    renderScanline(state, scanline, framebuffer, scrollX, scrollY);
  }
}
