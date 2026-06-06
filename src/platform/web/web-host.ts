import type { IHost, NesControllerState } from "../host";
import { EMPTY_CONTROLLER } from "../host";

export class WebHost implements IHost {
  readonly id = "web" as const;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData;
  private keys = new Set<string>();
  private audioContext: AudioContext | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get 2d context");
    }
    this.ctx = ctx;
    canvas.width = 256;
    canvas.height = 240;
    this.imageData = ctx.createImageData(256, 240);
    window.addEventListener("keydown", (e) => this.keys.add(e.code));
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
  }

  pollInput(): NesControllerState {
    return {
      a: this.keys.has("KeyZ") || this.keys.has("KeyK"),
      b: this.keys.has("KeyX") || this.keys.has("KeyJ"),
      select: this.keys.has("ShiftRight") || this.keys.has("KeyR"),
      start: this.keys.has("Enter") || this.keys.has("KeyT"),
      up: this.keys.has("ArrowUp") || this.keys.has("KeyW"),
      down: this.keys.has("ArrowDown") || this.keys.has("KeyS"),
      left: this.keys.has("ArrowLeft") || this.keys.has("KeyA"),
      right: this.keys.has("ArrowRight") || this.keys.has("KeyD"),
    };
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
    this.ctx.putImageData(this.imageData, 0, 0);
  }

  pushAudio(samples: Float32Array): void {
    if (samples.length === 0) {
      return;
    }
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    const buffer = this.audioContext.createBuffer(1, samples.length, 44100);
    buffer.copyToChannel(samples, 0);
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.start();
  }
}
