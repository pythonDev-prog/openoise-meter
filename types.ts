
export enum DiagnosticStatus {
  NORMAL = 'NORMAL',
  ABNORMAL = 'ABNORMAL',
  IDLE = 'IDLE'
}

export interface MachineStandard {
  id: string;
  name: string;
  category: string;
  maxDb: number;
  peakFreqRange: [number, number]; // Expected operational frequency range
}

export interface AudioMetrics {
  db: number;
  peakFrequency: number;
  isStable: boolean;
  status: DiagnosticStatus;
}

export interface HistoryEntry {
  id: string;
  machineId: string;
  machineName: string;
  timestamp: number;
  status: DiagnosticStatus;
  db: number;
  peakFrequency: number;
}
