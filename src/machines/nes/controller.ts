import type { MemoryDevice } from "../../memory/types";

import type { NesControllerState } from "../../platform/host";

export class NesController implements MemoryDevice {
  private strobe = false;
  private shiftIndex1 = 0;
  private shiftIndex2 = 0;
  private buttons1: boolean[] = [false, false, false, false, false, false, false, false];
  private buttons2: boolean[] = [false, false, false, false, false, false, false, false];

  setButtons(port: 1 | 2, buttons: boolean[]): void {
    const target = port === 1 ? this.buttons1 : this.buttons2;
    for (let i = 0; i < 8; i++) {
      target[i] = buttons[i] ?? false;
    }
  }

  pressButton(port: 1 | 2, index: number): void {
    if (index >= 0 && index < 8) {
      (port === 1 ? this.buttons1 : this.buttons2)[index] = true;
    }
  }

  releaseButton(port: 1 | 2, index: number): void {
    if (index >= 0 && index < 8) {
      (port === 1 ? this.buttons1 : this.buttons2)[index] = false;
    }
  }

  readByte(address: number): number {
    if (address === 0x4016) {
      return this.readPort(this.buttons1, "shiftIndex1");
    }
    if (address === 0x4017) {
      return this.readPort(this.buttons2, "shiftIndex2");
    }
    return 0;
  }

  private readPort(buttons: boolean[], indexKey: "shiftIndex1" | "shiftIndex2"): number {
    if (this.strobe) {
      return buttons[0] ? 1 : 0;
    }

    const shiftIndex = this[indexKey];
    if (shiftIndex >= 8) {
      return 1;
    }
    const value = buttons[shiftIndex] ? 1 : 0;
    this[indexKey] = shiftIndex + 1;
    return value;
  }

  writeByte(address: number, value: number): void {
    if (address === 0x4016) {
      this.strobe = (value & 0x01) !== 0;
      if (this.strobe) {
        this.shiftIndex1 = 0;
        this.shiftIndex2 = 0;
      }
    }
  }

  applyState(state: NesControllerState): void {
    this.setButtons(1, [
      state.a,
      state.b,
      state.select,
      state.start,
      state.up,
      state.down,
      state.left,
      state.right,
    ]);
  }

  poll(): void {
    if (this.strobe) {
      this.shiftIndex1 = 0;
      this.shiftIndex2 = 0;
    }
  }

  reset(): void {
    this.strobe = false;
    this.shiftIndex1 = 0;
    this.shiftIndex2 = 0;
    this.buttons1.fill(false);
    this.buttons2.fill(false);
  }
}
