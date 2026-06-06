import { describe, expect, it, vi } from "vitest";
import { NESMachine } from "../machines/nes/machine";
import { CPU_CYCLES_PER_FRAME_NTSC } from "../machines/nes/constants";

describe("NESMachine", () => {
  it("preserves 3:1 PPU clock ratio when stepping CPU cycles", () => {
    const machine = new NESMachine();
    const ppuClock = vi.spyOn(machine.ppu, "clock");

    machine.step(10);

    expect(ppuClock).toHaveBeenCalledTimes(30);
    ppuClock.mockRestore();
  });

  it("stepFrame advances one NTSC CPU frame", () => {
    const machine = new NESMachine();
    machine.stepFrame();
    expect(machine.getMasterCycle()).toBe(CPU_CYCLES_PER_FRAME_NTSC);
  });

  it("loads iNES programs via loadProgram", () => {
    const machine = new NESMachine();
    const rom = new Uint8Array(16 + 0x4000);
    rom[0] = 0x4e;
    rom[1] = 0x45;
    rom[2] = 0x53;
    rom[3] = 0x1a;
    rom[4] = 1;
    rom[5] = 0;
    rom[16] = 0x99;

    machine.loadProgram(rom);
    expect(machine.memoryMap.readByte(0x8000)).toBe(0x99);
  });
});
