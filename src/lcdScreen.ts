import { Device } from "./device";
import Bus from "./bus";

const INSTR_NOP = 0x00;
const INSTR_CLEAR = 0x01;
const INSTR_WRITE_CHAR = 0x20;

/**
 * LCD Screen
 */
export class LCDScreen extends Device {
  name: string = 'LCD Screen';
  wait: number = 0;
  columns: number = 32;
  rows: number = 1;
  currentColumn: number = 0;
  currentRow: number = 0;
  currentInstruction: number = 0;

  // buffer: string[] = new Array(this.columns);
  clear: boolean = false;

  constructor(columns: number = 32, rows: number = 1){
    super(columns * rows);
    this.columns = columns;
    this.rows = rows;
    this.currentColumn = 0;
    this.currentRow = 0;
    // this.buffer = new Array(this.columns * this.rows);
  }

  clock(bus: Bus){

    /*
    if(this.clear){
      this.buffer.fill(' ');
      const nColumns = this.columns + 4;
      for(let i = 0; i < nColumns; i++){
        if(i == 0){
          this.buffer[i] = '╔';
        }
        else if(i == nColumns - 1){
          this.buffer[i] = '╗';
        }
        else if(i == this.columns * this.rows){
          this.buffer[i] = '╚';
        }
        else if(i == this.columns * this.rows + this.columns + 3){
          this.buffer[i] = '╝';
        }
        else{
          this.buffer[i] = '═';
        }
      }
      this.clear = false;
      return;
    }

    if(!this.wait){
      const char = String.fromCharCode(bus.readByte(this.ramOffset + this.currentColumn) || 0x20);
      this.buffer[this.currentColumn] = char;


      // for(let i = 0; i < this.columns; i++){
      //   this.buffer[i] = String.fromCharCode(memory.readByte(this.ramOffset + i) || 0x20);
      // }

      process.stdout.clearLine(0);
      process.stdout.cursorTo(0, 0);

      const nColumns = this.columns + 4;
      const nRight = nColumns - 1;
      const top = new Array(nColumns);
      top.fill('═');
      top[0] = '╔';
      top[nRight] = '╗';

      const bottom = new Array(nColumns);
      bottom.fill('═');
      bottom[0] = '╚';
      bottom[nRight] = '╝';

      process.stdout.cursorTo(0, 1);
      process.stdout.write(top.join(''));

      process.stdout.cursorTo(0, 2);
      process.stdout.clearLine(0);
      process.stdout.write(`║ ${this.buffer.join('')} ║`);
    
      process.stdout.cursorTo(0, 3);
      process.stdout.write(bottom.join(''));

      this.wait = 1000;
    }
    this.wait -= 1;

    // process.stdout.cursorTo(0, 4);
    // process.stdout.clearLine(0);
    // process.stdout.write(`Wait: ${this.wait}`);

    */
  }

}