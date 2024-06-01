import CPU from "./cpu";
import { MemoryController } from "./memoryController";
import { OPCODES } from "./opcodes/m6502";

//https://www.pagetable.com/c64ref/6502/

const SIGN_BIT = 7;
const PAGE_SIZE = 255;
const STACK_MIN = 0x0100;
const STACK_MAX = 0x01FF;

//TWO's complement subtraction via addition
//a + (~b + 1)

interface InstructionInfo {
  instruction: (memory?: MemoryController, address?: number) => number;
  bytes: number;
  data_bytes: number;
}

export class M6502 extends CPU {
  opcodes: typeof OPCODES = OPCODES;
  littleEndian: boolean = true;

  /** Index Register X (8bit) */
  regX: number = 0;

  /** Index Register Y (8bit) */
  regY: number = 0;

  /** Accumulator (8bit) */
  accumulator: number = 0;

  /** Position of the next instruction (16bit) */
  programCounter: number = 0;

  /** Position of the current element on the stack (8bit) */
  stackPointer: number = STACK_MAX;

  /** Status flags [NV-BDIZC] (8bit) */
  status: number = 0;

  /** Carry */
  FLAG_C = 1 << 0;

  /** Zero */
  FLAG_Z = 1 << 1;

  /** Interrupt Disable */
  FLAG_I = 1 << 2;

  /** Decimal */
  FLAG_D = 1 << 3;

  /** Break Command */
  FLAG_B = 1 << 4;

  // FLAG__ = (1 << 0);
  FLAG_V = 1 << 6;

  /** Negative */
  FLAG_N = 1 << 7;

  //PINOUT DATA
  data = new Uint8Array(1);

  //PINOUT ADDRESS
  address = new Uint8Array(2);

  /** A lookup map initialized with all of the supported instructions by their opcode */
  instructionsMap = new Map<number, (memory: MemoryController, address?: number) => number>();

  /** How many cycles are left for the current instruction */
  cycleCount: number = 0;

  constructor(){
    super();

    //LDA
    this.instructionsMap.set(OPCODES.LDA, this.LDA);
    this.instructionsMap.set(OPCODES.LDA_ABS, this.LDA_ABS);
    this.instructionsMap.set(OPCODES.LDA_ABS_X, this.LDA_ABS_Y);
    this.instructionsMap.set(OPCODES.LDA_ZP, this.LDA_ZP);

    this.instructionsMap.set(OPCODES.LDX, this.LDX);
    this.instructionsMap.set(OPCODES.LDX_ABS, this.LDX_ABS);
    this.instructionsMap.set(OPCODES.LDX_ABS_Y, this.LDX_ABS_Y);
    this.instructionsMap.set(OPCODES.LDX_ZP, this.LDX_ZP);
    this.instructionsMap.set(OPCODES.LDX_ZP_Y, this.LDX_ZP_Y);

    this.instructionsMap.set(OPCODES.LDY, this.LDY);
    this.instructionsMap.set(OPCODES.LDY_ABS, this.LDY_ABS);
    this.instructionsMap.set(OPCODES.LDY_ABS_X, this.LDY_ABS_X);
    this.instructionsMap.set(OPCODES.LDY_ZP, this.LDY_ZP);
    this.instructionsMap.set(OPCODES.LDY_ZP_X, this.LDY_ZP_X);

    this.instructionsMap.set(OPCODES.DEC_ABS, this.DEC_ABS);
    this.instructionsMap.set(OPCODES.DEC_ABS_X, this.DEC_ABS_X);
    this.instructionsMap.set(OPCODES.DEC_ZP, this.DEC_ZP);
    this.instructionsMap.set(OPCODES.DEC_ZP_X, this.DEC_ZP_X);
    this.instructionsMap.set(OPCODES.DEX, this.DEX);
    this.instructionsMap.set(OPCODES.DEY, this.DEY);

    //STX
    this.instructionsMap.set(OPCODES.STX_ABS, this.STX_ABS);
    this.instructionsMap.set(OPCODES.STX_ZP, this.STX_ZP);
    this.instructionsMap.set(OPCODES.STX_ZPY, this.STX_ZPY);

    //STY
    this.instructionsMap.set(OPCODES.STY_ABS, this.STY_ABS);
    this.instructionsMap.set(OPCODES.STY_ZP, this.STY_ZP);
    this.instructionsMap.set(OPCODES.STY_ZPX, this.STY_ZPX);
    //IN
    this.instructionsMap.set(OPCODES.INX, this.INX);
    this.instructionsMap.set(OPCODES.INY, this.INY);

    //JMP
    this.instructionsMap.set(OPCODES.JMP, this.JMP);
    this.instructionsMap.set(OPCODES.JMP_I, this.JMP_I);

    //JSR
    this.instructionsMap.set(OPCODES.JSR, this.JSR);
    this.instructionsMap.set(OPCODES.RTS, this.RTS);

    //CLEAR
    this.instructionsMap.set(OPCODES.CLC, this.CLC);
    this.instructionsMap.set(OPCODES.CLD, this.CLD);
    this.instructionsMap.set(OPCODES.CLI, this.CLI);
    this.instructionsMap.set(OPCODES.CLV, this.CLV);

    //BRANCH
    this.instructionsMap.set(OPCODES.BCC, this.BCC);
    this.instructionsMap.set(OPCODES.BEQ, this.BEQ);
    this.instructionsMap.set(OPCODES.BMI, this.BMI);
    this.instructionsMap.set(OPCODES.BNE, this.BNE);
    this.instructionsMap.set(OPCODES.BPL, this.BPL);
    this.instructionsMap.set(OPCODES.BVC, this.BVC);
    this.instructionsMap.set(OPCODES.BVS, this.BVS);

    this.instructionsMap.set(OPCODES.TAX, this.TAX);
    this.instructionsMap.set(OPCODES.TAY, this.TAY);
    this.instructionsMap.set(OPCODES.TSX, this.TSX);
    this.instructionsMap.set(OPCODES.TXA, this.TXA);
    this.instructionsMap.set(OPCODES.TXS, this.TXS);
    this.instructionsMap.set(OPCODES.TYA, this.TYA);

    this.instructionsMap.set(OPCODES.NOP, this.NOP);
    this.instructionsMap.set(OPCODES.PLA, this.PLA);
    this.instructionsMap.set(OPCODES.PLP, this.PLP);
    this.instructionsMap.set(OPCODES.PHA, this.PHA);
    this.instructionsMap.set(OPCODES.PHP, this.PHP);
    
    this.instructionsMap.set(OPCODES.STA_ABS, this.STA_ABS);
    this.instructionsMap.set(OPCODES.STA_ABS_X, this.STA_ABS_X);
    this.instructionsMap.set(OPCODES.STA_ABS_Y, this.STA_ABS_Y);
    this.instructionsMap.set(OPCODES.STA_ZP, this.STA_ZP);
    this.instructionsMap.set(OPCODES.STA_ZP_X, this.STA_ZP_X);
    this.instructionsMap.set(OPCODES.STA_ZP_XI, this.STA_ZP_XI);
    this.instructionsMap.set(OPCODES.STA_ZP_YI, this.STA_ZP_YI);
  }

  reset(memory: MemoryController){
    this.cycleCount = 0;
    this.address.fill(0);
    this.data.fill(0);
    this.programCounter = memory.readShortLE(0xFFFC);
    this.stackPointer = STACK_MAX;

    console.log('M6502: RESET', this.programCounter, this.stackPointer);
  }

  clock(memory: MemoryController){
    if(!this.cycleCount) {
      const instrCode = memory.readByte(this.programCounter++);
      console.log('M6502: Clock', 'instruction', instrCode);
      const instr = this.instructionsMap.get(instrCode);
      if(typeof instr === 'function'){
        let data = 0;
        this.cycleCount = instr.call(this, memory, data);
      }
      return;
    }

    console.log('M6502: Clock', this.cycleCount);
    this.cycleCount -= 1;
    if(this.cycleCount < 0){ this.cycleCount = 0; }
  }

  //--------------//
  // INSTRUCTIONS //
  //--------------//

  LDA(memory: MemoryController, address: number): number {
    this.accumulator = address;

    this.status &= ~this.FLAG_Z;
    if (this.accumulator == 0) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 2;
  }

  LDA_ABS(memory: MemoryController, address: number): number {
    this.accumulator = memory.readByte(address);

    this.status &= ~this.FLAG_Z;
    if (this.accumulator == 0) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 4;
  }

  LDA_ABS_X(memory: MemoryController, address: number): number {
    const offset = address + this.regX;
    this.accumulator = memory.readByte(offset);

    this.status &= ~this.FLAG_Z;
    if (this.accumulator == 0) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    if (address % PAGE_SIZE != offset % PAGE_SIZE) {
      return 5;
    }
    return 4;
  }

  LDA_ABS_Y(memory: MemoryController, address: number): number {
    const offset = address + this.regY;
    this.accumulator = memory.readByte(offset);

    this.status &= ~this.FLAG_Z;
    if (this.accumulator == 0) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    if (address % PAGE_SIZE != offset % PAGE_SIZE) {
      return 5;
    }
    return 4;
  }

  LDA_ZP(memory: MemoryController, address: number): number {
    this.accumulator = memory.readByte(address);

    this.status &= ~this.FLAG_Z;
    if (this.accumulator == 0) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 3;
  }

  LDX(memory: MemoryController, address: number): number {
    this.regX = address;

    this.status &= ~this.FLAG_Z;
    if (this.accumulator == 0) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 2;
  }

  LDX_ABS(memory: MemoryController, address: number): number {
    this.regX = memory.readByte(address);

    this.status &= ~this.FLAG_Z;
    if (this.accumulator == 0) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 4;
  }

  LDX_ABS_Y(memory: MemoryController, address: number): number {
    this.regX = memory.readByte(address + this.regY);

    this.status &= ~this.FLAG_Z;
    if (this.accumulator == 0) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    if(address % PAGE_SIZE != (address + this.regY) % PAGE_SIZE){
      return 5;
    }

    return 4;
  }

  LDX_ZP(memory: MemoryController, address: number): number {
    this.regX = memory.readByte(address);

    this.status &= ~this.FLAG_Z;
    if (this.accumulator == 0) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 3;
  }

  LDX_ZP_Y(memory: MemoryController, address: number): number {
    this.regX = memory.readByte(address + this.regY);

    this.status &= ~this.FLAG_Z;
    if (this.accumulator == 0) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 4;
  }

  LDY(memory: MemoryController, address: number): number {
    this.regY = address;

    this.status &= ~this.FLAG_Z;
    if (this.accumulator == 0) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 2;
  }

  LDY_ABS(memory: MemoryController, address: number): number {
    this.regY = memory.readByte(address);

    this.status &= ~this.FLAG_Z;
    if (this.accumulator == 0) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 4;
  }

  LDY_ABS_X(memory: MemoryController, address: number): number {
    this.regY = memory.readByte(address + this.regX);

    this.status &= ~this.FLAG_Z;
    if (this.accumulator == 0) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    if(address % PAGE_SIZE != (address + this.regX) % PAGE_SIZE){
      return 5;
    }

    return 4;
  }

  LDY_ZP(memory: MemoryController, address: number): number {
    this.regY = memory.readByte(address);

    this.status &= ~this.FLAG_Z;
    if (this.accumulator == 0) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 3;
  }

  LDY_ZP_X(memory: MemoryController, address: number): number {
    this.regY = memory.readByte(address + this.regX);

    this.status &= ~this.FLAG_Z;
    if (this.accumulator == 0) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 4;
  }

  DEC_ABS(memory: MemoryController, address: number): number {
    const result = memory.readByte(address) - 1;
    memory.writeByte(address, result);

    this.status &= ~this.FLAG_Z;
    if (!result) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((result >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 6; // return the number of cycles used
  }

  DEC_ABS_X(memory: MemoryController, address: number): number {
    const result = memory.readByte(address + this.regX) - 1;
    memory.writeByte(address + this.regX, result);

    this.status &= ~this.FLAG_Z;
    if (!result) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((result >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 6; // return the number of cycles used
  }

  DEC_ZP(memory: MemoryController, address: number): number {
    const result = memory.readByte(address) - 1;
    memory.writeByte(address, result);

    this.status &= ~this.FLAG_Z;
    if (!result) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((result >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 6; // return the number of cycles used
  }

  DEC_ZP_X(memory: MemoryController, address: number): number {
    const result = memory.readByte(address + this.regX) - 1;
    memory.writeByte(address + this.regX, result);

    this.status &= ~this.FLAG_Z;
    if (!result) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((result >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 6; // return the number of cycles used
  }

  DEX(memory: MemoryController, address: number): number {
    this.regX -= 1;

    this.status &= ~this.FLAG_Z;
    if (!this.regX) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.regX >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 4; // return the number of cycles used
  }

  DEY(memory: MemoryController, address: number): number {
    this.regY -= 1;

    this.status &= ~this.FLAG_Z;
    if (!this.regY) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.regY >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 4; // return the number of cycles used
  }

  EOR(memory: MemoryController, address: number): number {
    this.accumulator |= address;

    this.status &= ~this.FLAG_Z;
    if (!this.accumulator) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 2; // return the number of cycles used
  }

  EOR_ABS(memory: MemoryController, address: number): number {
    this.accumulator |= memory.readByte(address);

    this.status &= ~this.FLAG_Z;
    if (!this.accumulator) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 4; // return the number of cycles used
  }

  EOR_ABS_X(memory: MemoryController, address: number): number {
    this.accumulator |= memory.readByte(address + this.regX);

    this.status &= ~this.FLAG_Z;
    if (!this.accumulator) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    if(address % PAGE_SIZE != (address + this.regX) % PAGE_SIZE){
      return 5;
    }

    return 4; // return the number of cycles used
  }

  EOR_ABS_Y(memory: MemoryController, address: number): number {
    this.accumulator |= memory.readByte(address + this.regY);

    this.status &= ~this.FLAG_Z;
    if (!this.accumulator) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    if(address % PAGE_SIZE != (address + this.regY) % PAGE_SIZE){
      return 5;
    }

    return 4; // return the number of cycles used
  }

  EOR_ZP(memory: MemoryController, address: number): number {
    this.accumulator |= memory.readByte(address);

    this.status &= ~this.FLAG_Z;
    if (!this.accumulator) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 3; // return the number of cycles used
  }

  EOR_ZP_X(memory: MemoryController, address: number): number {
    this.accumulator |= memory.readByte(address + this.regX);

    this.status &= ~this.FLAG_Z;
    if (!this.accumulator) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 4; // return the number of cycles used
  }

  EOR_ZP_XI(memory: MemoryController, address: number): number {
    //Get the real address from the ZP
    let addr = memory.readByte(address + this.regX);
    addr |= (memory.readByte(address + this.regX + 1) << 8);
    
    //Use the memory addr to get the real value
    this.accumulator |= memory.readByte(addr);

    this.status &= ~this.FLAG_Z;
    if (!this.accumulator) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    return 6; // return the number of cycles used
  }

  STA_ABS(memory: MemoryController, address: number): number {
    memory.writeByte(address, this.accumulator)
    return 4; // return the number of cycles used
  }

  STA_ABS_X(memory: MemoryController, address: number): number {
    memory.writeByte(address + this.regX, this.accumulator)
    return 5; // return the number of cycles used
  }

  STA_ABS_Y(memory: MemoryController, address: number): number {
    memory.writeByte(address + this.regY, this.accumulator)
    return 5; // return the number of cycles used
  }

  STA_ZP(memory: MemoryController, address: number): number {
    memory.writeByte(address, this.accumulator)
    return 3; // return the number of cycles used
  }

  STA_ZP_X(memory: MemoryController, address: number): number {
    memory.writeByte(address + this.regX, this.accumulator)
    return 4; // return the number of cycles used
  }

  STA_ZP_XI(memory: MemoryController, address: number): number {
    memory.writeByte(memory.readByte(address + this.regX), this.accumulator)
    return 6; // return the number of cycles used
  }

  STA_ZP_YI(memory: MemoryController, address: number): number {
    memory.writeByte(memory.readByte(address) + this.regX, this.accumulator)
    return 6; // return the number of cycles used
  }

  STX_ABS(memory: MemoryController, address: number): number {
    memory.writeByte(address, this.regX)
    return 4; // return the number of cycles used
  }

  STX_ZP(memory: MemoryController, address: number): number {
    memory.writeByte(address, this.regX)
    return 3; // return the number of cycles used
  }

  STX_ZPY(memory: MemoryController, address: number): number {
    memory.writeByte(address + this.regY, this.regX)
    return 4; // return the number of cycles used
  }

  STY_ABS(memory: MemoryController, address: number): number {
    memory.writeByte(address, this.regY)
    return 4; // return the number of cycles used
  }

  STY_ZP(memory: MemoryController, address: number): number {
    memory.writeByte(address, this.regY)
    return 3; // return the number of cycles used
  }

  STY_ZPX(memory: MemoryController, address: number): number {
    memory.writeByte(address + this.regX, this.regY)
    return 4; // return the number of cycles used
  }

  TAX(memory: MemoryController, address: number): number {
    this.regX = this.accumulator;

    this.status &= ~this.FLAG_N;
    if ((this.regX >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    this.status &= ~this.FLAG_Z;
    if (!this.regX) {
      this.status |= this.FLAG_Z;
    }

    return 2; // return the number of cycles used
  }

  TAY(memory: MemoryController, address: number): number {
    this.regY = this.accumulator;

    this.status &= ~this.FLAG_N;
    if ((this.regY >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    this.status &= ~this.FLAG_Z;
    if (!this.regY) {
      this.status |= this.FLAG_Z;
    }

    return 2; // return the number of cycles used
  }

  TSX(memory: MemoryController, address: number): number {
    this.regX = this.stackPointer;

    this.status &= ~this.FLAG_N;
    if ((this.regX >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    this.status &= ~this.FLAG_Z;
    if (!this.regX) {
      this.status |= this.FLAG_Z;
    }

    return 2; // return the number of cycles used
  }

  TXA(memory: MemoryController, address: number): number {
    this.accumulator = this.regX;

    this.status &= ~this.FLAG_N;
    if ((this.regX >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    this.status &= ~this.FLAG_Z;
    if (!this.regX) {
      this.status |= this.FLAG_Z;
    }

    return 2; // return the number of cycles used
  }

  TXS(memory: MemoryController, address: number): number {
    this.stackPointer = this.regX;

    this.status &= ~this.FLAG_N;
    if ((this.regX >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    this.status &= ~this.FLAG_Z;
    if (!this.regX) {
      this.status |= this.FLAG_Z;
    }

    return 2; // return the number of cycles used
  }

  TYA(memory: MemoryController, address: number): number {
    this.accumulator = this.regY;

    this.status &= ~this.FLAG_N;
    if ((this.regY >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    this.status &= ~this.FLAG_Z;
    if (!this.regY) {
      this.status |= this.FLAG_Z;
    }

    return 2; // return the number of cycles used
  }

  INX(): number {
    this.regX = this.regX >= 255 ? 0 : this.regX + 1;

    this.status &= ~this.FLAG_N;
    if ((this.regX >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    this.status &= ~this.FLAG_Z;
    if (!this.regX) {
      this.status |= this.FLAG_Z;
    }

    return 2;
  }

  INY(): number {
    this.regY = this.regY >= 255 ? 0 : this.regY + 1;

    this.status &= ~this.FLAG_N;
    if ((this.regY >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }

    this.status &= ~this.FLAG_Z;
    if (!this.regY) {
      this.status |= this.FLAG_Z;
    }

    return 2;
  }

  JMP(memory: MemoryController, address: number): number {
    console.log('JMP', address);
    address = memory.readShortLE(this.programCounter);
    this.programCounter += 2;
    console.log('JMP', address);
    this.programCounter = address;
    return 3;
  }

  JMP_I(memory: MemoryController, address: number): number {
    this.programCounter = memory.readShortLE(address);
    return 5;
  }

  JSR(memory: MemoryController, address: number): number {
    this.stackPointer -= 2;
    memory.writeShortLE(this.stackPointer, this.programCounter);
    this.programCounter = address;
    return 6;
  }

  RTS(memory: MemoryController, address: number): number {
    this.programCounter = memory.readShortLE(this.stackPointer);
    this.stackPointer += 2;
    return 6;
  }

  RTI(memory: MemoryController, address: number): number {
    this.status = memory.readByte(this.stackPointer);
    this.stackPointer += 1;
    this.programCounter = memory.readShortLE(this.stackPointer);
    this.stackPointer += 2;
    return 6;
  }

  CLC(memory: MemoryController): number {
    this.status &= ~this.FLAG_C;
    return 2;
  }

  CLD(memory: MemoryController): number {
    this.status &= ~this.FLAG_D;
    return 2;
  }

  CLI(memory: MemoryController): number {
    this.status &= ~this.FLAG_I;
    return 2;
  }

  CLV(memory: MemoryController): number {
    this.status &= ~this.FLAG_V;
    return 2;
  }

  BCC(memory: MemoryController, address: number): number {
    if ((this.status & this.FLAG_C) == 0) {
      const old_page = this.programCounter % PAGE_SIZE;
      this.programCounter |= address;
      if (this.programCounter % PAGE_SIZE != old_page) {
        return 4;
      }
      return 3;
    }
    return 2;
  }

  BCS(memory: MemoryController, address: number): number {
    if ((this.status & this.FLAG_C) == this.FLAG_C) {
      const old_page = this.programCounter % PAGE_SIZE;
      this.programCounter |= address;
      if (this.programCounter % PAGE_SIZE != old_page) {
        return 4;
      }
      return 3;
    }
    return 2;
  }

  BEQ(memory: MemoryController, address: number): number {
    if ((this.status & this.FLAG_Z) == this.FLAG_Z) {
      const old_page = this.programCounter % PAGE_SIZE;
      this.programCounter |= address;
      if (this.programCounter % PAGE_SIZE != old_page) {
        return 4;
      }
      return 3;
    }
    return 2;
  }

  BMI(memory: MemoryController, address: number): number {
    if ((this.status & this.FLAG_N) == this.FLAG_N) {
      const old_page = this.programCounter % PAGE_SIZE;
      this.programCounter |= address;
      if (this.programCounter % PAGE_SIZE != old_page) {
        return 4;
      }
      return 3;
    }
    return 2;
  }

  BNE(memory: MemoryController, address: number): number {
    if ((this.status & this.FLAG_Z) == 0) {
      const old_page = this.programCounter % PAGE_SIZE;
      this.programCounter |= address;
      if (this.programCounter % PAGE_SIZE != old_page) {
        return 4;
      }
      return 3;
    }
    return 2;
  }

  BPL(memory: MemoryController, address: number): number {
    if ((this.status & this.FLAG_N) == 0) {
      const old_page = this.programCounter % PAGE_SIZE;
      this.programCounter |= address;
      if (this.programCounter % PAGE_SIZE != old_page) {
        return 4;
      }
      return 3;
    }
    return 2;
  }

  BVC(memory: MemoryController, address: number): number {
    if ((this.status & this.FLAG_V) == 0) {
      const old_page = this.programCounter % PAGE_SIZE;
      this.programCounter |= address;
      if (this.programCounter % PAGE_SIZE != old_page) {
        return 4;
      }
      return 3;
    }
    return 2;
  }

  BVS(memory: MemoryController, address: number): number {
    if ((this.status & this.FLAG_V) == this.FLAG_V) {
      const old_page = this.programCounter % PAGE_SIZE;
      this.programCounter |= address;
      if (this.programCounter % PAGE_SIZE != old_page) {
        return 4;
      }
      return 3;
    }
    return 2;
  }

  LSR(memory: MemoryController, address: number): number {
    this.status &= ~this.FLAG_C;
    if((this.accumulator & 0x01) == 0x01){
      this.status |= this.FLAG_C;
    }

    this.accumulator = this.accumulator >> 1;

    this.status &= ~this.FLAG_N;
    this.status &= ~this.FLAG_Z;
    if (!this.accumulator) {
      this.status |= this.FLAG_Z;
    }
    return 2;
  }

  LSR_ABS(memory: MemoryController, address: number): number {
    this.status &= ~this.FLAG_C;
    if((memory.readByte(address) & 0x01) == 0x01){
      this.status |= this.FLAG_C;
    }

    memory.writeByte(address, memory.readByte(address) >> 1)

    this.status &= ~this.FLAG_N;
    this.status &= ~this.FLAG_Z;
    if (!memory.readByte(address)) {
      this.status |= this.FLAG_Z;
    }
    return 6;
  }

  LSR_ABS_X(memory: MemoryController, address: number): number {
    this.status &= ~this.FLAG_C;
    if((memory.readByte(address + this.regX) & 0x01) == 0x01){
      this.status |= this.FLAG_C;
    }

    memory.writeByte(address + this.regX, memory.readByte(address + this.regX) >> 1)

    this.status &= ~this.FLAG_N;
    this.status &= ~this.FLAG_Z;
    if (!memory.readByte(address + this.regX)) {
      this.status |= this.FLAG_Z;
    }
    return 6;
  }

  LSR_ZP(memory: MemoryController, address: number): number {
    this.status &= ~this.FLAG_C;
    if((memory.readByte(address) & 0x01) == 0x01){
      this.status |= this.FLAG_C;
    }

    memory.writeByte(address, memory.readByte(address) >> 1)

    this.status &= ~this.FLAG_N;
    this.status &= ~this.FLAG_Z;
    if (!memory.readByte(address)) {
      this.status |= this.FLAG_Z;
    }
    return 6;
  }

  LSR_ZP_X(memory: MemoryController, address: number): number {
    this.status &= ~this.FLAG_C;
    if((memory.readByte(address + this.regX) & 0x01) == 0x01){
      this.status |= this.FLAG_C;
    }

    memory.writeByte(address + this.regX, memory.readByte(address + this.regX) >> 1)

    this.status &= ~this.FLAG_N;
    this.status &= ~this.FLAG_Z;
    if (!memory.readByte(address + this.regX)) {
      this.status |= this.FLAG_Z;
    }
    return 6;
  }

  ASR(memory: MemoryController, address: number): number {
    this.status &= ~this.FLAG_C;
    if((this.accumulator & 0x01) == 0x01){
      this.status |= this.FLAG_C;
    }

    this.accumulator = (this.accumulator << 1) & 0xFF;
    this.status &= ~this.FLAG_N;
    this.status &= ~this.FLAG_Z;
    if (!this.accumulator) {
      this.status |= this.FLAG_Z;
    }
    return 2;
  }

  ASR_ABS(memory: MemoryController, address: number): number {
    this.status &= ~this.FLAG_C;
    if((memory.readByte(address) & 0x01) == 0x01){
      this.status |= this.FLAG_C;
    }

    memory.writeByte(address, (memory.readByte(address) << 1) & 0xFF)

    this.status &= ~this.FLAG_N;
    this.status &= ~this.FLAG_Z;
    if (!memory.readByte(address)) {
      this.status |= this.FLAG_Z;
    }
    return 6;
  }

  ASR_ABS_X(memory: MemoryController, address: number): number {
    this.status &= ~this.FLAG_C;
    if((memory.readByte(address + this.regX) & 0x01) == 0x01){
      this.status |= this.FLAG_C;
    }

    memory.writeByte(address + this.regX, (memory.readByte(address + this.regX) << 1) & 0xFF)

    this.status &= ~this.FLAG_N;
    this.status &= ~this.FLAG_Z;
    if (!memory.readByte(address + this.regX)) {
      this.status |= this.FLAG_Z;
    }
    return 6;
  }

  ASR_ZP(memory: MemoryController, address: number): number {
    this.status &= ~this.FLAG_C;
    if((memory.readByte(address) & 0x01) == 0x01){
      this.status |= this.FLAG_C;
    }

    memory.writeByte(address, (memory.readByte(address) << 1) & 0xFF)

    this.status &= ~this.FLAG_N;
    this.status &= ~this.FLAG_Z;
    if (!memory.readByte(address)) {
      this.status |= this.FLAG_Z;
    }
    return 6;
  }

  ASR_ZP_X(memory: MemoryController, address: number): number {
    this.status &= ~this.FLAG_C;
    if((memory.readByte(address + this.regX) & 0x01) == 0x01){
      this.status |= this.FLAG_C;
    }

    memory.writeByte(address + this.regX, (memory.readByte(address + this.regX) << 1) & 0xFF)

    this.status &= ~this.FLAG_N;
    this.status &= ~this.FLAG_Z;
    if (!memory.readByte(address + this.regX)) {
      this.status |= this.FLAG_Z;
    }
    return 6;
  }

  NOP(memory: MemoryController, address: number): number {
    return 2;
  }

  PHA(memory: MemoryController, address: number): number {
    this.stackPointer -= 1;
    memory.writeByte(this.stackPointer, this.accumulator & 0xFF);
    return 3;
  }

  PHP(memory: MemoryController, address: number): number {
    this.stackPointer -= 1;
    memory.writeByte(this.stackPointer, this.status & 0xFF);
    return 3;
  }

  PLA(memory: MemoryController, address: number): number {
    this.accumulator = memory.readByte(this.stackPointer);
    this.stackPointer -= 1;
    return 4;
  }

  PLP(memory: MemoryController, address: number): number {
    this.status = memory.readByte(this.stackPointer);
    this.stackPointer -= 1;
    return 4;
  }

}
