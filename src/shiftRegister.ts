export default class ShiftRegister {

  data: number = 0;
  data_in: number = 0;
  data_mask: number = 0xFF;
  overflow_bit: number = 0;

  tmp_value: number = 0;
  
  constructor(mask = 0xFF){
    this.data = 0;
    this.data_mask = mask;
  }

  clock(){
    this.data_in = this.data_in & 0x01;
    this.tmp_value = (this.data <<= 1) | this.data_in;
    this.overflow_bit = this.tmp_value >> 8;
    this.data = this.tmp_value & this.data_mask
  }

}