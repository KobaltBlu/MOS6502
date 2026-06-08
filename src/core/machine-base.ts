import type { ICpu } from "../cpu/types";
import type { MemoryMap } from "../memory/memory-map";
import { CPU_CYCLES_PER_TICK } from "./clock";
import { IDisplay } from "./i-display";
import type { IMachine } from "./i-machine";

export abstract class MachineBase implements IMachine {
  abstract readonly id: string;
  abstract readonly name: string;
  cpu: ICpu;
  memoryMap: MemoryMap;
  running: boolean = false;
  protected masterCycle: number = 0;

  display?: IDisplay;

  constructor(cpu: ICpu, memoryMap: MemoryMap, display?: IDisplay) {
    this.cpu = cpu;
    this.memoryMap = memoryMap;
  }

  step(cycles: number = CPU_CYCLES_PER_TICK): void {
    
  }

  reset(): void {
    this.running = false;
    this.masterCycle = 0;
  }

  getMasterCycle(): number {
    return this.masterCycle;
  }

  abstract loadProgram(data: Uint8Array): void;
}
