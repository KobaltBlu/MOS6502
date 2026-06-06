import type { MemoryDevice } from "./types";

export class MirrorDevice implements MemoryDevice {
  constructor(
    private backing: MemoryDevice,
    private regionStart: number,
    private regionEnd: number,
    private mirrorMask: number
  ) {}

  readByte(address: number): number {
    if (address < this.regionStart || address > this.regionEnd) {
      return 0;
    }
    return this.backing.readByte(address & this.mirrorMask);
  }

  writeByte(address: number, value: number): void {
    if (address < this.regionStart || address > this.regionEnd) {
      return;
    }
    this.backing.writeByte(address & this.mirrorMask, value);
  }

  readShortLE(address: number): number {
    const low = this.readByte(address);
    const high = this.readByte(address + 1);
    return (high << 8) | low;
  }

  writeShortLE(address: number, value: number): void {
    this.writeByte(address, value & 0xff);
    this.writeByte(address + 1, (value >> 8) & 0xff);
  }
}
