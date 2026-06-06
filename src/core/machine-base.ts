import type { ICpu } from "../cpu/types";
import type { MemoryMap } from "../memory/memory-map";
import { CPU_CYCLES_PER_TICK } from "./clock";
import type { IMachine } from "./i-machine";

const HEADLESS_BATCH = 256;

export interface MachineTickable {
  tick(cycles: number): void;
}

export interface MachineTimingConfig {
  ppuCyclesPerCpuCycle: number;
  tickables?: MachineTickable[];
  onCpuCycle?: () => void;
}

export abstract class MachineBase implements IMachine {
  abstract readonly id: string;
  abstract readonly name: string;
  cpu: ICpu;
  memoryMap: MemoryMap;
  running: boolean = false;
  protected masterCycle: number = 0;
  protected timing: MachineTimingConfig;

  constructor(cpu: ICpu, memoryMap: MemoryMap, timing: MachineTimingConfig) {
    this.cpu = cpu;
    this.memoryMap = memoryMap;
    this.timing = timing;
  }

  step(cycles: number = CPU_CYCLES_PER_TICK): void {
    const ppuRatio = this.timing.ppuCyclesPerCpuCycle;
    const end = this.masterCycle + cycles;
    while (this.masterCycle < end) {
      this.cpu.clock(this.memoryMap);
      for (let i = 0; i < ppuRatio; i++) {
        this.timing.onCpuCycle?.();
      }
      this.masterCycle++;
    }
    for (const tickable of this.timing.tickables ?? []) {
      tickable.tick(cycles);
    }
  }

  run(maxSteps?: number): void {
    this.reset();
    this.running = true;
    this.cpu.reset(this.memoryMap);

    let steps = 0;
    while (this.running) {
      const remaining =
        maxSteps !== undefined ? maxSteps - steps : HEADLESS_BATCH;
      const batch = Math.min(HEADLESS_BATCH, remaining);
      this.step(batch);
      steps += batch;
      if (maxSteps !== undefined && steps >= maxSteps) {
        this.running = false;
      }
    }
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
