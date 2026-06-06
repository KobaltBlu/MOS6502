import type { MemoryDevice } from "../memory/types";
import { LCD_BASE, LCD_SIZE } from "../machines/generic6502/constants";

export class LCDScreen implements MemoryDevice {
  private buffer = new Uint8Array(LCD_SIZE);
  private baseAddress = LCD_BASE;
  renderWait = 0;

  readByte(address: number): number {
    return this.buffer[address - this.baseAddress] ?? 0;
  }

  writeByte(address: number, value: number): void {
    this.buffer[address - this.baseAddress] = value & 0xff;
  }

  getDisplayText(): string {
    const chars: string[] = [];
    for (let i = 0; i < LCD_SIZE; i++) {
      chars.push(String.fromCharCode(this.buffer[i] || 0x20));
    }
    return chars.join("");
  }

  tick(cycles: number = 1): void {
    this.renderWait = Math.max(0, this.renderWait - cycles);
  }

  shouldRender(): boolean {
    return this.renderWait === 0;
  }

  markRendered(throttle: number): void {
    this.renderWait = throttle;
  }
}
