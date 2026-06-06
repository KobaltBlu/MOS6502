import type { MemoryMap } from "../../memory/memory-map";
import type { NesPpu } from "../../devices/nes/ppu";

export const OAM_DMA_ADDRESS = 0x4014;
export const OAM_DMA_STALL_CYCLES = 513;

export class OamDma {
  stallCycles = 0;

  trigger(page: number, memoryMap: MemoryMap, ppu: NesPpu): void {
    const base = (page & 0xff) << 8;
    for (let i = 0; i < 256; i++) {
      ppu.writeOamDmaByte(i, memoryMap.readByte(base + i));
    }
    this.stallCycles = OAM_DMA_STALL_CYCLES;
  }

  isStalled(): boolean {
    return this.stallCycles > 0;
  }

  tick(): void {
    if (this.stallCycles > 0) {
      this.stallCycles--;
    }
  }

  reset(): void {
    this.stallCycles = 0;
  }
}
