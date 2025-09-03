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
  parameter: 'boreCm' | 'motorRpm' | 'rodCm' | 'pumpEfficiency';
  currentValue: number;
  suggestedValue: number;
  change: number;
  impact: string;
  outOfRange: boolean;
  confidence: 'low' | 'medium' | 'high';
}

export interface RegressionCoefficients {
  pressure: {
    intercept: number;
    boreCm: number;
    rodCm: number;
    deadLoadTon: number;
    holdingLoadTon: number;
    motorRpm: number;
    pumpEfficiency: number;
    systemLossBar: number;
  };
  efficiency: {
    intercept: number;
    boreCm: number;
    rodCm: number;
    deadLoadTon: number;
    holdingLoadTon: number;
    motorRpm: number;
    pumpEfficiency: number;
    systemLossBar: number;
  };
  cycleTime: {
    intercept: number;
    boreCm: number;
    rodCm: number;
    deadLoadTon: number;
    holdingLoadTon: number;
    motorRpm: number;
    pumpEfficiency: number;
    systemLossBar: number;
  };
  rSquared: {
    pressure: number;
    efficiency: number;
    cycleTime: number;
  };
}

export class MLModel {
  private static coefficients: RegressionCoefficients | null = null;
  private static isLoading = false;

  private static readonly FALLBACK_COEFFS: RegressionCoefficients = {
    pressure: {
      intercept: 45.2,
      boreCm: -8.5,
      rodCm: 2.1,
      deadLoadTon: 12.3,
      holdingLoadTon: 8.7,
      motorRpm: 0.002,
      pumpEfficiency: -15.4,
      systemLossBar: 1.8
    },
    efficiency: {
      intercept: 0.65,
      boreCm: 0.08,
      rodCm: -0.02,
      deadLoadTon: -0.01,
      holdingLoadTon: -0.005,
      motorRpm: 0.00008,
      pumpEfficiency: 0.35,
      systemLossBar: -0.008
    },
    cycleTime: {
      intercept: 12.5,
      boreCm: -1.2,
      rodCm: 0.3,
      deadLoadTon: 0.8,
      holdingLoadTon: 0.4,
      motorRpm: -0.003,
      pumpEfficiency: -2.1,
      systemLossBar: 0.15
    },
    rSquared: {
      pressure: 0.87,
      efficiency: 0.92,
      cycleTime: 0.85
    }
  };


  static async loadCoefficients(): Promise<void> {
    if (this.coefficients || this.isLoading) return;
    
    this.isLoading = true;
    
    try {
      const response = await fetch('/api/ml-coefficients', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const apiCoeffs = await response.json();
        this.coefficients = this.validateCoefficients(apiCoeffs) ? apiCoeffs : this.FALLBACK_COEFFS;
        console.log('✅ ML coefficients loaded from API');
      } else {
        throw new Error(`API responded with status: ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch ML coefficients from API, using fallback:', error);
      this.coefficients = this.FALLBACK_COEFFS;
    } finally {
      this.isLoading = false;
    }
  }


  private static validateCoefficients(coeffs: any): boolean {
    try {
      return (
        coeffs &&
        coeffs.pressure && typeof coeffs.pressure.intercept === 'number' &&
        coeffs.efficiency && typeof coeffs.efficiency.intercept === 'number' &&
        coeffs.cycleTime && typeof coeffs.cycleTime.intercept === 'number' &&
        coeffs.rSquared && typeof coeffs.rSquared.pressure === 'number'
      );
    } catch {
      return false;
    }
  }


  private static async getCoefficients(): Promise<RegressionCoefficients> {
    if (!this.coefficients) {
      await this.loadCoefficients();
    }
    return this.coefficients || this.FALLBACK_COEFFS;
  }

 
  static async predict(inputs: InputModel): Promise<PredictionResult> {
    const coeffs = await this.getCoefficients();

    const maxPressure = this.calculatePressure(inputs, coeffs.pressure);
    const efficiency = this.calculateEfficiency(inputs, coeffs.efficiency);
    const cycleTime = this.calculateCycleTime(inputs, coeffs.cycleTime);

    const avgRSquared = (coeffs.rSquared.pressure + coeffs.rSquared.efficiency + coeffs.rSquared.cycleTime) / 3;
    const confidence = this.getConfidenceLevel(avgRSquared);

    return {
      maxPressure: Math.max(0, maxPressure),
      efficiency: Math.max(0, Math.min(1, efficiency)),
      cycleTime: Math.max(0, cycleTime),
      confidence
    };
  }


  static async suggestImprovements(inputs: InputModel, goal: Goal): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    const coeffs = await this.getCoefficients();
    const currentPrediction = await this.predict(inputs);

    if (goal.targetCycleTimePct) {
      const targetCycleTime = currentPrediction.cycleTime * (1 + goal.targetCycleTimePct / 100);
      const cycleTimeDiff = targetCycleTime - currentPrediction.cycleTime;

      const boreSensitivity = await this.calculateSensitivity(inputs, 'boreCm', 'cycleTime');
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
          confidence: this.getConfidenceLevel(coeffs.rSquared.cycleTime)
        });
      }

      const rpmSensitivity = await this.calculateSensitivity(inputs, 'motorRpm', 'cycleTime');
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
          confidence: this.getConfidenceLevel(coeffs.rSquared.cycleTime)
        });
      }

      const rodSensitivity = await this.calculateSensitivity(inputs, 'rodCm', 'cycleTime');
      if (Math.abs(rodSensitivity) > 0.001) {
        const rodChange = cycleTimeDiff / rodSensitivity;
        const newRod = inputs.rodCm + rodChange;
        
        suggestions.push({
          parameter: 'rodCm',
          currentValue: inputs.rodCm,
          suggestedValue: Math.max(1, Math.min(inputs.boreCm - 0.5, newRod)),
          change: rodChange,
          impact: `Cycle time ${goal.targetCycleTimePct > 0 ? 'increased' : 'reduced'} by ${Math.abs(goal.targetCycleTimePct)}%`,
          outOfRange: newRod < 1 || newRod >= inputs.boreCm,
          confidence: this.getConfidenceLevel(coeffs.rSquared.cycleTime)
        });
      }

      const effSensitivity = await this.calculateSensitivity(inputs, 'pumpEfficiency', 'cycleTime');
      if (Math.abs(effSensitivity) > 0.001) {
        const effChange = cycleTimeDiff / effSensitivity;
        const newEff = inputs.pumpEfficiency + effChange;
        
        suggestions.push({
          parameter: 'pumpEfficiency',
          currentValue: inputs.pumpEfficiency,
          suggestedValue: Math.max(0.5, Math.min(0.98, newEff)),
          change: effChange,
          impact: `Cycle time ${goal.targetCycleTimePct > 0 ? 'increased' : 'reduced'} by ${Math.abs(goal.targetCycleTimePct)}%`,
          outOfRange: newEff < 0.7 || newEff > 0.95,
          confidence: this.getConfidenceLevel(coeffs.rSquared.cycleTime)
        });
      }
    }

    if (goal.targetMaxPressurePct) {
      const targetPressure = currentPrediction.maxPressure * (1 + goal.targetMaxPressurePct / 100);
      const pressureDiff = targetPressure - currentPrediction.maxPressure;

      const boreSensitivity = await this.calculateSensitivity(inputs, 'boreCm', 'maxPressure');
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
          confidence: this.getConfidenceLevel(coeffs.rSquared.pressure)
        });
      }
    }

    if (goal.targetEfficiencyPct) {
      const targetEfficiency = currentPrediction.efficiency * (1 + goal.targetEfficiencyPct / 100);
      const efficiencyDiff = targetEfficiency - currentPrediction.efficiency;

      const pumpEffSensitivity = await this.calculateSensitivity(inputs, 'pumpEfficiency', 'efficiency');
      if (Math.abs(pumpEffSensitivity) > 0.001) {
        const pumpEffChange = efficiencyDiff / pumpEffSensitivity;
        const newPumpEff = inputs.pumpEfficiency + pumpEffChange;
        
        suggestions.push({
          parameter: 'pumpEfficiency',
          currentValue: inputs.pumpEfficiency,
          suggestedValue: Math.max(0.5, Math.min(0.98, newPumpEff)),
          change: pumpEffChange,
          impact: `System efficiency ${goal.targetEfficiencyPct > 0 ? 'increased' : 'reduced'} by ${Math.abs(goal.targetEfficiencyPct)}%`,
          outOfRange: newPumpEff < 0.7 || newPumpEff > 0.95,
          confidence: this.getConfidenceLevel(coeffs.rSquared.efficiency)
        });
      }
    }

    return suggestions.slice(0, 4);
  }


  private static calculatePressure(inputs: InputModel, coeffs: any): number {
    return coeffs.intercept +
           coeffs.boreCm * inputs.boreCm +
           coeffs.rodCm * inputs.rodCm +
           coeffs.deadLoadTon * inputs.deadLoadTon +
           coeffs.holdingLoadTon * inputs.holdingLoadTon +
           coeffs.motorRpm * inputs.motorRpm +
           coeffs.pumpEfficiency * inputs.pumpEfficiency +
           coeffs.systemLossBar * inputs.systemLossBar;
  }

  /**
   * Calculate efficiency using regression coefficients
   */
  private static calculateEfficiency(inputs: InputModel, coeffs: any): number {
    return coeffs.intercept +
           coeffs.boreCm * inputs.boreCm +
           coeffs.rodCm * inputs.rodCm +
           coeffs.deadLoadTon * inputs.deadLoadTon +
           coeffs.holdingLoadTon * inputs.holdingLoadTon +
           coeffs.motorRpm * inputs.motorRpm +
           coeffs.pumpEfficiency * inputs.pumpEfficiency +
           coeffs.systemLossBar * inputs.systemLossBar;
  }

  /**
   * Calculate cycle time using regression coefficients
   */
  private static calculateCycleTime(inputs: InputModel, coeffs: any): number {
    return coeffs.intercept +
           coeffs.boreCm * inputs.boreCm +
           coeffs.rodCm * inputs.rodCm +
           coeffs.deadLoadTon * inputs.deadLoadTon +
           coeffs.holdingLoadTon * inputs.holdingLoadTon +
           coeffs.motorRpm * inputs.motorRpm +
           coeffs.pumpEfficiency * inputs.pumpEfficiency +
           coeffs.systemLossBar * inputs.systemLossBar;
  }

  /**
   * Calculate sensitivity using finite differences
   */
  private static async calculateSensitivity(
    inputs: InputModel, 
    parameter: keyof InputModel, 
    target: 'maxPressure' | 'efficiency' | 'cycleTime'
  ): Promise<number> {
    const delta = parameter === 'motorRpm' ? 10 : 0.1; // Small nudge
    
    // Create modified inputs
    const modifiedInputs = { ...inputs };
    modifiedInputs[parameter] = (inputs[parameter] as number) + delta;
    
    // Calculate predictions
    const originalPrediction = await this.predict(inputs);
    const modifiedPrediction = await this.predict(modifiedInputs);
    
    // Return sensitivity (change in target per unit change in parameter)
    return (modifiedPrediction[target] - originalPrediction[target]) / delta;
  }

  /**
   * Convert R² value to confidence level
   */
  private static getConfidenceLevel(rSquared: number): 'low' | 'medium' | 'high' {
    if (rSquared >= 0.9) return 'high';
    if (rSquared >= 0.8) return 'medium';
    return 'low';
  }

  /**
   * Get coefficient source information
   */
  static getCoefficientsSource(): 'api' | 'fallback' {
    return this.coefficients === this.FALLBACK_COEFFS ? 'fallback' : 'api';
  }
}