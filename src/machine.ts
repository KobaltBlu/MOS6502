import Bus from "./bus";
import CPU from "./cpu";
import { M6502 } from "./m6502";
import Memory from "./memory";
import { PPU } from "./ppu";
import ROM from "./rom";
import { LCDScreen } from "./lcdScreen";
import IOController from "./ioController";

const SYSTEM_MAX_MEMORY = 0xFFFF;

const MEMORY_RAM_START = 0x0000;
const MEMORY_IO_START = 0x1770;
const MEMORY_ROM_START = 0xF000;

const RAM_SIZE = 0xF000;
const ROM_SIZE = 0x0FFF;

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
    this.ram = new Memory(RAM_SIZE);
    this.cpu = new M6502();
    this.ppu = new PPU(320, 240);

    this.rom = new ROM(ROM_SIZE);

    this.lcdScreen = new LCDScreen(32, 2);
    this.lcdIOController = new IOController(2);

    this.lcdIOController.setOnBeforeClock((bus: Bus) => {
      this.lcdIOController.portIndex = -1;
      if(bus.address === 0x1770){
        this.lcdIOController.portIndex = 0;
        this.lcdScreen.RS = bus.getBusBit(7);
        this.lcdScreen.RW = bus.getBusBit(6);
        this.lcdScreen.E = bus.getBusBit(5);
      } else if(bus.address === 0x1771){
        this.lcdIOController.portIndex = 1;
        this.lcdScreen.RS = bus.getBusBit(7);
        this.lcdScreen.RW = bus.getBusBit(6);
        this.lcdScreen.E = bus.getBusBit(5);
      }
    });

    this.lcdScreen.setOnBeforeClock((bus: Bus) => {
      
    });

    this.lcdIOController.registerPorts(this.bus, MEMORY_IO_START);

    this.bus.registerDeviceAuto(MEMORY_RAM_START, this.ram);
    this.bus.registerDeviceAuto(MEMORY_ROM_START, this.rom);

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
