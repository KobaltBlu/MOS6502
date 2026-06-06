import type { IHost, NesControllerState } from "../host";
import { EMPTY_CONTROLLER } from "../host";

export class NodeHost implements IHost {
  readonly id = "node" as const;

  pollInput(): NesControllerState {
    return EMPTY_CONTROLLER;
  }

  presentFrame(_pixels: Uint32Array): void {}

  pushAudio(_samples: Float32Array): void {}

  log(message: string): void {
    if (typeof process !== "undefined" && process.stdout) {
      process.stdout.write(message + "\n");
    }
  }
}
