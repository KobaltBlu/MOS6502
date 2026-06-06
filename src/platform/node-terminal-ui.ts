import type { IMachine } from "../core/i-machine";
import { CYCLES_PER_FRAME, TICK_DELAY_MICROSECONDS } from "../core/clock";
import { CPU_CYCLES_PER_FRAME_NTSC } from "../machines/nes/constants";
import {
  isGeneric6502Machine,
  renderGenericHud,
  renderGenericLcd,
} from "./renderers/generic-terminal";
import { isNESMachine, renderNesHud, renderNesStatus } from "./renderers/nes-terminal";
import type { NESMachine } from "../machines/nes/machine";

function getTimer(): number {
  const hrTime = process.hrtime();
  return hrTime[0] * 1000000 + hrTime[1] / 1000;
}

function renderFrame(machine: IMachine): void {
  if (isGeneric6502Machine(machine)) {
    renderGenericHud(machine);
    renderGenericLcd(machine);
    return;
  }
  if (isNESMachine(machine)) {
    renderNesHud(machine);
    renderNesStatus(machine);
  }
}

function stepRealtime(machine: IMachine): void {
  if (isNESMachine(machine)) {
    (machine as NESMachine).stepFrame();
    return;
  }
  machine.step(CYCLES_PER_FRAME);
}

export function runWithTerminal(machine: IMachine): void {
  if (process.stdout.isTTY) {
    console.clear();
  }
  machine.cpu.reset(machine.memoryMap);
  machine.reset();
  machine.running = true;

  while (machine.running) {
    const start = getTimer();
    stepRealtime(machine);
    renderFrame(machine);

    const frameBudget =
      machine.id === "nes"
        ? Math.floor(1_000_000 / 60)
        : TICK_DELAY_MICROSECONDS;

    let elapsed = getTimer() - start;
    while (elapsed < frameBudget) {
      elapsed = getTimer() - start;
    }
  }
}

export { CPU_CYCLES_PER_FRAME_NTSC };
