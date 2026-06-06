import { createMachine, parseMachineId, type MachineId } from "../core/machine-factory";
import { runMachine } from "../platform/runner";
import { NodeHost } from "../platform/node/node-host";
import * as fs from "fs/promises";
import * as path from "path";

interface CliOptions {
  machineId: MachineId;
  romPath: string;
}

function parseArgs(argv: string[]): CliOptions {
  let machineId: MachineId = "generic6502";
  let romPath = path.join(__dirname, "..", "..", "helloworld.dat");

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--machine" && argv[i + 1]) {
      machineId = parseMachineId(argv[i + 1]);
      i++;
      continue;
    }
    if (!arg.startsWith("-")) {
      romPath = path.resolve(arg);
    }
  }

  return { machineId, romPath };
}

const options = parseArgs(process.argv);
const machine = createMachine(options.machineId);
const host = new NodeHost();

fs.readFile(options.romPath)
  .then((data) => {
    machine.loadProgram(data);
    runMachine(machine, host);
  })
  .catch((e) => {
    console.error(e);
  });
