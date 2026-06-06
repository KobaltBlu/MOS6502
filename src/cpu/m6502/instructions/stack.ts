import type { MemoryMap } from "../../../memory/memory-map";
import { STACK_PAGE } from "../../../core/constants";

type StackCpu = {
  stackPointer: number;
  programCounter: number;
  accumulator: number;
  status: number;
  FLAG_B: number;
};

function stackAddress(stackPointer: number): number {
  return STACK_PAGE | (stackPointer & 0xff);
}

function pushByte(cpu: StackCpu, memory: MemoryMap, value: number): void {
  memory.writeByte(stackAddress(cpu.stackPointer), value & 0xff);
  cpu.stackPointer = (cpu.stackPointer - 1) & 0xff;
}

function pullByte(cpu: StackCpu, memory: MemoryMap): number {
  cpu.stackPointer = (cpu.stackPointer + 1) & 0xff;
  return memory.readByte(stackAddress(cpu.stackPointer));
}

export const stackInstructions = {
  JMP(_memory: MemoryMap, address: number): number {
    this.programCounter = address;
    return 3;
  },
  JMP_I(memory: MemoryMap, address: number): number {
    const low = memory.readByte(address);
    const highAddress = (address & 0xff00) | ((address + 1) & 0x00ff);
    const high = memory.readByte(highAddress);
    this.programCounter = low | (high << 8);
    return 5;
  },
  JSR(memory: MemoryMap, address: number): number {
    const returnAddress = this.programCounter - 1;
    pushByte(this, memory, (returnAddress >> 8) & 0xff);
    pushByte(this, memory, returnAddress & 0xff);
    this.programCounter = address;
    return 6;
  },
  RTS(memory: MemoryMap): number {
    const lo = pullByte(this, memory);
    const hi = pullByte(this, memory);
    this.programCounter = ((lo | (hi << 8)) + 1) & 0xffff;
    return 6;
  },
  RTI(memory: MemoryMap): number {
    this.status = pullByte(this, memory) & 0xef;
    const lo = pullByte(this, memory);
    const hi = pullByte(this, memory);
    this.programCounter = lo | (hi << 8);
    return 6;
  },
  NOP(): number {
    return 2;
  },
  PHA(memory: MemoryMap): number {
    pushByte(this, memory, this.accumulator);
    return 3;
  },
  PHP(memory: MemoryMap): number {
    pushByte(this, memory, (this.status | 0x30) & 0xff);
    return 3;
  },
  PLA(memory: MemoryMap): number {
    this.accumulator = pullByte(this, memory);
    this.status &= ~this.FLAG_Z;
    if (!this.accumulator) {
      this.status |= this.FLAG_Z;
    }
    this.status &= ~this.FLAG_N;
    if (this.accumulator & 0x80) {
      this.status |= this.FLAG_N;
    }
    return 4;
  },
  PLP(memory: MemoryMap): number {
    this.status = (pullByte(this, memory) & 0xcf) | (this.status & 0x20);
    return 4;
  },
  pushReturnAddress(memory: MemoryMap, returnAddress: number): void {
    pushByte(this, memory, (returnAddress >> 8) & 0xff);
    pushByte(this, memory, returnAddress & 0xff);
  },
  pushStatus(memory: MemoryMap, breakFlag: boolean): void {
    let value = this.status | 0x30;
    if (!breakFlag) {
      value &= ~this.FLAG_B;
    }
    pushByte(this, memory, value);
  },
  serviceInterrupt(memory: MemoryMap, vector: number, breakFlag: boolean): number {
    this.pushReturnAddress(memory, this.programCounter);
    this.pushStatus(memory, breakFlag);
    this.status |= this.FLAG_I;
    this.programCounter = memory.readShortLE(vector);
    return 7;
  },
};
