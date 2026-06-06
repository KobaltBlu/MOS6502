import type { MemoryMap } from '../../../memory/memory-map';
import { setZeroNegative } from '../../flags';

function rolValue(cpu: { status: number; FLAG_C: number }, value: number): number {
  const carryIn = (cpu.status & cpu.FLAG_C) ? 1 : 0;
  cpu.status &= ~cpu.FLAG_C;
  if (value & 0x80) {
    cpu.status |= cpu.FLAG_C;
  }
  return ((value << 1) | carryIn) & 0xff;
}

function rorValue(cpu: { status: number; FLAG_C: number }, value: number): number {
  const carryIn = (cpu.status & cpu.FLAG_C) ? 0x80 : 0;
  cpu.status &= ~cpu.FLAG_C;
  if (value & 0x01) {
    cpu.status |= cpu.FLAG_C;
  }
  return ((value >> 1) | carryIn) & 0xff;
}

export const rotateInstructions = {
  ROL(): number {
    this.accumulator = rolValue(this, this.accumulator);
    setZeroNegative(this, this.accumulator);
    return 2;
  },
  ROL_ABS(memory: MemoryMap, address: number): number {
    const value = rolValue(this, memory.readByte(address));
    memory.writeByte(address, value);
    setZeroNegative(this, value);
    return 6;
  },
  ROL_ABS_X(memory: MemoryMap, address: number): number {
    const addr = (address + this.regX) & 0xffff;
    const value = rolValue(this, memory.readByte(addr));
    memory.writeByte(addr, value);
    setZeroNegative(this, value);
    return 7;
  },
  ROL_ZP(memory: MemoryMap, address: number): number {
    const value = rolValue(this, memory.readByte(address));
    memory.writeByte(address, value);
    setZeroNegative(this, value);
    return 5;
  },
  ROL_ZP_X(memory: MemoryMap, address: number): number {
    const addr = (address + this.regX) & 0xff;
    const value = rolValue(this, memory.readByte(addr));
    memory.writeByte(addr, value);
    setZeroNegative(this, value);
    return 6;
  },
  ROR(): number {
    this.accumulator = rorValue(this, this.accumulator);
    setZeroNegative(this, this.accumulator);
    return 2;
  },
  ROR_ABS(memory: MemoryMap, address: number): number {
    const value = rorValue(this, memory.readByte(address));
    memory.writeByte(address, value);
    setZeroNegative(this, value);
    return 6;
  },
  ROR_ABS_X(memory: MemoryMap, address: number): number {
    const addr = (address + this.regX) & 0xffff;
    const value = rorValue(this, memory.readByte(addr));
    memory.writeByte(addr, value);
    setZeroNegative(this, value);
    return 7;
  },
  ROR_ZP(memory: MemoryMap, address: number): number {
    const value = rorValue(this, memory.readByte(address));
    memory.writeByte(address, value);
    setZeroNegative(this, value);
    return 5;
  },
  ROR_ZP_X(memory: MemoryMap, address: number): number {
    const addr = (address + this.regX) & 0xff;
    const value = rorValue(this, memory.readByte(addr));
    memory.writeByte(addr, value);
    setZeroNegative(this, value);
    return 6;
  },
};
