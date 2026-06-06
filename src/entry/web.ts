import { createMachine } from "../core/machine-factory";
import { runMachine } from "../platform/runner";
import { nesError, nesLog } from "../platform/nes-debug-log";
import { WebHost } from "../platform/web/web-host";
import type { NESMachine } from "../machines/nes/machine";

const canvas = document.getElementById("screen") as HTMLCanvasElement | null;
const fileInput = document.getElementById("rom") as HTMLInputElement | null;
const status = document.getElementById("status");

if (!canvas) {
  throw new Error("Missing #screen canvas");
}

if (!fileInput) {
  nesLog("init", "Warning: #rom file input not found — ROM loading disabled");
}

const host = new WebHost(canvas);
const machine = createMachine("nes") as NESMachine;
let loadGeneration = 0;

function setStatus(text: string): void {
  if (status) {
    status.textContent = text;
  }
}

nesLog("init", "Web UI ready", {
  canvas: `${canvas.width}x${canvas.height}`,
  hasFileInput: Boolean(fileInput),
});

fileInput?.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) {
    nesLog("load", "File picker closed with no selection");
    return;
  }

  const generation = ++loadGeneration;
  nesLog("load", "File selected", {
    name: file.name,
    size: file.size,
    type: file.type || "(empty)",
    generation,
  });

  let data: Uint8Array;
  try {
    data = new Uint8Array(await file.arrayBuffer());
    nesLog("load", "File read into memory", {
      bytes: data.length,
      generation,
    });
  } catch (error) {
    nesError("load", "Failed to read file", error);
    setStatus(`Read failed: ${String(error)}`);
    return;
  }

  try {
    machine.loadProgram(data);
    const summary = machine.cartridge.getLoadSummary();
    nesLog("load", "ROM loaded into machine", {
      generation,
      ...summary,
    });
    setStatus(`Loaded ${file.name}`);
    runMachine(machine, host, { loadGeneration: generation });
  } catch (error) {
    nesError("load", "ROM load failed", error);
    setStatus(String(error));
  }
});

setStatus("Drop or choose a .nes ROM file");
