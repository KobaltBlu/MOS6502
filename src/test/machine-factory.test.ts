import { describe, expect, it } from "vitest";
import { createMachine, parseMachineId } from "../core/machine-factory";
import { Generic6502Machine } from "../machines/generic6502/machine";
import { NESMachine } from "../machines/nes/machine";

describe("machine factory", () => {
  it("creates generic6502 by default", () => {
    const machine = createMachine("generic6502");
    expect(machine).toBeInstanceOf(Generic6502Machine);
    expect(machine.id).toBe("generic6502");
  });

  it("creates NES machine", () => {
    const machine = createMachine("nes");
    expect(machine).toBeInstanceOf(NESMachine);
    expect(machine.id).toBe("nes");
  });

  it("parses machine ids", () => {
    expect(parseMachineId("nes")).toBe("nes");
    expect(parseMachineId("generic6502")).toBe("generic6502");
    expect(parseMachineId(undefined)).toBe("generic6502");
  });
});
