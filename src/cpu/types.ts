import type { MemoryMap } from "../memory/memory-map";

export interface InstructionInfo {
  instruction: (memory: MemoryMap, address: number) => number;
  address?: (memory: MemoryMap) => number;
}

export interface ICpu {
  cycleCount: number;
  currentInstCode: number;
  currentIntrAddress: number;
  currentIntrCycles: number;
  instructionsMap: Map<number, InstructionInfo>;
  reset(memory: MemoryMap): void;
  clock(memory: MemoryMap): void;
}
