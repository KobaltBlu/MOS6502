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

  D: number = 0; //DISPLAY ON|OFF
  C: number = 0; //CURSOR ON|OFF
  B: number = 0; //BLINK ON|OFF
  DI: number = 0; //DECREMENT|INCREMENT
  SL: number = 0; //SHIFT LEFT|RIGHT
  DL: number = 0; //8-BIT|4-BIT
  N: number = 0; //1-LINE|2-LINE
  F: number = 0; //5x10|5x8
  BF: number = 0; //BUSY FLAG

  screenUpdated: boolean = false;

  constructor(columns: number = 32, rows: number = 1){
    super(columns * rows);
    this.columns = columns;
    this.rows = rows;
    this.currentColumn = 0;
    this.currentRow = 0;
    this.screenUpdated = true;
  }

  clock(bus: Bus){
    this.screenUpdated = false;
    if(!this.E){
      this.onClockEnd();
      return;
    }

    /**
     * INSTRUCTION REGISTER
     */
    if(!this.RS)
    {
      this.currentInstruction = this.getInstructionCode(bus.data);
      this.processInstruction(bus.data);
    }
    /**
     * DATA REGISTER
     */
    else
    {
      const address = this.currentColumn + (this.currentRow * this.columns);
      this.data.setUint8(address, bus.data);
      this.screenUpdated = true;
    }
    this.onClockEnd();
  }

  onClockEnd(){
    this.RS = 0;
    this.RW = 0;
    this.E = 0;
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

  processInstruction(data: number){
    if(this.currentInstruction == INSTR_NOP) return;
    
    if(this.currentInstruction == INSTR_CLEAR){
      this.bytes.fill(0);
      this.screenUpdated = true;
    }
    else if(this.currentInstruction == INSTR_RETN_HOME){
      this.currentColumn = 0;
      this.currentRow = 0;
      this.screenUpdated = true;
    }
    else if(this.currentInstruction == INSTR_ENTRY_MODE){
      this.DI = (data & 0x01) ? 1 : 0;
      this.SL = (data & 0x02) ? 1 : 0;
    }
    else if(this.currentInstruction == INSTR_DSPLY_STATE){
      this.D = (data & 0x01) ? 1 : 0;
      this.C = (data & 0x02) ? 1 : 0;
      this.B = (data & 0x04) ? 1 : 0;
    }
    else if(this.currentInstruction == INSTR_CD_SHIFT){
      this.SL = (data & 0x01) ? 1 : 0;
      this.DL = (data & 0x02) ? 1 : 0;
    }
    else if(this.currentInstruction == INSTR_FUNC_SET){
      this.DL = (data & 0x04) ? 1 : 0;
      this.N = (data & 0x08) ? 1 : 0;
      this.F = (data & 0x10) ? 1 : 0;
    }
  }

}