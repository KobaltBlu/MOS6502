import type { NesControllerState } from "../../platform/host";
import { nesLog } from "../../platform/nes-debug-log";
import { R2A03 } from "../../cpu/r2a03";
import { MachineBase } from "../../core/machine-base";
import type { IMachine } from "../../core/i-machine";
import { buildNesMemoryMap } from "./memory-map";
import { Cartridge } from "./cartridge";
import { NesPpu } from "../../devices/nes/ppu";
import { NesApu } from "./apu";
import { NesController } from "./controller";
import { OamDma } from "./dma";
import { nesScheduler } from "./scheduler";
import Memory from "../../memory/memory";
import {
  CPU_CYCLES_PER_FRAME_NTSC,
  PPU_CYCLES_PER_CPU,
} from "./constants";

export class NESMachine extends MachineBase implements IMachine {
  readonly id = "nes";
  readonly name = "Nintendo Entertainment System (NTSC)";

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
      ppuCyclesPerCpuCycle: PPU_CYCLES_PER_CPU,
      onCpuCycle: () => {
        hardware.ppu.clock();
        hardware.dma.tick();
      },
    });

    this.ram = hardware.ram;
    this.ppu = hardware.ppu;
    this.apu = hardware.apu;
    this.cartridge = hardware.cartridge;
    this.controller = hardware.controller;
    this.dma = hardware.dma;
    this.cpu = cpu;
  }

  loadProgram(data: Uint8Array): void {
    this.cartridge.loadINES(data);
    this.ppu.mirroring = this.cartridge.getMirroring();
    this.ppu.chrRead = (address) => this.cartridge.readChr(address);
    this.ppu.chrWrite = (address, value) => this.cartridge.writeChr(address, value);
    const chrSample = this.cartridge.readChr(0);
    const prgSample = this.cartridge.readByte(0x8000);
    nesLog("machine", "PPU wired to cartridge", {
      mirroring: this.ppu.mirroring,
      chrSample: `$${chrSample.toString(16)}`,
      prgSample8000: `$${prgSample.toString(16)}`,
    });
  }

  stepFrame(): void {
    this.ppu.mirroring = this.cartridge.getMirroring();
    const frameStart = this.masterCycle;
    nesScheduler.stepFrame({
      cpu: this.cpu as R2A03,
      memoryMap: this.memoryMap,
      ppu: this.ppu,
      apu: this.apu,
      dma: this.dma,
      controller: this.controller,
    });
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
  }
}

export default NESMachine;
