import Memory from "./memory";

export class MemoryController {

  memoryMap: Map<number, Memory>;

  constructor(){
    this.memoryMap = new Map<number, Memory>();
  }

  add(address: number, memory: Memory): void {
    for(let i = 0; i < memory.totalBytes; i++){
      this.memoryMap.set(address + i, memory);
    }
  }

  getMemoryAtAddress(address: number): Memory {
    return this.memoryMap.get(address);
  }

  readShortLE(address: number): number {
    const memory = this.getMemoryAtAddress(address);
    if(memory){
      return memory.readShortLE(address);
    }
  }

  readByte(address: number): number {
    const memory = this.getMemoryAtAddress(address);
    if(memory){
      return memory.readByte(address);
    }
  }

  writeShortLE(address: number, value: number): void {
    const memory = this.getMemoryAtAddress(address);
    if(memory){
      memory.writeShortLE(address, value);
    }
  }

  writeByte(address: number, value: number): void {
    const memory = this.getMemoryAtAddress(address);
    if(memory){
      memory.writeByte(address, value);
    }
  }

}