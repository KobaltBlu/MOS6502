import { M6502 } from "../../cpu/m6502/m6502";
import Memory from "../../memory/memory";
import { MemoryMap } from "../../memory/memory-map";
import ROM from "../../memory/rom";
import { LCDScreen } from "../../devices/lcd-screen";
import { MachineBase } from "../../core/machine-base";
import type { IMachine } from "../../core/i-machine";
import {
  LCD_BASE,
  LCD_SIZE,
  PPU_BASE,
  PPU_SIZE,
  RAM_BASE,
  RAM_SIZE,
  ROM_BASE,
  ROM_SIZE,
} from "./constants";

export class Generic6502Machine extends MachineBase implements IMachine {
  readonly id = "generic6502";
  readonly name = "Generic 6502 Dev Board";

  ram: Memory;
  rom: ROM;
  terminalScreen: LCDScreen;

  constructor() {
    const ram = new Memory(RAM_SIZE);
    const cpu = new M6502();
    const rom = new ROM(ROM_SIZE);
    const terminalScreen = new LCDScreen();
    const memoryMap = new MemoryMap();

    memoryMap.addRegion(RAM_BASE, RAM_BASE + RAM_SIZE - 1, ram);
    memoryMap.addRegion(LCD_BASE, LCD_BASE + LCD_SIZE - 1, terminalScreen);
    memoryMap.addRegion(ROM_BASE, 0xffff, rom);

    super(cpu, memoryMap, {
      ppuCyclesPerCpuCycle: 3,
      tickables: [terminalScreen],
      onCpuCycle: () => {
        
      },
    });

    this.ram = ram;
    this.rom = rom;
    this.terminalScreen = terminalScreen;
  }

  loadProgram(data: Uint8Array): void {
    this.rom.writeData(data);
  }
}

export default Generic6502Machine;
