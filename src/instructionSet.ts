import { M6502 } from "./m6502";
import Memory from "./memory";

const SIGN_BIT = 7;
const PAGE_SIZE = 255;

//TWO's complement subtraction via addition
//a + (~b + 1)

export class InstructionSet  {

    static LDA(cpu: M6502, memory: Memory, address: number): number {
        cpu.accumulator = address;

        cpu.status &= ~cpu.FLAG_Z;
        if(cpu.accumulator == 0){
            cpu.status |= cpu.FLAG_Z;
        }

        cpu.status &= ~cpu.FLAG_N;
        if((cpu.accumulator >> SIGN_BIT) & 0x01){
            cpu.status |= cpu.FLAG_N;
        }

        return 2;
    }

    static LDA_ABS(cpu: M6502, memory: Memory, address: number): number {
        cpu.accumulator = memory.bytes[address];

        cpu.status &= ~cpu.FLAG_Z;
        if(cpu.accumulator == 0){
            cpu.status |= cpu.FLAG_Z;
        }

        cpu.status &= ~cpu.FLAG_N;
        if((cpu.accumulator >> SIGN_BIT) & 0x01){
            cpu.status |= cpu.FLAG_N;
        }

        return 4;
    }

    static LDA_ABS_X(cpu: M6502, memory: Memory, address: number): number {
        const offset = address + cpu.regX;
        cpu.accumulator = memory.bytes[offset];

        cpu.status &= ~cpu.FLAG_Z;
        if(cpu.accumulator == 0){
            cpu.status |= cpu.FLAG_Z;
        }

        cpu.status &= ~cpu.FLAG_N;
        if((cpu.accumulator >> SIGN_BIT) & 0x01){
            cpu.status |= cpu.FLAG_N;
        }

        if((address % PAGE_SIZE) != (offset % PAGE_SIZE)){
            return 5;
        }
        return 4;
    }

    static LDA_ABS_Y(cpu: M6502, memory: Memory, address: number): number {
        const offset = address + cpu.regY;
        cpu.accumulator = memory.bytes[offset];

        cpu.status &= ~cpu.FLAG_Z;
        if(cpu.accumulator == 0){
            cpu.status |= cpu.FLAG_Z;
        }

        cpu.status &= ~cpu.FLAG_N;
        if((cpu.accumulator >> SIGN_BIT) & 0x01){
            cpu.status |= cpu.FLAG_N;
        }

        if((address % PAGE_SIZE) != (offset % PAGE_SIZE)){
            return 5;
        }
        return 4;
    }

    static LDA_ZP(cpu: M6502, memory: Memory, address: number): number {
        cpu.accumulator = memory.data[address];

        cpu.status &= ~cpu.FLAG_Z;
        if(cpu.accumulator == 0){
            cpu.status |= cpu.FLAG_Z;
        }

        cpu.status &= ~cpu.FLAG_N;
        if((cpu.accumulator >> SIGN_BIT) & 0x01){
            cpu.status |= cpu.FLAG_N;
        }

        return 3;
    }

    static STX(cpu: M6502): number {
        
        return 0; // return the number of cycles used
    }

    static INX(cpu: M6502): number {
        cpu.regX = cpu.regX >= 255 ? 0 : cpu.regX + 1;

        cpu.status &= ~cpu.FLAG_N;
        if((cpu.regX >> SIGN_BIT) & 0x01){
            cpu.status |= cpu.FLAG_N;
        }

        cpu.status &= ~cpu.FLAG_Z;
        if(cpu.regX == 0){
            cpu.status |= cpu.FLAG_Z;
        }

        return 2;
    }

    static INY(cpu: M6502): number {
        cpu.regY = cpu.regY >= 255 ? 0 : cpu.regY + 1;

        cpu.status &= ~cpu.FLAG_N;
        if((cpu.regY >> SIGN_BIT) & 0x01){
            cpu.status |= cpu.FLAG_N;
        }

        cpu.status &= ~cpu.FLAG_Z;
        if(cpu.regY == 0){
            cpu.status |= cpu.FLAG_Z;
        }

        return 2;
    }

    static JMP(cpu: M6502, address: number): number {
        cpu.programCounter = address;
        return 3;
    }

    static JMP_I(cpu: M6502, memory: Memory, address: number): number {
        cpu.programCounter = memory.data.getUint16(address, cpu.littleEndian);
        return 5;
    }

    static JSR(cpu: M6502, memory: Memory, address: number): number {
        memory.data.setUint16(cpu.stackPointer, cpu.programCounter, true);
        cpu.stackPointer += 2;
        cpu.programCounter = address;
        return 6;
    }

    static CLC(cpu: M6502, memory: Memory): number {
        cpu.status &= ~cpu.FLAG_C;
        return 2;
    }

    static CLD(cpu: M6502, memory: Memory): number {
        cpu.status &= ~cpu.FLAG_D;
        return 2;
    }

    static CLI(cpu: M6502, memory: Memory): number {
        cpu.status &= ~cpu.FLAG_I;
        return 2;
    }

    static CLV(cpu: M6502, memory: Memory): number {
        cpu.status &= ~cpu.FLAG_V;
        return 2;
    }

    static BCC(cpu: M6502, memory: Memory, address: number): number {
        if((cpu.status & cpu.FLAG_C) == 0){
            const old_page = (cpu.programCounter % PAGE_SIZE);
            cpu.programCounter |= address;
            if((cpu.programCounter % PAGE_SIZE) != old_page){
                return 4;
            }
            return 3;
        }
        return 2;
    }

    static BCS(cpu: M6502, memory: Memory, address: number): number {
        if((cpu.status & cpu.FLAG_C) == cpu.FLAG_C){
            const old_page = (cpu.programCounter % PAGE_SIZE);
            cpu.programCounter |= address;
            if((cpu.programCounter % PAGE_SIZE) != old_page){
                return 4;
            }
            return 3;
        }
        return 2;
    }

    static BEQ(cpu: M6502, memory: Memory, address: number): number {
        if((cpu.status & cpu.FLAG_Z) == cpu.FLAG_Z){
            const old_page = (cpu.programCounter % PAGE_SIZE);
            cpu.programCounter |= address;
            if((cpu.programCounter % PAGE_SIZE) != old_page){
                return 4;
            }
            return 3;
        }
        return 2;
    }

    static BMI(cpu: M6502, memory: Memory, address: number): number {
        if((cpu.status & cpu.FLAG_N) == cpu.FLAG_N){
            const old_page = (cpu.programCounter % PAGE_SIZE);
            cpu.programCounter |= address;
            if((cpu.programCounter % PAGE_SIZE) != old_page){
                return 4;
            }
            return 3;
        }
        return 2;
    }

    static BNE(cpu: M6502, memory: Memory, address: number): number {
        if((cpu.status & cpu.FLAG_Z) == 0){
            const old_page = (cpu.programCounter % PAGE_SIZE);
            cpu.programCounter |= address;
            if((cpu.programCounter % PAGE_SIZE) != old_page){
                return 4;
            }
            return 3;
        }
        return 2;
    }

    static BPL(cpu: M6502, memory: Memory, address: number): number {
        if((cpu.status & cpu.FLAG_N) == 0){
            const old_page = (cpu.programCounter % PAGE_SIZE);
            cpu.programCounter |= address;
            if((cpu.programCounter % PAGE_SIZE) != old_page){
                return 4;
            }
            return 3;
        }
        return 2;
    }


}