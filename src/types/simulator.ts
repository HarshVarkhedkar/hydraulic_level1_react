// src/types/simulator.ts

// Input parameters for the hydraulic system model
export interface InputModel {
  boreCm: number;
  rodCm: number;
  deadLoadTon: number;
  holdingLoadTon: number;
  motorRpm: number;
  pumpEfficiency: number;
  systemLossBar: number;
}

// Duty cycle phases of the hydraulic cylinder
export type Phase = 'FastDown' | 'Working' | 'Holding' | 'FastUp';

// A single datapoint in the simulation timeline
export interface DataPoint {
  timeSec: number;
  strokeMm: number;
  flowLpm: number;
  pressureBar: number;
  hydPowerKW: number;
  pumpPowerKW: number;
  actuatorPowerKW: number;
  phase?: Phase; // <-- new field for tagging each datapoint with cycle phase
}

// Validation results for user input
export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  tips: string[];
}

// Step-by-step calculation logs
export interface CalculationStep {
  formula: string;
  calculation: string;
  result: string;
}
