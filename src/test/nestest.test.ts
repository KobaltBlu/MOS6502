import { describe, expect, it } from "vitest";
import { M6502 } from "../cpu/m6502/m6502";
import { R2A03 } from "../cpu/r2a03";
import Memory from "../memory/memory";
import ROM from "../memory/rom";
import { MemoryMap } from "../memory/memory-map";
import { OPCODES } from "../cpu/opcodes";
import { NMI_VECTOR, IRQ_VECTOR } from "../cpu/constants";

type CpuTestBedOptions = {
  CpuType?: typeof M6502;
  irqVector?: number;
  nmiVector?: number;
};

function createCpuTestBed(
  program: number[],
  options: CpuTestBedOptions = {}
): { cpu: M6502; map: MemoryMap; ram: Memory } {
  const map = new MemoryMap();
  const ram = new Memory(0xf000);
  map.addRegion(0x0000, 0xefff, ram);

  const rom = new ROM(0x1000);
  const romImage = new Uint8Array(0x1000);
  for (let i = 0; i < program.length; i++) {
    romImage[i] = program[i];
  }
  romImage[0xfffc - 0xf000] = 0x00;
  romImage[0xfffd - 0xf000] = 0xf0;
  if (options.irqVector !== undefined) {
    romImage[IRQ_VECTOR - 0xf000] = options.irqVector & 0xff;
    romImage[IRQ_VECTOR + 1 - 0xf000] = (options.irqVector >> 8) & 0xff;
  }
  if (options.nmiVector !== undefined) {
    romImage[NMI_VECTOR - 0xf000] = options.nmiVector & 0xff;
    romImage[NMI_VECTOR + 1 - 0xf000] = (options.nmiVector >> 8) & 0xff;
  }
  rom.writeData(romImage);
  map.addRegion(0xf000, 0xffff, rom);

  const CpuType = options.CpuType ?? M6502;
  return { cpu: new CpuType(), map, ram };
}

function runCycles(cpu: M6502, map: MemoryMap, cycles: number): void {
  for (let i = 0; i < cycles; i++) {
    cpu.clock(map);
  }
}

function runUntil(cpu: M6502, map: MemoryMap, maxSteps: number, predicate: () => boolean): void {
  for (let i = 0; i < maxSteps; i++) {
    cpu.clock(map);
    if (cpu.cycleCount === 0 && predicate()) {
      return;
    }
  }
}

describe("6502 opcode smoke tests", () => {
  it("ADC immediate sets accumulator and carry", () => {
    const { cpu, map } = createCpuTestBed([
      OPCODES.CLC,
      OPCODES.LDA,
      0xff,
      OPCODES.ADC,
      0x01,
      OPCODES.NOP,
    ]);
    cpu.reset(map);
    runUntil(cpu, map, 40, () => (cpu.status & cpu.FLAG_C) !== 0);
    expect(cpu.accumulator).toBe(0x00);
    expect(cpu.status & cpu.FLAG_C).toBe(cpu.FLAG_C);
    expect(cpu.status & cpu.FLAG_Z).toBe(cpu.FLAG_Z);
  });

  it("SBC immediate subtracts with borrow", () => {
    const { cpu, map } = createCpuTestBed([
      OPCODES.LDA,
      0x50,
      OPCODES.SEC,
      OPCODES.SBC,
      0x30,
      OPCODES.NOP,
    ]);
    cpu.reset(map);
    runUntil(cpu, map, 40, () => cpu.accumulator === 0x20);
    expect(cpu.accumulator).toBe(0x20);
    expect(cpu.status & cpu.FLAG_C).toBe(cpu.FLAG_C);
  });

  it("BIT absolute sets N and V from memory", () => {
    const { cpu, map, ram } = createCpuTestBed([
      OPCODES.LDA,
      0x40,
      OPCODES.BIT_ABS,
      0x00,
      0x10,
      OPCODES.NOP,
    ]);
    ram.writeByte(0x1000, 0xc0);
    cpu.reset(map);
    runUntil(cpu, map, 40, () => (cpu.status & cpu.FLAG_V) === cpu.FLAG_V);
    expect(cpu.status & cpu.FLAG_N).toBe(cpu.FLAG_N);
    expect(cpu.status & cpu.FLAG_V).toBe(cpu.FLAG_V);
    expect(cpu.status & cpu.FLAG_Z).toBe(0);
  });

  it("BRK pushes return address and jumps to IRQ vector", () => {
    const { cpu, map } = createCpuTestBed(
      [OPCODES.BRK, 0x00, OPCODES.NOP, OPCODES.NOP],
      { irqVector: 0x1234 }
    );
    cpu.reset(map);
    runCycles(cpu, map, 7);
    expect(cpu.programCounter).toBe(0x1234);
    expect(cpu.status & cpu.FLAG_I).toBe(cpu.FLAG_I);
  });

  it("R2A03 ignores decimal mode during ADC", () => {
    const { cpu, map } = createCpuTestBed(
      [OPCODES.SED, OPCODES.LDA, 0x09, OPCODES.ADC, 0x01, OPCODES.NOP],
      { CpuType: R2A03 }
    );
    cpu.reset(map);
    runUntil(cpu, map, 40, () => cpu.accumulator === 0x0a);
    expect(cpu.accumulator).toBe(0x0a);
  });

  it("NMI services interrupt vector at $FFFA", () => {
    const { cpu, map } = createCpuTestBed([OPCODES.NOP, OPCODES.NOP], { nmiVector: 0x7856 });
    cpu.reset(map);
    cpu.triggerNmi();
    runCycles(cpu, map, 7);
    expect(cpu.programCounter).toBe(0x7856);
    expect(cpu.status & cpu.FLAG_I).toBe(cpu.FLAG_I);
  });

  it("counts the execution cycle as the first instruction cycle", () => {
    const { cpu, map } = createCpuTestBed([
      OPCODES.NOP,
      OPCODES.LDA,
      0x42,
      OPCODES.NOP,
    ]);
    cpu.reset(map);

    cpu.clock(map);
    expect(cpu.programCounter).toBe(0xf001);
    expect(cpu.cycleCount).toBe(1);

    cpu.clock(map);
    expect(cpu.programCounter).toBe(0xf001);
    expect(cpu.cycleCount).toBe(0);

    cpu.clock(map);
    expect(cpu.programCounter).toBe(0xf003);
    expect(cpu.accumulator).toBe(0x42);
    expect(cpu.cycleCount).toBe(1);
  });

  it("branch timing only adds a cycle when the high address byte changes", () => {
    const { cpu, map } = createCpuTestBed([]);
    cpu.status = cpu.FLAG_Z;

    cpu.programCounter = 0xf1fe;
    expect(cpu.BEQ(map, 0x01)).toBe(3);
    expect(cpu.programCounter).toBe(0xf1ff);

    cpu.programCounter = 0xf1ff;
    expect(cpu.BEQ(map, 0x01)).toBe(4);
    expect(cpu.programCounter).toBe(0xf200);
  });

  it("indexed load timing compares high address bytes for page crossing", () => {
    const { cpu, map, ram } = createCpuTestBed([]);
    ram.writeByte(0x11ff, 0x7a);
    ram.writeByte(0x1200, 0x7b);

    cpu.regX = 1;
    expect(cpu.LDA_ABS_X(map, 0x11fe)).toBe(4);
    expect(cpu.accumulator).toBe(0x7a);

    expect(cpu.LDA_ABS_X(map, 0x11ff)).toBe(5);
    expect(cpu.accumulator).toBe(0x7b);
  });

  it("zero-page indexed loads and decrements wrap within zero page", () => {
    const { cpu, map, ram } = createCpuTestBed([]);
    ram.writeByte(0x0000, 0x80);
    cpu.regX = 1;
    cpu.regY = 1;

    expect(cpu.LDY_ZP_X(map, 0xff)).toBe(4);
    expect(cpu.regY).toBe(0x80);

    expect(cpu.DEC_ZP_X(map, 0xff)).toBe(6);
    expect(ram.readByte(0x0000)).toBe(0x7f);
  });

  it("zero-page indexed ALU opcodes apply X exactly once", () => {
    const cases = [
      {
        opcode: OPCODES.ADC_ZP_X,
        setup: [OPCODES.CLC, OPCODES.LDA, 0x01],
        value: 0x02,
        decoy: 0x40,
        expect: (cpu: M6502) => expect(cpu.accumulator).toBe(0x03),
      },
      {
        opcode: OPCODES.SBC_ZP_X,
        setup: [OPCODES.SEC, OPCODES.LDA, 0x05],
        value: 0x02,
        decoy: 0x40,
        expect: (cpu: M6502) => expect(cpu.accumulator).toBe(0x03),
      },
      {
        opcode: OPCODES.AND_ZP_X,
        setup: [OPCODES.LDA, 0xf0],
        value: 0x0f,
        decoy: 0xff,
        expect: (cpu: M6502) => expect(cpu.accumulator).toBe(0x00),
      },
      {
        opcode: OPCODES.ORA_ZP_X,
        setup: [OPCODES.LDA, 0xf0],
        value: 0x0f,
        decoy: 0x00,
        expect: (cpu: M6502) => expect(cpu.accumulator).toBe(0xff),
      },
      {
        opcode: OPCODES.EOR_ZP_X,
        setup: [OPCODES.LDA, 0xff],
        value: 0x0f,
        decoy: 0xff,
        expect: (cpu: M6502) => expect(cpu.accumulator).toBe(0xf0),
      },
      {
        opcode: OPCODES.CMP_ZP_X,
        setup: [OPCODES.LDA, 0x20],
        value: 0x20,
        decoy: 0x21,
        expect: (cpu: M6502) => {
          expect(cpu.status & cpu.FLAG_Z).toBe(cpu.FLAG_Z);
          expect(cpu.status & cpu.FLAG_C).toBe(cpu.FLAG_C);
        },
      },
    ];

    for (const testCase of cases) {
      const { cpu, map, ram } = createCpuTestBed([
        OPCODES.LDX,
        0x01,
        ...testCase.setup,
        testCase.opcode,
        0x10,
        OPCODES.NOP,
      ]);
      ram.writeByte(0x11, testCase.value);
      ram.writeByte(0x12, testCase.decoy);
      cpu.reset(map);

      runUntil(cpu, map, 80, () => cpu.programCounter >= 0xf000 + 5 + testCase.setup.length);

      testCase.expect(cpu);
    }
  });

  it("indirect indexed Y load and ALU timings add a page-cross cycle", () => {
    const cases = [
      { name: "LDA", run: (cpu: M6502, map: MemoryMap) => cpu.LDA_ZP_YI(map, 0x10) },
      { name: "ADC", run: (cpu: M6502, map: MemoryMap) => cpu.ADC_ZP_YI(map, 0x10) },
      { name: "SBC", run: (cpu: M6502, map: MemoryMap) => cpu.SBC_ZP_YI(map, 0x10) },
      { name: "AND", run: (cpu: M6502, map: MemoryMap) => cpu.AND_ZP_YI(map, 0x10) },
      { name: "ORA", run: (cpu: M6502, map: MemoryMap) => cpu.ORA_ZP_YI(map, 0x10) },
      { name: "EOR", run: (cpu: M6502, map: MemoryMap) => cpu.EOR_ZP_YI(map, 0x10) },
      { name: "CMP", run: (cpu: M6502, map: MemoryMap) => cpu.CMP_ZP_YI(map, 0x10) },
    ];

    for (const testCase of cases) {
      const { cpu, map, ram } = createCpuTestBed([]);
      cpu.regY = 0x0f;
      cpu.status = cpu.FLAG_C;
      cpu.accumulator = 0xff;
      ram.writeByte(0x10, 0x20);
      ram.writeByte(0x11, 0x12);
      ram.writeByte(0x122f, 0x01);
      expect(testCase.run(cpu, map)).toBe(5);

      cpu.regY = 0x10;
      ram.writeByte(0x10, 0xf8);
      ram.writeByte(0x11, 0x12);
      ram.writeByte(0x1308, 0x01);
      expect(testCase.run(cpu, map)).toBe(6);
    }
  });

  it("absolute indexed stores wrap at the 16-bit address boundary", () => {
    const { cpu, map, ram } = createCpuTestBed([]);
    cpu.accumulator = 0x5a;
    cpu.regX = 1;
    cpu.regY = 2;

    expect(cpu.STA_ABS_X(map, 0xffff)).toBe(5);
    expect(ram.readByte(0x0000)).toBe(0x5a);

    cpu.accumulator = 0xa5;
    expect(cpu.STA_ABS_Y(map, 0xffff)).toBe(5);
    expect(ram.readByte(0x0001)).toBe(0xa5);
  });

  it("absolute indexed reads and read-modify-write instructions wrap at 16 bits", () => {
    const { cpu, map, ram } = createCpuTestBed([]);
    ram.writeByte(0x0000, 0x81);
    ram.writeByte(0x0001, 0x02);
    ram.writeByte(0x0002, 0x40);

    cpu.regX = 1;
    expect(cpu.LDA_ABS_X(map, 0xffff)).toBe(5);
    expect(cpu.accumulator).toBe(0x81);

    cpu.accumulator = 0x01;
    cpu.status &= ~cpu.FLAG_C;
    expect(cpu.ADC_ABS_X(map, 0xffff)).toBe(5);
    expect(cpu.accumulator).toBe(0x82);

    cpu.accumulator = 0xff;
    expect(cpu.EOR_ABS_X(map, 0xffff)).toBe(5);
    expect(cpu.accumulator).toBe(0x7e);

    expect(cpu.ASL_ABS_X(map, 0xffff)).toBe(7);
    expect(ram.readByte(0x0000)).toBe(0x02);
    expect(cpu.status & cpu.FLAG_C).toBe(cpu.FLAG_C);

    cpu.status |= cpu.FLAG_C;
    expect(cpu.ROL_ABS_X(map, 0xffff)).toBe(7);
    expect(ram.readByte(0x0000)).toBe(0x05);

    expect(cpu.LSR_ABS_X(map, 0xffff)).toBe(7);
    expect(ram.readByte(0x0000)).toBe(0x02);

    cpu.status |= cpu.FLAG_C;
    expect(cpu.ROR_ABS_X(map, 0xffff)).toBe(7);
    expect(ram.readByte(0x0000)).toBe(0x81);

    expect(cpu.DEC_ABS_X(map, 0xffff)).toBe(7);
    expect(ram.readByte(0x0000)).toBe(0x80);

    cpu.regX = 2;
    expect(cpu.INC_ABS_X(map, 0xffff)).toBe(7);
    expect(ram.readByte(0x0001)).toBe(0x03);
  });

  it("RTI restores the unused status bit as set", () => {
    const { cpu, map, ram } = createCpuTestBed([]);
    cpu.stackPointer = 0xfc;
    ram.writeByte(0x01fd, 0x00);
    ram.writeByte(0x01fe, 0x34);
    ram.writeByte(0x01ff, 0x12);

    expect(cpu.RTI(map, 0)).toBe(6);
    expect(cpu.status & 0x20).toBe(0x20);
    expect(cpu.programCounter).toBe(0x1234);
  });

  it("PLP restores the unused status bit as set", () => {
    const { cpu, map, ram } = createCpuTestBed([]);
    cpu.status = 0;
    cpu.stackPointer = 0xfe;
    ram.writeByte(0x01ff, 0x00);

    expect(cpu.PLP(map, 0)).toBe(4);
    expect(cpu.status & 0x20).toBe(0x20);
  });

  it("wraps opcode and operand fetches at the 16-bit program counter boundary", () => {
    const map = new MemoryMap();
    const ram = new Memory(0x10000);
    map.addRegion(0x0000, 0xffff, ram);
    const cpu = new M6502();

    ram.writeByte(0xffff, OPCODES.LDA);
    ram.writeByte(0x0000, 0x42);
    cpu.programCounter = 0xffff;

    cpu.clock(map);

    expect(cpu.accumulator).toBe(0x42);
    expect(cpu.programCounter).toBe(0x0001);
    expect(cpu.cycleCount).toBe(1);
  });

  it("JMP indirect emulates the 6502 page-wrap bug", () => {
    const { cpu, map, ram } = createCpuTestBed([]);
    ram.writeByte(0x02ff, 0x34);
    ram.writeByte(0x0200, 0x12);
    ram.writeByte(0x0300, 0xab);

    expect(cpu.JMP_I(map, 0x02ff)).toBe(5);
    expect(cpu.programCounter).toBe(0x1234);
  });

  it("reset disables IRQs and TXS does not change flags", () => {
    const { cpu, map } = createCpuTestBed([]);
    cpu.reset(map);
    expect(cpu.status & cpu.FLAG_I).toBe(cpu.FLAG_I);

    cpu.status = cpu.FLAG_Z;
    cpu.regX = 0x80;
    expect(cpu.TXS(map, 0)).toBe(2);
    expect(cpu.stackPointer).toBe(0x80);
    expect(cpu.status).toBe(cpu.FLAG_Z);
  });
});
