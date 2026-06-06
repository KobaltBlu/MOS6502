export interface NesControllerState {
  a: boolean;
  b: boolean;
  select: boolean;
  start: boolean;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export const EMPTY_CONTROLLER: NesControllerState = {
  a: false,
  b: false,
  select: false,
  start: false,
  up: false,
  down: false,
  left: false,
  right: false,
};

export interface IHost {
  readonly id: "node" | "web";
  pollInput(): NesControllerState;
  presentFrame(pixels: Uint32Array): void;
  pushAudio(samples: Float32Array): void;
  log?(message: string): void;
}
