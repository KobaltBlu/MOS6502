import type { IMachine } from "./i-machine";
import { Generic6502Machine } from "../machines/generic6502/machine";
import { NESMachine } from "../machines/nes/machine";

export type MachineId = "generic6502" | "nes";

export function createMachine(id: MachineId): IMachine {
  switch (id) {
    case "nes":
      return new NESMachine();
    case "generic6502":
    default:
      return new Generic6502Machine();
  }
}

export function parseMachineId(value: string | undefined): MachineId {
  if (value === "nes") {
    return "nes";
  }
  return "generic6502";
}
