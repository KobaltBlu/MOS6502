import Memory from "./memory";

export default class ROM extends Memory {
  name: string = 'ROM';
  constructor(num_bytes: number = 0){
    super(num_bytes);
  }
  
  writeShortLE(address: number, value: number): void {
    //read-only
    return;
  }

  writeByte(address: number, value: number): void {
    //read-only
    return;
  }

  writeData(data: Uint8Array){
    this.bytes = data;
  }

}
  