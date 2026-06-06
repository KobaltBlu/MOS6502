import { describe, expect, it } from "vitest";
import { M6502 } from "../cpu/m6502/m6502";
import Memory from "../memory/memory";
import ROM from "../memory/rom";
import { MemoryMap } from "../memory/memory-map";
import { OPCODES } from "../cpu/opcodes";

function createCpuTestBed(program: number[]): { cpu: M6502; map: MemoryMap } {
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
  rom.writeData(romImage);
  map.addRegion(0xf000, 0xffff, rom);

  return { cpu: new M6502(), map };
}

function runUntil(cpu: M6502, map: MemoryMap, maxSteps: number, predicate: () => boolean): void {
  for (let i = 0; i < maxSteps; i++) {
    cpu.clock(map);
    if (cpu.cycleCount === 0 && predicate()) {
      return;
    }
  }
}

describe("M6502 smoke tests", () => {
  it("executes LDA immediate", () => {
    const { cpu, map } = createCpuTestBed([OPCODES.LDA, 0x2a, OPCODES.NOP]);
    cpu.reset(map);
    runUntil(cpu, map, 10, () => cpu.accumulator === 0x2a);
    expect(cpu.accumulator).toBe(0x2a);
  });

  it("branches when BEQ condition is met", () => {
    const { cpu, map } = createCpuTestBed([
      OPCODES.LDA,
      0x00,
      OPCODES.BEQ,
      0x03,
      OPCODES.NOP,
      OPCODES.LDA,
      0x01,
      OPCODES.LDA,
      0x02,
    ]);
    cpu.reset(map);
    runUntil(cpu, map, 40, () => cpu.accumulator === 0x02);
    expect(cpu.accumulator).toBe(0x02);
  });

  it("round-trips PHA and PLA", () => {
    const { cpu, map } = createCpuTestBed([
      OPCODES.LDA,
      0x55,
      OPCODES.PHA,
      OPCODES.LDA,
      0x00,
      OPCODES.PLA,
    ]);
    cpu.reset(map);
    runUntil(cpu, map, 60, () => cpu.accumulator === 0x55);
    expect(cpu.accumulator).toBe(0x55);
  });

  it("DEX wraps from 0 to 255", () => {
    const { cpu, map } = createCpuTestBed([OPCODES.LDX, 0x00, OPCODES.DEX, OPCODES.NOP]);
    cpu.reset(map);
    runUntil(cpu, map, 20, () => cpu.regX === 0xff);
    expect(cpu.regX).toBe(0xff);
    expect(cpu.status & cpu.FLAG_N).toBe(cpu.FLAG_N);
  });
});
