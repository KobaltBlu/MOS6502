import { SIGN_BIT } from "./constants";

export interface FlagState {
  status: number;
  FLAG_Z: number;
  FLAG_N: number;
}

export function setZeroNegative(cpu: FlagState, value: number): void {
  cpu.status &= ~cpu.FLAG_Z;
  if (value === 0) {
    cpu.status |= cpu.FLAG_Z;
  }

  cpu.status &= ~cpu.FLAG_N;
  if ((value >> SIGN_BIT) & 0x01) {
    cpu.status |= cpu.FLAG_N;
  }
}