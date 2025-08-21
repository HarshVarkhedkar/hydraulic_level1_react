import React from 'react';
import { ValidationResult, DataPoint, CalculationStep } from '../types/simulator';
import { ExportUtils } from '../utils/exportUtils';
import { Download, FileText } from 'lucide-react';

interface OutputPanelProps {
  validation: ValidationResult;
  data: DataPoint[] | null;
  steps: CalculationStep[];
  inputs: any;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({
  validation,
  data,
  steps,
  inputs
}) => {
  const handleCSVExport = () => {
    if (data) {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      ExportUtils.downloadCSV(data, `simulation_results_${timestamp}.csv`);
    }
  };

  const handlePDFExport = async () => {
    if (data) {
      await ExportUtils.generatePDF(inputs, data, steps, validation.warnings, validation.tips);
    }
  };

  return (
    <div className="space-y-6">
      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <div className="bg-amber-900 border border-amber-600 rounded-lg p-4">
          <h3 className="text-amber-300 font-semibold mb-2">Warnings</h3>
          <div className="text-amber-100 text-sm space-y-1">
            {validation.warnings.map((warning, index) => (
              <div key={index}>• {warning}</div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      {validation.tips.length > 0 && (
        <div className="bg-green-900 border border-green-600 rounded-lg p-4">
          <h3 className="text-green-300 font-semibold mb-2">Optimization Tips</h3>
          <div className="text-green-100 text-sm space-y-1">
            {validation.tips.map((tip, index) => (
              <div key={index}>• {tip}</div>
            ))}
          </div>
        </div>
      )}

      {/* Export Buttons */}
      {data && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-white font-semibold mb-4">Export Results</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCSVExport}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
      )}

      {/* Calculation Steps */}
      {steps.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-white font-semibold mb-4">Calculation Steps</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {steps.map((step, index) => (
              <div key={index} className="bg-gray-700 rounded p-3">
                <div className="text-blue-300 font-medium text-sm">{step.formula}</div>
                <div className="text-gray-300 text-xs mt-1">{step.calculation}</div>
                <div className="text-green-300 text-xs font-medium mt-1">= {step.result}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};