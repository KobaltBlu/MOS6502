import type { MemoryDevice, MemoryRegion } from "./types";

// Bus deferred until a second CPU or co-processor needs shared signal lines.

export class MemoryMap {
  private regions: MemoryRegion[] = [];

  addRegion(start: number, end: number, device: MemoryDevice): void {
    if ("baseAddress" in device) {
      (device as { baseAddress: number }).baseAddress = start;
    }
    this.regions.push({ start, end, device });
  }

  private findRegion(address: number): MemoryRegion | undefined {
    for (let i = this.regions.length - 1; i >= 0; i--) {
      const region = this.regions[i];
      if (address >= region.start && address <= region.end) {
        return region;
      }
    }
    return undefined;
  }

  readByte(address: number): number {
    const region = this.findRegion(address);
    return region ? region.device.readByte(address) : 0;
  }

  writeByte(address: number, value: number): void {
    const region = this.findRegion(address);
    if (region) {
      region.device.writeByte(address, value);
    }
  }

  readShortLE(address: number): number {
    const region = this.findRegion(address);
    if (!region) {
      return 0;
    }
    if (region.device.readShortLE) {
      return region.device.readShortLE(address);
    }
    return region.device.readByte(address) | (region.device.readByte(address + 1) << 8);
  }

  writeShortLE(address: number, value: number): void {
    const region = this.findRegion(address);
    if (!region) {
      return;
    }
    if (region.device.writeShortLE) {
      region.device.writeShortLE(address, value);
      return;
    }
    region.device.writeByte(address, value & 0xff);
    region.device.writeByte(address + 1, (value >> 8) & 0xff);
  }
}
