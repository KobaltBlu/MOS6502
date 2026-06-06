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

function mirrorNametableAddress(
  address: number,
  mirroring: "horizontal" | "vertical"
): number {
  const offset = address & 0x03ff;
  const table = (address >> 10) & 0x03;
  if (mirroring === "horizontal") {
    const mapped = table < 2 ? 0 : 2;
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

function renderBackgroundPixel(
  state: PpuRenderState,
  scanline: number,
  dot: number,
  scrollX: number,
  scrollY: number
): number | null {
  if ((state.mask & 0x08) === 0) {
    return null;
  }

  const x = dot + scrollX;
  const y = scanline + scrollY;
  const tileX = (x >> 3) & 0x1f;
  const tileY = (y >> 3) & 0x1f;
  const fineY = y & 0x07;
  const fineX = x & 0x07;

  const nametableBase = (state.ctrl & 0x03) * 0x400;
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
    const row = scanline - y;
    if (row >= 0 && row < height) {
      sprites.push({ index: i, y, tile, attr, x });
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

  let tile = sprite.tile;
  let patternRow = row;
  if (height === 16) {
    if (row >= 8) {
      tile |= 1;
      patternRow = row - 8;
    }
  }

  const flipY = (sprite.attr & 0x80) !== 0;
  const flipX = (sprite.attr & 0x40) !== 0;
  const fineY = flipY ? 7 - patternRow : patternRow;
  const fineX = flipX ? col : 7 - col;

  const table = height === 8 ? ((state.ctrl >> 3) & 1) * 0x1000 : (tile & 1) * 0x1000;
  const tileIndex = height === 8 ? tile : tile & 0xfe;
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
  const rowOffset = scanline * 256;
  const sprites = collectSprites(state, scanline);
  const priorityBack = (state.ctrl & 0x20) !== 0;

  for (let dot = 0; dot < 256; dot++) {
    let color = 0;
    const bgColor = renderBackgroundPixel(state, scanline, dot, scrollX, scrollY);
    let spriteColor: number | null = null;
    let spriteIndex = -1;

    if ((state.mask & 0x10) !== 0) {
      for (const sprite of sprites) {
        const pixel = renderSpritePixel(state, scanline, dot, sprite);
        if (pixel !== null) {
          spriteColor = pixel;
          spriteIndex = sprite.index;
          break;
        }
      }
    }

    if (spriteColor !== null && (bgColor === null || priorityBack || spriteIndex === 0)) {
      color = nesColorToRgb(spriteColor);
      if (spriteIndex === 0 && bgColor !== null && dot >= 1 && dot < 255) {
        state.sprite0Hit = true;
      }
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
  for (let scanline = 0; scanline < 240; scanline++) {
    renderScanline(state, scanline, framebuffer, scrollX, scrollY);
  }
}
