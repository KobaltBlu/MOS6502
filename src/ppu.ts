export class PPU {

  width = 320;
  height = 240;
  h = 0;
  v = 0;

  data: Uint8Array;

  constructor(width = 320, height = 240){
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(this.width * this.height);
    this.reset();
  }

  read(byte: number){

  }

  write(byte: number){
    return;
  }

  clock(){

  }

  reset(){
    this.h = 0;
    this.v = 0;
    this.data.fill(0, 0, this.width * this.height);
  }

}