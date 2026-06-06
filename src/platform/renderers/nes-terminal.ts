import type { NESMachine } from "../../machines/nes/machine";
import { M6502 } from "../../cpu/m6502/m6502";

export function isNESMachine(machine: unknown): machine is NESMachine {
  return (
    typeof machine === "object" &&
    machine !== null &&
    "id" in machine &&
    (machine as NESMachine).id === "nes"
  );
}

export function renderNesHud(machine: NESMachine): void {
  if (!process.stdout.isTTY) {
    return;
  }
  process.stdout.clearLine(1);
  process.stdout.cursorTo(0, 0);
  const cpu = machine.cpu as M6502;
  process.stdout.write(
    "NES: PC=$" +
      cpu.programCounter.toString(16) +
      " scanline=" +
      machine.ppu.scanline +
      " dot=" +
      machine.ppu.dot +
      " ppuCycle=" +
      machine.ppu.ppuCycle
  );
}

export function renderNesStatus(machine: NESMachine): void {
  if (!process.stdout.isTTY) {
    return;
  }
  process.stdout.cursorTo(0, 1);
  process.stdout.write("╔══════════════════════════════════╗");
  process.stdout.cursorTo(0, 2);
  process.stdout.clearLine(0);
  process.stdout.write("║ NES PPU stub — no video output   ║");
  process.stdout.cursorTo(0, 3);
  process.stdout.write("╚══════════════════════════════════╝");
}
