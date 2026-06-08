import type { ICpu } from "../cpu/types";
import type { MemoryMap } from "../memory/memory-map";

export interface IMachine {
  readonly id: string;
  readonly name: string;
  cpu: ICpu;
  memoryMap: MemoryMap;
  running: boolean;
  step(cycles?: number): void;
  reset(): void;
  loadMedia(data: Uint8Array): void;
  getMasterCycle(): number;
}
