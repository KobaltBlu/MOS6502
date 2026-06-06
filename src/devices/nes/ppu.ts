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

export type ChrReadCallback = (address: number) => number;

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
  mirroring: "horizontal" | "vertical" = "horizontal";

  private baseAddress = PPU_REG_BASE;
  private addressLatch = false;
  private oamAddress = 0;
  private scrollLatch = false;
  private scrollX = 0;
  private scrollY = 0;
  private ppuAddr = 0;

  readByte(address: number): number {
    const index = (address & 0x2007) - this.baseAddress;
    if (index < 0 || index >= this.registers.length) {
      return 0;
    }

    switch (index) {
      case 2: {
        let status = this.registers[2] & 0x1f;
        if (this.sprite0Hit) {
          status |= PPUSTATUS_SPRITE0_HIT;
        }
        if (this.isInVblank()) {
          status |= PPUSTATUS_VBLANK;
        }
        this.registers[2] &= ~(PPUSTATUS_VBLANK | PPUSTATUS_SPRITE0_HIT | PPUSTATUS_SPRITE_OVERFLOW);
        this.sprite0Hit = false;
        this.addressLatch = false;
        return status;
      }
      case 4:
        return this.oam[this.oamAddress++ & 0xff];
      case 7: {
        const value = this.readVramInternal(this.ppuAddr);
        this.ppuAddr = (this.ppuAddr + this.vramIncrement()) & 0x3fff;
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
      case 1:
      case 3:
        this.registers[index] = value;
        if (index === 3) {
          this.oamAddress = value;
        }
        break;
      case 4:
        this.oam[this.oamAddress++ & 0xff] = value;
        break;
      case 5:
        if (!this.scrollLatch) {
          this.scrollX = value;
        } else {
          this.scrollY = value;
        }
        this.scrollLatch = !this.scrollLatch;
        break;
      case 6:
        if (!this.addressLatch) {
          this.ppuAddr = (this.ppuAddr & 0x00ff) | ((value & 0x3f) << 8);
        } else {
          this.ppuAddr = (this.ppuAddr & 0xff00) | value;
          this.ppuAddr &= 0x3fff;
        }
        this.addressLatch = !this.addressLatch;
        break;
      case 7:
        this.writeVramInternal(this.ppuAddr, value);
        this.ppuAddr = (this.ppuAddr + this.vramIncrement()) & 0x3fff;
        break;
      default:
        this.registers[index] = value;
    }
  }

  writeOamByte(index: number, value: number): void {
    this.oam[index & 0xff] = value & 0xff;
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

    if (this.scanline < VISIBLE_SCANLINES && this.dot === 0) {
      this.renderCurrentScanline();
    }

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
    this.addressLatch = false;
    this.scrollLatch = false;
    this.scrollX = 0;
    this.scrollY = 0;
    this.ppuAddr = 0;
    this.oamAddress = 0;
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
      sprite0Hit: false,
    };

    renderScanline(state, this.scanline, this.framebuffer, this.scrollX, this.scrollY);
    if (state.sprite0Hit) {
      this.sprite0Hit = true;
    }
  }

  private vramIncrement(): number {
    return (this.registers[0] & 0x04) ? 32 : 1;
  }

  private mirrorNametableAddress(address: number): number {
    const offset = address & 0x03ff;
    const table = (address >> 10) & 0x03;
    if (this.mirroring === "horizontal") {
      const mapped = table < 2 ? 0 : 2;
      return mapped * 0x400 + offset;
    }
    const mapped = table & 1;
    return mapped * 0x400 + offset;
  }

  private readVramInternal(address: number): number {
    const addr = address & 0x3fff;
    if (addr >= 0x3f00) {
      const paletteIndex = addr & 0x1f;
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
      const paletteIndex = addr & 0x1f;
      this.palette[paletteIndex] = value & 0x3f;
      if (paletteIndex >= 0x10 && (paletteIndex & 0x03) === 0) {
        this.palette[paletteIndex - 0x10] = value & 0x3f;
      }
      return;
    }
    if (addr < 0x2000) {
      return;
    }
    const mirrored = this.mirrorNametableAddress(addr);
    this.vram[mirrored] = value & 0xff;
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
    sprite0Hit: false,
  };
  renderFrame(state, ppu.framebuffer);
  if (state.sprite0Hit) {
    ppu.sprite0Hit = true;
  }
}
