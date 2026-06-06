import type { IMachine } from "../core/i-machine";
import type { IHost } from "./host";
import { CYCLES_PER_FRAME, TICK_DELAY_MICROSECONDS } from "../core/clock";
import { isGeneric6502Machine, renderGenericHud, renderGenericLcd } from "./renderers/generic-terminal";
import { isNESMachine } from "./renderers/nes-terminal";
import type { NESMachine } from "../machines/nes/machine";
import type { R2A03 } from "../cpu/r2a03";
import { nesLog, setLastFrameSnapshot } from "./nes-debug-log";

export interface RunMachineOptions {
  loadGeneration?: number;
}

let webFrameLoopId = 0;
let activeWebLoopId = 0;

function getTimer(): number {
  if (typeof process !== "undefined" && process.hrtime) {
    const hrTime = process.hrtime();
    return hrTime[0] * 1000000 + hrTime[1] / 1000;
  }
  return performance.now() * 1000;
}

export function runMachine(
  machine: IMachine,
  host: IHost,
  options: RunMachineOptions = {}
): void {
  const cpu = machine.cpu as R2A03;
  machine.cpu.reset(machine.memoryMap);
  machine.reset();
  machine.running = true;

  if (host.id === "web" && isNESMachine(machine)) {
    nesLog("run", "CPU reset after ROM load", {
      loadGeneration: options.loadGeneration,
      programCounter: `$${cpu.programCounter.toString(16)}`,
      stackPointer: `$${cpu.stackPointer.toString(16)}`,
      status: `$${cpu.status.toString(16)}`,
    });
    runNesWeb(machine, host, options.loadGeneration);
    return;
  }

  runNodeLoop(machine, host);
}

function runNodeLoop(machine: IMachine, host: IHost): void {
  if (typeof process !== "undefined" && process.stdout?.isTTY) {
    console.clear();
  }

  while (machine.running) {
    const start = getTimer();
    if (isNESMachine(machine)) {
      machine.stepFrame();
      renderNesNode(machine, host);
    } else {
      machine.step(CYCLES_PER_FRAME);
      if (isGeneric6502Machine(machine)) {
        renderGenericHud(machine);
        renderGenericLcd(machine);
      }
    }

    let elapsed = getTimer() - start;
    const budget = isNESMachine(machine) ? Math.floor(1_000_000 / 60) : TICK_DELAY_MICROSECONDS;
    while (elapsed < budget) {
      elapsed = getTimer() - start;
    }
  }
}

function runNesWeb(machine: NESMachine, host: IHost, loadGeneration?: number): void {
  const loopId = ++webFrameLoopId;
  activeWebLoopId = loopId;
  let frameCount = 0;

  nesLog("run", "Starting web frame loop", { loopId, loadGeneration });

  const frame = () => {
    if (!machine.running || activeWebLoopId !== loopId) {
      return;
    }

    machine.pollControllers(host.pollInput());
    machine.stepFrame();
    host.presentFrame(machine.ppu.framebuffer);
    const audio = machine.apu.consumeFrameBuffer();
    if (audio.length) {
      host.pushAudio(audio);
    }

    frameCount++;
    const cpu = machine.cpu as R2A03;
    const snapshot = {
      loopId,
      loadGeneration,
      frame: frameCount,
      programCounter: `$${cpu.programCounter.toString(16)}`,
      scanline: machine.ppu.scanline,
      dot: machine.ppu.dot,
      vblank: machine.ppu.isInVblank(),
      ppuctrl: `$${machine.ppu.registers[0].toString(16)}`,
      ppumask: `$${machine.ppu.registers[1].toString(16)}`,
      nmiEnabled: machine.ppu.isNmiEnabled(),
      dmaStalled: machine.dma.isStalled(),
      nonZeroPixels: countNonZeroPixels(machine.ppu.framebuffer),
    };

    if (frameCount === 1) {
      nesLog("frame", "First frame rendered", snapshot);
      setLastFrameSnapshot(snapshot);
    } else if (frameCount === 60) {
      nesLog("frame", "Frame 60 snapshot", snapshot);
      setLastFrameSnapshot(snapshot);
    } else if (frameCount === 300) {
      nesLog("frame", "Frame 300 snapshot (5s)", snapshot);
      setLastFrameSnapshot(snapshot);
    }

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function countNonZeroPixels(framebuffer: Uint32Array): number {
  let count = 0;
  for (let i = 0; i < framebuffer.length; i++) {
    if ((framebuffer[i] & 0xffffff) !== 0) {
      count++;
    }
  }
  return count;
}

function renderNesNode(machine: NESMachine, host: IHost): void {
  if (typeof process === "undefined" || !process.stdout?.isTTY) {
    return;
  }
  host.log?.(
    `NES PC=$${(machine.cpu as R2A03).programCounter.toString(16)} scanline=${machine.ppu.scanline} vblank=${machine.ppu.isInVblank()}`
  );
}
