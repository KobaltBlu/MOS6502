/**
 *
 */
export default class Bus {
  data: Uint8Array;

  constructor(busSize: number = 8) {
    if (busSize < 8) {
      busSize = 8;
    }
    this.data = new Uint8Array(busSize/8);
  }
}
