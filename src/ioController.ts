import Bus from "./bus";
import { Device } from "./device";

export default class IOController extends Device {
  name: string = 'IO Controller';
  ports: number = 2;
  portIndex: number = 0;

  constructor(portCount: number = 2){
    super(portCount, portCount * 8);
    this.ports = portCount;
    this.portIndex = 0;
  }

  clock(bus: Bus){
    if(this.portIndex < 0 || this.portIndex >= this.ports)
      return;
    this.writeByte(this.portIndex * 8, bus.data);
  }

}