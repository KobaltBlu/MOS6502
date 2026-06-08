import type { NesControllerState } from "../../platform/host";
import { R2A03 } from "../../cpu/r2a03";
import { MachineBase } from "../../core/machine-base";
import type { IMachine } from "../../core/i-machine";
import { buildNesMemoryMap } from "./memory-map";
import { Cartridge } from "./cartridge";
import { NesPpu } from "../../devices/nes/ppu";
import { NesApu } from "./apu";
import { NesController } from "./controller";
import { OamDma } from "./dma";
import Memory from "../../memory/memory";
import {
  CPU_CYCLES_PER_FRAME_NTSC,
  PPU_CYCLES_PER_CPU,
  PPU_CYCLES_PER_FRAME_NTSC,
} from "./constants";

export class NESMachine extends MachineBase implements IMachine {
  readonly id = "nes";
  readonly name = "Nintendo Entertainment System (NTSC)";

  cpu: R2A03;
  ram: Memory;
  ppu: NesPpu;
  apu: NesApu;
  cartridge: Cartridge;
  controller: NesController;
  dma: OamDma;

  constructor() {
    const hardware = buildNesMemoryMap();
    const cpu = new R2A03();
    hardware.apu.bindCpu(cpu);

    super(cpu, hardware.memoryMap, {
      width: 256,
      height: 240
    });

    this.ram = hardware.ram;
    this.ppu = hardware.ppu;
    this.apu = hardware.apu;
    this.cartridge = hardware.cartridge;
    this.controller = hardware.controller;
    this.dma = hardware.dma;
  }

  loadMedia(data: Uint8Array): void {
    this.cartridge.loadINES(data);
    this.ppu.mirroring = this.cartridge.getMirroring();
    this.ppu.chrRead = (address) => this.cartridge.readChr(address);
    this.ppu.chrWrite = (address, value) => this.cartridge.writeChr(address, value);
  }

  stepFrame(): void {
    this.ppu.mirroring = this.cartridge.getMirroring();
    const frameStart = this.masterCycle;

    for (let i = 0; i < PPU_CYCLES_PER_FRAME_NTSC; i++) {
      this.ppu.tickCycle();

      if (i % PPU_CYCLES_PER_CPU === 0) {
        if (!this.dma.isStalled() && !this.apu.isDmcStalled()) {
          this.cpu.clock(this.memoryMap);
          this.apu.tickCpuCycle(this.memoryMap);
        } else if (!this.dma.isStalled()) {
          this.apu.tickCpuCycle(this.memoryMap);
        }
      
        this.dma.tick();
      
        if (this.ppu.consumeNmiRequest()) {
          this.cpu.triggerNmi();
        }
      }
    }

    this.controller.poll();
    this.apu.endFrame();
    this.masterCycle = frameStart + CPU_CYCLES_PER_FRAME_NTSC;
  }

  pollControllers(state?: NesControllerState): void {
    if (state) {
      this.controller.applyState(state);
    }
    this.controller.poll();
  }

  reset(): void {
    super.reset();
    this.ppu.reset();
    this.apu.reset();
    this.dma.reset();
    this.controller.reset();
    this.cartridge.reset();
    this.cpu.reset(this.memoryMap);
  }
}

export default NESMachine;
