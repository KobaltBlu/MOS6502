import { Device } from "./device";
import Bus from "./bus";

const INSTR_NOP = 0x00;
const INSTR_CLEAR = 0x01;
const INSTR_RETN_HOME = 0x02;
const INSTR_ENTRY_MODE = 0x04;
const INSTR_DSPLY_STATE = 0x08;
const INSTR_CD_SHIFT = 0x10;
const INSTR_FUNC_SET = 0x20;
const INSTR_SET_CGRAM_ADDR = 0x40;
const INSTR_SET_DDRAM_ADDR = 0x80;

/**
 * I/D  = 1: Increment
 * I/D  = 0: Decrement
 * S    = 1: Accompanies display shift
 * S/C  = 1: Display shift
 * S/C  = 0: Cursor move
 * R/L  = 1: Shift to the right
 * R/L  = 0: Shift to the left
 * DL   = 1: 8 bits, DL = 0: 4 bits
 * N    = 1: 2 lines, N = 0: 1 line
 * F    = 1: 5 × 10 dots, F = 0: 5 × 8 dots
 * BF   = 1: Internally operating
 * BF   = 0: Instructions acceptable
 */

//HD44780U

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

  RS: number = 0;
  RW: number = 0;
  E: number = 0;

  D: number = 0; //DISPLAY ON/OFF
  C: number = 0; //CURSOR ON/OFF
  B: number = 0; //BLINK ON/OFF

  constructor(columns: number = 32, rows: number = 1){
    super(columns * rows);
    this.columns = columns;
    this.rows = rows;
    this.currentColumn = 0;
    this.currentRow = 0;
    // this.buffer = new Array(this.columns * this.rows);
  }

  clock(bus: Bus){
    if(!this.E) return;

    /**
     * INSTRUCTION REGISTER
     */
    if(!this.RS)
    {
      this.currentInstruction = this.getInstructionCode(bus.data);
      this.processInstruction();
    }
    /**
     * DATA REGISTER
     */
    else
    {
      const address = this.currentColumn + (this.currentRow * this.columns);
      this.data.setUint8(address, bus.data);
    }

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

  getInstructionCode(value: number): number {
    if ((value & 0x80) === 0x80) return INSTR_SET_DDRAM_ADDR;  // Set DDRAM
    if ((value & 0xC0) === 0x40) return INSTR_SET_CGRAM_ADDR;  // Set CGRAM
    if ((value & 0xE0) === 0x20) return INSTR_FUNC_SET;  // Function Set
    if ((value & 0xF0) === 0x10) return INSTR_CD_SHIFT;  // Cursor or Display Shift
    if ((value & 0xF8) === 0x08) return INSTR_DSPLY_STATE;  // Display ON/OFF
    if ((value & 0xFC) === 0x04) return INSTR_ENTRY_MODE;  // Entry Mode Set
    if (value === 0x02) return INSTR_RETN_HOME;           // Return Home
    if (value === 0x01) return INSTR_CLEAR;           // Clear Display
    return INSTR_NOP;                               // Unknown / invalid
  }

  processInstruction(){
    if(this.currentInstruction == INSTR_NOP) return;

    this.currentInstruction = INSTR_NOP;
  }

}