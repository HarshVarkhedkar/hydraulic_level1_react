import React from 'react';
import { InputModel, ValidationResult } from '../types/simulator';
import { ValidationUtils } from '../utils/validation';

interface InputPanelProps {
  inputs: Partial<InputModel>;
  onChange: (inputs: Partial<InputModel>) => void;
  onRunSimulation: () => void;
  validation: ValidationResult;
  isRunning: boolean;
}

export const InputPanel: React.FC<InputPanelProps> = ({
  inputs,
  onChange,
  onRunSimulation,
  validation,
  isRunning
}) => {
  const handleInputChange = (field: keyof InputModel, value: string) => {
    const numValue = parseFloat(value) || 0;
    onChange({ ...inputs, [field]: numValue });
  };

  const handleKeyPress = (e: React.KeyboardEvent, nextField?: string) => {
    if (e.key === 'Enter') {
      if (nextField) {
        const nextElement = document.getElementById(nextField);
        nextElement?.focus();
      } else {
        onRunSimulation();
      }
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
      <h2 className="text-xl font-bold text-white mb-6">Simulation Parameters</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Bore Diameter (cm)
          </label>
          <input
            id="bore"
            type="number"
            step="0.1"
            min="0"
            value={inputs.boreCm || ''}
            onChange={(e) => handleInputChange('boreCm', e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, 'rod')}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            placeholder="Enter bore diameter"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Rod Diameter (cm)
          </label>
          <input
            id="rod"
            type="number"
            step="0.1"
            min="0"
            value={inputs.rodCm || ''}
            onChange={(e) => handleInputChange('rodCm', e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, 'deadLoad')}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            placeholder="Enter rod diameter"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Dead Load (ton)
          </label>
          <input
            id="deadLoad"
            type="number"
            step="0.1"
            min="0"
            value={inputs.deadLoadTon || ''}
            onChange={(e) => handleInputChange('deadLoadTon', e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, 'holdingLoad')}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            placeholder="Enter dead load"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Holding Load (ton)
          </label>
          <input
            id="holdingLoad"
            type="number"
            step="0.1"
            min="0"
            value={inputs.holdingLoadTon || ''}
            onChange={(e) => handleInputChange('holdingLoadTon', e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, 'rpm')}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            placeholder="Enter holding load"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Motor RPM
          </label>
          <input
            id="rpm"
            type="number"
            step="1"
            min="0"
            value={inputs.motorRpm || ''}
            onChange={(e) => handleInputChange('motorRpm', e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, 'efficiency')}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            placeholder="Enter motor RPM"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Pump Efficiency (0-1)
          </label>
          <input
            id="efficiency"
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={inputs.pumpEfficiency || ''}
            onChange={(e) => handleInputChange('pumpEfficiency', e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, 'loss')}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            placeholder="Enter efficiency (e.g., 0.85)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            System Losses (bar)
          </label>
          <input
            id="loss"
            type="number"
            step="0.1"
            min="0"
            value={inputs.systemLossBar || ''}
            onChange={(e) => handleInputChange('systemLossBar', e.target.value)}
            onKeyPress={(e) => handleKeyPress(e)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            placeholder="Enter system losses"
          />
        </div>

        <button
          onClick={onRunSimulation}
          disabled={!validation.isValid || isRunning}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none"
        >
          {isRunning ? 'Running Simulation...' : 'Run Simulation'}
        </button>
      </div>
    </div>
  );
};