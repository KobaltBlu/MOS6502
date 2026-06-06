import { describe, expect, it } from "vitest";
import { CPU_CLOCK_NTSC, NesApu, SAMPLE_RATE } from "../machines/nes/apu";
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

describe("APU audio output", () => {
  it("outputs zero-centered silence when channels are disabled", () => {
    const apu = new NesApu();

    for (let i = 0; i < 2000; i++) {
      apu.tickCpuCycle();
    }

    const samples = apu.consumeFrameBuffer();
    expect(samples.length).toBeGreaterThan(0);
    expect(Array.from(samples).every((sample) => sample === 0)).toBe(true);
  });

  it("paces generated samples across CPU cycles instead of filling immediately", () => {
    const apu = new NesApu();

    for (let i = 0; i < 800; i++) {
      apu.tickCpuCycle();
    }

    const samples = apu.consumeFrameBuffer();
    const expectedMax = Math.ceil((800 * SAMPLE_RATE) / CPU_CLOCK_NTSC);
    expect(samples.length).toBeLessThanOrEqual(expectedMax);
  });

  it("produces varying pulse samples when a pulse channel is enabled", () => {
    const apu = new NesApu();
    apu.writeByte(0x4000, 0x3f);
    apu.writeByte(0x4002, 0x20);
    apu.writeByte(0x4003, 0x00);
    apu.writeByte(0x4015, 0x01);

    for (let i = 0; i < 5000; i++) {
      apu.tickCpuCycle();
    }

    const unique = new Set(Array.from(apu.consumeFrameBuffer()));
    expect(unique.size).toBeGreaterThan(1);
  });
});
