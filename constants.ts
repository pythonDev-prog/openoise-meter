
import { MachineStandard } from './types';

export const MACHINE_STANDARDS: MachineStandard[] = [
  {
    id: 'm1',
    name: 'Washing Machine - Spin Cycle',
    category: 'Home Appliance',
    maxDb: 72,
    peakFreqRange: [50, 200]
  },
  {
    id: 'm2',
    name: 'Industrial Conveyor Belt',
    category: 'Manufacturing',
    maxDb: 85,
    peakFreqRange: [100, 500]
  },
  {
    id: 'm3',
    name: 'Pneumatic Drill (Stationary)',
    category: 'Construction',
    maxDb: 105,
    peakFreqRange: [800, 2000]
  },
  {
    id: 'm4',
    name: 'Centrifugal Pump (Medium)',
    category: 'Utilities',
    maxDb: 78,
    peakFreqRange: [200, 600]
  },
  {
    id: 'm5',
    name: 'HVAC Air Handler',
    category: 'Facilities',
    maxDb: 65,
    peakFreqRange: [60, 150]
  }
];

export const CALIBRATION_STORAGE_KEY = 'acoustic_tool_calibration_v1';
export const DEFAULT_CALIBRATION_OFFSET = -20; // Default offset for web audio RMS
