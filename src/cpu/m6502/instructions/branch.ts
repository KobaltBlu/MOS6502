import type { MemoryMap } from '../../../memory/memory-map';
import type { M6502 } from '../m6502';

function branchIf(cpu: M6502, condition: boolean, offset: number): number {
  if (!condition) {
    return 2;
  }

  const oldPc = cpu.programCounter;
  cpu.programCounter = (cpu.programCounter + (offset << 24 >> 24)) & 0xffff;
  return (oldPc & 0xff00) !== (cpu.programCounter & 0xff00) ? 4 : 3;
}

export const branchInstructions = {
  BCC(_memory: MemoryMap, address: number): number {
    return branchIf(this, (this.status & this.FLAG_C) == 0, address);
  },
  BCS(_memory: MemoryMap, address: number): number {
    return branchIf(this, (this.status & this.FLAG_C) == this.FLAG_C, address);
  },
  BEQ(_memory: MemoryMap, address: number): number {
    return branchIf(this, (this.status & this.FLAG_Z) == this.FLAG_Z, address);
  },
  BMI(_memory: MemoryMap, address: number): number {
    return branchIf(this, (this.status & this.FLAG_N) == this.FLAG_N, address);
  },
  BNE(_memory: MemoryMap, address: number): number {
    return branchIf(this, (this.status & this.FLAG_Z) == 0, address);
  },
  BPL(_memory: MemoryMap, address: number): number {
    return branchIf(this, (this.status & this.FLAG_N) == 0, address);
  },
  BVC(_memory: MemoryMap, address: number): number {
    return branchIf(this, (this.status & this.FLAG_V) == 0, address);
  },
  BVS(_memory: MemoryMap, address: number): number {
    return branchIf(this, (this.status & this.FLAG_V) == this.FLAG_V, address);
  },
};
