import Machine from "./src/machine";
import * as fs from 'fs/promises';

const machine = new Machine();
fs.readFile('./data.dat').then((data) => {
  console.log('data', data);
  machine.rom.writeData(data);
  machine.run();
}).catch((e) => {
  console.error(e);
});