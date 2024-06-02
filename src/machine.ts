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

    this.memoryController = new MemoryController();
    this.memoryController.add(0x0000, this.ram);
    this.memoryController.add(0xF000, this.rom);
  }

  run() {
    console.log('run');
    this.reset();
    this.running = true;

    console.log(this.memoryController.readByte(0xF000));
    console.log(this.memoryController.readShortLE(0xFFFC));
    
    this.cpu.reset(this.memoryController);
    while (this.running) {
      this.onClockTick();
    }
  }

  onClockTick() {
    const sNano = this.getTimer();
    this.cpu.clock(this.memoryController);
    this.ppu.clock();
    this.ppu.clock();
    this.ppu.clock();
    // this.reset();

    let output = new Array(32);
    output.fill('_', 0, 32);
    for(let i = 0; i < 32; i++){
      output[i] = String.fromCharCode(this.memoryController.readByte(0x1000 + i));
    }

    console.clear();
    console.log('M6502:', 'instruction', (this.cpu as M6502).currentInstCode, 'cycle', (this.cpu as M6502).cycleCount + '/' + (this.cpu as M6502).currentIntrCycles, 'address', (this.cpu as M6502).currentIntrAddress);
    console.log(`
//////////////////////////////////////
// ${output.join('')} //
//////////////////////////////////////
  `);

    let sElapsed = this.getTimer() - sNano;
    while(sElapsed < 10000){
    // while(sElapsed < 1000000/4){
      sElapsed = this.getTimer() - sNano;
    }
  }

  getTimer(){
    const hrTime = process.hrtime()
    return hrTime[0] * 1000000 + hrTime[1] / 1000;
  }

  reset() {
    this.running = false;
  }
}
