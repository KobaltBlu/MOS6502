import CPU from "../cpu";
import { OPCODES } from "../opcodes";
import type { MemoryMap } from "../../memory/memory-map";
import { RESET_VECTOR, STACK_RESET } from "../../core/constants";
import { NMI_VECTOR, IRQ_VECTOR } from "../constants";
import { registerInstructions } from "../instruction-table";
import { loadInstructions } from "./instructions/load";
import { storeInstructions } from "./instructions/store";
import { branchInstructions } from "./instructions/branch";
import { stackInstructions } from "./instructions/stack";
import { transferInstructions } from "./instructions/transfer";
import { shiftInstructions } from "./instructions/shift";
import { rotateInstructions } from "./instructions/rotate";
import { arithmeticInstructions } from "./instructions/arithmetic";

export class M6502 extends CPU {
  opcodes: typeof OPCODES = OPCODES;
  littleEndian: boolean = true;
  supportsDecimalMode: boolean = true;

  regX: number = 0;
  regY: number = 0;
  accumulator: number = 0;
  programCounter: number = 0;
  stackPointer: number = STACK_RESET;
  status: number = 0;

  nmiPending: boolean = false;
  irqLine: boolean = false;

  FLAG_C = 1 << 0;
  FLAG_Z = 1 << 1;
  FLAG_I = 1 << 2;
  FLAG_D = 1 << 3;
  FLAG_B = 1 << 4;
  FLAG_V = 1 << 6;
  FLAG_N = 1 << 7;

  data = new Uint8Array(1);
  address = new Uint8Array(2);

  constructor() {
    super();
    Object.assign(M6502.prototype, loadInstructions);
    Object.assign(M6502.prototype, storeInstructions);
    Object.assign(M6502.prototype, branchInstructions);
    Object.assign(M6502.prototype, stackInstructions);
    Object.assign(M6502.prototype, transferInstructions);
    Object.assign(M6502.prototype, shiftInstructions);
    Object.assign(M6502.prototype, rotateInstructions);
    Object.assign(M6502.prototype, arithmeticInstructions);
    registerInstructions(this);
  }

  triggerNmi(): void {
    this.nmiPending = true;
  }

  triggerIrq(): void {
    this.irqLine = true;
  }

  clearIrq(): void {
    this.irqLine = false;
  }

  reset(memory: MemoryMap): void {
    this.cycleCount = 0;
    this.address.fill(0);
    this.data.fill(0);
    this.programCounter = memory.readShortLE(RESET_VECTOR);
    this.stackPointer = STACK_RESET;
    this.status = this.FLAG_I | 0x20;
    this.nmiPending = false;
    this.irqLine = false;
  }

  clock(memory: MemoryMap): void {
    if (!this.cycleCount) {
      if (this.nmiPending) {
        this.nmiPending = false;
        this.cycleCount = this.serviceInterrupt(memory, NMI_VECTOR, false);
        return;
      }
      if (this.irqLine && !(this.status & this.FLAG_I)) {
        this.cycleCount = this.serviceInterrupt(memory, IRQ_VECTOR, false);
        return;
      }

      const instrCode = memory.readByte(this.programCounter++);
      this.currentInstCode = instrCode;
      const instruction = this.instructionsMap.get(instrCode);
      if (!instruction) {
        this.cycleCount = 2;
        return;
      }
      this.currentInst = instruction;
      this.currentIntrAddress = 0;
      if (instruction.address) {
        this.currentIntrAddress = instruction.address(memory);
      }
      this.currentIntrCycles = this.cycleCount = instruction.instruction.call(
        this,
        memory,
        this.currentIntrAddress
      );
      return;
    }

    this.cycleCount -= 1;
    if (this.cycleCount < 0) {
      this.cycleCount = 0;
    }
  }
}

export interface M6502 extends CPU {
  [key: string]: unknown;
  LDA(memory: MemoryMap, address: number): number;
  LDA_ABS(memory: MemoryMap, address: number): number;
  LDA_ABS_X(memory: MemoryMap, address: number): number;
  LDA_ABS_Y(memory: MemoryMap, address: number): number;
  LDA_ZP(memory: MemoryMap, address: number): number;
  LDA_ZP_X(memory: MemoryMap, address: number): number;
  LDA_ZP_XI(memory: MemoryMap, address: number): number;
  LDA_ZP_YI(memory: MemoryMap, address: number): number;
  LDX(memory: MemoryMap, address: number): number;
  LDX_ABS(memory: MemoryMap, address: number): number;
  LDX_ABS_Y(memory: MemoryMap, address: number): number;
  LDX_ZP(memory: MemoryMap, address: number): number;
  LDX_ZP_Y(memory: MemoryMap, address: number): number;
  LDY(memory: MemoryMap, address: number): number;
  LDY_ABS(memory: MemoryMap, address: number): number;
  LDY_ABS_X(memory: MemoryMap, address: number): number;
  LDY_ZP(memory: MemoryMap, address: number): number;
  LDY_ZP_X(memory: MemoryMap, address: number): number;
  DEC_ABS(memory: MemoryMap, address: number): number;
  DEC_ABS_X(memory: MemoryMap, address: number): number;
  DEC_ZP(memory: MemoryMap, address: number): number;
  DEC_ZP_X(memory: MemoryMap, address: number): number;
  DEX(memory: MemoryMap, address: number): number;
  DEY(memory: MemoryMap, address: number): number;
  EOR(memory: MemoryMap, address: number): number;
  EOR_ABS(memory: MemoryMap, address: number): number;
  EOR_ABS_X(memory: MemoryMap, address: number): number;
  EOR_ABS_Y(memory: MemoryMap, address: number): number;
  EOR_ZP(memory: MemoryMap, address: number): number;
  EOR_ZP_X(memory: MemoryMap, address: number): number;
  EOR_ZP_XI(memory: MemoryMap, address: number): number;
  EOR_ZP_YI(memory: MemoryMap, address: number): number;
  STA_ABS(memory: MemoryMap, address: number): number;
  STA_ABS_X(memory: MemoryMap, address: number): number;
  STA_ABS_Y(memory: MemoryMap, address: number): number;
  STA_ZP(memory: MemoryMap, address: number): number;
  STA_ZP_X(memory: MemoryMap, address: number): number;
  STA_ZP_XI(memory: MemoryMap, address: number): number;
  STA_ZP_YI(memory: MemoryMap, address: number): number;
  STX_ABS(memory: MemoryMap, address: number): number;
  STX_ZP(memory: MemoryMap, address: number): number;
  STX_ZPY(memory: MemoryMap, address: number): number;
  STY_ABS(memory: MemoryMap, address: number): number;
  STY_ZP(memory: MemoryMap, address: number): number;
  STY_ZPX(memory: MemoryMap, address: number): number;
  TAX(memory: MemoryMap, address: number): number;
  TAY(memory: MemoryMap, address: number): number;
  TSX(memory: MemoryMap, address: number): number;
  TXA(memory: MemoryMap, address: number): number;
  TXS(memory: MemoryMap, address: number): number;
  TYA(memory: MemoryMap, address: number): number;
  INX(memory: MemoryMap, address: number): number;
  INY(memory: MemoryMap, address: number): number;
  JMP(memory: MemoryMap, address: number): number;
  JMP_I(memory: MemoryMap, address: number): number;
  JSR(memory: MemoryMap, address: number): number;
  RTS(memory: MemoryMap, address: number): number;
  RTI(memory: MemoryMap, address: number): number;
  CLC(memory: MemoryMap, address: number): number;
  CLD(memory: MemoryMap, address: number): number;
  CLI(memory: MemoryMap, address: number): number;
  CLV(memory: MemoryMap, address: number): number;
  SEC(memory: MemoryMap, address: number): number;
  SED(memory: MemoryMap, address: number): number;
  SEI(memory: MemoryMap, address: number): number;
  BCC(memory: MemoryMap, address: number): number;
  BCS(memory: MemoryMap, address: number): number;
  BEQ(memory: MemoryMap, address: number): number;
  BMI(memory: MemoryMap, address: number): number;
  BNE(memory: MemoryMap, address: number): number;
  BPL(memory: MemoryMap, address: number): number;
  BVC(memory: MemoryMap, address: number): number;
  BVS(memory: MemoryMap, address: number): number;
  LSR(memory: MemoryMap, address: number): number;
  LSR_ABS(memory: MemoryMap, address: number): number;
  LSR_ABS_X(memory: MemoryMap, address: number): number;
  LSR_ZP(memory: MemoryMap, address: number): number;
  LSR_ZP_X(memory: MemoryMap, address: number): number;
  ASL(memory: MemoryMap, address: number): number;
  ASL_ABS(memory: MemoryMap, address: number): number;
  ASL_ABS_X(memory: MemoryMap, address: number): number;
  ASL_ZP(memory: MemoryMap, address: number): number;
  ASL_ZP_X(memory: MemoryMap, address: number): number;
  ASR(memory: MemoryMap, address: number): number;
  ASR_ABS(memory: MemoryMap, address: number): number;
  ASR_ABS_X(memory: MemoryMap, address: number): number;
  ASR_ZP(memory: MemoryMap, address: number): number;
  ASR_ZP_X(memory: MemoryMap, address: number): number;
  ROL(memory: MemoryMap, address: number): number;
  ROL_ABS(memory: MemoryMap, address: number): number;
  ROL_ABS_X(memory: MemoryMap, address: number): number;
  ROL_ZP(memory: MemoryMap, address: number): number;
  ROL_ZP_X(memory: MemoryMap, address: number): number;
  ROR(memory: MemoryMap, address: number): number;
  ROR_ABS(memory: MemoryMap, address: number): number;
  ROR_ABS_X(memory: MemoryMap, address: number): number;
  ROR_ZP(memory: MemoryMap, address: number): number;
  ROR_ZP_X(memory: MemoryMap, address: number): number;
  ADC(memory: MemoryMap, address: number): number;
  ADC_ABS(memory: MemoryMap, address: number): number;
  ADC_ABS_X(memory: MemoryMap, address: number): number;
  ADC_ABS_Y(memory: MemoryMap, address: number): number;
  ADC_ZP(memory: MemoryMap, address: number): number;
  ADC_ZP_X(memory: MemoryMap, address: number): number;
  ADC_ZP_XI(memory: MemoryMap, address: number): number;
  ADC_ZP_YI(memory: MemoryMap, address: number): number;
  SBC(memory: MemoryMap, address: number): number;
  SBC_ABS(memory: MemoryMap, address: number): number;
  SBC_ABS_X(memory: MemoryMap, address: number): number;
  SBC_ABS_Y(memory: MemoryMap, address: number): number;
  SBC_ZP(memory: MemoryMap, address: number): number;
  SBC_ZP_X(memory: MemoryMap, address: number): number;
  SBC_ZP_XI(memory: MemoryMap, address: number): number;
  SBC_ZP_YI(memory: MemoryMap, address: number): number;
  AND(memory: MemoryMap, address: number): number;
  AND_ABS(memory: MemoryMap, address: number): number;
  AND_ABS_X(memory: MemoryMap, address: number): number;
  AND_ABS_Y(memory: MemoryMap, address: number): number;
  AND_ZP(memory: MemoryMap, address: number): number;
  AND_ZP_X(memory: MemoryMap, address: number): number;
  AND_ZP_XI(memory: MemoryMap, address: number): number;
  AND_ZP_YI(memory: MemoryMap, address: number): number;
  ORA(memory: MemoryMap, address: number): number;
  ORA_ABS(memory: MemoryMap, address: number): number;
  ORA_ABS_X(memory: MemoryMap, address: number): number;
  ORA_ABS_Y(memory: MemoryMap, address: number): number;
  ORA_ZP(memory: MemoryMap, address: number): number;
  ORA_ZP_X(memory: MemoryMap, address: number): number;
  ORA_ZP_XI(memory: MemoryMap, address: number): number;
  ORA_ZP_YI(memory: MemoryMap, address: number): number;
  CMP(memory: MemoryMap, address: number): number;
  CMP_ABS(memory: MemoryMap, address: number): number;
  CMP_ABS_X(memory: MemoryMap, address: number): number;
  CMP_ABS_Y(memory: MemoryMap, address: number): number;
  CMP_ZP(memory: MemoryMap, address: number): number;
  CMP_ZP_X(memory: MemoryMap, address: number): number;
  CMP_ZP_XI(memory: MemoryMap, address: number): number;
  CMP_ZP_YI(memory: MemoryMap, address: number): number;
  CPX(memory: MemoryMap, address: number): number;
  CPX_ABS(memory: MemoryMap, address: number): number;
  CPX_ZP(memory: MemoryMap, address: number): number;
  CPY(memory: MemoryMap, address: number): number;
  CPY_ABS(memory: MemoryMap, address: number): number;
  CPY_ZP(memory: MemoryMap, address: number): number;
  BIT_ABS(memory: MemoryMap, address: number): number;
  BIT_ZP(memory: MemoryMap, address: number): number;
  INC_ZP(memory: MemoryMap, address: number): number;
  INC_ZP_X(memory: MemoryMap, address: number): number;
  INC_ABS(memory: MemoryMap, address: number): number;
  INC_ABS_X(memory: MemoryMap, address: number): number;
  BRK(memory: MemoryMap, address: number): number;
  NOP(memory: MemoryMap, address: number): number;
  PHA(memory: MemoryMap, address: number): number;
  PHP(memory: MemoryMap, address: number): number;
  PLA(memory: MemoryMap, address: number): number;
  PLP(memory: MemoryMap, address: number): number;
  pushReturnAddress(memory: MemoryMap, returnAddress: number): void;
  pushStatus(memory: MemoryMap, breakFlag: boolean): void;
  serviceInterrupt(memory: MemoryMap, vector: number, breakFlag: boolean): number;
}
