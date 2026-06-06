import type { MemoryMap } from "../../memory/memory-map";
import type { M6502 } from "./m6502";

export function readByte(this: M6502, memory: MemoryMap): number {
  return memory.readByte(this.programCounter++);
}

export function readShort(this: M6502, memory: MemoryMap): number {
  const address = memory.readShortLE(this.programCounter);
  this.programCounter += 2;
  return address;
}

export function readZeroPage(this: M6502, memory: MemoryMap): number {
  return memory.readByte(this.programCounter++) & 0xff;
}

export function readZeroPageX(this: M6502, memory: MemoryMap): number {
  const zp = memory.readByte(this.programCounter++);
  return (zp + this.regX) & 0xff;
}

export function readZeroPageY(this: M6502, memory: MemoryMap): number {
  const zp = memory.readByte(this.programCounter++);
  return (zp + this.regY) & 0xff;
}

export function readZeroPageXIndirect(this: M6502, memory: MemoryMap): number {
  const zp = memory.readByte(this.programCounter++);
  const ptr = (zp + this.regX) & 0xff;
  return memory.readByte(ptr) | (memory.readByte((ptr + 1) & 0xff) << 8);
}

export function readZeroPageYIndirect(this: M6502, memory: MemoryMap): number {
  const zp = memory.readByte(this.programCounter++);
  const lo = memory.readByte(zp);
  const hi = memory.readByte((zp + 1) & 0xff);
  return lo | (hi << 8);
}

export const addressing = {
  readByte,
  readShort,
  readZeroPage,
  readZeroPageX,
  readZeroPageY,
  readZeroPageXIndirect,
  readZeroPageYIndirect,
};
