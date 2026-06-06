import { describe, expect, it } from "vitest";
import { NesApu } from "../machines/nes/apu";
import { R2A03 } from "../cpu/r2a03";

describe("APU frame counter", () => {
  it("does not assert IRQ before $4017 is written", () => {
    const apu = new NesApu();
    const cpu = new R2A03();
    apu.bindCpu(cpu);

    for (let i = 0; i < 50_000; i++) {
      apu.tickCpuCycle();
    }

    expect(cpu.irqLine).toBe(false);
    expect(apu.readByte(0x4015) & 0x40).toBe(0);
  });

  it("clears IRQ line when $4015 is read after frame IRQ", () => {
    const apu = new NesApu();
    const cpu = new R2A03();
    apu.bindCpu(cpu);
    apu.writeByte(0x4017, 0x00);

    for (let i = 0; i < 40_000; i++) {
      apu.tickCpuCycle();
      if (cpu.irqLine) {
        break;
      }
    }

    expect(cpu.irqLine).toBe(true);
    expect(apu.readByte(0x4015) & 0x40).toBe(0x40);
    expect(cpu.irqLine).toBe(false);
  });
});
