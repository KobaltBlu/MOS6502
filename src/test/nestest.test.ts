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
});
