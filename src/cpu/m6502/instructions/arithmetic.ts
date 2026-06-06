import type { MemoryMap } from "../../../memory/memory-map";
import { PAGE_SIZE } from "../../../core/constants";
import { setZeroNegative } from "../../flags";
import { IRQ_VECTOR } from "../../constants";
import type { M6502 } from "../m6502";

function compare(cpu: M6502, register: number, value: number): void {
  const result = (register - value) & 0xff;
  cpu.status &= ~cpu.FLAG_C;
  if (register >= value) {
    cpu.status |= cpu.FLAG_C;
  }
  setZeroNegative(cpu, result);
}

function adcBinary(cpu: M6502, value: number): void {
  const carry = cpu.status & cpu.FLAG_C ? 1 : 0;
  const sum = cpu.accumulator + value + carry;
  cpu.status &= ~cpu.FLAG_C;
  if (sum > 0xff) {
    cpu.status |= cpu.FLAG_C;
  }
  cpu.status &= ~cpu.FLAG_V;
  if (((cpu.accumulator ^ sum) & (value ^ sum) & 0x80) !== 0) {
    cpu.status |= cpu.FLAG_V;
  }
  cpu.accumulator = sum & 0xff;
  setZeroNegative(cpu, cpu.accumulator);
}

function adcDecimal(cpu: M6502, value: number): void {
  const carry = cpu.status & cpu.FLAG_C ? 1 : 0;
  let lo = (cpu.accumulator & 0x0f) + (value & 0x0f) + carry;
  let hi = (cpu.accumulator & 0xf0) + (value & 0xf0);
  if (lo > 0x09) {
    lo += 0x06;
    hi += 0x10;
  }
  if (hi > 0x90) {
    hi += 0x60;
  }
  cpu.status &= ~cpu.FLAG_C;
  if (hi > 0xff) {
    cpu.status |= cpu.FLAG_C;
  }
  cpu.status &= ~cpu.FLAG_V;
  if (((cpu.accumulator ^ value ^ hi) & 0x80) !== 0) {
    cpu.status |= cpu.FLAG_V;
  }
  cpu.accumulator = (lo & 0x0f) | (hi & 0xf0);
  setZeroNegative(cpu, cpu.accumulator);
}

function sbcBinary(cpu: M6502, value: number): void {
  adcBinary(cpu, value ^ 0xff);
}

function sbcDecimal(cpu: M6502, value: number): void {
  adcDecimal(cpu, value ^ 0xff);
}

function doAdc(cpu: M6502, value: number): void {
  if ((cpu.status & cpu.FLAG_D) && cpu.supportsDecimalMode) {
    adcDecimal(cpu, value);
  } else {
    adcBinary(cpu, value);
  }
}

function doSbc(cpu: M6502, value: number): void {
  if ((cpu.status & cpu.FLAG_D) && cpu.supportsDecimalMode) {
    sbcDecimal(cpu, value);
  } else {
    sbcBinary(cpu, value);
  }
}

function applyLogic(cpu: M6502, value: number, op: (a: number, b: number) => number): void {
  cpu.accumulator = op(cpu.accumulator, value) & 0xff;
  setZeroNegative(cpu, cpu.accumulator);
}

function incMemory(cpu: M6502, memory: MemoryMap, address: number): number {
  const result = (memory.readByte(address) + 1) & 0xff;
  memory.writeByte(address, result);
  setZeroNegative(cpu, result);
  return result;
}

export const arithmeticInstructions = {
  ADC(_memory: MemoryMap, address: number): number {
    doAdc(this, address);
    return 2;
  },
  ADC_ABS(memory: MemoryMap, address: number): number {
    doAdc(this, memory.readByte(address));
    return 4;
  },
  ADC_ABS_X(memory: MemoryMap, address: number): number {
    const offset = address + this.regX;
    doAdc(this, memory.readByte(offset));
    if (address % PAGE_SIZE !== offset % PAGE_SIZE) {
      return 5;
    }
    return 4;
  },
  ADC_ABS_Y(memory: MemoryMap, address: number): number {
    const offset = address + this.regY;
    doAdc(this, memory.readByte(offset));
    if (address % PAGE_SIZE !== offset % PAGE_SIZE) {
      return 5;
    }
    return 4;
  },
  ADC_ZP(memory: MemoryMap, address: number): number {
    doAdc(this, memory.readByte(address));
    return 3;
  },
  ADC_ZP_X(memory: MemoryMap, address: number): number {
    doAdc(this, memory.readByte((address + this.regX) & 0xff));
    return 4;
  },
  ADC_ZP_XI(memory: MemoryMap, address: number): number {
    const ptr = (address + this.regX) & 0xff;
    const addr = memory.readByte(ptr) | (memory.readByte((ptr + 1) & 0xff) << 8);
    doAdc(this, memory.readByte(addr));
    return 6;
  },
  ADC_ZP_YI(memory: MemoryMap, address: number): number {
    const lo = memory.readByte(address);
    const hi = memory.readByte((address + 1) & 0xff);
    const addr = (lo | (hi << 8)) + this.regY;
    doAdc(this, memory.readByte(addr & 0xffff));
    if (((lo | (hi << 8)) & 0xff00) !== (addr & 0xff00)) {
      return 5;
    }
    return 4;
  },
  SBC(_memory: MemoryMap, address: number): number {
    doSbc(this, address);
    return 2;
  },
  SBC_ABS(memory: MemoryMap, address: number): number {
    doSbc(this, memory.readByte(address));
    return 4;
  },
  SBC_ABS_X(memory: MemoryMap, address: number): number {
    const offset = address + this.regX;
    doSbc(this, memory.readByte(offset));
    if (address % PAGE_SIZE !== offset % PAGE_SIZE) {
      return 5;
    }
    return 4;
  },
  SBC_ABS_Y(memory: MemoryMap, address: number): number {
    const offset = address + this.regY;
    doSbc(this, memory.readByte(offset));
    if (address % PAGE_SIZE !== offset % PAGE_SIZE) {
      return 5;
    }
    return 4;
  },
  SBC_ZP(memory: MemoryMap, address: number): number {
    doSbc(this, memory.readByte(address));
    return 3;
  },
  SBC_ZP_X(memory: MemoryMap, address: number): number {
    doSbc(this, memory.readByte((address + this.regX) & 0xff));
    return 4;
  },
  SBC_ZP_XI(memory: MemoryMap, address: number): number {
    const ptr = (address + this.regX) & 0xff;
    const addr = memory.readByte(ptr) | (memory.readByte((ptr + 1) & 0xff) << 8);
    doSbc(this, memory.readByte(addr));
    return 6;
  },
  SBC_ZP_YI(memory: MemoryMap, address: number): number {
    const lo = memory.readByte(address);
    const hi = memory.readByte((address + 1) & 0xff);
    const addr = (lo | (hi << 8)) + this.regY;
    doSbc(this, memory.readByte(addr & 0xffff));
    if (((lo | (hi << 8)) & 0xff00) !== (addr & 0xff00)) {
      return 5;
    }
    return 4;
  },
  AND(_memory: MemoryMap, address: number): number {
    applyLogic(this, address, (a, b) => a & b);
    return 2;
  },
  AND_ABS(memory: MemoryMap, address: number): number {
    applyLogic(this, memory.readByte(address), (a, b) => a & b);
    return 4;
  },
  AND_ABS_X(memory: MemoryMap, address: number): number {
    const offset = address + this.regX;
    applyLogic(this, memory.readByte(offset), (a, b) => a & b);
    if (address % PAGE_SIZE !== offset % PAGE_SIZE) {
      return 5;
    }
    return 4;
  },
  AND_ABS_Y(memory: MemoryMap, address: number): number {
    const offset = address + this.regY;
    applyLogic(this, memory.readByte(offset), (a, b) => a & b);
    if (address % PAGE_SIZE !== offset % PAGE_SIZE) {
      return 5;
    }
    return 4;
  },
  AND_ZP(memory: MemoryMap, address: number): number {
    applyLogic(this, memory.readByte(address), (a, b) => a & b);
    return 3;
  },
  AND_ZP_X(memory: MemoryMap, address: number): number {
    applyLogic(this, memory.readByte((address + this.regX) & 0xff), (a, b) => a & b);
    return 4;
  },
  AND_ZP_XI(memory: MemoryMap, address: number): number {
    const ptr = (address + this.regX) & 0xff;
    const addr = memory.readByte(ptr) | (memory.readByte((ptr + 1) & 0xff) << 8);
    applyLogic(this, memory.readByte(addr), (a, b) => a & b);
    return 6;
  },
  AND_ZP_YI(memory: MemoryMap, address: number): number {
    const lo = memory.readByte(address);
    const hi = memory.readByte((address + 1) & 0xff);
    const addr = (lo | (hi << 8)) + this.regY;
    applyLogic(this, memory.readByte(addr & 0xffff), (a, b) => a & b);
    if (((lo | (hi << 8)) & 0xff00) !== (addr & 0xff00)) {
      return 5;
    }
    return 4;
  },
  ORA(_memory: MemoryMap, address: number): number {
    applyLogic(this, address, (a, b) => a | b);
    return 2;
  },
  ORA_ABS(memory: MemoryMap, address: number): number {
    applyLogic(this, memory.readByte(address), (a, b) => a | b);
    return 4;
  },
  ORA_ABS_X(memory: MemoryMap, address: number): number {
    const offset = address + this.regX;
    applyLogic(this, memory.readByte(offset), (a, b) => a | b);
    if (address % PAGE_SIZE !== offset % PAGE_SIZE) {
      return 5;
    }
    return 4;
  },
  ORA_ABS_Y(memory: MemoryMap, address: number): number {
    const offset = address + this.regY;
    applyLogic(this, memory.readByte(offset), (a, b) => a | b);
    if (address % PAGE_SIZE !== offset % PAGE_SIZE) {
      return 5;
    }
    return 4;
  },
  ORA_ZP(memory: MemoryMap, address: number): number {
    applyLogic(this, memory.readByte(address), (a, b) => a | b);
    return 3;
  },
  ORA_ZP_X(memory: MemoryMap, address: number): number {
    applyLogic(this, memory.readByte((address + this.regX) & 0xff), (a, b) => a | b);
    return 4;
  },
  ORA_ZP_XI(memory: MemoryMap, address: number): number {
    const ptr = (address + this.regX) & 0xff;
    const addr = memory.readByte(ptr) | (memory.readByte((ptr + 1) & 0xff) << 8);
    applyLogic(this, memory.readByte(addr), (a, b) => a | b);
    return 6;
  },
  ORA_ZP_YI(memory: MemoryMap, address: number): number {
    const lo = memory.readByte(address);
    const hi = memory.readByte((address + 1) & 0xff);
    const addr = (lo | (hi << 8)) + this.regY;
    applyLogic(this, memory.readByte(addr & 0xffff), (a, b) => a | b);
    if (((lo | (hi << 8)) & 0xff00) !== (addr & 0xff00)) {
      return 5;
    }
    return 4;
  },
  CMP(_memory: MemoryMap, address: number): number {
    compare(this, this.accumulator, address);
    return 2;
  },
  CMP_ABS(memory: MemoryMap, address: number): number {
    compare(this, this.accumulator, memory.readByte(address));
    return 4;
  },
  CMP_ABS_X(memory: MemoryMap, address: number): number {
    const offset = address + this.regX;
    compare(this, this.accumulator, memory.readByte(offset));
    if (address % PAGE_SIZE !== offset % PAGE_SIZE) {
      return 5;
    }
    return 4;
  },
  CMP_ABS_Y(memory: MemoryMap, address: number): number {
    const offset = address + this.regY;
    compare(this, this.accumulator, memory.readByte(offset));
    if (address % PAGE_SIZE !== offset % PAGE_SIZE) {
      return 5;
    }
    return 4;
  },
  CMP_ZP(memory: MemoryMap, address: number): number {
    compare(this, this.accumulator, memory.readByte(address));
    return 3;
  },
  CMP_ZP_X(memory: MemoryMap, address: number): number {
    compare(this, this.accumulator, memory.readByte((address + this.regX) & 0xff));
    return 4;
  },
  CMP_ZP_XI(memory: MemoryMap, address: number): number {
    const ptr = (address + this.regX) & 0xff;
    const addr = memory.readByte(ptr) | (memory.readByte((ptr + 1) & 0xff) << 8);
    compare(this, this.accumulator, memory.readByte(addr));
    return 6;
  },
  CMP_ZP_YI(memory: MemoryMap, address: number): number {
    const lo = memory.readByte(address);
    const hi = memory.readByte((address + 1) & 0xff);
    const addr = (lo | (hi << 8)) + this.regY;
    compare(this, this.accumulator, memory.readByte(addr & 0xffff));
    if (((lo | (hi << 8)) & 0xff00) !== (addr & 0xff00)) {
      return 5;
    }
    return 4;
  },
  CPX(_memory: MemoryMap, address: number): number {
    compare(this, this.regX, address);
    return 2;
  },
  CPX_ABS(memory: MemoryMap, address: number): number {
    compare(this, this.regX, memory.readByte(address));
    return 4;
  },
  CPX_ZP(memory: MemoryMap, address: number): number {
    compare(this, this.regX, memory.readByte(address));
    return 3;
  },
  CPY(_memory: MemoryMap, address: number): number {
    compare(this, this.regY, address);
    return 2;
  },
  CPY_ABS(memory: MemoryMap, address: number): number {
    compare(this, this.regY, memory.readByte(address));
    return 4;
  },
  CPY_ZP(memory: MemoryMap, address: number): number {
    compare(this, this.regY, memory.readByte(address));
    return 3;
  },
  BIT_ABS(memory: MemoryMap, address: number): number {
    const value = memory.readByte(address);
    this.status &= ~(this.FLAG_V | this.FLAG_N | this.FLAG_Z);
    if (value & 0x40) {
      this.status |= this.FLAG_V;
    }
    if (value & 0x80) {
      this.status |= this.FLAG_N;
    }
    if ((this.accumulator & value) === 0) {
      this.status |= this.FLAG_Z;
    }
    return 4;
  },
  BIT_ZP(memory: MemoryMap, address: number): number {
    const value = memory.readByte(address);
    this.status &= ~(this.FLAG_V | this.FLAG_N | this.FLAG_Z);
    if (value & 0x40) {
      this.status |= this.FLAG_V;
    }
    if (value & 0x80) {
      this.status |= this.FLAG_N;
    }
    if ((this.accumulator & value) === 0) {
      this.status |= this.FLAG_Z;
    }
    return 3;
  },
  INC_ZP(memory: MemoryMap, address: number): number {
    incMemory(this, memory, address);
    return 5;
  },
  INC_ZP_X(memory: MemoryMap, address: number): number {
    incMemory(this, memory, (address + this.regX) & 0xff);
    return 6;
  },
  INC_ABS(memory: MemoryMap, address: number): number {
    incMemory(this, memory, address);
    return 6;
  },
  INC_ABS_X(memory: MemoryMap, address: number): number {
    incMemory(this, memory, address + this.regX);
    return 7;
  },
  SEC(): number {
    this.status |= this.FLAG_C;
    return 2;
  },
  SED(): number {
    this.status |= this.FLAG_D;
    return 2;
  },
  SEI(): number {
    this.status |= this.FLAG_I;
    return 2;
  },
  BRK(memory: MemoryMap): number {
    this.programCounter += 1;
    this.pushReturnAddress(memory, this.programCounter);
    this.pushStatus(memory, true);
    this.status |= this.FLAG_I;
    this.programCounter = memory.readShortLE(IRQ_VECTOR);
    return 7;
  },
};
