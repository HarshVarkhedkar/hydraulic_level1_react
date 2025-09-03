import { InputModel, ValidationResult } from '../types/simulator';

export class ValidationUtils {
  static validateInputs(input: Partial<InputModel>): ValidationResult {
    const warnings: string[] = [];
    const tips: string[] = [];
    let isValid = true;

    const requiredFields = ['boreCm', 'rodCm', 'deadLoadTon', 'holdingLoadTon', 'motorRpm', 'pumpEfficiency', 'systemLossBar'];
    for (const field of requiredFields) {
      if (!input[field as keyof InputModel] || input[field as keyof InputModel] === 0) {
        isValid = false;
      }
    }

    if (!isValid) {
      warnings.push('Please fill in all required fields');
      return { isValid, warnings, tips };
    }

    if (input.boreCm! > 8.5) {
      warnings.push('Bore exceeds recommended 8.5 cm');
    }
    if (input.deadLoadTon! > 3.0) {
      warnings.push('Dead load exceeds recommended 3.0 ton');
    }
    if (input.holdingLoadTon! > 12.0) {
      warnings.push('Holding load exceeds recommended 12.0 ton');
    }
    if (input.rodCm! >= input.boreCm!) {
      warnings.push('Rod diameter must be smaller than bore diameter');
      isValid = false;
    }

    if (input.pumpEfficiency! < 0.85) {
      tips.push('Consider upgrading pump for higher efficiency (>85%)');
    }
    if (input.systemLossBar! > 12) {
      tips.push('High system losses detected. Check for leaks or restrictions');
    }
    if (input.motorRpm! < 1000) {
      tips.push('Low RPM may result in slow cycle times');
    }
    if (input.motorRpm! > 3000) {
      tips.push('High RPM may increase wear and noise');
    }

    return { isValid, warnings, tips };
  }
}