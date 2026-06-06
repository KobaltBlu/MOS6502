import type { MemoryMap } from '../../../memory/memory-map';
import { PAGE_SIZE } from '../../../core/constants';
import { setZeroNegative } from '../../flags';
import { SIGN_BIT } from '../../constants';

export const branchInstructions = {
  BCC(_memory: MemoryMap, address: number): number {
    if ((this.status & this.FLAG_C) == 0) {
      const old_page = this.programCounter % PAGE_SIZE;
      this.programCounter = (this.programCounter + (address << 24 >> 24)) & 0xffff;
      if (this.programCounter % PAGE_SIZE != old_page) {
        return 4;
      }
      return 3;
    }
    return 2;
  },
  BCS(_memory: MemoryMap, address: number): number {
    if ((this.status & this.FLAG_C) == this.FLAG_C) {
      const old_page = this.programCounter % PAGE_SIZE;
      this.programCounter = (this.programCounter + (address << 24 >> 24)) & 0xffff;
      if (this.programCounter % PAGE_SIZE != old_page) {
        return 4;
      }
      return 3;
    }
    return 2;
  },
  BEQ(_memory: MemoryMap, address: number): number {
    if ((this.status & this.FLAG_Z) == this.FLAG_Z) {
      const old_page = this.programCounter % PAGE_SIZE;
      this.programCounter = (this.programCounter + (address << 24 >> 24)) & 0xffff;
      if (this.programCounter % PAGE_SIZE != old_page) {
        return 4;
      }
      return 3;
    }
    return 2;
  },
  BMI(_memory: MemoryMap, address: number): number {
    if ((this.status & this.FLAG_N) == this.FLAG_N) {
      const old_page = this.programCounter % PAGE_SIZE;
      this.programCounter = (this.programCounter + (address << 24 >> 24)) & 0xffff;
      if (this.programCounter % PAGE_SIZE != old_page) {
        return 4;
      }
      return 3;
    }
    return 2;
  },
  BNE(_memory: MemoryMap, address: number): number {
    if ((this.status & this.FLAG_Z) == 0) {
      const old_page = this.programCounter % PAGE_SIZE;
      this.programCounter = (this.programCounter + (address << 24 >> 24)) & 0xffff;
      if (this.programCounter % PAGE_SIZE != old_page) {
        return 4;
      }
      return 3;
    }
    return 2;
  },
  BPL(_memory: MemoryMap, address: number): number {
    if ((this.status & this.FLAG_N) == 0) {
      const old_page = this.programCounter % PAGE_SIZE;
      this.programCounter = (this.programCounter + (address << 24 >> 24)) & 0xffff;
      if (this.programCounter % PAGE_SIZE != old_page) {
        return 4;
      }
      return 3;
    }
    return 2;
  },
  BVC(_memory: MemoryMap, address: number): number {
    if ((this.status & this.FLAG_V) == 0) {
      const old_page = this.programCounter % PAGE_SIZE;
      this.programCounter = (this.programCounter + (address << 24 >> 24)) & 0xffff;
      if (this.programCounter % PAGE_SIZE != old_page) {
        return 4;
      }
      return 3;
    }
    return 2;
  },
  BVS(_memory: MemoryMap, address: number): number {
    if ((this.status & this.FLAG_V) == this.FLAG_V) {
      const old_page = this.programCounter % PAGE_SIZE;
      this.programCounter = (this.programCounter + (address << 24 >> 24)) & 0xffff;
      if (this.programCounter % PAGE_SIZE != old_page) {
        return 4;
      }
      return 3;
    }
    return 2;
  },
};
