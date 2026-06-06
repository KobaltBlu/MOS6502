import { describe, expect, it } from "vitest";
import { nesColorToRgb, renderScanline, type PpuRenderState } from "../devices/nes/render";
import { NesPpu } from "../devices/nes/ppu";
import { buildNesMemoryMap } from "../machines/nes/memory-map";
import {
  DOTS_PER_SCANLINE,
  PPUSTATUS_SPRITE0_HIT,
  PPUSTATUS_SPRITE_OVERFLOW,
  PPUSTATUS_VBLANK,
  PRE_RENDER_SCANLINE,
} from "../machines/nes/interrupts";

function packRgba8888(rgb: number): number {
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = rgb & 0xff;
  return ((0xff << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

function createState(overrides: Partial<PpuRenderState> = {}): PpuRenderState {
  const palette = new Uint8Array(32);
  palette[0] = 0x0f;
  palette[1] = 0x02;
  palette[2] = 0x02;
  palette[3] = 0x02;
  palette[0x11] = 0x16;
  palette[0x12] = 0x16;
  palette[0x13] = 0x16;

  return {
    ctrl: 0x00,
    mask: 0x1e,
    vram: new Uint8Array(0x800),
    oam: new Uint8Array(256).fill(0xff),
    palette,
    chrRead: () => 0xff,
    mirroring: "horizontal",
    sprite0Hit: false,
    ...overrides,
  };
}

describe("PPU sprite 0 hit", () => {
  it("sets sprite0Hit when sprite 0 overlaps opaque background", () => {
    const vram = new Uint8Array(0x800);
    vram[0] = 0x01;
    const oam = new Uint8Array(256).fill(0xff);
    oam[0] = 0;
    oam[1] = 0;
    oam[2] = 0;
    oam[3] = 0;

    const state = createState({
      vram,
      oam,
    });

    const framebuffer = new Uint32Array(256 * 240);
    renderScanline(state, 1, framebuffer, 0, 0);
    expect(state.sprite0Hit).toBe(true);
  });

  it("does not render a sprite on the hidden OAM Y line", () => {
    const oam = new Uint8Array(256).fill(0xff);
    oam[0] = 0;
    oam[1] = 0;
    oam[2] = 0;
    oam[3] = 0;
    const state = createState({ mask: 0x14, oam });
    const framebuffer = new Uint32Array(256 * 240);

    renderScanline(state, 0, framebuffer, 0, 0);
    expect(framebuffer[0]).toBe(packRgba8888(nesColorToRgb(0x0f)));

    renderScanline(state, 1, framebuffer, 0, 0);
    expect(framebuffer[256]).toBe(packRgba8888(nesColorToRgb(0x16)));
  });

  it("keeps background in front of sprites with the priority attribute", () => {
    const vram = new Uint8Array(0x800);
    vram[0] = 0x01;
    const oam = new Uint8Array(256).fill(0xff);
    oam[0] = 0;
    oam[1] = 0;
    oam[2] = 0x20;
    oam[3] = 0;
    const state = createState({ vram, oam });
    const framebuffer = new Uint32Array(256 * 240);

    renderScanline(state, 1, framebuffer, 0, 0);

    expect(framebuffer[256]).toBe(packRgba8888(nesColorToRgb(0x02)));
    expect(state.sprite0Hit).toBe(true);
  });

  it("uses the second tile for the lower half of 8x16 sprites", () => {
    const oam = new Uint8Array(256).fill(0xff);
    oam[0] = 0;
    oam[1] = 0x02;
    oam[2] = 0;
    oam[3] = 0;
    const state = createState({
      ctrl: 0x20,
      mask: 0x14,
      oam,
      chrRead: (address) => (address >= 0x30 && address < 0x40 ? 0xff : 0),
    });
    const framebuffer = new Uint32Array(256 * 240);

    renderScanline(state, 8, framebuffer, 0, 0);
    expect(framebuffer[8 * 256]).toBe(packRgba8888(nesColorToRgb(0x0f)));

    renderScanline(state, 9, framebuffer, 0, 0);
    expect(framebuffer[9 * 256]).toBe(packRgba8888(nesColorToRgb(0x16)));
  });

  it("honors left-edge background and sprite masks", () => {
    const vram = new Uint8Array(0x800);
    vram[0] = 0x01;
    vram[1] = 0x01;
    const oam = new Uint8Array(256).fill(0xff);
    oam[0] = 0;
    oam[1] = 0;
    oam[2] = 0;
    oam[3] = 0;
    const state = createState({ mask: 0x18, vram, oam });
    const framebuffer = new Uint32Array(256 * 240);

    renderScanline(state, 1, framebuffer, 0, 0);

    expect(framebuffer[256]).toBe(packRgba8888(nesColorToRgb(0x0f)));
    expect(framebuffer[256 + 8]).toBe(packRgba8888(nesColorToRgb(0x02)));
  });

  it("scrolls background pixels into adjacent nametables", () => {
    const vram = new Uint8Array(0x800);
    vram[0] = 0x01;
    vram[0x400] = 0x02;
    const state = createState({
      mask: 0x0a,
      vram,
      mirroring: "vertical",
      chrRead: (address) => {
        const tile = address >> 4;
        return tile === 2 ? 0xff : 0;
      },
    });
    const framebuffer = new Uint32Array(256 * 240);

    renderScanline(state, 0, framebuffer, 256, 0);

    expect(framebuffer[0]).toBe(packRgba8888(nesColorToRgb(0x02)));
  });
});

describe("PPU VRAM and status registers", () => {
  it("maps horizontal nametable mirrors into 2KB VRAM", () => {
    const ppu = new NesPpu();
    ppu.mirroring = "horizontal";

    ppu.writeByte(0x2006, 0x28);
    ppu.writeByte(0x2006, 0x00);
    ppu.writeByte(0x2007, 0xab);

    ppu.writeByte(0x2006, 0x2c);
    ppu.writeByte(0x2006, 0x00);
    expect(ppu.readByte(0x2007)).toBe(0x00);
    expect(ppu.readByte(0x2007)).toBe(0xab);
  });

  it("mirrors universal background palette addresses both ways", () => {
    const ppu = new NesPpu();

    ppu.writeByte(0x2006, 0x3f);
    ppu.writeByte(0x2006, 0x00);
    ppu.writeByte(0x2007, 0x12);
    ppu.writeByte(0x2006, 0x3f);
    ppu.writeByte(0x2006, 0x10);
    expect(ppu.readByte(0x2007)).toBe(0x12);

    ppu.writeByte(0x2006, 0x3f);
    ppu.writeByte(0x2006, 0x10);
    ppu.writeByte(0x2007, 0x23);
    ppu.writeByte(0x2006, 0x3f);
    ppu.writeByte(0x2006, 0x00);
    expect(ppu.readByte(0x2007)).toBe(0x23);
  });

  it("clears the readable vblank flag after PPUSTATUS is read", () => {
    const ppu = new NesPpu();
    ppu.scanline = 241;
    ppu.registers[2] = PPUSTATUS_VBLANK;

    expect(ppu.readByte(0x2002) & PPUSTATUS_VBLANK).toBe(PPUSTATUS_VBLANK);
    expect(ppu.readByte(0x2002) & PPUSTATUS_VBLANK).toBe(0);
  });

  it("does not clear sprite hit or overflow when PPUSTATUS is read", () => {
    const ppu = new NesPpu();
    ppu.sprite0Hit = true;
    ppu.registers[2] = PPUSTATUS_VBLANK | PPUSTATUS_SPRITE_OVERFLOW;

    const firstRead = ppu.readByte(0x2002);
    expect(firstRead & PPUSTATUS_SPRITE0_HIT).toBe(PPUSTATUS_SPRITE0_HIT);
    expect(firstRead & PPUSTATUS_SPRITE_OVERFLOW).toBe(PPUSTATUS_SPRITE_OVERFLOW);

    const secondRead = ppu.readByte(0x2002);
    expect(secondRead & PPUSTATUS_VBLANK).toBe(0);
    expect(secondRead & PPUSTATUS_SPRITE0_HIT).toBe(PPUSTATUS_SPRITE0_HIT);
    expect(secondRead & PPUSTATUS_SPRITE_OVERFLOW).toBe(PPUSTATUS_SPRITE_OVERFLOW);
  });

  it("clears sprite hit and overflow at the pre-render scanline", () => {
    const ppu = new NesPpu();
    ppu.scanline = PRE_RENDER_SCANLINE - 1;
    ppu.dot = DOTS_PER_SCANLINE - 1;
    ppu.sprite0Hit = true;
    ppu.registers[2] = PPUSTATUS_VBLANK | PPUSTATUS_SPRITE_OVERFLOW;

    ppu.tickCycle();

    expect(ppu.scanline).toBe(PRE_RENDER_SCANLINE);
    expect(ppu.sprite0Hit).toBe(false);
    expect(ppu.registers[2] & (PPUSTATUS_VBLANK | PPUSTATUS_SPRITE_OVERFLOW)).toBe(0);
  });

  it("starts OAM DMA at the current OAMADDR and wraps", () => {
    const { memoryMap, ppu } = buildNesMemoryMap();
    memoryMap.writeByte(0x0200, 0xa0);
    memoryMap.writeByte(0x0201, 0xa1);
    memoryMap.writeByte(0x0202, 0xa2);

    memoryMap.writeByte(0x2003, 0xfe);
    memoryMap.writeByte(0x4014, 0x02);

    expect(ppu.oam[0xfe]).toBe(0xa0);
    expect(ppu.oam[0xff]).toBe(0xa1);
    expect(ppu.oam[0x00]).toBe(0xa2);
  });

  it("buffers PPUDATA reads outside palette space", () => {
    const ppu = new NesPpu();
    ppu.writeByte(0x2006, 0x20);
    ppu.writeByte(0x2006, 0x00);
    ppu.writeByte(0x2007, 0x44);

    ppu.writeByte(0x2006, 0x20);
    ppu.writeByte(0x2006, 0x00);
    expect(ppu.readByte(0x2007)).toBe(0x00);
    expect(ppu.readByte(0x2007)).toBe(0x44);
  });

  it("returns palette PPUDATA reads immediately", () => {
    const ppu = new NesPpu();
    ppu.writeByte(0x2006, 0x3f);
    ppu.writeByte(0x2006, 0x01);
    ppu.writeByte(0x2007, 0x2a);

    ppu.writeByte(0x2006, 0x3f);
    ppu.writeByte(0x2006, 0x01);
    expect(ppu.readByte(0x2007)).toBe(0x2a);
  });

  it("writes CHR-RAM through PPUDATA pattern-table addresses", () => {
    const { memoryMap, cartridge } = buildNesMemoryMap();
    const rom = new Uint8Array(16 + 0x4000);
    rom[0] = 0x4e;
    rom[1] = 0x45;
    rom[2] = 0x53;
    rom[3] = 0x1a;
    rom[4] = 1;
    rom[5] = 0;
    cartridge.loadINES(rom);

    memoryMap.writeByte(0x2006, 0x00);
    memoryMap.writeByte(0x2006, 0x12);
    memoryMap.writeByte(0x2007, 0x66);

    expect(cartridge.readChr(0x0012)).toBe(0x66);
  });
});
