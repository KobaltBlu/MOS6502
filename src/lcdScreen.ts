import { MemoryController } from "./memoryController";

export class LCDScreen {

  wait: number = 0 ;

  constructor(){
    
  }

  clock(memory: MemoryController){

    if(!this.wait){
      const output = new Array(32);
      for(let i = 0; i < 32; i++){
        output[i] = String.fromCharCode(memory.readByte(0x1000 + i) || 0x20);
      }

      process.stdout.cursorTo(0, 1);
      process.stdout.write(`╔══════════════════════════════════╗`);

      process.stdout.cursorTo(0, 2);
      process.stdout.clearLine(0);
      process.stdout.write(`║ ${output.join('')} ║`);
    
      process.stdout.cursorTo(0, 3);
      process.stdout.write(`╚══════════════════════════════════╝`);
      this.wait = 1000;
    }
    this.wait -= 1;

    // process.stdout.cursorTo(0, 4);
    // process.stdout.clearLine(0);
    // process.stdout.write(`Wait: ${this.wait}`);
  }

}