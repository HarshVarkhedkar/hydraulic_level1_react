export interface InputModel {
  boreCm: number;
  rodCm: number;
  deadLoadTon: number;
  holdingLoadTon: number;
  motorRpm: number;
  pumpEfficiency: number;
  systemLossBar: number;
}

export interface DataPoint {
  timeSec: number;
  strokeMm: number;
  flowLpm: number;
  pressureBar: number;
  hydPowerKW: number;
  pumpPowerKW: number;
  actuatorPowerKW: number;
}

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  tips: string[];
}

export interface CalculationStep {
  formula: string;
  calculation: string;
  result: string;
}