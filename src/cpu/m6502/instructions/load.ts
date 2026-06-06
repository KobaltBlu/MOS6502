import type { MemoryMap } from "../../../memory/memory-map";
import { setZeroNegative } from "../../flags";

function pageCrossed(base: number, offset: number): boolean {
  return (base & 0xff00) !== (offset & 0xff00);
}

export const loadInstructions = {
  LDA(memory: MemoryMap, address: number): number {
    this.accumulator = address;
    setZeroNegative(this, this.accumulator);
    return 2;
  },
  LDA_ABS(memory: MemoryMap, address: number): number {
    this.accumulator = memory.readByte(address);
    setZeroNegative(this, this.accumulator);
    return 4;
  },
  LDA_ABS_X(memory: MemoryMap, address: number): number {
    const offset = address + this.regX;
    this.accumulator = memory.readByte(offset & 0xffff);
    setZeroNegative(this, this.accumulator);
    if (pageCrossed(address, offset)) {
      return 5;
    }
    return 4;
  },
  LDA_ABS_Y(memory: MemoryMap, address: number): number {
    const offset = address + this.regY;
    this.accumulator = memory.readByte(offset & 0xffff);
    setZeroNegative(this, this.accumulator);
    if (pageCrossed(address, offset)) {
      return 5;
    }
    return 4;
  },
  LDA_ZP(memory: MemoryMap, address: number): number {
    this.accumulator = memory.readByte(address);
    setZeroNegative(this, this.accumulator);
    return 3;
  },
  LDA_ZP_X(memory: MemoryMap, address: number): number {
    this.accumulator = memory.readByte((address + this.regX) & 0xff);
    setZeroNegative(this, this.accumulator);
    return 4;
  },
  LDA_ZP_XI(memory: MemoryMap, address: number): number {
    const ptr = (address + this.regX) & 0xff;
    const addr = memory.readByte(ptr) | (memory.readByte((ptr + 1) & 0xff) << 8);
    this.accumulator = memory.readByte(addr);
    setZeroNegative(this, this.accumulator);
    return 6;
  },
  LDA_ZP_YI(memory: MemoryMap, address: number): number {
    const lo = memory.readByte(address);
    const hi = memory.readByte((address + 1) & 0xff);
    const base = lo | (hi << 8);
    const addr = base + this.regY;
    this.accumulator = memory.readByte(addr & 0xffff);
    setZeroNegative(this, this.accumulator);
    if ((base & 0xff00) !== (addr & 0xff00)) {
      return 6;
    }
    return 5;
  },
  LDX(memory: MemoryMap, address: number): number {
    this.regX = address;
    setZeroNegative(this, this.regX);
    return 2;
  },
  LDX_ABS(memory: MemoryMap, address: number): number {
    this.regX = memory.readByte(address);
    setZeroNegative(this, this.regX);
    return 4;
  },
  LDX_ABS_Y(memory: MemoryMap, address: number): number {
    const offset = address + this.regY;
    this.regX = memory.readByte(offset & 0xffff);
    setZeroNegative(this, this.regX);
    if (pageCrossed(address, offset)) {
      return 5;
    }
    return 4;
  },
  LDX_ZP(memory: MemoryMap, address: number): number {
    this.regX = memory.readByte(address);
    setZeroNegative(this, this.regX);
    return 3;
  },
  LDX_ZP_Y(memory: MemoryMap, address: number): number {
    this.regX = memory.readByte((address + this.regY) & 0xff);
    setZeroNegative(this, this.regX);
    return 4;
  },
  LDY(memory: MemoryMap, address: number): number {
    this.regY = address;
    setZeroNegative(this, this.regY);
    return 2;
  },
  LDY_ABS(memory: MemoryMap, address: number): number {
    this.regY = memory.readByte(address);
    setZeroNegative(this, this.regY);
    return 4;
  },
  LDY_ABS_X(memory: MemoryMap, address: number): number {
    const offset = address + this.regX;
    this.regY = memory.readByte(offset & 0xffff);
    setZeroNegative(this, this.regY);
    if (pageCrossed(address, offset)) {
      return 5;
    }
    return 4;
  },
  LDY_ZP(memory: MemoryMap, address: number): number {
    this.regY = memory.readByte(address);
    setZeroNegative(this, this.regY);
    return 3;
  },
  LDY_ZP_X(memory: MemoryMap, address: number): number {
    this.regY = memory.readByte((address + this.regX) & 0xff);
    setZeroNegative(this, this.regY);
    return 4;
  },
};
