export interface MemoryDevice {
  readByte(address: number): number;
  writeByte(address: number, value: number): void;
  readShortLE?(address: number): number;
  writeShortLE?(address: number, value: number): void;
}

export interface MemoryRegion {
  start: number;
  end: number;
  device: MemoryDevice;
}
