import { describe, expect, it } from "vitest";
import { NesApu } from "../machines/nes/apu";
import { R2A03 } from "../cpu/r2a03";

describe("DMC DMA steal", () => {
  it("stalls CPU cycles when DMC sample fetch is active", () => {
    const apu = new NesApu();
    const cpu = new R2A03();
    apu.bindCpu(cpu);
    apu.writeByte(0x4015, 0x10);

    let stalled = 0;
    for (let i = 0; i < 5000; i++) {
      if (apu.isDmcStalled()) {
        stalled++;
      }
      apu.tickCpuCycle();
    }

    expect(stalled).toBeGreaterThan(0);
  });
});
