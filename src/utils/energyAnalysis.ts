// src/utils/energyAnalysis.ts
import { DataPoint, Phase } from '../types/simulator';

export interface PhaseEnergy {
  phase: Phase;
  energyKJ: number;     // total energy in kilojoules
  durationSec: number;  // total time spent in this phase
  avgPowerKW: number;   // average power during this phase
}

/**
 * Aggregates hydraulic energy per phase from simulation data.
 * 
 * Formula:
 *   Energy (kJ) = Power (kW) × time (s)
 *   (since 1 kW × 1 s = 1 kJ)
 */
export function aggregateEnergyByPhase(data: DataPoint[]): PhaseEnergy[] {
  if (!data || data.length === 0) return [];

  const byPhase: Record<string, { energyKJ: number; duration: number; totalPower: number; count: number }> = {};

  for (let i = 0; i < data.length; i++) {
    const dp = data[i];
    const phase = dp.phase || 'Working';
    const nextTime = i < data.length - 1 ? data[i + 1].timeSec : dp.timeSec;
    const dt = Math.max(0.001, nextTime - dp.timeSec); // seconds

    const powerKW = dp.hydPowerKW;
    const energyKJ = powerKW * dt; // kW * s = kJ

    if (!byPhase[phase]) {
      byPhase[phase] = { energyKJ: 0, duration: 0, totalPower: 0, count: 0 };
    }

    byPhase[phase].energyKJ += energyKJ;
    byPhase[phase].duration += dt;
    byPhase[phase].totalPower += powerKW;
    byPhase[phase].count += 1;
  }

  return Object.entries(byPhase).map(([phase, val]) => ({
    phase: phase as Phase,
    energyKJ: parseFloat(val.energyKJ.toFixed(2)),
    durationSec: parseFloat(val.duration.toFixed(2)),
    avgPowerKW: parseFloat((val.totalPower / Math.max(1, val.count)).toFixed(2)),
  }));
}
