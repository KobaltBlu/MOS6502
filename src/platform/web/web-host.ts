import type { IHost, NesControllerState } from "../host";
import { SAMPLE_RATE } from "../../machines/nes/apu";

const NES_WIDTH = 256;
const NES_HEIGHT = 240;

export type VideoScaleMode = "integer" | "fit" | "stretch";

export interface WebHostVideoOptions {
  scaleMode: VideoScaleMode;
  scale: number;
  smoothing: boolean;
}

type NesButton = keyof NesControllerState;

const DEFAULT_BINDINGS: Record<NesButton, string[]> = {
  a: ["KeyZ", "KeyK"],
  b: ["KeyX", "KeyJ"],
  select: ["ShiftRight", "ShiftLeft", "KeyR"],
  start: ["Enter", "KeyT"],
  up: ["ArrowUp", "KeyW"],
  down: ["ArrowDown", "KeyS"],
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
};

export class WebHost implements IHost {
  readonly id = "web" as const;

  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  private readonly frameCanvas: HTMLCanvasElement;
  private readonly frameCtx: CanvasRenderingContext2D;
  private readonly imageData: ImageData;

  private readonly viewport: HTMLElement | null;

  private keys = new Set<string>();
  private bindings: Record<NesButton, string[]> = structuredClone(DEFAULT_BINDINGS);

  private audioContext: AudioContext | null = null;
  private nextAudioTime = 0;

  private videoOptions: WebHostVideoOptions = {
    scaleMode: "integer",
    scale: 3,
    smoothing: false,
  };

  constructor(canvas: HTMLCanvasElement, viewport?: HTMLElement | null) {
    this.canvas = canvas;
    this.viewport = viewport ?? canvas.parentElement;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get 2d context");
    }

    this.ctx = ctx;

    this.frameCanvas = document.createElement("canvas");
    this.frameCanvas.width = NES_WIDTH;
    this.frameCanvas.height = NES_HEIGHT;

    const frameCtx = this.frameCanvas.getContext("2d");
    if (!frameCtx) {
      throw new Error("Could not get frame 2d context");
    }

    this.frameCtx = frameCtx;
    this.imageData = frameCtx.createImageData(NES_WIDTH, NES_HEIGHT);

    this.applyVideoOptions();

    window.addEventListener("resize", () => this.applyVideoOptions());
    window.addEventListener("keydown", (e) => this.keys.add(e.code));
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.keys.clear());
  }

  setVideoOptions(options: Partial<WebHostVideoOptions>): void {
    this.videoOptions = {
      ...this.videoOptions,
      ...options,
    };

    this.applyVideoOptions();
  }

  getVideoOptions(): WebHostVideoOptions {
    return { ...this.videoOptions };
  }

  setScale(scale: number): void {
    this.setVideoOptions({
      scale: Math.max(1, Math.floor(scale)),
      scaleMode: "integer",
    });
  }

  setBindings(bindings: Partial<Record<NesButton, string[]>>): void {
    this.bindings = {
      ...this.bindings,
      ...bindings,
    };
  }

  getBindings(): Record<NesButton, string[]> {
    return structuredClone(this.bindings);
  }

  resetBindings(): void {
    this.bindings = structuredClone(DEFAULT_BINDINGS);
  }

  private applyVideoOptions(): void {
    const viewportRect = this.viewport?.getBoundingClientRect();
    const { scaleMode, scale, smoothing } = this.videoOptions;

    let outputWidth = NES_WIDTH * scale;
    let outputHeight = NES_HEIGHT * scale;

    if (viewportRect) {
      const availableWidth = Math.max(1, viewportRect.width);
      const availableHeight = Math.max(1, viewportRect.height);

      if (scaleMode === "integer") {
        const maxScale = Math.max(
          1,
          Math.floor(Math.min(availableWidth / NES_WIDTH, availableHeight / NES_HEIGHT))
        );

        const finalScale = Math.max(1, Math.min(Math.floor(scale), maxScale));

        outputWidth = NES_WIDTH * finalScale;
        outputHeight = NES_HEIGHT * finalScale;
      } else if (scaleMode === "fit") {
        const fitScale = Math.max(
          1,
          Math.min(availableWidth / NES_WIDTH, availableHeight / NES_HEIGHT)
        );

        outputWidth = Math.floor(NES_WIDTH * fitScale);
        outputHeight = Math.floor(NES_HEIGHT * fitScale);
      } else {
        outputWidth = Math.floor(availableWidth);
        outputHeight = Math.floor(availableHeight);
      }
    }

    this.canvas.width = outputWidth;
    this.canvas.height = outputHeight;

    this.ctx.imageSmoothingEnabled = smoothing;
  }

  presentFrame(pixels: Uint32Array): void {
    const data = this.imageData.data;

    for (let i = 0; i < pixels.length; i++) {
      const pixel = pixels[i];
      const offset = i * 4;

      data[offset] = pixel & 0xff;
      data[offset + 1] = (pixel >> 8) & 0xff;
      data[offset + 2] = (pixel >> 16) & 0xff;
      data[offset + 3] = 255;
    }

    this.frameCtx.putImageData(this.imageData, 0, 0);

    this.ctx.imageSmoothingEnabled = this.videoOptions.smoothing;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(
      this.frameCanvas,
      0,
      0,
      NES_WIDTH,
      NES_HEIGHT,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
  }

  private isPressed(button: NesButton): boolean {
    return this.bindings[button].some((code) => this.keys.has(code));
  }

  pollInput(): NesControllerState {
    return {
      a: this.isPressed("a"),
      b: this.isPressed("b"),
      select: this.isPressed("select"),
      start: this.isPressed("start"),
      up: this.isPressed("up"),
      down: this.isPressed("down"),
      left: this.isPressed("left"),
      right: this.isPressed("right"),
    };
  }

  pushAudio(samples: Float32Array): void {
    if (samples.length === 0) {
      return;
    }
  
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      this.nextAudioTime = this.audioContext.currentTime + 0.1;
    }
  
    if (this.audioContext.state === "suspended") {
      void this.audioContext.resume();
    }
  
    const now = this.audioContext.currentTime;
  
    if (this.nextAudioTime < now + 0.03) {
      this.nextAudioTime = now + 0.08;
    }
  
    const buffer = this.audioContext.createBuffer(
      1,
      samples.length,
      this.audioContext.sampleRate
    );
  
    buffer.copyToChannel(samples, 0);
  
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
  
    source.start(this.nextAudioTime);
    this.nextAudioTime += samples.length / this.audioContext.sampleRate;
  }
}