import type { M6502 } from "./m6502/m6502";
import { OPCODES } from "./opcodes";
import { addressing } from "./m6502/addressing";

export function registerInstructions(cpu: M6502): void {
  const {
    readByte,
    readShort,
    readZeroPage,
    readZeroPageX,
    readZeroPageY,
    readZeroPageXIndirect,
    readZeroPageYIndirect,
  } = addressing;

  cpu.instructionsMap.set(OPCODES.LDA, { instruction: cpu.LDA, address: readByte.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.LDA_ABS, { instruction: cpu.LDA_ABS, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.LDA_ABS_X, { instruction: cpu.LDA_ABS_X, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.LDA_ABS_Y, { instruction: cpu.LDA_ABS_Y, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.LDA_ZP, { instruction: cpu.LDA_ZP, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.LDA_ZP_X, { instruction: cpu.LDA_ZP_X, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.LDA_ZP_XI, { instruction: cpu.LDA_ZP_XI, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.LDA_ZP_YI, { instruction: cpu.LDA_ZP_YI, address: readZeroPage.bind(cpu) });

  cpu.instructionsMap.set(OPCODES.LDX, { instruction: cpu.LDX, address: readByte.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.LDX_ABS, { instruction: cpu.LDX_ABS, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.LDX_ABS_Y, { instruction: cpu.LDX_ABS_Y, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.LDX_ZP, { instruction: cpu.LDX_ZP, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.LDX_ZP_Y, { instruction: cpu.LDX_ZP_Y, address: readZeroPage.bind(cpu) });

  cpu.instructionsMap.set(OPCODES.LDY, { instruction: cpu.LDY, address: readByte.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.LDY_ABS, { instruction: cpu.LDY_ABS, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.LDY_ABS_X, { instruction: cpu.LDY_ABS_X, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.LDY_ZP, { instruction: cpu.LDY_ZP, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.LDY_ZP_X, { instruction: cpu.LDY_ZP_X, address: readZeroPage.bind(cpu) });

  cpu.instructionsMap.set(OPCODES.STA_ABS, { instruction: cpu.STA_ABS, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.STA_ABS_X, { instruction: cpu.STA_ABS_X, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.STA_ABS_Y, { instruction: cpu.STA_ABS_Y, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.STA_ZP, { instruction: cpu.STA_ZP, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.STA_ZP_X, { instruction: cpu.STA_ZP_X, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.STA_ZP_XI, { instruction: cpu.STA_ZP_XI, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.STA_ZP_YI, { instruction: cpu.STA_ZP_YI, address: readZeroPage.bind(cpu) });

  cpu.instructionsMap.set(OPCODES.STX_ABS, { instruction: cpu.STX_ABS, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.STX_ZP, { instruction: cpu.STX_ZP, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.STX_ZP_Y, { instruction: cpu.STX_ZPY, address: readZeroPage.bind(cpu) });

  cpu.instructionsMap.set(OPCODES.STY_ABS, { instruction: cpu.STY_ABS, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.STY_ZP, { instruction: cpu.STY_ZP, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.STY_ZP_X, { instruction: cpu.STY_ZPX, address: readZeroPage.bind(cpu) });

  cpu.instructionsMap.set(OPCODES.ADC, { instruction: cpu.ADC, address: readByte.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ADC_ABS, { instruction: cpu.ADC_ABS, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ADC_ABS_X, { instruction: cpu.ADC_ABS_X, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ADC_ABS_Y, { instruction: cpu.ADC_ABS_Y, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ADC_ZP, { instruction: cpu.ADC_ZP, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ADC_ZP_X, { instruction: cpu.ADC_ZP_X, address: readZeroPageX.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ADC_ZP_XI, { instruction: cpu.ADC_ZP_XI, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ADC_ZP_YI, { instruction: cpu.ADC_ZP_YI, address: readZeroPage.bind(cpu) });

  cpu.instructionsMap.set(OPCODES.SBC, { instruction: cpu.SBC, address: readByte.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.SBC_ABS, { instruction: cpu.SBC_ABS, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.SBC_ABS_X, { instruction: cpu.SBC_ABS_X, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.SBC_ABS_Y, { instruction: cpu.SBC_ABS_Y, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.SBC_ZP, { instruction: cpu.SBC_ZP, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.SBC_ZP_X, { instruction: cpu.SBC_ZP_X, address: readZeroPageX.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.SBC_ZP_XI, { instruction: cpu.SBC_ZP_XI, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.SBC_ZP_YI, { instruction: cpu.SBC_ZP_YI, address: readZeroPage.bind(cpu) });

  cpu.instructionsMap.set(OPCODES.AND, { instruction: cpu.AND, address: readByte.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.AND_ABS, { instruction: cpu.AND_ABS, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.AND_ABS_X, { instruction: cpu.AND_ABS_X, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.AND_ABS_Y, { instruction: cpu.AND_ABS_Y, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.AND_ZP, { instruction: cpu.AND_ZP, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.AND_ZP_X, { instruction: cpu.AND_ZP_X, address: readZeroPageX.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.AND_ZP_XI, { instruction: cpu.AND_ZP_XI, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.AND_ZP_YI, { instruction: cpu.AND_ZP_YI, address: readZeroPage.bind(cpu) });

  cpu.instructionsMap.set(OPCODES.ORA, { instruction: cpu.ORA, address: readByte.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ORA_ABS, { instruction: cpu.ORA_ABS, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ORA_ABS_X, { instruction: cpu.ORA_ABS_X, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ORA_ABS_Y, { instruction: cpu.ORA_ABS_Y, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ORA_ZP, { instruction: cpu.ORA_ZP, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ORA_ZP_X, { instruction: cpu.ORA_ZP_X, address: readZeroPageX.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ORA_ZP_XI, { instruction: cpu.ORA_ZP_XI, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ORA_ZP_YI, { instruction: cpu.ORA_ZP_YI, address: readZeroPage.bind(cpu) });

  cpu.instructionsMap.set(OPCODES.EOR, { instruction: cpu.EOR, address: readByte.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.EOR_ABS, { instruction: cpu.EOR_ABS, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.EOR_ABS_X, { instruction: cpu.EOR_ABS_X, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.EOR_ABS_Y, { instruction: cpu.EOR_ABS_Y, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.EOR_ZP, { instruction: cpu.EOR_ZP, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.EOR_ZP_X, { instruction: cpu.EOR_ZP_X, address: readZeroPageX.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.EOR_ZP_XI, { instruction: cpu.EOR_ZP_XI, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.EOR_ZP_YI, { instruction: cpu.EOR_ZP_YI, address: readZeroPage.bind(cpu) });

  cpu.instructionsMap.set(OPCODES.CMP, { instruction: cpu.CMP, address: readByte.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.CMP_ABS, { instruction: cpu.CMP_ABS, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.CMP_ABS_X, { instruction: cpu.CMP_ABS_X, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.CMP_ABS_Y, { instruction: cpu.CMP_ABS_Y, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.CMP_ZP, { instruction: cpu.CMP_ZP, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.CMP_ZP_X, { instruction: cpu.CMP_ZP_X, address: readZeroPageX.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.CMP_ZP_XI, { instruction: cpu.CMP_ZP_XI, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.CMP_ZP_YI, { instruction: cpu.CMP_ZP_YI, address: readZeroPage.bind(cpu) });

  cpu.instructionsMap.set(OPCODES.CPX, { instruction: cpu.CPX, address: readByte.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.CPX_ABS, { instruction: cpu.CPX_ABS, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.CPX_ZP, { instruction: cpu.CPX_ZP, address: readZeroPage.bind(cpu) });

  cpu.instructionsMap.set(OPCODES.CPY, { instruction: cpu.CPY, address: readByte.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.CPY_ABS, { instruction: cpu.CPY_ABS, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.CPY_ZP, { instruction: cpu.CPY_ZP, address: readZeroPage.bind(cpu) });

  cpu.instructionsMap.set(OPCODES.BIT_ABS, { instruction: cpu.BIT_ABS, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.BIT_ZP, { instruction: cpu.BIT_ZP, address: readZeroPage.bind(cpu) });

  cpu.instructionsMap.set(OPCODES.INC_ZP, { instruction: cpu.INC_ZP, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.INC_ZP_X, { instruction: cpu.INC_ZP_X, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.INC_ABS, { instruction: cpu.INC_ABS, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.INC_ABS_X, { instruction: cpu.INC_ABS_X, address: readShort.bind(cpu) });

  cpu.instructionsMap.set(OPCODES.DEC_ABS, { instruction: cpu.DEC_ABS, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.DEC_ABS_X, { instruction: cpu.DEC_ABS_X, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.DEC_ZP, { instruction: cpu.DEC_ZP, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.DEC_ZP_X, { instruction: cpu.DEC_ZP_X, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.DEX, { instruction: cpu.DEX });
  cpu.instructionsMap.set(OPCODES.DEY, { instruction: cpu.DEY });
  cpu.instructionsMap.set(OPCODES.INX, { instruction: cpu.INX });
  cpu.instructionsMap.set(OPCODES.INY, { instruction: cpu.INY });

  cpu.instructionsMap.set(OPCODES.ASL, { instruction: cpu.ASL });
  cpu.instructionsMap.set(OPCODES.ASL_ABS, { instruction: cpu.ASL_ABS, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ASL_ABS_X, { instruction: cpu.ASL_ABS_X, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ASL_ZP, { instruction: cpu.ASL_ZP, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ASL_ZP_X, { instruction: cpu.ASL_ZP_X, address: readZeroPage.bind(cpu) });

  cpu.instructionsMap.set(OPCODES.LSR, { instruction: cpu.LSR });
  cpu.instructionsMap.set(OPCODES.LSR_ABS, { instruction: cpu.LSR_ABS, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.LSR_ABS_X, { instruction: cpu.LSR_ABS_X, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.LSR_ZP, { instruction: cpu.LSR_ZP, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.LSR_ZP_X, { instruction: cpu.LSR_ZP_X, address: readZeroPage.bind(cpu) });

  cpu.instructionsMap.set(OPCODES.ROL, { instruction: cpu.ROL });
  cpu.instructionsMap.set(OPCODES.ROL_ABS, { instruction: cpu.ROL_ABS, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ROL_ABS_X, { instruction: cpu.ROL_ABS_X, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ROL_ZP, { instruction: cpu.ROL_ZP, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ROL_ZP_X, { instruction: cpu.ROL_ZP_X, address: readZeroPage.bind(cpu) });

  cpu.instructionsMap.set(OPCODES.ROR, { instruction: cpu.ROR });
  cpu.instructionsMap.set(OPCODES.ROR_ABS, { instruction: cpu.ROR_ABS, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ROR_ABS_X, { instruction: cpu.ROR_ABS_X, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ROR_ZP, { instruction: cpu.ROR_ZP, address: readZeroPage.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.ROR_ZP_X, { instruction: cpu.ROR_ZP_X, address: readZeroPage.bind(cpu) });

  cpu.instructionsMap.set(OPCODES.JMP, { instruction: cpu.JMP, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.JMP_I, { instruction: cpu.JMP_I, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.JSR, { instruction: cpu.JSR, address: readShort.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.RTS, { instruction: cpu.RTS });
  cpu.instructionsMap.set(OPCODES.RTI, { instruction: cpu.RTI });
  cpu.instructionsMap.set(OPCODES.BRK, { instruction: cpu.BRK });

  cpu.instructionsMap.set(OPCODES.CLC, { instruction: cpu.CLC });
  cpu.instructionsMap.set(OPCODES.CLD, { instruction: cpu.CLD });
  cpu.instructionsMap.set(OPCODES.CLI, { instruction: cpu.CLI });
  cpu.instructionsMap.set(OPCODES.CLV, { instruction: cpu.CLV });
  cpu.instructionsMap.set(OPCODES.SEC, { instruction: cpu.SEC });
  cpu.instructionsMap.set(OPCODES.SED, { instruction: cpu.SED });
  cpu.instructionsMap.set(OPCODES.SEI, { instruction: cpu.SEI });

  cpu.instructionsMap.set(OPCODES.BCC, { instruction: cpu.BCC, address: readByte.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.BCS, { instruction: cpu.BCS, address: readByte.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.BEQ, { instruction: cpu.BEQ, address: readByte.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.BMI, { instruction: cpu.BMI, address: readByte.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.BNE, { instruction: cpu.BNE, address: readByte.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.BPL, { instruction: cpu.BPL, address: readByte.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.BVC, { instruction: cpu.BVC, address: readByte.bind(cpu) });
  cpu.instructionsMap.set(OPCODES.BVS, { instruction: cpu.BVS, address: readByte.bind(cpu) });

  cpu.instructionsMap.set(OPCODES.TAX, { instruction: cpu.TAX });
  cpu.instructionsMap.set(OPCODES.TAY, { instruction: cpu.TAY });
  cpu.instructionsMap.set(OPCODES.TSX, { instruction: cpu.TSX });
  cpu.instructionsMap.set(OPCODES.TXA, { instruction: cpu.TXA });
  cpu.instructionsMap.set(OPCODES.TXS, { instruction: cpu.TXS });
  cpu.instructionsMap.set(OPCODES.TYA, { instruction: cpu.TYA });

  cpu.instructionsMap.set(OPCODES.NOP, { instruction: cpu.NOP });
  cpu.instructionsMap.set(OPCODES.PLA, { instruction: cpu.PLA });
  cpu.instructionsMap.set(OPCODES.PLP, { instruction: cpu.PLP });
  cpu.instructionsMap.set(OPCODES.PHA, { instruction: cpu.PHA });
  cpu.instructionsMap.set(OPCODES.PHP, { instruction: cpu.PHP });

  for (let opcode = 0; opcode < 256; opcode++) {
    if (!cpu.instructionsMap.has(opcode)) {
      cpu.instructionsMap.set(opcode, { instruction: cpu.NOP });
    }
  }
}
