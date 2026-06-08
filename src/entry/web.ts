import { createMachine } from "../core/machine-factory";
import type { IHost } from "../platform/host";
import { nesError, nesLog } from "../platform/nes-debug-log";
import { WebHost, type VideoScaleMode } from "../platform/web/web-host";
import type { NESMachine } from "../machines/nes/machine";
import type { NesControllerState } from "../platform/host";
import { PPU_CYCLES_PER_CPU, PPU_CYCLES_PER_FRAME_NTSC } from "../machines/nes/constants";

const DEFAULT_SCALE = 3;

const screenCanvas = document.getElementById("screen") as HTMLCanvasElement | null;
const viewport = document.getElementById("viewport");

const fileInput = document.getElementById("rom") as HTMLInputElement | null;
const chooseRomButton = document.getElementById("choose-rom") as HTMLButtonElement | null;
const resetButton = document.getElementById("reset-emulator") as HTMLButtonElement | null;
const fullscreenButton = document.getElementById("fullscreen") as HTMLButtonElement | null;

const scaleSelect = document.getElementById("scale") as HTMLSelectElement | null;
const scaleModeSelect = document.getElementById("scale-mode") as HTMLSelectElement | null;
const smoothingCheckbox = document.getElementById("smoothing") as HTMLInputElement | null;

const videoDialog = document.getElementById("video-dialog") as HTMLDialogElement | null;
const inputDialog = document.getElementById("input-dialog") as HTMLDialogElement | null;

const videoDialogScale = document.getElementById("video-dialog-scale") as HTMLSelectElement | null;
const videoDialogScaleMode = document.getElementById("video-dialog-scale-mode") as HTMLSelectElement | null;
const videoDialogSmoothing = document.getElementById("video-dialog-smoothing") as HTMLInputElement | null;

const status = document.getElementById("status");
const app = document.getElementById("app") ?? document.body;

const romName = document.getElementById("rom-name");
const romMapper = document.getElementById("rom-mapper");
const romPrg = document.getElementById("rom-prg");
const romChr = document.getElementById("rom-chr");
const screenSize = document.getElementById("screen-size");

if (!screenCanvas) {
  throw new Error("Missing #screen canvas");
}

const canvas: HTMLCanvasElement = screenCanvas;

if (!fileInput) {
  nesLog("init", "Warning: #rom file input not found — ROM loading disabled");
}

const host = new WebHost(canvas, viewport);
let machine = createMachine("nes") as NESMachine;
host.setDisplaySize(machine.display?.width ?? 256, machine.display?.height ?? 240);

let loadGeneration = 0;
let currentRomData: Uint8Array | null = null;
let currentRomFileName = "";

function setText(element: Element | null, text: string): void {
  if (element) {
    element.textContent = text;
  }
}

function setStatus(text: string): void {
  setText(status, text);
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }

  return `${bytes} B`;
}

function updateScreenSize(): void {
  setText(screenSize, `${canvas.width}x${canvas.height}`);
}

function clearRomMeta(): void {
  setText(romName, "None");
  setText(romMapper, "—");
  setText(romPrg, "—");
  setText(romChr, "—");
}

function updateRomMeta(fileName: string): void {
  const summary = machine.cartridge.getLoadSummary();

  setText(romName, fileName);

  if (!summary) {
    setText(romMapper, "—");
    setText(romPrg, "—");
    setText(romChr, "—");
    return;
  }

  setText(romMapper, String(summary.mapperId));
  setText(romPrg, formatBytes(summary.prgSize));
  setText(romChr, formatBytes(summary.chrSize));
}

function syncVideoUiToHost(): void {
  const options = host.getVideoOptions();

  if (scaleSelect) {
    scaleSelect.value = String(options.scale);
  }

  if (scaleModeSelect) {
    scaleModeSelect.value = options.scaleMode;
  }

  if (smoothingCheckbox) {
    smoothingCheckbox.checked = options.smoothing;
  }

  if (videoDialogScale) {
    videoDialogScale.value = String(options.scale);
  }

  if (videoDialogScaleMode) {
    videoDialogScaleMode.value = options.scaleMode;
  }

  if (videoDialogSmoothing) {
    videoDialogSmoothing.checked = options.smoothing;
  }

  updateScreenSize();
}

function applyVideoOptions(options?: {
  scale?: number;
  scaleMode?: VideoScaleMode;
  smoothing?: boolean;
}): void {
  host.setVideoOptions({
    scale: options?.scale ?? Number(scaleSelect?.value ?? DEFAULT_SCALE),
    scaleMode: options?.scaleMode ?? ((scaleModeSelect?.value ?? "integer") as VideoScaleMode),
    smoothing: options?.smoothing ?? Boolean(smoothingCheckbox?.checked),
  });

  syncVideoUiToHost();

  nesLog("ui", "Video options changed", {
    ...host.getVideoOptions(),
    canvas: `${canvas.width}x${canvas.height}`,
  });
}

async function loadRomFile(file: File): Promise<void> {
  const generation = ++loadGeneration;
  currentRomFileName = file.name;

  setStatus(`Loading ${file.name}...`);

  nesLog("load", "File selected", {
    name: file.name,
    size: file.size,
    type: file.type || "(empty)",
    generation,
  });

  let data: Uint8Array;

  try {
    data = new Uint8Array(await file.arrayBuffer());
    currentRomData = data;

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
    machine = createMachine("nes") as NESMachine;
    host.setDisplaySize(machine.display?.width ?? 256, machine.display?.height ?? 240);
    machine.loadMedia(data);

    updateRomMeta(file.name);

    nesLog("load", "ROM loaded into machine", {
      generation,
      ...machine.cartridge.getLoadSummary(),
    });

    setStatus(`Loaded ${file.name}`);
    resetButton?.removeAttribute("disabled");

    canvas.focus();

    runMachine(machine, host);
  } catch (error) {
    nesError("load", "ROM load failed", error);
    setStatus(`ROM load failed: ${String(error)}`);
    clearRomMeta();
  }
}

function resetEmulator(): void {
  if (!currentRomData) {
    setStatus("No ROM loaded");
    return;
  }

  try {
    machine = createMachine("nes") as NESMachine;
    host.setDisplaySize(machine.display?.width ?? 256, machine.display?.height ?? 240);
    machine.loadMedia(currentRomData);

    updateRomMeta(currentRomFileName);

    setStatus(`Reset ${currentRomFileName}`);
    canvas.focus();

    runMachine(machine, host);
  } catch (error) {
    nesError("reset", "Reset failed", error);
    setStatus(`Reset failed: ${String(error)}`);
  }
}

function getBindingLabel(button: keyof NesControllerState, codes: string[]): string {
  return `${button.toUpperCase()}: ${codes.join(" / ")}`;
}

function refreshBindingButtons(): void {
  const bindings = host.getBindings();

  document.querySelectorAll<HTMLButtonElement>("[data-bind]").forEach((button) => {
    const nesButton = button.dataset.bind as keyof NesControllerState | undefined;

    if (!nesButton) {
      return;
    }

    button.textContent = getBindingLabel(nesButton, bindings[nesButton]);
  });
}

function installControlBindingUi(): void {
  refreshBindingButtons();

  document.querySelectorAll<HTMLButtonElement>("[data-bind]").forEach((button) => {
    button.addEventListener("click", () => {
      const nesButton = button.dataset.bind as keyof NesControllerState | undefined;

      if (!nesButton) {
        return;
      }

      button.textContent = `Press a key for ${nesButton.toUpperCase()}...`;

      const onKeyDown = (event: KeyboardEvent): void => {
        event.preventDefault();
        event.stopPropagation();

        host.setBindings({
          [nesButton]: [event.code],
        });

        refreshBindingButtons();

        window.removeEventListener("keydown", onKeyDown, true);
      };

      window.addEventListener("keydown", onKeyDown, true);
    });
  });
}

function installMenuUi(): void {
  document.querySelector('[data-menu="file"]')?.addEventListener("click", () => {
    fileInput?.click();
  });

  document.querySelector('[data-menu="emulation"]')?.addEventListener("click", () => {
    if (currentRomData) {
      resetEmulator();
    }
  });

  document.querySelector('[data-menu="video"]')?.addEventListener("click", () => {
    syncVideoUiToHost();
    videoDialog?.showModal();
  });

  document.querySelector('[data-menu="input"]')?.addEventListener("click", () => {
    refreshBindingButtons();
    inputDialog?.showModal();
  });

  document.querySelector('[data-menu="help"]')?.addEventListener("click", () => {
    setStatus("Controls: Arrows/WASD, Z/K = A, X/J = B, Enter = Start, Shift/R = Select");
  });
}

function installVideoUi(): void {
  scaleSelect?.addEventListener("change", () => {
    applyVideoOptions({
      scale: Number(scaleSelect.value),
    });
  });

  scaleModeSelect?.addEventListener("change", () => {
    applyVideoOptions({
      scaleMode: scaleModeSelect.value as VideoScaleMode,
    });
  });

  smoothingCheckbox?.addEventListener("change", () => {
    applyVideoOptions({
      smoothing: smoothingCheckbox.checked,
    });
  });

  videoDialogScale?.addEventListener("change", () => {
    applyVideoOptions({
      scale: Number(videoDialogScale.value),
    });
  });

  videoDialogScaleMode?.addEventListener("change", () => {
    applyVideoOptions({
      scaleMode: videoDialogScaleMode.value as VideoScaleMode,
    });
  });

  videoDialogSmoothing?.addEventListener("change", () => {
    applyVideoOptions({
      smoothing: videoDialogSmoothing.checked,
    });
  });

  window.addEventListener("resize", () => {
    updateScreenSize();
  });
}

function installFileUi(): void {
  chooseRomButton?.addEventListener("click", () => {
    fileInput?.click();
  });

  resetButton?.addEventListener("click", () => {
    resetEmulator();
  });

  fileInput?.addEventListener("change", async () => {
    const file = fileInput.files?.[0];

    if (!file) {
      nesLog("load", "File picker closed with no selection");
      return;
    }

    await loadRomFile(file);
    fileInput.value = "";
  });

  document.addEventListener("dragover", (event) => {
    event.preventDefault();
    app.classList.add("nes-dragging");
  });

  document.addEventListener("dragleave", (event) => {
    if (event.relatedTarget === null) {
      app.classList.remove("nes-dragging");
    }
  });

  document.addEventListener("drop", async (event) => {
    event.preventDefault();
    app.classList.remove("nes-dragging");

    const file = event.dataTransfer?.files?.[0];

    if (!file) {
      return;
    }

    await loadRomFile(file);
  });
}

function installFullscreenUi(): void {
  fullscreenButton?.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await (viewport ?? canvas).requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      nesError("ui", "Fullscreen failed", error);
      setStatus(`Fullscreen failed: ${String(error)}`);
    }
  });

  document.addEventListener("fullscreenchange", () => {
    if (fullscreenButton) {
      fullscreenButton.textContent = document.fullscreenElement
        ? "Exit Fullscreen"
        : "Fullscreen";
    }

    updateScreenSize();
  });
}

function installUi(): void {
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "NES screen");

  installMenuUi();
  installVideoUi();
  installFileUi();
  installFullscreenUi();
  installControlBindingUi();

  host.setVideoOptions({
    scale: DEFAULT_SCALE,
    scaleMode: "integer",
    smoothing: false,
  });

  syncVideoUiToHost();
}

installUi();
clearRomMeta();

nesLog("init", "Web UI ready", {
  canvas: `${canvas.width}x${canvas.height}`,
  hasFileInput: Boolean(fileInput),
});

setStatus("Open or drop a .nes ROM file");

let webFrameLoopId = 0;
let activeWebLoopId = 0;
let queuedRAF: number | null = null;

export function runMachine(
  machine: NESMachine,
  host: IHost
): void {
  if (queuedRAF) {
    cancelAnimationFrame(queuedRAF);
    queuedRAF = null;
  }

  machine.reset();
  machine.running = true;

  const loopId = ++webFrameLoopId;
  activeWebLoopId = loopId;
  let frameCount = 0;

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
    queuedRAF = requestAnimationFrame(frame);
  };
  queuedRAF = requestAnimationFrame(frame);
}