import { Device } from "./device";
import { BusTransaction } from "./interface/BusTransaction";


/**
 *
 */
export default class Bus {
  busSize: number = 8;
  data: number = 0;
  address: number = 0;
  cache: BusTransaction[] = [];
  cacheCycle: number = 0;
  devices: Device[] = [];
  memoryMap: Map<number, Device>;

  constructor(busSize: number = 8) {
    this.busSize = busSize;
    this.data = 0;
    this.address = 0;
    this.cache = [];
    this.cacheCycle = 0;
    this.memoryMap = new Map<number, Device>();
  }

  /**
   * Register a device at an offset and automatically map the device to the memory map
   * @param offset The offset to register the device at
   * @param device The device to register
   */
  registerDeviceAuto(offset: number, device: Device): void {
    device.offset = offset;
    this.devices.push(device);
    const dataSize = device.totalBytes;
    for (let i = 0; i < dataSize; i++) {
      this.registerDeviceAtOffset(offset + i, device);
    }
  }

  /**
   * Register a device at an offset and manually map the device to the memory map
   * @param offset The offset to register the device at
   * @param device The device to register
   */
  registerDeviceAtOffset(offset: number, device: Device): void {
    if(this.devices.indexOf(device) === -1){
      device.offset = offset;
      this.devices.push(device);
    }
    //Check if a device is already mapped to the target offset
    const existingDeviceAtOffset = this.memoryMap.get(offset);
    if(!!existingDeviceAtOffset){
      console.warn(`Device ${existingDeviceAtOffset.name} at offset ${offset} is already mapped to ${existingDeviceAtOffset.readByte(offset)}`);
      return;
    }
    this.memoryMap.set(offset, device);
  }

  readByte(address: number): number {
    const data = this.memoryMap.get(address)?.readByte(address) ?? 0xFF;
    this.cache.push({
      type: 'read',
      address,
      data,
      cycle: this.cacheCycle++,
    });
    return data;
  }

  readShortLE(address: number): number {
    const data = this.memoryMap.get(address)?.readShortLE(address) ?? 0xFFFF;
    this.cache.push({
      type: 'read',
      address,
      data, 
      cycle: this.cacheCycle++,
    });
    return data;
  }

  writeByte(address: number, data: number) {
    this.memoryMap.get(address)?.writeByte(address, data);
    this.cache.push({
      type: 'write',
      address,
      data,
      cycle: this.cacheCycle++,
    });
  }

  writeShortLE(address: number, data: number) {
    this.memoryMap.get(address)?.writeShortLE(address, data);
    this.cache.push({
      type: 'write',
      address,
      data,
      cycle: this.cacheCycle++,
    });
  }

  reset(): void {
    this.address = 0;
    this.data = 0;
    this.cache = [];
    this.cacheCycle = 0;
  }

  popState(): boolean {
    const state = this.cache.pop();
    if (state) {
      this.data = state.data;
      this.address = state.address;
      return true;
    }
    return false;
  }

  clock(): boolean {
    if (!this.popState()) {
      return false;
    }
    
    return true;
  }
}
