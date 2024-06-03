import Bus from "./bus";
import CPU from "./cpu";
import { M6502 } from "./m6502";
import Memory from "./memory";
import { MemoryController } from "./memoryController";
import { PPU } from "./ppu";
import ROM from "./rom";
import { LCDScreen } from "./lcdScreen";

export default class Machine {
  ram: Memory = undefined;
  cpu: CPU = undefined;
  ppu: PPU = undefined;
  bus: Bus = undefined;

  rom: ROM;
  terminalScreen: LCDScreen;
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

    this.terminalScreen = new LCDScreen();
  }

  run() {
    console.log('run');
    this.reset();
    this.running = true;
    
    this.cpu.reset(this.memoryController);
    console.clear();
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

    process.stdout.clearLine(1);
    process.stdout.cursorTo(0, 0);
    process.stdout.write('M6502: instruction ' + '0x'+this.cpu.currentInstCode.toString(16) + ' cycle ' + this.cpu.cycleCount + '/' + this.cpu.currentIntrCycles + ' address ' + this.cpu.currentIntrAddress);
    
    this.terminalScreen.clock(this.memoryController);

    //Delay until x nanoseconds have elapsed
    let sElapsed = this.getTimer() - sNano;
    while(sElapsed < 60){
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
