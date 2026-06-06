import type { InstructionInfo } from "./types";
import type { MemoryMap } from "../memory/memory-map";

export default class CPU {
  instructionsMap = new Map<number, InstructionInfo>();
  cycleCount: number = 0;
  currentInst!: InstructionInfo;
  currentInstCode: number = 0;
  currentIntrAddress: number = 0;
  currentIntrCycles: number = 0;

  reset(_memory: MemoryMap): void {}

  clock(_memory: MemoryMap): void {}
}
