import { InputModel } from '../types/simulator';

export interface PredictionResult {
  maxPressure: number;
  efficiency: number;
  cycleTime: number;
  confidence: 'low' | 'medium' | 'high';
  status: 'Normal' | 'Warning' | 'Critical';
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

/**
 * Shape of JSON exported from sklearn
 */
interface SklearnModel {
  type: 'classification' | 'regression';
  features: string[];
  scaler: {
    mean: { [key: string]: number };
    scale: { [key: string]: number };
  };
  intercept: number | number[];
  coef: number[] | number[][];
  classes?: string[];
}

interface FileCoefficients {
  health?: SklearnModel;
  efficiency?: SklearnModel;
  cycleTime?: SklearnModel;
  pressure?: SklearnModel;
}

export class MLModel {
  private static fileCoeffs: FileCoefficients | null = null;
  private static isLoading = false;
  private static source: 'json' | 'fallback' = 'fallback';

  /**
   * Fallback coefficients (for offline mode)
   */
  private static readonly FALLBACK = {
    pressure: { intercept: 45.2, boreCm: -8.5, rodCm: 2.1, deadLoadTon: 12.3 },
    efficiency: { intercept: 0.65, boreCm: 0.08, rodCm: -0.02 },
    cycleTime: { intercept: 12.5, boreCm: -1.2, rodCm: 0.3 },
  };

  /**
   * Load sklearn-style ml_coefficients.json
   */
  static async loadCoefficients(): Promise<void> {
    if (this.fileCoeffs || this.isLoading) return;
    this.isLoading = true;

    try {
      const response = await fetch('/ml_coefficients.json');
      if (response.ok) {
        const fileCoeffs: FileCoefficients = await response.json();
        this.fileCoeffs = fileCoeffs;
        this.source = 'json';
        console.log('✅ Loaded sklearn model coefficients from ml_coefficients.json');
      } else {
        throw new Error(`File not found: ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load ml_coefficients.json, using fallback:', error);
      this.source = 'fallback';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Map simulation inputs -> sensor-like features expected by sklearn model
   */
  private static mapInputs(inputs: InputModel): Record<string, number> {
    return {
      pressureBar: inputs.systemLossBar + inputs.deadLoadTon * 10,
      temperatureC: 40 + inputs.motorRpm / 1000,
      vibration: 0.5 + inputs.holdingLoadTon / 100,
      flowLpm: (inputs.motorRpm * inputs.pumpEfficiency) / 20,
      systemEfficiency: inputs.pumpEfficiency * 100 - inputs.systemLossBar, // %
    };
  }

  private static scaleFeature(model: SklearnModel, key: string, value: number): number {
    const mean = model.scaler.mean[key] ?? 0;
    const scale = model.scaler.scale[key] ?? 1;
    return (value - mean) / (scale || 1);
  }

  private static predictSklearn(model: SklearnModel, inputs: any): number | string {
    const scaledFeatures = model.features.map((f) =>
      this.scaleFeature(model, f, inputs[f] ?? 0)
    );

    if (model.type === 'regression') {
      const coef = model.coef as number[];
      let result = model.intercept as number;
      coef.forEach((c, i) => {
        result += c * scaledFeatures[i];
      });
      return result;
    }

    if (model.type === 'classification') {
      const coef = model.coef as number[][];
      const intercept = model.intercept as number[];
      const logits = coef.map((row, classIdx) =>
        intercept[classIdx] + row.reduce((sum, c, i) => sum + c * scaledFeatures[i], 0)
      );
      const maxIdx = logits.indexOf(Math.max(...logits));
      return model.classes ? model.classes[maxIdx] : 'Normal';
    }

    return 0;
  }

  static async predict(inputs: InputModel): Promise<PredictionResult> {
    await this.loadCoefficients();

    let maxPressure = 0;
    let efficiency = 0;
    let cycleTime = 0;
    let status: 'Normal' | 'Warning' | 'Critical' = 'Normal';

    const mappedInputs = this.mapInputs(inputs);

    if (this.fileCoeffs) {
      if (this.fileCoeffs.pressure) {
        maxPressure = this.predictSklearn(this.fileCoeffs.pressure, mappedInputs) as number;
      }
      if (this.fileCoeffs.efficiency) {
        efficiency = this.predictSklearn(this.fileCoeffs.efficiency, mappedInputs) as number;
      }
      if (this.fileCoeffs.cycleTime) {
        cycleTime = this.predictSklearn(this.fileCoeffs.cycleTime, mappedInputs) as number;
      }
      if (this.fileCoeffs.health) {
        const healthPred = this.predictSklearn(this.fileCoeffs.health, mappedInputs);
        if (healthPred === 'Fault') status = 'Critical';
        else if (healthPred === 'Warning') status = 'Warning';
        else status = 'Normal';
      }
    }

    // 🚨 Hybrid Fallback
    if (!maxPressure || isNaN(maxPressure)) {
      maxPressure = inputs.systemLossBar + inputs.deadLoadTon * 10; // rough bar estimate
    }

    if (!efficiency || isNaN(efficiency)) {
      efficiency = inputs.pumpEfficiency * 100; // simulator fallback
    }

    // Clamp efficiency strictly to 0–100%
    efficiency = Math.min(100, Math.max(0, efficiency));

    if (!cycleTime || isNaN(cycleTime)) {
      cycleTime = (inputs.holdingLoadTon + inputs.deadLoadTon) / (inputs.motorRpm / 60); // sec approx
    }

    // 🚨 Rule-based status override (final layer)
    if (efficiency < 20) status = 'Critical';
    else if (efficiency < 50) status = 'Warning';
    else status = 'Normal';

    const confidence: 'low' | 'medium' | 'high' =
      this.source === 'json' ? 'high' : 'medium';

    return { maxPressure, efficiency, cycleTime, confidence, status };
  }

  static async suggestImprovements(inputs: InputModel, goal: Goal): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    return suggestions;
  }

  static getCoefficientsSource(): 'json' | 'fallback' {
    return this.source;
  }
}
