import Machine from "./src/machine";
import * as fs from 'fs/promises';

// let readline = require('readline');

// readline.emitKeypressEvents(process.stdin);

// process.stdin.on('keypress', (ch, key) => {
//   console.log('got "keypress"', ch, key);
//     process.stdout.clearLine(1);
//     process.stdout.cursorTo(0, 6);
//     process.stdout.write(`stdout: ${key?.name}`);
//   if (key && key.ctrl && key.name == 'c') {
//     process.stdin.pause();
//   }
// });

// process.stdin.setRawMode(true);


process.stdin.setEncoding('utf8');
process.stdin.on('readable', () => {
  const machine = new Machine();
  fs.readFile('./helloworld.dat').then((data) => {
    machine.rom.writeData(data);
    machine.run();
  }).catch((e) => {
    console.error(e);
  });
});