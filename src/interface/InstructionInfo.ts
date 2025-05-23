import type Bus from "../bus";

export interface InstructionInfo {
  instruction: (bus?: Bus, address?: number) => number;
  address: (bus?: Bus) => number;
}