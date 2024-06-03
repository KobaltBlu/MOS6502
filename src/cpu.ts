import type { InstructionInfo } from "./interface/InstructionInfo";
import type { MemoryController } from "./memoryController";

export default class CPU {

  /** A lookup map initialized with all of the supported instructions by their opcode */
  instructionsMap = new Map<number, InstructionInfo>();

  /** How many cycles are left for the current instruction */
  cycleCount: number = 0;

  /** Current instruction number */
  currentInst: InstructionInfo;
  currentInstCode: number = 0;
  currentIntrAddress: number = 0;
  currentIntrCycles: number = 0;
  
  constructor() {
    
  }

  reset(memory: MemoryController){
    
  }

  clock(memory: MemoryController) {

  }

}
