import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, FileText, Info, Calculator } from 'lucide-react';
import { InputModel, DataPoint, CalculationStep } from '../types/simulator';
import { MLModel, Goal, PredictionResult, Suggestion } from '../utils/mlModel';
import { PDFReportGenerator } from '../utils/pdfReport';

interface AIPredictionPanelProps {
  inputs: InputModel;
  goal: Goal;
  data?: DataPoint[] | null;
  steps?: CalculationStep[];
  warnings?: string[];
  tips?: string[];
}

export const AIPredictionPanel: React.FC<AIPredictionPanelProps> = ({ 
  inputs, 
  goal, 
  data = null,
  steps = [],
  warnings = [],
  tips = []
}) => {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showCalculations, setShowCalculations] = useState(false);
  const [modelInfo, setModelInfo] = useState<any>(null);

  useEffect(() => {
    const updatePredictions = async () => {
      setIsLoading(true);
      try {
        const [predictionResult, suggestionResults] = await Promise.all([
          MLModel.predict(inputs),
          MLModel.suggestImprovements(inputs, goal)
        ]);
        setPrediction(predictionResult);
        setSuggestions(suggestionResults);
        
        // Load model info
        const info = await MLModel.getModelInfo();
        setModelInfo(info);
      } catch (error) {
        console.error('Error updating predictions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    updatePredictions();
  }, [inputs, goal]);

  const handleGeneratePDF = async () => {
    if (!prediction) return;

    setIsGeneratingPDF(true);
    try {
      // Wait a moment to ensure charts are fully rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const pdfGenerator = new PDFReportGenerator();
      await pdfGenerator.generateReport({
        inputs,
        data: data || [],
        steps,
        predictions: prediction,
        suggestions,
        warnings,
        tips
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report. Please ensure simulation has been run and try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getConfidenceColor = (confidence: 'low' | 'medium' | 'high') => {
    switch (confidence) {
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-red-400';
    }
  };

  const getConfidenceIcon = (confidence: 'low' | 'medium' | 'high') => {
    switch (confidence) {
      case 'high': return <CheckCircle size={14} className="text-green-400" />;
      case 'medium': return <TrendingUp size={14} className="text-yellow-400" />;
      case 'low': return <AlertTriangle size={14} className="text-red-400" />;
    }
  };

  const formatParameterName = (param: string) => {
    switch (param) {
      case 'boreCm': return 'Bore Diameter';
      case 'rodCm': return 'Rod Diameter';
      case 'motorRpm': return 'Motor RPM';
      case 'pumpEfficiency': return 'Pump Efficiency';
      default: return param;
    }
  };

  const formatParameterUnit = (param: string) => {
    switch (param) {
      case 'boreCm': return 'cm';
      case 'rodCm': return 'cm';
      case 'motorRpm': return 'RPM';
      case 'pumpEfficiency': return '';
      default: return '';
    }
  };

  const formatParameterValue = (param: string, value: number) => {
    switch (param) {
      case 'pumpEfficiency': return (value * 100).toFixed(1) + '%';
      default: return value.toFixed(1);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="text-purple-400 animate-pulse" size={20} />
          <h3 className="text-white font-semibold">AI Predictions & Suggestions</h3>
        </div>
        <div className="text-center text-gray-400 py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p>Analyzing system parameters...</p>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="text-purple-400" size={20} />
          <h3 className="text-white font-semibold">AI Predictions & Suggestions</h3>
        </div>
        <div className="text-center text-gray-400 py-8">
          <AlertTriangle size={32} className="mx-auto mb-4" />
          <p>Unable to generate predictions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="text-purple-400" size={20} />
          <h3 className="text-white font-semibold">AI Predictions & Suggestions</h3>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Model Info Button */}
          <button
            onClick={() => setShowCalculations(!showCalculations)}
            className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors"
          >
            <Calculator size={12} />
            {showCalculations ? 'Hide' : 'Show'} Details
          </button>
          
          {/* PDF Export Button */}
          <button
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none shadow-lg"
          >
            {isGeneratingPDF ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating Report...
              </>
            ) : (
              <>
                <FileText size={14} />
                📄 Generate Complete Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Coefficient Source Indicator */}
      <div className="mb-4 p-3 bg-gray-700 rounded text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">
            Model: {modelInfo?.source === 'api' ? '🌐 Live API' : '📁 Local Fallback'}
          </span>
          {modelInfo && (
            <span className="text-gray-500">
              R²: P={modelInfo.rSquared.pressure.toFixed(2)} E={modelInfo.rSquared.efficiency.toFixed(2)} T={modelInfo.rSquared.cycleTime.toFixed(2)}
            </span>
          )}
        </div>
        {modelInfo?.metadata && (
          <div className="mt-1 text-gray-500">
            Training: {modelInfo.metadata.trainingDataPoints.toLocaleString()} samples • 
            Updated: {modelInfo.metadata.lastUpdated} • 
            Validation: {(modelInfo.metadata.validationScore * 100).toFixed(1)}%
          </div>
        )}
      </div>

      {/* Detailed Calculations Panel */}
      {showCalculations && prediction?.calculations && (
        <div className="mb-6 p-4 bg-gray-900 rounded border border-gray-600">
          <h4 className="text-blue-300 font-medium mb-3 flex items-center gap-2">
            <Calculator size={16} />
            Detailed AI Calculations
          </h4>
          
          {/* Pressure Calculation */}
          <div className="mb-4">
            <h5 className="text-sm font-medium text-gray-300 mb-2">Max Pressure Calculation</h5>
            <div className="text-xs text-gray-400 mb-2 font-mono">
              {prediction.calculations.pressureCalculation.formula}
            </div>
            <div className="space-y-1">
              {prediction.calculations.pressureCalculation.intermediateSteps.map((step, idx) => (
                <div key={idx} className="text-xs text-gray-400 pl-2 border-l border-gray-700">
                  {step}
                </div>
              ))}
            </div>
            <div className="text-sm text-green-400 mt-2 font-medium">
              Final Result: {prediction.calculations.pressureCalculation.finalResult.toFixed(2)} bar
            </div>
          </div>

          {/* Efficiency Calculation */}
          <div className="mb-4">
            <h5 className="text-sm font-medium text-gray-300 mb-2">System Efficiency Calculation</h5>
            <div className="text-xs text-gray-400 mb-2 font-mono">
              {prediction.calculations.efficiencyCalculation.formula}
            </div>
            <div className="space-y-1">
              {prediction.calculations.efficiencyCalculation.intermediateSteps.map((step, idx) => (
                <div key={idx} className="text-xs text-gray-400 pl-2 border-l border-gray-700">
                  {step}
                </div>
              ))}
            </div>
            <div className="text-sm text-green-400 mt-2 font-medium">
              Final Result: {(prediction.calculations.efficiencyCalculation.finalResult * 100).toFixed(2)}%
            </div>
          </div>

          {/* Cycle Time Calculation */}
          <div>
            <h5 className="text-sm font-medium text-gray-300 mb-2">Cycle Time Calculation</h5>
            <div className="text-xs text-gray-400 mb-2 font-mono">
              {prediction.calculations.cycleTimeCalculation.formula}
            </div>
            <div className="space-y-1">
              {prediction.calculations.cycleTimeCalculation.intermediateSteps.map((step, idx) => (
                <div key={idx} className="text-xs text-gray-400 pl-2 border-l border-gray-700">
                  {step}
                </div>
              ))}
            </div>
            <div className="text-sm text-green-400 mt-2 font-medium">
              Final Result: {prediction.calculations.cycleTimeCalculation.finalResult.toFixed(3)} s
            </div>
          </div>
        </div>
      )}

      {/* Predictions Section */}
      <div className="mb-6">
        <h4 className="text-purple-300 font-medium mb-3">Predicted Performance</h4>
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-gray-700 rounded p-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Max Pressure</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{prediction.maxPressure.toFixed(1)} bar</span>
                {getConfidenceIcon(prediction.confidence)}
              </div>
            </div>
          </div>
          
          <div className="bg-gray-700 rounded p-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">System Efficiency</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{(prediction.efficiency * 100).toFixed(1)}%</span>
                {getConfidenceIcon(prediction.confidence)}
              </div>
            </div>
          </div>
          
          <div className="bg-gray-700 rounded p-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Cycle Time</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{prediction.cycleTime.toFixed(1)} s</span>
                {getConfidenceIcon(prediction.confidence)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-gray-400">Confidence:</span>
          <span className={`text-xs font-medium ${getConfidenceColor(prediction.confidence)}`}>
            {prediction.confidence.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Suggestions Section */}
      {suggestions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-blue-300 font-medium mb-3">Optimization Suggestions</h4>
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="bg-gray-700 rounded p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-blue-400 mt-0.5" />
                    <span className="text-white font-medium text-sm">
                      {formatParameterName(suggestion.parameter)}
                    </span>
                    {suggestion.outOfRange && (
                      <AlertTriangle size={12} className="text-amber-400" />
                    )}
                  </div>
                  {getConfidenceIcon(suggestion.confidence)}
                </div>
                
                <div className="text-xs text-gray-300 space-y-1">
                  <div>
                    Current: {formatParameterValue(suggestion.parameter, suggestion.currentValue)} {formatParameterUnit(suggestion.parameter)}
                  </div>
                  <div>
                    Suggested: {formatParameterValue(suggestion.parameter, suggestion.suggestedValue)} {formatParameterUnit(suggestion.parameter)}
                    <span className={`ml-2 ${suggestion.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ({suggestion.change > 0 ? '+' : ''}{suggestion.parameter === 'pumpEfficiency' ? (suggestion.change * 100).toFixed(1) + '%' : suggestion.change.toFixed(1)})
                    </span>
                  </div>
                  <div className="text-blue-300">
                    → {suggestion.impact}
                  </div>
                  
                  {/* Enhanced suggestion details */}
                  {showCalculations && suggestion.calculationSteps && (
                    <div className="mt-2 p-2 bg-gray-800 rounded">
                      <div className="text-xs text-gray-400 mb-1">Calculation Steps:</div>
                      {suggestion.calculationSteps.map((step, stepIdx) => (
                        <div key={stepIdx} className="text-xs text-gray-500 pl-2 border-l border-gray-600">
                          {step}
                        </div>
                      ))}
                      <div className="text-xs text-gray-400 mt-2">
                        <strong>Reasoning:</strong> {suggestion.reasoning}
                      </div>
                    </div>
                  )}
                  
                  {suggestion.outOfRange && (
                    <div className="text-amber-400 flex items-center gap-1">
                      <AlertTriangle size={10} />
                      Outside recommended range
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goal Configuration */}
      <div className="mb-4 p-3 bg-gray-900 rounded border border-gray-600">
        <h5 className="text-gray-300 font-medium text-sm mb-2">Current Goal</h5>
        <div className="text-xs text-gray-400">
          {goal.targetCycleTimePct && (
            <div>• Reduce cycle time by {Math.abs(goal.targetCycleTimePct)}%</div>
          )}
          {goal.targetMaxPressurePct && (
            <div>• Reduce max pressure by {Math.abs(goal.targetMaxPressurePct)}%</div>
          )}
          {goal.targetEfficiencyPct && (
            <div>• Improve efficiency by {Math.abs(goal.targetEfficiencyPct)}%</div>
          )}
          {!goal.targetCycleTimePct && !goal.targetMaxPressurePct && !goal.targetEfficiencyPct && (
            <div>• No specific optimization goal set</div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="p-3 bg-gray-900 rounded border border-gray-600">
        <p className="text-xs text-gray-400">
          <span className="font-medium">Enhanced AI Model:</span> Uses non-linear regression with interaction terms for improved accuracy. 
          Sensitivity analysis employs finite differences. Always validate with full simulation. 
          {modelInfo?.metadata && (
            <span className="block mt-1">
              Model trained on {modelInfo.metadata.trainingDataPoints.toLocaleString()} data points with {(modelInfo.metadata.validationScore * 100).toFixed(1)}% validation accuracy.
            </span>
          )}
        </p>
      </div>
    </div>
  );
};