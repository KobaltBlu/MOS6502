import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { M6502 } from "../cpu/m6502/m6502";
import { R2A03 } from "../cpu/r2a03";
import Memory from "../memory/memory";
import { MemoryMap } from "../memory/memory-map";

const NESTEST_ROM = path.join(__dirname, "roms", "nestest.nes");

function loadNestestIfPresent(): Uint8Array | null {
  if (!existsSync(NESTEST_ROM)) {
    return null;
  }
  return readFileSync(NESTEST_ROM);
}

describe("nestest integration", () => {
  it("runs nestest ROM headlessly when present", () => {
    const rom = loadNestestIfPresent();
    if (!rom) {
      return;
    }

    const map = new MemoryMap();
    const ram = new Memory(0x800);
    map.addRegion(0x0000, 0x1fff, ram);
    const prg = rom.slice(16, 16 + rom[4] * 0x4000);
    const prgDevice = {
      readByte: (address: number) => prg[address - 0x8000] ?? 0,
      writeByte: () => {},
      readShortLE: (address: number) =>
        (prg[address - 0x8000] ?? 0) | ((prg[address - 0x8000 + 1] ?? 0) << 8),
      writeShortLE: () => {},
    };
    map.addRegion(0x8000, 0xffff, prgDevice);

    const cpu = new R2A03();
    cpu.reset(map);
    for (let i = 0; i < 100_000; i++) {
      cpu.clock(map);
    }
    expect(cpu.programCounter).toBeGreaterThan(0x8000);
  });

  it("validates R2A03 is used for NES CPU class", () => {
    expect(new R2A03()).toBeInstanceOf(M6502);
  });
});
