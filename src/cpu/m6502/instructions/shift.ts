import type { MemoryMap } from '../../../memory/memory-map';
import { setZeroNegative } from '../../flags';

function pageCrossed(base: number, offset: number): boolean {
  return (base & 0xff00) !== (offset & 0xff00);
}

function applyEor(cpu: { accumulator: number; status: number; FLAG_Z: number; FLAG_N: number }, value: number): void {
  cpu.accumulator ^= value;
  setZeroNegative(cpu, cpu.accumulator);
}

function aslValue(cpu: { status: number; FLAG_C: number }, value: number): number {
  cpu.status &= ~cpu.FLAG_C;
  if (value & 0x80) {
    cpu.status |= cpu.FLAG_C;
  }
  return (value << 1) & 0xff;
}

export const shiftInstructions = {
  EOR(_memory: MemoryMap, address: number): number {
    applyEor(this, address);
    return 2;
  },
  EOR_ABS(memory: MemoryMap, address: number): number {
    applyEor(this, memory.readByte(address));
    return 4;
  },
  EOR_ABS_X(memory: MemoryMap, address: number): number {
    const offset = address + this.regX;
    applyEor(this, memory.readByte(offset));
    if (pageCrossed(address, offset)) {
      return 5;
    }
    return 4;
  },
  EOR_ABS_Y(memory: MemoryMap, address: number): number {
    const offset = address + this.regY;
    applyEor(this, memory.readByte(offset));
    if (pageCrossed(address, offset)) {
      return 5;
    }
    return 4;
  },
  EOR_ZP(memory: MemoryMap, address: number): number {
    applyEor(this, memory.readByte(address));
    return 3;
  },
  EOR_ZP_X(memory: MemoryMap, address: number): number {
    applyEor(this, memory.readByte((address + this.regX) & 0xff));
    return 4;
  },
  EOR_ZP_XI(memory: MemoryMap, address: number): number {
    const ptr = (address + this.regX) & 0xff;
    const addr = memory.readByte(ptr) | (memory.readByte((ptr + 1) & 0xff) << 8);
    applyEor(this, memory.readByte(addr));
    return 6;
  },
  EOR_ZP_YI(memory: MemoryMap, address: number): number {
    const lo = memory.readByte(address);
    const hi = memory.readByte((address + 1) & 0xff);
    const base = lo | (hi << 8);
    const addr = base + this.regY;
    applyEor(this, memory.readByte(addr & 0xffff));
    if ((base & 0xff00) !== (addr & 0xff00)) {
      return 5;
    }
    return 4;
  },
  CLC(): number {
    this.status &= ~this.FLAG_C;
    return 2;
  },
  CLD(): number {
    this.status &= ~this.FLAG_D;
    return 2;
  },
  CLI(): number {
    this.status &= ~this.FLAG_I;
    return 2;
  },
  CLV(): number {
    this.status &= ~this.FLAG_V;
    return 2;
  },
  LSR(): number {
    this.status &= ~this.FLAG_C;
    if (this.accumulator & 0x01) {
      this.status |= this.FLAG_C;
    }
    this.accumulator = this.accumulator >> 1;
    this.status &= ~this.FLAG_N;
    setZeroNegative(this, this.accumulator);
    return 2;
  },
  LSR_ABS(memory: MemoryMap, address: number): number {
    const value = memory.readByte(address);
    this.status &= ~this.FLAG_C;
    if (value & 0x01) {
      this.status |= this.FLAG_C;
    }
    const result = value >> 1;
    memory.writeByte(address, result);
    this.status &= ~this.FLAG_N;
    setZeroNegative(this, result);
    return 6;
  },
  LSR_ABS_X(memory: MemoryMap, address: number): number {
    const addr = address + this.regX;
    const value = memory.readByte(addr);
    this.status &= ~this.FLAG_C;
    if (value & 0x01) {
      this.status |= this.FLAG_C;
    }
    const result = value >> 1;
    memory.writeByte(addr, result);
    this.status &= ~this.FLAG_N;
    setZeroNegative(this, result);
    return 7;
  },
  LSR_ZP(memory: MemoryMap, address: number): number {
    const value = memory.readByte(address);
    this.status &= ~this.FLAG_C;
    if (value & 0x01) {
      this.status |= this.FLAG_C;
    }
    const result = value >> 1;
    memory.writeByte(address, result);
    this.status &= ~this.FLAG_N;
    setZeroNegative(this, result);
    return 5;
  },
  LSR_ZP_X(memory: MemoryMap, address: number): number {
    const addr = (address + this.regX) & 0xff;
    const value = memory.readByte(addr);
    this.status &= ~this.FLAG_C;
    if (value & 0x01) {
      this.status |= this.FLAG_C;
    }
    const result = value >> 1;
    memory.writeByte(addr, result);
    this.status &= ~this.FLAG_N;
    setZeroNegative(this, result);
    return 6;
  },
  ASL(): number {
    this.accumulator = aslValue(this, this.accumulator);
    setZeroNegative(this, this.accumulator);
    return 2;
  },
  ASL_ABS(memory: MemoryMap, address: number): number {
    const result = aslValue(this, memory.readByte(address));
    memory.writeByte(address, result);
    setZeroNegative(this, result);
    return 6;
  },
  ASL_ABS_X(memory: MemoryMap, address: number): number {
    const addr = address + this.regX;
    const result = aslValue(this, memory.readByte(addr));
    memory.writeByte(addr, result);
    setZeroNegative(this, result);
    return 7;
  },
  ASL_ZP(memory: MemoryMap, address: number): number {
    const result = aslValue(this, memory.readByte(address));
    memory.writeByte(address, result);
    setZeroNegative(this, result);
    return 5;
  },
  ASL_ZP_X(memory: MemoryMap, address: number): number {
    const addr = (address + this.regX) & 0xff;
    const result = aslValue(this, memory.readByte(addr));
    memory.writeByte(addr, result);
    setZeroNegative(this, result);
    return 6;
  },
  ASR(): number {
    return this.ASL();
  },
  ASR_ABS(memory: MemoryMap, address: number): number {
    return this.ASL_ABS(memory, address);
  },
  ASR_ABS_X(memory: MemoryMap, address: number): number {
    return this.ASL_ABS_X(memory, address);
  },
  ASR_ZP(memory: MemoryMap, address: number): number {
    return this.ASL_ZP(memory, address);
  },
  ASR_ZP_X(memory: MemoryMap, address: number): number {
    return this.ASL_ZP_X(memory, address);
  },
};
