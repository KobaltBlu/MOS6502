import type { Generic6502Machine } from "../../machines/generic6502/machine";
import { LCD_RENDER_THROTTLE } from "../../core/clock";

export function isGeneric6502Machine(machine: unknown): machine is Generic6502Machine {
  return (
    typeof machine === "object" &&
    machine !== null &&
    "id" in machine &&
    (machine as Generic6502Machine).id === "generic6502"
  );
}

export function renderGenericHud(machine: Generic6502Machine): void {
  if (!process.stdout.isTTY) {
    return;
  }
  process.stdout.clearLine(1);
  process.stdout.cursorTo(0, 0);
  process.stdout.write(
    "M6502: instruction 0x" +
      machine.cpu.currentInstCode.toString(16) +
      " cycle " +
      machine.cpu.cycleCount +
      "/" +
      machine.cpu.currentIntrCycles +
      " address " +
      machine.cpu.currentIntrAddress
  );
}

export function renderGenericLcd(machine: Generic6502Machine): void {
  if (!process.stdout.isTTY) {
    return;
  }
  if (!machine.terminalScreen.shouldRender()) {
    return;
  }

  const output = machine.terminalScreen.getDisplayText();

  process.stdout.cursorTo(0, 1);
  process.stdout.write("╔══════════════════════════════════╗");

  process.stdout.cursorTo(0, 2);
  process.stdout.clearLine(0);
  process.stdout.write(`║ ${output} ║`);

  process.stdout.cursorTo(0, 3);
  process.stdout.write("╚══════════════════════════════════╝");

  machine.terminalScreen.markRendered(LCD_RENDER_THROTTLE);
}
