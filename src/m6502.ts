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

/**
 * M6502 class.
 * 
 * @extends CPU
 */
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

  /**
   * Constructor for the M6502 class.
   */
  constructor(){
    super();

    //LDA
    this.instructionsMap.set(OPCODES.LDA, {instruction: this.LDA, address: this.readByte });
    this.instructionsMap.set(OPCODES.LDA_ABS, {instruction: this.LDA_ABS, address: this.readShort });
    this.instructionsMap.set(OPCODES.LDA_ABS_X, {instruction: this.LDA_ABS_Y, address: this.readShort });
    this.instructionsMap.set(OPCODES.LDA_ZP, {instruction: this.LDA_ZP, address: this.readByte });

    this.instructionsMap.set(OPCODES.LDX, {instruction: this.LDX, address: this.readByte });
    this.instructionsMap.set(OPCODES.LDX_ABS, {instruction: this.LDX_ABS, address: this.readShort });
    this.instructionsMap.set(OPCODES.LDX_ABS_Y, {instruction: this.LDX_ABS_Y, address: this.readShort });
    this.instructionsMap.set(OPCODES.LDX_ZP, {instruction: this.LDX_ZP, address: this.readByte });
    this.instructionsMap.set(OPCODES.LDX_ZP_Y, {instruction: this.LDX_ZP_Y, address: this.readByte });

    this.instructionsMap.set(OPCODES.LDY, {instruction: this.LDY, address: this.readByte });
    this.instructionsMap.set(OPCODES.LDY_ABS, {instruction: this.LDY_ABS, address: this.readShort });
    this.instructionsMap.set(OPCODES.LDY_ABS_X, {instruction: this.LDY_ABS_X, address: this.readShort });
    this.instructionsMap.set(OPCODES.LDY_ZP, {instruction: this.LDY_ZP, address: this.readByte });
    this.instructionsMap.set(OPCODES.LDY_ZP_X, {instruction: this.LDY_ZP_X, address: this.readByte });

    this.instructionsMap.set(OPCODES.DEC_ABS, {instruction: this.DEC_ABS, address: this.readShort });
    this.instructionsMap.set(OPCODES.DEC_ABS_X, {instruction: this.DEC_ABS_X, address: this.readShort });
    this.instructionsMap.set(OPCODES.DEC_ZP, {instruction: this.DEC_ZP, address: this.readByte });
    this.instructionsMap.set(OPCODES.DEC_ZP_X, {instruction: this.DEC_ZP_X, address: this.readByte });

    this.instructionsMap.set(OPCODES.DEX, {instruction: this.DEX, address: undefined });
    this.instructionsMap.set(OPCODES.DEY, {instruction: this.DEY, address: undefined });
    
    //STA
    this.instructionsMap.set(OPCODES.STA_ABS, {instruction: this.STA_ABS, address: this.readShort });
    this.instructionsMap.set(OPCODES.STA_ABS_X, {instruction: this.STA_ABS_X, address: this.readShort });
    this.instructionsMap.set(OPCODES.STA_ABS_Y, {instruction: this.STA_ABS_Y, address: this.readShort });
    this.instructionsMap.set(OPCODES.STA_ZP, {instruction: this.STA_ZP, address: this.readByte });
    this.instructionsMap.set(OPCODES.STA_ZP_X, {instruction: this.STA_ZP_X, address: this.readByte });
    this.instructionsMap.set(OPCODES.STA_ZP_XI, {instruction: this.STA_ZP_XI, address: this.readByte });
    this.instructionsMap.set(OPCODES.STA_ZP_YI, {instruction: this.STA_ZP_YI, address: this.readByte });

    //STX
    this.instructionsMap.set(OPCODES.STX_ABS, {instruction: this.STX_ABS, address: this.readShort });
    this.instructionsMap.set(OPCODES.STX_ZP, {instruction: this.STX_ZP, address: this.readByte });
    this.instructionsMap.set(OPCODES.STX_ZPY, {instruction: this.STX_ZPY, address: this.readByte });

    //STY
    this.instructionsMap.set(OPCODES.STY_ABS, {instruction: this.STY_ABS, address: this.readShort });
    this.instructionsMap.set(OPCODES.STY_ZP, {instruction: this.STY_ZP, address: this.readByte });
    this.instructionsMap.set(OPCODES.STY_ZPX, {instruction: this.STY_ZPX, address: this.readByte });

    //IN
    this.instructionsMap.set(OPCODES.INX, {instruction: this.INX, address: undefined });
    this.instructionsMap.set(OPCODES.INY, {instruction: this.INY, address: undefined });

    //JMP
    this.instructionsMap.set(OPCODES.JMP, {instruction: this.JMP, address: this.readShort });
    this.instructionsMap.set(OPCODES.JMP_I, {instruction: this.JMP_I, address: this.readShort });

    //JSR
    this.instructionsMap.set(OPCODES.JSR, {instruction: this.JSR, address: this.readShort });
    this.instructionsMap.set(OPCODES.RTS, {instruction: this.RTS, address: undefined });

    //CLEAR
    this.instructionsMap.set(OPCODES.CLC, {instruction: this.CLC, address: undefined });
    this.instructionsMap.set(OPCODES.CLD, {instruction: this.CLD, address: undefined });
    this.instructionsMap.set(OPCODES.CLI, {instruction: this.CLI, address: undefined });
    this.instructionsMap.set(OPCODES.CLV, {instruction: this.CLV, address: undefined });

    //BRANCH
    this.instructionsMap.set(OPCODES.BCC, {instruction: this.BCC, address: this.readShort });
    this.instructionsMap.set(OPCODES.BEQ, {instruction: this.BEQ, address: this.readShort });
    this.instructionsMap.set(OPCODES.BMI, {instruction: this.BMI, address: this.readShort });
    this.instructionsMap.set(OPCODES.BNE, {instruction: this.BNE, address: this.readShort });
    this.instructionsMap.set(OPCODES.BPL, {instruction: this.BPL, address: this.readShort });
    this.instructionsMap.set(OPCODES.BVC, {instruction: this.BVC, address: this.readShort });
    this.instructionsMap.set(OPCODES.BVS, {instruction: this.BVS, address: this.readShort });

    this.instructionsMap.set(OPCODES.TAX, {instruction: this.TAX, address: undefined });
    this.instructionsMap.set(OPCODES.TAY, {instruction: this.TAY, address: undefined });
    this.instructionsMap.set(OPCODES.TSX, {instruction: this.TSX, address: undefined });
    this.instructionsMap.set(OPCODES.TXA, {instruction: this.TXA, address: undefined });
    this.instructionsMap.set(OPCODES.TXS, {instruction: this.TXS, address: undefined });
    this.instructionsMap.set(OPCODES.TYA, {instruction: this.TYA, address: undefined });

    this.instructionsMap.set(OPCODES.NOP, {instruction: this.NOP, address: undefined });
    this.instructionsMap.set(OPCODES.PLA, {instruction: this.PLA, address: undefined });
    this.instructionsMap.set(OPCODES.PLP, {instruction: this.PLP, address: undefined });
    this.instructionsMap.set(OPCODES.PHA, {instruction: this.PHA, address: undefined });
    this.instructionsMap.set(OPCODES.PHP, {instruction: this.PHP, address: undefined });
  }

  /**
   * Resets the CPU.
   * 
   * @param memory - The memory controller.
   */
  reset(memory: MemoryController){
    this.cycleCount = 0;
    this.address.fill(0);
    this.data.fill(0);
    this.programCounter = memory.readShortLE(0xFFFC);
    this.stackPointer = STACK_MAX;

    // console.log('M6502: RESET', this.programCounter, this.stackPointer);
  }

  /**
   * Executes the next instruction.
   * 
   * @param memory - The memory controller.
   */
  clock(memory: MemoryController){
    if(!this.cycleCount) {
      const instrCode = memory.readByte(this.programCounter++);
      // console.log('M6502: Clock', 'instruction', instrCode);
      this.currentInstCode = instrCode;
      this.currentInst = this.instructionsMap.get(instrCode);
      if(typeof this.currentInst === 'object'){
        this.currentIntrAddress = 0;
        if(this.currentInst.address){
          this.currentIntrAddress = this.currentInst.address.call(this, memory);
        }
        this.currentIntrCycles = this.cycleCount = this.currentInst.instruction.call(this, memory, this.currentIntrAddress);
      }
      return;
    }

    // console.log('M6502: Clock', this.cycleCount);
    this.cycleCount -= 1;
    if(this.cycleCount < 0){ this.cycleCount = 0; }
  }

  //-----------------//
  // ADDRESS READERS //
  //-----------------//

  /**
   * Reads a byte value from the program counter.
   * 
   * @param memory - The memory controller.
   * @returns The byte value read from the program counter.
   */
  readByte(memory: MemoryController){
    const address = memory.readByte(this.programCounter++);
    return address;
  }

  /**
   * Reads a short value from the program counter.
   * 
   * @param memory - The memory controller.
   * @returns The short value read from the program counter.
   */
  readShort(memory: MemoryController){
    const address = memory.readShortLE(this.programCounter++);
    this.programCounter++;
    return address;
  }

  //--------------//
  // INSTRUCTIONS //
  //--------------//

  /**
   * Loads a value into the accumulator.
   * 
   * @param memory - The memory controller.
   * @param address - The address to load the value from.
   * @returns The number of cycles used.
   */
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

  /**
   * Loads a value from an absolute address into the accumulator.
   * 
   * @param memory - The memory controller.
   * @param address - The absolute address to load the value from.
   * @returns The number of cycles used.
   */
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

  /**
   * Loads a value from an absolute address into the accumulator.
   * 
   * @param memory - The memory controller.
   * @param address - The absolute address to load the value from.
   * @returns The number of cycles used.
   */
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

  /**
   * Loads a value from an absolute address into the accumulator.
   * 
   * @param memory - The memory controller.
   * @param address - The absolute address to load the value from.
   * @returns The number of cycles used.
   */
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

  /**
   * Loads a value from a zero page address into the accumulator.
   * 
   * @param memory - The memory controller.
   * @param address - The zero page address to load the value from.
   * @returns The number of cycles used.
   */
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

  /**
   * Loads a value into the X register.
   * 
   * @param memory - The memory controller.
   * @param address - The address to load the value from.
   * @returns The number of cycles used.  
   */
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

  /**
   * Loads a value from an absolute address into the X register.
   * 
   * @param memory - The memory controller.
   * @param address - The absolute address to load the value from.
   * @returns The number of cycles used.
   */
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

  /**
   * Loads a value from an absolute address into the X register.
   * 
   * @param memory - The memory controller.
   * @param address - The absolute address to load the value from.
   * @returns The number of cycles used.
   */
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

  /**
   * Loads a value from a zero page address into the X register.
   * 
   * @param memory - The memory controller.
   * @param address - The zero page address to load the value from.
   * @returns The number of cycles used.
   */
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

  /**
   * Loads a value from a zero page address into the X register.
   * 
   * @param memory - The memory controller.
   * @param address - The zero page address to load the value from.
   * @returns The number of cycles used.
   */
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

  /**
   * Loads a value into the Y register.
   * 
   * @param memory - The memory controller.
   * @param address - The address to load the value from.
   * @returns The number of cycles used.
   */
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

  /**
   * Loads a value from an absolute address into the Y register.
   * 
   * @param memory - The memory controller.
   * @param address - The absolute address to load the value from.
   * @returns The number of cycles used.
   */
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

  /**
   * Loads a value from an absolute address into the Y register.
   * 
   * @param memory - The memory controller.
   * @param address - The absolute address to load the value from.
   * @returns The number of cycles used.
   */
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

  /**
   * Loads a value from a zero page address into the Y register.
   * 
   * @param memory - The memory controller.
   * @param address - The zero page address to load the value from.
   * @returns The number of cycles used.
   */
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

  /**
   * Loads a value from a zero page address into the Y register.
   * 
   * @param memory - The memory controller.
   * @param address - The zero page address to load the value from.
   * @returns The number of cycles used.
   */
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

  /**
   * Decrements a value at an absolute address.
   * 
   * @param memory - The memory controller.
   * @param address - The absolute address to decrement.
   * @returns The number of cycles used.
   */
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

  /**
   * Decrements a value at an absolute address.
   * 
   * @param memory - The memory controller.
   * @param address - The absolute address to decrement.
   * @returns The number of cycles used.
   */
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

  /**
   * Decrements a value at a zero page address.
   * 
   * @param memory - The memory controller.
   * @param address - The zero page address to decrement.
   * @returns The number of cycles used.
   */
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

  /**
   * Decrements a value at a zero page address.
   * 
   * @param memory - The memory controller.
   * @param address - The zero page address to decrement.
   * @returns The number of cycles used.
   */
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

  /**
   * Decrements the X register.
   * 
   * @param memory - The memory controller.
   * @param address - The address to decrement.
   * @returns The number of cycles used.
   */
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

  /**
   * Decrements the Y register.
   * 
   * @param memory - The memory controller.
   * @param address - The address to decrement.
   * @returns The number of cycles used.
   */
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

  /**
   * Performs an exclusive OR operation between the accumulator and a value.
   * 
   * @param memory - The memory controller.
   * @param address - The address to perform the operation on.
   * @returns The number of cycles used.  
   */
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

  /**
   * Performs an exclusive OR operation between the accumulator and a value.
   * 
   * @param memory - The memory controller.
   * @param address - The address to perform the operation on.
   * @returns The number of cycles used.
   */
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

  /**
   * Performs an exclusive OR operation between the accumulator and a value.
   * 
   * @param memory - The memory controller.
   * @param address - The address to perform the operation on.
   * @returns The number of cycles used.
   */
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

  /**
   * Performs an exclusive OR operation between the accumulator and a value.
   * 
   * @param memory - The memory controller.
   * @param address - The address to perform the operation on.
   * @returns The number of cycles used.
   */
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

  /**
   * Performs an exclusive OR operation between the accumulator and a value.
   * 
   * @param memory - The memory controller.
   * @param address - The address to perform the operation on.
   * @returns The number of cycles used.
   */
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

    /**
   * Performs an exclusive OR operation between the accumulator and a value.
   * 
   * @param memory - The memory controller.
   * @param address - The address to perform the operation on.
   * @returns The number of cycles used.
   */
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

  /**
   * Performs an exclusive OR operation between the accumulator and a value.
   * 
   * @param memory - The memory controller.
   * @param address - The address to perform the operation on.
   * @returns The number of cycles used.
   */
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

  /**
   * Stores the accumulator in an absolute address.
   * 
   * @param memory - The memory controller.
   * @param address - The address to store the value at.
   * @returns The number of cycles used.
   */
  STA_ABS(memory: MemoryController, address: number): number {
    memory.writeByte(address, this.accumulator)
    return 4; // return the number of cycles used
  }

  /**
   * Stores the accumulator in an absolute address.
   * 
   * @param memory - The memory controller.
   * @param address - The address to store the value at.
   * @returns The number of cycles used.
   */
  STA_ABS_X(memory: MemoryController, address: number): number {
    memory.writeByte(address + this.regX, this.accumulator)
    return 5; // return the number of cycles used
  }

  /**
   * Stores the accumulator in an absolute address.
   * 
   * @param memory - The memory controller.
   * @param address - The address to store the value at.
   * @returns The number of cycles used.
   */
  STA_ABS_Y(memory: MemoryController, address: number): number {
    memory.writeByte(address + this.regY, this.accumulator)
    return 5; // return the number of cycles used
  }

  /**
   * Stores the accumulator in a zero page address.
   * 
   * @param memory - The memory controller.
   * @param address - The address to store the value at.
   * @returns The number of cycles used.
   */
  STA_ZP(memory: MemoryController, address: number): number {
    memory.writeByte(address, this.accumulator)
    return 3; // return the number of cycles used
  }

  /**
   * Stores the accumulator in a zero page address.
   * 
   * @param memory - The memory controller.
   * @param address - The address to store the value at.
   * @returns The number of cycles used.  
   */
  STA_ZP_X(memory: MemoryController, address: number): number {
    memory.writeByte(address + this.regX, this.accumulator)
    return 4; // return the number of cycles used
  }

  /**
   * Stores the accumulator in a zero page address.
   * 
   * @param memory - The memory controller.
   * @param address - The address to store the value at.
   * @returns The number of cycles used.
   */ 
  STA_ZP_XI(memory: MemoryController, address: number): number {
    memory.writeByte(memory.readByte(address + this.regX), this.accumulator)
    return 6; // return the number of cycles used
  }

  /**
   * Stores the accumulator in a zero page address.
   * 
   * @param memory - The memory controller.
   * @param address - The address to store the value at.
   * @returns The number of cycles used.
   */
  STA_ZP_YI(memory: MemoryController, address: number): number {
    memory.writeByte(memory.readByte(address) + this.regX, this.accumulator)
    return 6; // return the number of cycles used
  }

  /**
   * Stores the X register in an absolute address.
   * 
   * @param memory - The memory controller.
   * @param address - The address to store the value at.
   * @returns The number of cycles used.
   */
  STX_ABS(memory: MemoryController, address: number): number {
    memory.writeByte(address, this.regX)
    return 4; // return the number of cycles used
  }

  /**
   * Stores the X register in a zero page address.
   * 
   * @param memory - The memory controller.
   * @param address - The address to store the value at.
   * @returns The number of cycles used.
   */
  STX_ZP(memory: MemoryController, address: number): number {
    memory.writeByte(address, this.regX)
    return 3; // return the number of cycles used
  }

  /**
   * Stores the X register in a zero page address.
   * 
   * @param memory - The memory controller.
   * @param address - The address to store the value at.
   * @returns The number of cycles used.
   */
  STX_ZPY(memory: MemoryController, address: number): number {
    memory.writeByte(address + this.regY, this.regX)
    return 4; // return the number of cycles used
  }

  /**
   * Stores the Y register in an absolute address.
   * 
   * @param memory - The memory controller.
   * @param address - The address to store the value at.
   * @returns The number of cycles used.
   */
  STY_ABS(memory: MemoryController, address: number): number {
    memory.writeByte(address, this.regY)
    return 4; // return the number of cycles used
  }

  /**
   * Stores the Y register in a zero page address.
   * 
   * @param memory - The memory controller.
   * @param address - The address to store the value at.
   * @returns The number of cycles used.
   */
  STY_ZP(memory: MemoryController, address: number): number {
    memory.writeByte(address, this.regY)
    return 3; // return the number of cycles used
  }

  /**
   * Stores the Y register in a zero page address.
   * 
   * @param memory - The memory controller.
   * @param address - The address to store the value at.
   * @returns The number of cycles used.
   */
  STY_ZPX(memory: MemoryController, address: number): number {
    memory.writeByte(address + this.regX, this.regY)
    return 4; // return the number of cycles used
  }

  /**
   * Transfers the accumulator to the X register.
   * 
   * @param memory - The memory controller.
   * @param address - The address to store the value at.
   * @returns The number of cycles used.
   */
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

  /**
   * Transfers the accumulator to the Y register.
   * 
   * @param memory - The memory controller.
   * @param address - The address to store the value at.
   * @returns The number of cycles used.
   */
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

  /**
   * Transfers the stack pointer to the X register.
   * 
   * @param memory - The memory controller.
   * @param address - The address to store the value at.
   * @returns The number of cycles used.
   */
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

  /**
   * Transfers the X register to the accumulator.
   * 
   * @param memory - The memory controller.
   * @param address - The address to store the value at.
   * @returns The number of cycles used.
   */
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

  /**
   * Transfers the X register to the stack pointer.
   * 
   * @param memory - The memory controller.
   * @param address - The address to store the value at.
   * @returns The number of cycles used.
   */
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

  /**
   * Transfers the Y register to the accumulator.
   * 
   * @param memory - The memory controller.
   * @param address - The address to store the value at.
   * @returns The number of cycles used.
   */
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

  /**
   * Increments the X register.
   * 
   * @param memory - The memory controller.
   * @param address - The address to store the value at.
   * @returns The number of cycles used.
   */
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

  /**
   * Increments the Y register.
   * 
   * @param memory - The memory controller.
   * @param address - The address to store the value at.
   * @returns The number of cycles used.
   */
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

  /**
   * Jumps to an address.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
  JMP(memory: MemoryController, address: number): number {
    this.programCounter = address;
    return 3;
  }

  /**
   * Jumps to an address.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
  JMP_I(memory: MemoryController, address: number): number {
    this.programCounter = memory.readShortLE(address);
    return 5;
  }

  /**
   * Jumps to an address.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
  JSR(memory: MemoryController, address: number): number {
    this.stackPointer -= 2;
    memory.writeShortLE(this.stackPointer, this.programCounter);
    this.programCounter = address;
    return 6;
  }

  /**
   * Jumps to an address.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
  RTS(memory: MemoryController, address: number): number {
    this.programCounter = memory.readShortLE(this.stackPointer);
    this.stackPointer += 2;
    return 6;
  }

  /**
   * Jumps to an address.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
  RTI(memory: MemoryController, address: number): number {
    this.status = memory.readByte(this.stackPointer);
    this.stackPointer += 1;
    this.programCounter = memory.readShortLE(this.stackPointer);
    this.stackPointer += 2;
    return 6;
  }

  /**
   * Clears the carry flag.
   * 
   * @param memory - The memory controller.
   * @returns The number of cycles used.
   */
  CLC(memory: MemoryController): number {
    this.status &= ~this.FLAG_C;
    return 2;
  }

  /**
   * Clears the decimal flag.
   * 
   * @param memory - The memory controller.
   * @returns The number of cycles used.
   */
  CLD(memory: MemoryController): number {
    this.status &= ~this.FLAG_D;
    return 2;
  }

  /**
   * Clears the interrupt flag.
   * 
   * @param memory - The memory controller.
   * @returns The number of cycles used.
   */
  CLI(memory: MemoryController): number {
    this.status &= ~this.FLAG_I;
    return 2;
  }

  /**
   * Clears the overflow flag.
   * 
   * @param memory - The memory controller.
   * @returns The number of cycles used.
   */
  CLV(memory: MemoryController): number {
    this.status &= ~this.FLAG_V;
    return 2;
  }

  /**
   * Branches if the carry flag is clear.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
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

  /**
   * Branches if the carry flag is set.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
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

  /**
   * Branches if the zero flag is set.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
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

  /**
   * Branches if the negative flag is set.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
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

  /**
   * Branches if the zero flag is not set.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
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

  /**
   * Branches if the negative flag is not set.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
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

  /**
   * Branches if the overflow flag is clear.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
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

  /**
   * Branches if the overflow flag is set.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
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

  /**
   * Shifts the accumulator right.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
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

  /**
   * Shifts the accumulator right.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
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

  /**
   * Shifts the accumulator right.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
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

  /**
   * Shifts the accumulator right.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
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

  /**
   * Shifts the accumulator right.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
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

  /**
   * Shifts the accumulator right.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
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

  /**
   * Shifts the accumulator right.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
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

  /**
   * Shifts the accumulator right.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
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

  /**
   * Shifts the accumulator right.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
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

  /**
   * Shifts the accumulator right.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
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

  /**
   * Shifts the accumulator right.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
  NOP(memory: MemoryController, address: number): number {
    return 2;
  }

  /**
   * Pushes the accumulator to the stack.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
  PHA(memory: MemoryController, address: number): number {
    this.stackPointer -= 1;
    memory.writeByte(this.stackPointer, this.accumulator & 0xFF);
    return 3;
  }

  /**
   * Pushes the status register to the stack.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
  PHP(memory: MemoryController, address: number): number {
    this.stackPointer -= 1;
    memory.writeByte(this.stackPointer, this.status & 0xFF);
    return 3;
  }

  /**
   * Pulls the accumulator from the stack.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
  PLA(memory: MemoryController, address: number): number {
    this.accumulator = memory.readByte(this.stackPointer);
    this.stackPointer -= 1;
    return 4;
  }

  /**
   * Pulls the status register from the stack.
   * 
   * @param memory - The memory controller.
   * @param address - The address to jump to.
   * @returns The number of cycles used.
   */
  PLP(memory: MemoryController, address: number): number {
    this.status = memory.readByte(this.stackPointer);
    this.stackPointer -= 1;
    return 4;
  }

}
