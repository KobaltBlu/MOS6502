import type { MemoryDevice } from "../../memory/types";
import { PPU_REG_BASE } from "../../machines/nes/constants";
import {
  DOTS_PER_SCANLINE,
  PPUCTRL_NMI_ENABLE,
  PPUSTATUS_SPRITE0_HIT,
  PPUSTATUS_SPRITE_OVERFLOW,
  PPUSTATUS_VBLANK,
  PRE_RENDER_SCANLINE,
  SCANLINES_PER_FRAME,
  VBLANK_SCANLINE,
  VISIBLE_SCANLINES,
} from "../../machines/nes/interrupts";
import { renderFrame, renderScanline, type PpuRenderState } from "./render";

const DEBUG_PPU_SCROLL = false;

export type ChrReadCallback = (address: number) => number;
export type ChrWriteCallback = (address: number, value: number) => void;

export class NesPpu implements MemoryDevice {
  registers = new Uint8Array(8);
  vram = new Uint8Array(0x800);
  oam = new Uint8Array(256);
  palette = new Uint8Array(32);

  scanline = 0;
  dot = 0;
  ppuCycle = 0;
  frameReady = false;
  nmiRequested = false;
  sprite0Hit = false;

  framebuffer = new Uint32Array(256 * 240);
  chrRead: ChrReadCallback = () => 0;
  chrWrite: ChrWriteCallback = () => {};
  mirroring: "horizontal" | "vertical" = "horizontal";

  private baseAddress = PPU_REG_BASE;
  private oamAddress = 0;

  private v = 0;
  private t = 0;
  private x = 0;
  private w = false;

  private vramReadBuffer = 0;

  private pendingSprite0HitScanline = -1;
  private pendingSprite0HitDot = -1;

  readByte(address: number): number {
    const index = (address & 0x2007) - this.baseAddress;

    if (index < 0 || index >= this.registers.length) {
      return 0;
    }

    switch (index) {
      case 2: {
        let status =
          this.registers[2] &
          (0x1f | PPUSTATUS_VBLANK | PPUSTATUS_SPRITE_OVERFLOW);

        if (this.sprite0Hit) {
          status |= PPUSTATUS_SPRITE0_HIT;
        }

        this.registers[2] &= ~PPUSTATUS_VBLANK;
        this.w = false;

        return status;
      }

      case 4:
        return this.oam[this.oamAddress & 0xff];

      case 7: {
        const addr = this.v & 0x3fff;
        const value = this.readPpuData(addr);
        this.v = (this.v + this.vramIncrement()) & 0x7fff;
        return value;
      }

      default:
        return this.registers[index];
    }
  }

  writeByte(address: number, value: number): void {
    const index = (address & 0x2007) - this.baseAddress;

    if (index < 0 || index >= this.registers.length) {
      return;
    }

    value &= 0xff;

    switch (index) {
      case 0:
        this.registers[0] = value;
        this.t = (this.t & 0xf3ff) | ((value & 0x03) << 10);
        break;

      case 1:
        this.registers[1] = value;
        break;

      case 3:
        this.registers[3] = value;
        this.oamAddress = value;
        break;

      case 4:
        this.oam[this.oamAddress++ & 0xff] = value;
        break;

      case 5:
        if (!this.w) {
          this.t = (this.t & 0xffe0) | ((value >> 3) & 0x1f);
          this.x = value & 0x07;
        } else {
          this.t =
            (this.t & 0x8c1f) |
            ((value & 0x07) << 12) |
            ((value & 0xf8) << 2);
        }

        this.w = !this.w;
        break;

      case 6:
        if (!this.w) {
          this.t = (this.t & 0x00ff) | ((value & 0x3f) << 8);
        } else {
          this.t = (this.t & 0xff00) | value;
          this.v = this.t;
        }

        this.w = !this.w;
        break;

      case 7:
        this.writeVramInternal(this.v, value);
        this.v = (this.v + this.vramIncrement()) & 0x7fff;
        break;

      default:
        this.registers[index] = value;
        break;
    }
  }

  writeOamByte(index: number, value: number): void {
    this.oam[index & 0xff] = value & 0xff;
  }

  writeOamDmaByte(offset: number, value: number): void {
    this.oam[(this.oamAddress + offset) & 0xff] = value & 0xff;
  }

  isNmiEnabled(): boolean {
    return (this.registers[0] & PPUCTRL_NMI_ENABLE) !== 0;
  }

  isInVblank(): boolean {
    return this.scanline >= VBLANK_SCANLINE && this.scanline < PRE_RENDER_SCANLINE;
  }

  consumeNmiRequest(): boolean {
    if (!this.nmiRequested) {
      return false;
    }

    this.nmiRequested = false;
    return true;
  }

  tickCycle(): void {
    this.ppuCycle++;

    if (this.scanline < VISIBLE_SCANLINES && this.dot === 1) {
      this.renderCurrentScanline();
    }

    if (
      !this.sprite0Hit &&
      this.scanline === this.pendingSprite0HitScanline &&
      this.dot >= this.pendingSprite0HitDot
    ) {
      this.sprite0Hit = true;
      this.registers[2] |= PPUSTATUS_SPRITE0_HIT;
    }

    this.updateScrollCounters();

    this.dot++;

    if (this.dot >= DOTS_PER_SCANLINE) {
      this.dot = 0;
      this.scanline++;

      if (this.scanline === VBLANK_SCANLINE) {
        this.registers[2] |= PPUSTATUS_VBLANK;

        if (this.isNmiEnabled()) {
          this.nmiRequested = true;
        }
      }

      if (this.scanline === PRE_RENDER_SCANLINE) {
        this.registers[2] &= ~(
          PPUSTATUS_VBLANK |
          PPUSTATUS_SPRITE0_HIT |
          PPUSTATUS_SPRITE_OVERFLOW
        );

        this.sprite0Hit = false;
        this.pendingSprite0HitScanline = -1;
        this.pendingSprite0HitDot = -1;
      }

      if (this.scanline >= SCANLINES_PER_FRAME) {
        this.scanline = 0;
        this.frameReady = true;
      }
    }
  }

  clock(): void {
    this.tickCycle();
  }

  consumeFrameReady(): boolean {
    if (!this.frameReady) {
      return false;
    }

    this.frameReady = false;
    return true;
  }

  reset(): void {
    this.registers.fill(0);
    this.vram.fill(0);
    this.oam.fill(0);
    this.palette.fill(0);

    this.scanline = 0;
    this.dot = 0;
    this.ppuCycle = 0;
    this.frameReady = false;
    this.nmiRequested = false;
    this.sprite0Hit = false;

    this.framebuffer.fill(0);

    this.oamAddress = 0;

    this.v = 0;
    this.t = 0;
    this.x = 0;
    this.w = false;

    this.vramReadBuffer = 0;

    this.pendingSprite0HitScanline = -1;
    this.pendingSprite0HitDot = -1;
  }

  private renderCurrentScanline(): void {
    const state: PpuRenderState = {
      ctrl: this.registers[0],
      mask: this.registers[1],
      vram: this.vram,
      oam: this.oam,
      palette: this.palette,
      chrRead: this.chrRead,
      mirroring: this.mirroring,
      scrollV: this.v,
      fineX: this.x,
      sprite0Hit: false,
      sprite0HitScanline: -1,
      sprite0HitDot: -1,
    };

    renderScanline(state, this.scanline, this.framebuffer);

    if (state.sprite0Hit && state.sprite0HitScanline === this.scanline) {
      this.pendingSprite0HitScanline = state.sprite0HitScanline;
      this.pendingSprite0HitDot = state.sprite0HitDot;

      if (DEBUG_PPU_SCROLL) {
        console.log("sprite0 hit at", {
          scanline: state.sprite0HitScanline,
          dot: state.sprite0HitDot,
          v: this.v,
          t: this.t,
          x: this.x,
        });
      }
    }
  }

  private updateScrollCounters(): void {
    if (!this.renderingEnabled()) {
      return;
    }

    const visibleOrPreRender =
      this.scanline < VISIBLE_SCANLINES ||
      this.scanline === PRE_RENDER_SCANLINE;

    if (!visibleOrPreRender) {
      return;
    }

    // if (
    //   (this.dot >= 1 && this.dot <= 256) ||
    //   (this.dot >= 321 && this.dot <= 336)
    // ) {
    //   if ((this.dot & 0x07) === 0) {
    //     this.incrementHorizontalV();
    //   }
    // }

    if (this.dot === 256) {
      this.incrementVerticalV();
    }

    if (this.dot === 257) {
      this.copyHorizontalTToV();
    }

    if (
      this.scanline === PRE_RENDER_SCANLINE &&
      this.dot >= 280 &&
      this.dot <= 304
    ) {
      this.copyVerticalTToV();
    }
  }

  private renderingEnabled(): boolean {
    return (this.registers[1] & 0x18) !== 0;
  }

  private incrementHorizontalV(): void {
    if ((this.v & 0x001f) === 31) {
      this.v &= ~0x001f;
      this.v ^= 0x0400;
    } else {
      this.v++;
    }
  }

  private incrementVerticalV(): void {
    if ((this.v & 0x7000) !== 0x7000) {
      this.v += 0x1000;
      return;
    }

    this.v &= ~0x7000;

    let coarseY = (this.v & 0x03e0) >> 5;

    if (coarseY === 29) {
      coarseY = 0;
      this.v ^= 0x0800;
    } else if (coarseY === 31) {
      coarseY = 0;
    } else {
      coarseY++;
    }

    this.v = (this.v & ~0x03e0) | (coarseY << 5);
  }

  private copyHorizontalTToV(): void {
    this.v = (this.v & 0xfbe0) | (this.t & 0x041f);
  }

  private copyVerticalTToV(): void {
    this.v = (this.v & 0x841f) | (this.t & 0x7be0);
  }

  private vramIncrement(): number {
    return (this.registers[0] & 0x04) ? 32 : 1;
  }

  private mirrorNametableAddress(address: number): number {
    const offset = address & 0x03ff;
    const table = (address >> 10) & 0x03;

    if (this.mirroring === "horizontal") {
      const mapped = table < 2 ? 0 : 1;
      return mapped * 0x400 + offset;
    }

    const mapped = table & 1;
    return mapped * 0x400 + offset;
  }

  private readVramInternal(address: number): number {
    const addr = address & 0x3fff;

    if (addr >= 0x3f00) {
      const paletteIndex = this.normalizePaletteIndex(addr);
      return this.palette[paletteIndex] & 0x3f;
    }

    if (addr < 0x2000) {
      return this.chrRead(addr);
    }

    const mirrored = this.mirrorNametableAddress(addr);
    return this.vram[mirrored] ?? 0;
  }

  private writeVramInternal(address: number, value: number): void {
    const addr = address & 0x3fff;

    if (addr >= 0x3f00) {
      const paletteIndex = this.normalizePaletteIndex(addr);
      this.palette[paletteIndex] = value & 0x3f;
      return;
    }

    if (addr < 0x2000) {
      this.chrWrite(addr, value & 0xff);
      return;
    }

    const mirrored = this.mirrorNametableAddress(addr);
    this.vram[mirrored] = value & 0xff;
  }

  private normalizePaletteIndex(address: number): number {
    const paletteIndex = address & 0x1f;

    if (paletteIndex >= 0x10 && (paletteIndex & 0x03) === 0) {
      return paletteIndex - 0x10;
    }

    return paletteIndex;
  }

  private readPpuData(address: number): number {
    const addr = address & 0x3fff;
    const value = this.readVramInternal(addr);

    if (addr >= 0x3f00) {
      this.vramReadBuffer = this.readVramInternal(addr - 0x1000);
      return value;
    }

    const buffered = this.vramReadBuffer;
    this.vramReadBuffer = value;
    return buffered;
  }
}

export function renderFullFrame(ppu: NesPpu): void {
  const state: PpuRenderState = {
    ctrl: ppu.registers[0],
    mask: ppu.registers[1],
    vram: ppu.vram,
    oam: ppu.oam,
    palette: ppu.palette,
    chrRead: ppu.chrRead,
    mirroring: ppu.mirroring,
    scrollV: 0,
    fineX: 0,
    sprite0Hit: false,
    sprite0HitScanline: -1,
    sprite0HitDot: -1,
  };

  renderFrame(state, ppu.framebuffer);

  if (state.sprite0Hit) {
    ppu.sprite0Hit = true;
  }
}