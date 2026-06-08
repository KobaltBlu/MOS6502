import { describe, expect, it, vi } from "vitest";
import { Generic6502Machine } from "../machines/generic6502/machine";

describe("Generic6502Machine.step", () => {
  it("advances masterCycle by the number of CPU cycles stepped", () => {
    const machine = new Generic6502Machine();
    machine.step(1);
    expect(machine.getMasterCycle()).toBe(1);
    machine.step(4);
    expect(machine.getMasterCycle()).toBe(5);
  });

  it("calls PPU clock exactly 3 times per CPU cycle", () => {
    const machine = new Generic6502Machine();

    machine.step(10);
  });

  it("decrements LCD renderWait by the batch count", () => {
    const machine = new Generic6502Machine();
    machine.terminalScreen.renderWait = 100;

    machine.step(10);

    expect(machine.terminalScreen.renderWait).toBe(90);
  });

  it("resets masterCycle on reset()", () => {
    const machine = new Generic6502Machine();
    machine.step(42);
    machine.reset();
    expect(machine.getMasterCycle()).toBe(0);
  });

  it("defaults to stepping one CPU cycle", () => {
    const machine = new Generic6502Machine();

    machine.step();

    expect(machine.getMasterCycle()).toBe(1);
  });
});

describe("Generic6502Machine.run", () => {
  it("stops after maxSteps CPU cycles", () => {
    const machine = new Generic6502Machine();
    expect(machine.getMasterCycle()).toBe(50);
    expect(machine.running).toBe(false);
  });
});
