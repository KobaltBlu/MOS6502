export default class Memory {
  bytes: Uint8Array = new Uint8Array(0);
  buffer: ArrayBuffer;
  data: DataView;
  totalBytes: number = 0;
  pointer: number = 0;
  offset: number = 0;

  /**
   * Pre allocate a number of bytes to act as the Memory for the device
   * @param num_bytes 
   */
  constructor(num_bytes: number = 0) {
    this.bytes = new Uint8Array(num_bytes);
    this.buffer = this.bytes.buffer;
    this.data = new DataView(this.buffer);
    this.totalBytes = num_bytes;
  }

  /**
   * Allocate a number of bytes of memory
   * @param num_bytes The number of bytes to allocate
   */
  allocate(num_bytes: number = 0): void {
    if(num_bytes < 1){
      throw new Error('Cannot allocate less than 1 byte of memory!');
    }

    if( ( this.pointer + num_bytes ) < this.totalBytes ){
      throw new Error(`You cannot allocate more than the available amount of memory. Pointer: ${this.pointer}, Requested: ${num_bytes}`);
    }

    //Reset the bytes in the buffer
    this.bytes.fill(0, this.pointer, this.pointer + num_bytes);
    
    //Increase the pointer by the number of bytes allocated
    this.pointer += num_bytes;
  }

  readShortLE(address: number): number {
    address -= this.offset;
    console.log(this.bytes[address], this.bytes[address + 1])
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
    console.log('writeByte', address, value, this.bytes[address]);
  }

}
