import Bus from "./bus";
import CPU from "./cpu";
import { M6502 } from "./m6502";
import Memory from "./memory";
import { MemoryController } from "./memoryController";
import { OPCODES } from "./opcodes/m6502";
import { PPU } from "./ppu";
import ROM from "./rom";

export default class Machine {
  ram: Memory = undefined;
  cpu: CPU = undefined;
  ppu: PPU = undefined;
  bus: Bus = undefined;

  rom: ROM;
  memoryController: MemoryController;

  running: boolean = false;

  constructor() {
    this.bus = new Bus(8);
    this.ram = new Memory(0xF000);
    this.cpu = new M6502();
    this.ppu = new PPU(320, 240);

    this.rom = new ROM(0x0FFF);
    this.rom.bytes[0x0000] = OPCODES.NOP;
    this.rom.bytes[0x0000 + 1] = OPCODES.NOP;
    this.rom.bytes[0x0000 + 2] = OPCODES.NOP;
    this.rom.bytes[0x0000 + 3] = OPCODES.NOP;
    this.rom.bytes[0x0000 + 4] = OPCODES.NOP;
    this.rom.bytes[0x0000 + 5] = OPCODES.NOP;
    this.rom.bytes[0x0000 + 6] = OPCODES.NOP;
    this.rom.bytes[0x0000 + 7] = OPCODES.NOP;
    this.rom.bytes[0x0000 + 8] = OPCODES.NOP;
    this.rom.bytes[0x0000 + 9] = OPCODES.NOP;
    this.rom.bytes[0x0000 + 10] = OPCODES.NOP;
    this.rom.bytes[0x0000 + 11] = OPCODES.NOP;
    this.rom.bytes[0x0000 + 12] = OPCODES.NOP;
    this.rom.bytes[0x0000 + 13] = OPCODES.NOP;
    this.rom.bytes[0x0000 + 14] = OPCODES.NOP;
    this.rom.bytes[0x0000 + 15] = OPCODES.NOP;
    this.rom.bytes[0x0000 + 16] = OPCODES.JMP;
    this.rom.bytes[0x0000 + 17] = 0x00;
    this.rom.bytes[0x0000 + 18] = 0xF0;

    this.rom.bytes[0x0FFC] = 0x00;
    this.rom.bytes[0x0FFD] = 0xF0;

    this.memoryController = new MemoryController();
    this.memoryController.add(0x0000, this.ram);
    this.memoryController.add(0xF000, this.rom);

    console.log(this.rom.bytes);
    console.log(this.memoryController.readByte(0xF000));

    console.log(this.memoryController.readShortLE(0xFFFC));

    //Test ROM Data
    //16 NOPs
    //1 JMP back to 0xF000

    /*this.ram.bytes[0xF000 + 0] = OPCODES.NOP;
    this.ram.bytes[0xF000 + 1] = OPCODES.NOP;
    this.ram.bytes[0xF000 + 2] = OPCODES.NOP;
    this.ram.bytes[0xF000 + 3] = OPCODES.NOP;
    this.ram.bytes[0xF000 + 4] = OPCODES.NOP;
    this.ram.bytes[0xF000 + 5] = OPCODES.NOP;
    this.ram.bytes[0xF000 + 6] = OPCODES.NOP;
    this.ram.bytes[0xF000 + 7] = OPCODES.NOP;
    this.ram.bytes[0xF000 + 8] = OPCODES.NOP;
    this.ram.bytes[0xF000 + 9] = OPCODES.NOP;
    this.ram.bytes[0xF000 + 10] = OPCODES.NOP;
    this.ram.bytes[0xF000 + 11] = OPCODES.NOP;
    this.ram.bytes[0xF000 + 12] = OPCODES.NOP;
    this.ram.bytes[0xF000 + 13] = OPCODES.NOP;
    this.ram.bytes[0xF000 + 14] = OPCODES.NOP;
    this.ram.bytes[0xF000 + 15] = OPCODES.NOP;
    this.ram.bytes[0xF000 + 16] = 0x40;
    this.ram.bytes[0xF000 + 17] = 0x00;
    this.ram.bytes[0xF000 + 18] = 0xF0;

    this.ram.bytes[0xFFFC] = 0x00;
    this.ram.bytes[0xFFFD] = 0xF0;*/
  }

  run() {
    console.log('run');
    this.reset();
    this.running = true;
    this.cpu.reset(this.memoryController);
    while (this.running) {
      this.onClockTick();
    }
  }

  onClockTick() {
    console.log('Clock', 'Cycle');
    this.cpu.clock(this.memoryController);
    this.ppu.clock();
    this.ppu.clock();
    this.ppu.clock();
    // this.reset();
  }

  reset() {
    this.running = false;
  }
}
