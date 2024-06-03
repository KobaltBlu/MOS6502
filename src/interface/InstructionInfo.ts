import type { MemoryController } from "../memoryController";

export interface InstructionInfo {
  instruction: (memory?: MemoryController, address?: number) => number;
  address: (memory?: MemoryController) => number;
}