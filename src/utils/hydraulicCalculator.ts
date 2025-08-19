export class HydroCalculator {
  private static readonly g = 9.81;

  static pistonArea(boreCm: number): number {
    const boreM = boreCm / 100.0;
    return Math.PI * Math.pow(boreM, 2) / 4.0;
  }

  static rodArea(boreCm: number, rodCm: number): number {
    const boreM = boreCm / 100.0;
    const rodM = rodCm / 100.0;
    return Math.PI * (Math.pow(boreM, 2) - Math.pow(rodM, 2)) / 4.0;
  }

  static forceFromTon(ton: number): number {
    return ton * 1000.0 * this.g;
  }

  static pressureBar(forceN: number, areaM2: number): number {
    return (forceN / areaM2) / 1e5;
  }

  static flowLpm(areaM2: number, speedMmSec: number): number {
    const vMs = speedMmSec / 1000.0;
    const qM3Sec = areaM2 * vMs;
    return qM3Sec * 60.0 * 1000.0;
  }

  static hydraulicPowerKW(pBar: number, qLpm: number): number {
    return (pBar * qLpm) / 600.0;
  }

  static pumpInputKW(hydraulicKW: number, pumpEff: number): number {
    return hydraulicKW / pumpEff;
  }

  static pumpDisplacementCC(qLpm: number, rpm: number): number {
    return (qLpm * 1000.0) / rpm;
  }

  static reliefSetting(requiredBar: number, systemLossBar: number, safetyMarginPercent: number): number {
    return requiredBar + systemLossBar + (requiredBar * safetyMarginPercent / 100.0);
  }
}