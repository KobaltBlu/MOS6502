const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "../src/m6502.ts"), "utf8");
const start = src.indexOf("// INSTRUCTIONS");
const end = src.lastIndexOf("}");
const body = src.slice(start, end);
const methodRe = /^  ([A-Z][A-Z0-9_]*)\([^)]*\)[^{]*\{[\s\S]*?\n  \}/gm;
const methods = {};
let m;
while ((m = methodRe.exec(body)) !== null) {
  methods[m[1]] = m[0];
}

const loadNames = /^LDA|^LDX|^LDY/;
const storeNames = /^STA|^STX|^STY/;
const branchNames = /^BCC|^BCS|^BEQ|^BMI|^BNE|^BPL|^BVC|^BVS/;
const stackNames = /^JMP|^JSR|^RTS|^RTI|^PHA|^PHP|^PLA|^PLP|^NOP/;
const transferNames = /^TAX|^TAY|^TSX|^TXA|^TXS|^TYA|^INX|^INY|^DEX|^DEY|^DEC/;

const buckets = {
  load: {},
  store: {},
  branch: {},
  stack: {},
  transfer: {},
  shift: {},
};

for (const [name, code] of Object.entries(methods)) {
  let bucket = "shift";
  if (loadNames.test(name)) bucket = "load";
  else if (storeNames.test(name)) bucket = "store";
  else if (branchNames.test(name)) bucket = "branch";
  else if (stackNames.test(name)) bucket = "stack";
  else if (transferNames.test(name)) bucket = "transfer";
  buckets[bucket][name] = code;
}

const outDir = path.join(__dirname, "../src/cpu/m6502/instructions");
fs.mkdirSync(outDir, { recursive: true });

const header =
  "import type { MemoryMap } from '../../../memory/memory-map';\n" +
  "import { PAGE_SIZE } from '../../../core/constants';\n" +
  "import { setZeroNegative } from '../../flags';\n" +
  "import { SIGN_BIT } from '../../constants';\n\n";

function convertMethod(code) {
  return code
    .replace(/^  /, "")
    .replace(/MemoryController/g, "MemoryMap")
    .replace(/\n  \}$/, "\n  },");
}

for (const [bucket, obj] of Object.entries(buckets)) {
  let out = header + `export const ${bucket}Instructions = {\n`;
  for (const code of Object.values(obj)) {
    out += "  " + convertMethod(code) + "\n";
  }
  out += "};\n";
  fs.writeFileSync(path.join(outDir, bucket + ".ts"), out);
}

console.log(
  "split",
  Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, Object.keys(v).length]))
);
