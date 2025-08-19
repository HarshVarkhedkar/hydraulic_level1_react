import { InputModel, DataPoint, CalculationStep } from '../types/simulator';
import { HydroCalculator } from './hydraulicCalculator';

export class Simulator {
  private input: InputModel;
  private pistonArea: number;
  private rodArea: number;
  private calculationSteps: CalculationStep[] = [];

  constructor(input: InputModel) {
    this.input = input;
    this.calculationSteps = [];

    this.pistonArea = HydroCalculator.pistonArea(input.boreCm);
    this.calculationSteps.push({
      formula: "Piston Area = π × (Bore²) / 4",
      calculation: `π × (${input.boreCm.toFixed(2)}²) / 4`,
      result: `${this.pistonArea.toFixed(4)} m²`
    });

    this.rodArea = HydroCalculator.rodArea(input.boreCm, input.rodCm);
    this.calculationSteps.push({
      formula: "Rod Area = π × (Bore² - Rod²) / 4",
      calculation: `π × (${input.boreCm.toFixed(2)}² - ${input.rodCm.toFixed(2)}²) / 4`,
      result: `${this.rodArea.toFixed(4)} m²`
    });
  }

  runSimulation(): { data: DataPoint[], steps: CalculationStep[] } {
    const data: DataPoint[] = [];
    let time = 0.0;
    let strokePos = 0.0;

    // Phase 1: Fast Down
    this.calculationSteps.push({
      formula: "Phase 1: Fast Down",
      calculation: "200 mm/s speed, 200 mm stroke, 1 second duration",
      result: "High flow, low pressure"
    });
    time = this.simulatePhase(data, time, strokePos, 200, 200, 1, this.input.deadLoadTon, this.pistonArea);
    strokePos += 200;

    // Phase 2: Working
    this.calculationSteps.push({
      formula: "Phase 2: Working",
      calculation: "10 mm/s speed, 50 mm stroke, 5 seconds duration",
      result: "Low flow, high pressure"
    });
    time = this.simulatePhase(data, time, strokePos, 10, 50, 5, this.input.holdingLoadTon, this.pistonArea);
    strokePos += 50;

    // Phase 3: Holding
    this.calculationSteps.push({
      formula: "Phase 3: Holding",
      calculation: "0 mm/s speed, 0 mm stroke, 2 seconds duration",
      result: "No flow, maintain pressure"
    });
    time = this.simulatePhase(data, time, strokePos, 0, 0, 2, this.input.holdingLoadTon, this.pistonArea);

    // Phase 4: Fast Up
    this.calculationSteps.push({
      formula: "Phase 4: Fast Up",
      calculation: "200 mm/s speed, 250 mm stroke, 1.25 seconds duration",
      result: "High flow, reduced pressure"
    });
    time = this.simulatePhase(data, time, strokePos, 200, 250, 1.25, this.input.deadLoadTon, this.rodArea);

    return { data, steps: this.calculationSteps };
  }

  private simulatePhase(
    data: DataPoint[],
    startTime: number,
    startStroke: number,
    speedMmSec: number,
    strokeMm: number,
    durationSec: number,
    loadTon: number,
    area: number
  ): number {
    let t = startTime;
    const dt = 0.01; // 10 ms step
    let strokePos = startStroke;

    const forceN = HydroCalculator.forceFromTon(loadTon);
    const pressureBar = HydroCalculator.pressureBar(forceN, area);

    for (let elapsed = 0; elapsed < durationSec; elapsed += dt) {
      const flowLpm = HydroCalculator.flowLpm(area, speedMmSec);
      const hydKW = HydroCalculator.hydraulicPowerKW(pressureBar, flowLpm);
      const pumpKW = HydroCalculator.pumpInputKW(hydKW, this.input.pumpEfficiency);
      const actKW = speedMmSec > 0 ? (forceN * (speedMmSec / 1000.0) / 1000.0) : 0;

      data.push({
        timeSec: Number(t.toFixed(2)),
        strokeMm: Number(strokePos.toFixed(2)),
        flowLpm: Number(flowLpm.toFixed(2)),
        pressureBar: Number(pressureBar.toFixed(2)),
        hydPowerKW: Number(hydKW.toFixed(2)),
        pumpPowerKW: Number(pumpKW.toFixed(2)),
        actuatorPowerKW: Number(actKW.toFixed(2))
      });

      strokePos += speedMmSec * dt;
      t += dt;
    }
    return t;
  }
}