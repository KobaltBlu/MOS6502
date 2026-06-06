import type { MemoryMap } from '../../../memory/memory-map';

function writeIndirectX(memory: MemoryMap, zp: number, regX: number, value: number): void {
  const ptr = (zp + regX) & 0xff;
  const addr = memory.readByte(ptr) | (memory.readByte((ptr + 1) & 0xff) << 8);
  memory.writeByte(addr, value);
}

function writeIndirectY(memory: MemoryMap, zp: number, regY: number, value: number): number {
  const lo = memory.readByte(zp);
  const hi = memory.readByte((zp + 1) & 0xff);
  const base = lo | (hi << 8);
  const addr = (base + regY) & 0xffff;
  memory.writeByte(addr, value);
  return base;
}

export const storeInstructions = {
  STA_ABS(memory: MemoryMap, address: number): number {
    memory.writeByte(address, this.accumulator);
    return 4;
  },
  STA_ABS_X(memory: MemoryMap, address: number): number {
    memory.writeByte(address + this.regX, this.accumulator);
    return 5;
  },
  STA_ABS_Y(memory: MemoryMap, address: number): number {
    memory.writeByte(address + this.regY, this.accumulator);
    return 5;
  },
  STA_ZP(memory: MemoryMap, address: number): number {
    memory.writeByte(address, this.accumulator);
    return 3;
  },
  STA_ZP_X(memory: MemoryMap, address: number): number {
    memory.writeByte((address + this.regX) & 0xff, this.accumulator);
    return 4;
  },
  STA_ZP_XI(memory: MemoryMap, address: number): number {
    writeIndirectX(memory, address, this.regX, this.accumulator);
    return 6;
  },
  STA_ZP_YI(memory: MemoryMap, address: number): number {
    writeIndirectY(memory, address, this.regY, this.accumulator);
    return 6;
  },
  STX_ABS(memory: MemoryMap, address: number): number {
    memory.writeByte(address, this.regX);
    return 4;
  },
  STX_ZP(memory: MemoryMap, address: number): number {
    memory.writeByte(address, this.regX);
    return 3;
  },
  STX_ZPY(memory: MemoryMap, address: number): number {
    memory.writeByte((address + this.regY) & 0xff, this.regX);
    return 4;
  },
  STY_ABS(memory: MemoryMap, address: number): number {
    memory.writeByte(address, this.regY);
    return 4;
  },
  STY_ZP(memory: MemoryMap, address: number): number {
    memory.writeByte(address, this.regY);
    return 3;
  },
  STY_ZPX(memory: MemoryMap, address: number): number {
    memory.writeByte((address + this.regX) & 0xff, this.regY);
    return 4;
  },
};
