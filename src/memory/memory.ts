import type { MemoryDevice } from "./types";

export default class Memory implements MemoryDevice {
  bytes: Uint8Array = new Uint8Array(0);
  buffer: ArrayBuffer;
  data: DataView;
  totalBytes: number = 0;
  pointer: number = 0;
  baseAddress: number = 0;

  constructor(num_bytes: number = 0) {
    this.bytes = new Uint8Array(num_bytes);
    this.buffer = this.bytes.buffer;
    this.data = new DataView(this.buffer);
    this.totalBytes = num_bytes;
  }

  allocate(num_bytes: number = 0): void {
    if (num_bytes < 1) {
      throw new Error("Cannot allocate less than 1 byte of memory!");
    }

    if (this.pointer + num_bytes < this.totalBytes) {
      throw new Error(
        `You cannot allocate more than the available amount of memory. Pointer: ${this.pointer}, Requested: ${num_bytes}`
      );
    }

    this.bytes.fill(0, this.pointer, this.pointer + num_bytes);
    this.pointer += num_bytes;
  }

  readShortLE(address: number): number {
    const local = address - this.baseAddress;
    return (this.bytes[local + 1] << 8) | this.bytes[local];
  }

  readByte(address: number): number {
    return this.bytes[address - this.baseAddress];
  }

  writeShortLE(address: number, value: number): void {
    const local = address - this.baseAddress;
    this.bytes[local] = value & 0xff;
    this.bytes[local + 1] = (value >> 8) & 0xff;
  }

  writeByte(address: number, value: number): void {
    this.bytes[address - this.baseAddress] = value & 0xff;
  }
}
