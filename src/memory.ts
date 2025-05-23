import { Device } from "./device";

export default class Memory extends Device {
  name: string = 'Memory';
  pointer: number = 0;
  offset: number = 0;

  /**
   * Pre allocate a number of bytes to act as the Memory for the device
   * @param num_bytes 
   */
  constructor(num_bytes: number = 0) {
    super(num_bytes);
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

}
