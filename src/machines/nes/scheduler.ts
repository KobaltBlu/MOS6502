import type { MemoryMap } from "../../memory/memory-map";
import type { R2A03 } from "../../cpu/r2a03";
import type { NesPpu } from "../../devices/nes/ppu";
import type { NesApu } from "./apu";
import type { OamDma } from "./dma";
import type { NesController } from "./controller";
import {
  PPU_CYCLES_PER_FRAME_NTSC,
  PPU_CYCLES_PER_CPU,
} from "./constants";

export interface NesSchedulerContext {
  cpu: R2A03;
  memoryMap: MemoryMap;
  ppu: NesPpu;
  apu: NesApu;
  dma: OamDma;
  controller: NesController;
}

export class NesScheduler {
  stepFrame(ctx: NesSchedulerContext): number {
    let cpuCycles = 0;

    for (let i = 0; i < PPU_CYCLES_PER_FRAME_NTSC; i++) {
      ctx.ppu.tickCycle();

      if (i % PPU_CYCLES_PER_CPU === 0) {
        if (!ctx.dma.isStalled() && !ctx.apu.isDmcStalled()) {
          ctx.cpu.clock(ctx.memoryMap);
          ctx.apu.tickCpuCycle(ctx.memoryMap);
          cpuCycles++;
        } else if (!ctx.dma.isStalled()) {
          ctx.apu.tickCpuCycle(ctx.memoryMap);
        }
      
        ctx.dma.tick();
      
        if (ctx.ppu.consumeNmiRequest()) {
          ctx.cpu.triggerNmi();
        }
      }
    }

    ctx.controller.poll();
    ctx.apu.endFrame();
    return cpuCycles;
  }
}

export const nesScheduler = new NesScheduler();
