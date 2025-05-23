export interface BusTransaction {
  type: 'read' | 'write';
  address: number;
  data: number;
  cycle: number;
};