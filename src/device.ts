import Bus from "./bus";

export class Device {
  /**
   * The name of the device
   */
  name: string = 'Unknown Device';
  /**
   * The buffer of the device
   */
  bytes: Uint8Array = new Uint8Array(0);
  /**
   * The total number of bytes in the device
   */
  totalBytes: number = 0;
  /**
   * The buffer of the device
   */
  buffer: ArrayBuffer;
  /**
   * The data view of the device
   */
  data: DataView;
  /**
   * The offset of the device on the bus
   */
  offset: number = 0;
  /**
   * The pins of the device
   */
  pins: Map<number, boolean> = new Map();

  onBeforeClock: (bus: Bus) => void = () => {};
  onAfterClock: (bus: Bus) => void = () => {};

  constructor(dataSize: number, pinCount: number = 0) {
    this.bytes = new Uint8Array(dataSize);
    this.buffer = this.bytes.buffer;
    this.data = new DataView(this.buffer);
    this.totalBytes = dataSize;
    this.pins = new Map();
  }

  setOnBeforeClock(callback: (bus: Bus) => void){
    this.onBeforeClock = callback || ((bus: Bus) => {});
  }

  setOnAfterClock(callback: (bus: Bus) => void){
    this.onAfterClock = callback || ((bus: Bus) => {});
  }

  clock(bus: Bus){
    this.onBeforeClock(bus);
    this.onAfterClock(bus);
  }

  readShortLE(address: number): number {
    address -= this.offset;
    // console.log(this.bytes[address], this.bytes[address + 1])
    return (this.bytes[address + 1] << 8) | this.bytes[address];
  }

  readByte(address: number): number {
    address -= this.offset;
    return this.bytes[address];
  }

  writeShortLE(address: number, value: number): void {
    address -= this.offset;
    this.bytes[address] = (value & 0x3) & 0xFF;
    this.bytes[address + 1] = ((value & 0xC) >> 2) & 0xFF;
  }

  writeByte(address: number, value: number): void {
    address -= this.offset;
    this.bytes[address] = (value & 0xFF) & 0xFF;
    // console.log('writeByte', address, value, this.bytes[address]);
  }
}
