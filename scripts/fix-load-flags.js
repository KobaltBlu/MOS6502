const fs = require("fs");

const p = "src/cpu/m6502/instructions/load.ts";
let c = fs.readFileSync(p, "utf8");

const flagBlock = `
    this.status &= ~this.FLAG_Z;
    if (this.accumulator == 0) {
      this.status |= this.FLAG_Z;
    }

    this.status &= ~this.FLAG_N;
    if ((this.accumulator >> SIGN_BIT) & 0x01) {
      this.status |= this.FLAG_N;
    }`;

while (c.includes(flagBlock)) {
  c = c.replace(flagBlock, "\n    setZeroNegative(this, this.accumulator);");
}

const regXBlock = /this\.regX = ([^;]+);\s+this\.status &= ~this\.FLAG_Z;[\s\S]*?this\.status \|= this\.FLAG_N;\s+\}/g;
c = c.replace(regXBlock, "this.regX = $1;\n    setZeroNegative(this, this.regX);\n  }");

const regYBlock = /this\.regY = ([^;]+);\s+this\.status &= ~this\.FLAG_Z;[\s\S]*?this\.status \|= this\.FLAG_N;\s+\}/g;
c = c.replace(regYBlock, "this.regY = $1;\n    setZeroNegative(this, this.regY);\n  }");

c = c.replace("import { SIGN_BIT } from '../../constants';\n", "");

fs.writeFileSync(p, c);
console.log("load.ts updated");
