import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import { NESMachine } from "../machines/nes/machine";
import type { R2A03 } from "../cpu/r2a03";

const SMB_PATH =
  "C:/Users/James/Downloads/Super Mario Bros. (Japan, USA)/Super Mario Bros. (Japan, USA).nes";

describe("Super Mario Bros ROM integration", () => {
  it("runs without PC stuck in vector table", () => {
    if (!existsSync(SMB_PATH)) {
      return;
    }

    const rom = readFileSync(SMB_PATH);
    const machine = new NESMachine();
    machine.loadMedia(new Uint8Array(rom));
    machine.cpu.reset(machine.memoryMap);
    machine.reset();

    const cpu = machine.cpu as R2A03;

    for (let frame = 0; frame < 300; frame++) {
      machine.stepFrame();
    }

    expect(cpu.programCounter).toBeGreaterThanOrEqual(0x8000);
    expect(cpu.programCounter).toBeLessThan(0xfff0);
  });
});
