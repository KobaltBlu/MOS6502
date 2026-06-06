import Memory from "./memory";

export default class ROM extends Memory {
  constructor(num_bytes: number = 0) {
    super(num_bytes);
  }

  writeShortLE(_address: number, _value: number): void {
    return;
  }

  writeByte(_address: number, _value: number): void {
    return;
  }

  writeData(data: Uint8Array): void {
    this.bytes = data;
    this.buffer = this.bytes.buffer;
    this.data = new DataView(this.buffer);
    this.totalBytes = data.length;
  }
}
