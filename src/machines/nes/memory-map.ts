import Memory from "../../memory/memory";
import { MemoryMap } from "../../memory/memory-map";
import { MirrorDevice } from "../../memory/mirror-device";
import type { MemoryDevice } from "../../memory/types";
import { Cartridge } from "./cartridge";
import { NesApu } from "./apu";
import { NesPpu } from "../../devices/nes/ppu";
import { NesController } from "./controller";
import { OamDma, OAM_DMA_ADDRESS } from "./dma";
import {
  APU_BASE,
  APU_IO_END,
  CARTRIDGE_BASE,
  PRG_RAM_BASE,
  PRG_RAM_END,
  RAM_MIRROR_END,
  RAM_MIRROR_MASK,
  RAM_SIZE,
  PPU_REG_MIRROR_END,
  PPU_REG_MIRROR_MASK,
} from "./constants";

export interface NesHardware {
  memoryMap: MemoryMap;
  ram: Memory;
  ppu: NesPpu;
  apu: NesApu;
  cartridge: Cartridge;
  controller: NesController;
  dma: OamDma;
}

class NesApuIo implements MemoryDevice {
  constructor(
    private apu: NesApu,
    private controller: NesController,
    private dma: OamDma,
    private memoryMap: MemoryMap,
    private ppu: NesPpu
  ) {}

  readByte(address: number): number {
    if (address === 0x4016 || address === 0x4017) {
      return this.controller.readByte(address);
    }
    return this.apu.readByte(address);
  }

  writeByte(address: number, value: number): void {
    if (address === OAM_DMA_ADDRESS) {
      this.dma.trigger(value, this.memoryMap, this.ppu);
      return;
    }
    if (address === 0x4016) {
      this.controller.writeByte(address, value);
      return;
    }
    this.apu.writeByte(address, value);
  }
}

export function buildNesMemoryMap(): NesHardware {
  const memoryMap = new MemoryMap();
  const ram = new Memory(RAM_SIZE);
  const ppu = new NesPpu();
  const apu = new NesApu();
  const cartridge = new Cartridge();
  const controller = new NesController();
  const dma = new OamDma();

  ppu.chrRead = (address) => cartridge.readChr(address);
  ppu.chrWrite = (address, value) => cartridge.writeChr(address, value);

  ram.baseAddress = 0;
  memoryMap.addRegion(
    0x0000,
    RAM_MIRROR_END,
    new MirrorDevice(ram, 0x0000, RAM_MIRROR_END, RAM_MIRROR_MASK)
  );
  memoryMap.addRegion(
    0x2000,
    PPU_REG_MIRROR_END,
    new MirrorDevice(ppu, 0x2000, PPU_REG_MIRROR_END, PPU_REG_MIRROR_MASK)
  );
  const apuIo = new NesApuIo(apu, controller, dma, memoryMap, ppu);
  memoryMap.addRegion(APU_BASE, APU_IO_END, apuIo);
  memoryMap.addRegion(PRG_RAM_BASE, PRG_RAM_END, cartridge.prgRam);
  memoryMap.addRegion(CARTRIDGE_BASE, 0xffff, cartridge);

  return { memoryMap, ram, ppu, apu, cartridge, controller, dma };
}

export function wireCartridgeToPpu(cartridge: Cartridge, ppu: NesPpu): void {
  ppu.chrRead = (address) => cartridge.readChr(address);
  ppu.chrWrite = (address, value) => cartridge.writeChr(address, value);
  ppu.mirroring = cartridge.getMirroring();
}
