import type { MemoryDevice } from "../memory/types";
import { PPU_BASE } from "../machines/generic6502/constants";

export class PPU implements MemoryDevice {
  width = 320;
  height = 240;
  h = 0;
  v = 0;
  data: Uint8Array;
  private baseAddress = PPU_BASE;

  constructor(width = 320, height = 240) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(this.width * this.height);
    this.reset();
  }

  readByte(address: number): number {
    const index = address - this.baseAddress;
    return this.data[index] ?? 0;
  }

  writeByte(address: number, value: number): void {
    const index = address - this.baseAddress;
    if (index >= 0 && index < this.data.length) {
      this.data[index] = value & 0xff;
    }
  }

  clock(): void {}

  reset(): void {
    this.h = 0;
    this.v = 0;
    this.data.fill(0, 0, this.width * this.height);
  }
}
