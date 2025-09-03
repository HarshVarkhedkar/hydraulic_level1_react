import React from 'react';
import { DataPoint, InputModel } from '../types/simulator';
import { HydroCalculator } from '../utils/hydraulicCalculator';

interface SummaryPanelProps {
  inputs: InputModel;
  data: DataPoint[] | null;
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({ inputs, data }) => {
  if (!data || data.length === 0) {
    return null;
  }

  const pistonArea = HydroCalculator.pistonArea(inputs.boreCm);
  const rodArea = HydroCalculator.rodArea(inputs.boreCm, inputs.rodCm);
  const forceDead = HydroCalculator.forceFromTon(inputs.deadLoadTon);
  const pressureDead = HydroCalculator.pressureBar(forceDead, pistonArea);
  const flowFastDown = HydroCalculator.flowLpm(pistonArea, 200);
  const hydPower = HydroCalculator.hydraulicPowerKW(pressureDead, flowFastDown);
  const pumpPower = HydroCalculator.pumpInputKW(hydPower, inputs.pumpEfficiency);
  const displacement = HydroCalculator.pumpDisplacementCC(flowFastDown, inputs.motorRpm);
  const relief = HydroCalculator.reliefSetting(pressureDead, inputs.systemLossBar, 10);

  const maxFlow = Math.max(...data.map(d => d.flowLpm));
  const maxPressure = Math.max(...data.map(d => d.pressureBar));
  const maxPower = Math.max(...data.map(d => d.hydPowerKW));
  const totalCycleTime = Math.max(...data.map(d => d.timeSec));

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-white font-semibold mb-4">System Summary</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {}
        <div>
          <h4 className="text-blue-300 font-medium mb-3">Calculated Parameters</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">Piston Area:</span>
              <span className="text-white font-medium">{(pistonArea * 10000).toFixed(2)} cm²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Rod Area:</span>
              <span className="text-white font-medium">{(rodArea * 10000).toFixed(2)} cm²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Required Pressure:</span>
              <span className="text-white font-medium">{pressureDead.toFixed(2)} bar</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Pump Displacement:</span>
              <span className="text-white font-medium">{displacement.toFixed(2)} cc/rev</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Relief Valve Setting:</span>
              <span className="text-white font-medium">{relief.toFixed(2)} bar</span>
            </div>
          </div>
        </div>

        {}
        <div>
          <h4 className="text-green-300 font-medium mb-3">Performance Metrics</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">Max Flow:</span>
              <span className="text-white font-medium">{maxFlow.toFixed(2)} L/min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Max Pressure:</span>
              <span className="text-white font-medium">{maxPressure.toFixed(2)} bar</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Max Power:</span>
              <span className="text-white font-medium">{maxPower.toFixed(2)} kW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Cycle Time:</span>
              <span className="text-white font-medium">{totalCycleTime.toFixed(2)} s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">System Efficiency:</span>
              <span className="text-white font-medium">{(inputs.pumpEfficiency * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};