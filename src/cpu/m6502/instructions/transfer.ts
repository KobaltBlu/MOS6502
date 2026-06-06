import type { MemoryMap } from '../../../memory/memory-map';
import { PAGE_SIZE } from '../../../core/constants';
import { setZeroNegative } from '../../flags';
import { SIGN_BIT } from '../../constants';

export const transferInstructions = {
  DEC_ABS(memory: MemoryMap, address: number): number {
    const result = memory.readByte(address) - 1;
    memory.writeByte(address, result);

    this.status &= ~this.FLAG_Z;
    if (!result) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((result >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 6; // return the number of cycles used
  },
  DEC_ABS_X(memory: MemoryMap, address: number): number {
    const result = memory.readByte(address + this.regX) - 1;
    memory.writeByte(address + this.regX, result);

    this.status &= ~this.FLAG_Z;
    if (!result) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((result >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 6; // return the number of cycles used
  },
  DEC_ZP(memory: MemoryMap, address: number): number {
    const result = memory.readByte(address) - 1;
    memory.writeByte(address, result);

    this.status &= ~this.FLAG_Z;
    if (!result) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((result >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 6; // return the number of cycles used
  },
  DEC_ZP_X(memory: MemoryMap, address: number): number {
    const result = memory.readByte(address + this.regX) - 1;
    memory.writeByte(address + this.regX, result);

    this.status &= ~this.FLAG_Z;
    if (!result) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((result >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 6; // return the number of cycles used
  },
  DEX(): number {
    this.regX = (this.regX - 1) & 0xff;

    this.status &= ~this.FLAG_Z;
    if (!this.regX) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.regX >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 4; // return the number of cycles used
  },
  DEY(): number {
    this.regY = (this.regY - 1) & 0xff;

    this.status &= ~this.FLAG_Z;
    if (!this.regY) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.regY >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 4; // return the number of cycles used
  },
  TAX(memory: MemoryMap, address: number): number {
    this.regX = this.accumulator;

    this.status &= ~this.FLAG_N;
    if ((this.regX >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    this.status &= ~this.FLAG_Z;
    if (!this.regX) {
      this.status |= this.FLAG_Z;
    }

    return 2; // return the number of cycles used
  },
  TAY(memory: MemoryMap, address: number): number {
    this.regY = this.accumulator;

    this.status &= ~this.FLAG_N;
    if ((this.regY >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    this.status &= ~this.FLAG_Z;
    if (!this.regY) {
      this.status |= this.FLAG_Z;
    }

    return 2; // return the number of cycles used
  },
  TSX(): number {
    this.regX = this.stackPointer & 0xff;

    this.status &= ~this.FLAG_N;
    if ((this.regX >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    this.status &= ~this.FLAG_Z;
    if (!this.regX) {
      this.status |= this.FLAG_Z;
    }

    return 2; // return the number of cycles used
  },
  TXA(memory: MemoryMap, address: number): number {
    this.accumulator = this.regX;

    this.status &= ~this.FLAG_N;
    if ((this.regX >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    this.status &= ~this.FLAG_Z;
    if (!this.regX) {
      this.status |= this.FLAG_Z;
    }

    return 2; // return the number of cycles used
  },
  TXS(): number {
    this.stackPointer = this.regX & 0xff;

    this.status &= ~this.FLAG_N;
    if ((this.regX >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    this.status &= ~this.FLAG_Z;
    if (!this.regX) {
      this.status |= this.FLAG_Z;
    }

    return 2; // return the number of cycles used
  },
  TYA(memory: MemoryMap, address: number): number {
    this.accumulator = this.regY;

    this.status &= ~this.FLAG_N;
    if ((this.regY >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    this.status &= ~this.FLAG_Z;
    if (!this.regY) {
      this.status |= this.FLAG_Z;
    }

    return 2; // return the number of cycles used
  },
  INX(): number {
    this.regX = (this.regX + 1) & 0xff;

    this.status &= ~this.FLAG_N;
    if ((this.regX >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    this.status &= ~this.FLAG_Z;
    if (!this.regX) {
      this.status |= this.FLAG_Z;
    }

    return 2;
  },
  INY(): number {
    this.regY = (this.regY + 1) & 0xff;

    this.status &= ~this.FLAG_N;
    if ((this.regY >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    this.status &= ~this.FLAG_Z;
    if (!this.regY) {
      this.status |= this.FLAG_Z;
    }

    return 2;
  },
};
