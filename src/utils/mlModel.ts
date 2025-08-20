import { InputModel } from '../types/simulator';

export interface PredictionResult {
  maxPressure: number;
  efficiency: number;
  cycleTime: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface Goal {
  targetCycleTimePct?: number;
  targetMaxPressurePct?: number;
  targetEfficiencyPct?: number;
}

export interface Suggestion {
  parameter: 'boreCm' | 'motorRpm';
  currentValue: number;
  suggestedValue: number;
  change: number;
  impact: string;
  outOfRange: boolean;
  confidence: 'low' | 'medium' | 'high';
}

export class MLModel {
  // Placeholder regression coefficients (to be replaced with real ones from Excel/Python)
  private static readonly PRESSURE_COEFFS = {
    intercept: 45.2,
    boreCm: -8.5,
    rodCm: 2.1,
    deadLoadTon: 12.3,
    holdingLoadTon: 8.7,
    motorRpm: 0.002,
    pumpEfficiency: -15.4,
    systemLossBar: 1.8
  };

  private static readonly EFFICIENCY_COEFFS = {
    intercept: 0.65,
    boreCm: 0.08,
    rodCm: -0.02,
    deadLoadTon: -0.01,
    holdingLoadTon: -0.005,
    motorRpm: 0.00008,
    pumpEfficiency: 0.35,
    systemLossBar: -0.008
  };

  private static readonly CYCLE_TIME_COEFFS = {
    intercept: 12.5,
    boreCm: -1.2,
    rodCm: 0.3,
    deadLoadTon: 0.8,
    holdingLoadTon: 0.4,
    motorRpm: -0.003,
    pumpEfficiency: -2.1,
    systemLossBar: 0.15
  };

  // R² values for confidence calculation (placeholder values)
  private static readonly R_SQUARED = {
    pressure: 0.87,
    efficiency: 0.92,
    cycleTime: 0.85
  };

  static predict(inputs: InputModel): PredictionResult {
    const maxPressure = this.calculatePressure(inputs);
    const efficiency = this.calculateEfficiency(inputs);
    const cycleTime = this.calculateCycleTime(inputs);

    // Calculate overall confidence based on R² values
    const avgRSquared = (this.R_SQUARED.pressure + this.R_SQUARED.efficiency + this.R_SQUARED.cycleTime) / 3;
    const confidence = this.getConfidenceLevel(avgRSquared);

    return {
      maxPressure: Math.max(0, maxPressure),
      efficiency: Math.max(0, Math.min(1, efficiency)),
      cycleTime: Math.max(0, cycleTime),
      confidence
    };
  }

  static suggestImprovements(inputs: InputModel, goal: Goal): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const currentPrediction = this.predict(inputs);

    // Handle cycle time reduction goal
    if (goal.targetCycleTimePct) {
      const targetCycleTime = currentPrediction.cycleTime * (1 + goal.targetCycleTimePct / 100);
      const cycleTimeDiff = targetCycleTime - currentPrediction.cycleTime;

      // Calculate sensitivity for bore diameter
      const boreSensitivity = this.calculateSensitivity(inputs, 'boreCm', 'cycleTime');
      if (Math.abs(boreSensitivity) > 0.001) {
        const boreChange = cycleTimeDiff / boreSensitivity;
        const newBore = inputs.boreCm + boreChange;
        
        suggestions.push({
          parameter: 'boreCm',
          currentValue: inputs.boreCm,
          suggestedValue: Math.max(3, Math.min(12, newBore)),
          change: boreChange,
          impact: `Cycle time ${goal.targetCycleTimePct > 0 ? 'increased' : 'reduced'} by ${Math.abs(goal.targetCycleTimePct)}%`,
          outOfRange: newBore < 3 || newBore > 8.5,
          confidence: this.getConfidenceLevel(this.R_SQUARED.cycleTime)
        });
      }

      // Calculate sensitivity for motor RPM
      const rpmSensitivity = this.calculateSensitivity(inputs, 'motorRpm', 'cycleTime');
      if (Math.abs(rpmSensitivity) > 0.00001) {
        const rpmChange = cycleTimeDiff / rpmSensitivity;
        const newRpm = inputs.motorRpm + rpmChange;
        
        suggestions.push({
          parameter: 'motorRpm',
          currentValue: inputs.motorRpm,
          suggestedValue: Math.max(500, Math.min(3500, newRpm)),
          change: rpmChange,
          impact: `Cycle time ${goal.targetCycleTimePct > 0 ? 'increased' : 'reduced'} by ${Math.abs(goal.targetCycleTimePct)}%`,
          outOfRange: newRpm < 1000 || newRpm > 3000,
          confidence: this.getConfidenceLevel(this.R_SQUARED.cycleTime)
        });
      }
    }

    // Handle pressure reduction goal
    if (goal.targetMaxPressurePct) {
      const targetPressure = currentPrediction.maxPressure * (1 + goal.targetMaxPressurePct / 100);
      const pressureDiff = targetPressure - currentPrediction.maxPressure;

      // Calculate sensitivity for bore diameter
      const boreSensitivity = this.calculateSensitivity(inputs, 'boreCm', 'maxPressure');
      if (Math.abs(boreSensitivity) > 0.001) {
        const boreChange = pressureDiff / boreSensitivity;
        const newBore = inputs.boreCm + boreChange;
        
        suggestions.push({
          parameter: 'boreCm',
          currentValue: inputs.boreCm,
          suggestedValue: Math.max(3, Math.min(12, newBore)),
          change: boreChange,
          impact: `Max pressure ${goal.targetMaxPressurePct > 0 ? 'increased' : 'reduced'} by ${Math.abs(goal.targetMaxPressurePct)}%`,
          outOfRange: newBore < 3 || newBore > 8.5,
          confidence: this.getConfidenceLevel(this.R_SQUARED.pressure)
        });
      }
    }

    return suggestions.slice(0, 4); // Limit to 4 suggestions
  }

  private static calculatePressure(inputs: InputModel): number {
    const coeffs = this.PRESSURE_COEFFS;
    return coeffs.intercept +
           coeffs.boreCm * inputs.boreCm +
           coeffs.rodCm * inputs.rodCm +
           coeffs.deadLoadTon * inputs.deadLoadTon +
           coeffs.holdingLoadTon * inputs.holdingLoadTon +
           coeffs.motorRpm * inputs.motorRpm +
           coeffs.pumpEfficiency * inputs.pumpEfficiency +
           coeffs.systemLossBar * inputs.systemLossBar;
  }

  private static calculateEfficiency(inputs: InputModel): number {
    const coeffs = this.EFFICIENCY_COEFFS;
    return coeffs.intercept +
           coeffs.boreCm * inputs.boreCm +
           coeffs.rodCm * inputs.rodCm +
           coeffs.deadLoadTon * inputs.deadLoadTon +
           coeffs.holdingLoadTon * inputs.holdingLoadTon +
           coeffs.motorRpm * inputs.motorRpm +
           coeffs.pumpEfficiency * inputs.pumpEfficiency +
           coeffs.systemLossBar * inputs.systemLossBar;
  }

  private static calculateCycleTime(inputs: InputModel): number {
    const coeffs = this.CYCLE_TIME_COEFFS;
    return coeffs.intercept +
           coeffs.boreCm * inputs.boreCm +
           coeffs.rodCm * inputs.rodCm +
           coeffs.deadLoadTon * inputs.deadLoadTon +
           coeffs.holdingLoadTon * inputs.holdingLoadTon +
           coeffs.motorRpm * inputs.motorRpm +
           coeffs.pumpEfficiency * inputs.pumpEfficiency +
           coeffs.systemLossBar * inputs.systemLossBar;
  }

  private static calculateSensitivity(
    inputs: InputModel, 
    parameter: keyof InputModel, 
    target: 'maxPressure' | 'efficiency' | 'cycleTime'
  ): number {
    const delta = parameter === 'motorRpm' ? 10 : 0.1; // Small nudge
    
    // Create modified inputs
    const modifiedInputs = { ...inputs };
    modifiedInputs[parameter] = (inputs[parameter] as number) + delta;
    
    // Calculate predictions
    const originalPrediction = this.predict(inputs);
    const modifiedPrediction = this.predict(modifiedInputs);
    
    // Return sensitivity (change in target per unit change in parameter)
    return (modifiedPrediction[target] - originalPrediction[target]) / delta;
  }

  private static getConfidenceLevel(rSquared: number): 'low' | 'medium' | 'high' {
    if (rSquared >= 0.9) return 'high';
    if (rSquared >= 0.8) return 'medium';
    return 'low';
  }
}