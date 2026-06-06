const PREFIX = "[NES]";

export interface NesLoadSummary {
  fileName?: string;
  fileSize: number;
  mapperId: number;
  prgSize: number;
  chrSize: number;
  mirroring: string;
  resetVector: number;
  prgCrc?: number;
  inesFormat?: string;
  nrom256?: boolean;
  hasTrainer?: boolean;
  hasBattery?: boolean;
}

export function nesLog(
  phase: string,
  message: string,
  data?: Record<string, unknown>
): void {
  if (data !== undefined) {
    console.log(`${PREFIX} [${phase}] ${message}`, data);
  } else {
    console.log(`${PREFIX} [${phase}] ${message}`);
  }
}

export function nesWarn(
  phase: string,
  message: string,
  data?: Record<string, unknown>
): void {
  if (data !== undefined) {
    console.warn(`${PREFIX} [${phase}] ${message}`, data);
  } else {
    console.warn(`${PREFIX} [${phase}] ${message}`);
  }
}

export function nesError(
  phase: string,
  message: string,
  error: unknown
): void {
  console.error(`${PREFIX} [${phase}] ${message}`, error);
}

/** Simple 32-bit FNV-1a over PRG ROM for identifying dumps in logs. */
export function hashPrg(prg: Uint8Array): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < prg.length; i++) {
    hash ^= prg[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

let lastLoadSummary: NesLoadSummary | null = null;
let lastFrameSnapshot: Record<string, unknown> | null = null;

export function setLastLoadSummary(summary: NesLoadSummary): void {
  lastLoadSummary = summary;
  if (typeof window !== "undefined") {
    (window as NesDebugWindow).__nesLastLoad = summary;
  }
}

export function setLastFrameSnapshot(snapshot: Record<string, unknown>): void {
  lastFrameSnapshot = snapshot;
  if (typeof window !== "undefined") {
    (window as NesDebugWindow).__nesLastFrame = snapshot;
  }
}

export function getLastLoadSummary(): NesLoadSummary | null {
  return lastLoadSummary;
}

export function getLastFrameSnapshot(): Record<string, unknown> | null {
  return lastFrameSnapshot;
}

interface NesDebugWindow extends Window {
  __nesLastLoad?: NesLoadSummary;
  __nesLastFrame?: Record<string, unknown>;
}
