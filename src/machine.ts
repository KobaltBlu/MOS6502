import Bus from "./bus";
import CPU from "./cpu";
import { M6502 } from "./m6502";
import Memory from "./memory";
import { PPU } from "./ppu";
import ROM from "./rom";
import { LCDScreen } from "./lcdScreen";
import IOController from "./ioController";

export default class Machine {
  ram: Memory = undefined;
  cpu: CPU = undefined;
  ppu: PPU = undefined;
  bus: Bus = undefined;
  ioBus: Bus = undefined;
  lcdIOController: IOController = undefined;

  rom: ROM;
  lcdScreen: LCDScreen;

  running: boolean = false;

  constructor() {
    this.bus = new Bus(8);
    this.ioBus = new Bus(8);
    this.ram = new Memory(0xF000);
    this.cpu = new M6502();
    this.ppu = new PPU(320, 240);

    this.rom = new ROM(0x0FFF);

    this.lcdScreen = new LCDScreen(32, 2);
    this.lcdIOController = new IOController(2);

    this.lcdIOController.setOnBeforeClock((bus: Bus) => {
      this.lcdIOController.portIndex = -1;
      if(bus.address === 0x1770){
        this.lcdIOController.portIndex = 0;
      } else if(bus.address === 0x1771){
        this.lcdIOController.portIndex = 1;
      }
      // this.ioBus.data = 
    });

    this.lcdScreen.setOnBeforeClock((bus: Bus) => {
      
    });

    this.bus.registerDeviceAtOffset(0x1770, this.lcdIOController); //PORT 0
    this.bus.registerDeviceAtOffset(0x1771, this.lcdIOController); //PORT 1

    this.bus.registerDeviceAuto(0x0000, this.ram);
    this.bus.registerDeviceAuto(0xF000, this.rom);

    this.ioBus.registerDeviceAuto(0x0000, this.lcdScreen);
  }

  run() {
    // console.log('run');
    this.reset();
    this.running = true;
    
    this.cpu.reset(this.bus);
    // console.clear();
    
    // while (this.running) {
      this.onClockTick();
    // }
  }

  onClockTick() {
    if(!this.running){
      return;
    }
    
    //CPU
    this.cpu.clock(this.bus);

    //TERMINAL
    process.stdout.clearLine(1);
    process.stdout.cursorTo(0, 0);
    process.stdout.write('M6502: instruction ' + '0x'+this.cpu.currentInstCode.toString(16) + ' cycle ' + this.cpu.cycleCount + '/' + this.cpu.currentIntrCycles + ' address ' + this.cpu.currentIntrAddress);
    
    //BUS
    this.bus.clock();

    //DEVICES
    for(let i = 0, dLen = this.bus.devices.length; i < dLen; i++){
      this.bus.devices[i].clock(this.bus);
    }

    //NEXT TICK
    process.nextTick(() => {
      this.onClockTick();
    });
  }

  getTimer(){
    const hrTime = process.hrtime()
    return hrTime[0] * 1000000 + hrTime[1] / 1000;
  }

  reset() {
    this.running = false;
  }
}
