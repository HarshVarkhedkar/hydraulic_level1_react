import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, FileText, Download } from 'lucide-react';
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
      alert('Failed to generate PDF report. Please try again.');
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
        
        {/* PDF Export Button */}
        <button
          onClick={handleGeneratePDF}
          disabled={isGeneratingPDF}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none"
        >
          {isGeneratingPDF ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Generating...
            </>
          ) : (
            <>
              <FileText size={14} />
              Export PDF
            </>
          )}
        </button>
      </div>

      {/* Coefficient Source Indicator */}
      <div className="mb-4 p-2 bg-gray-700 rounded text-xs">
        <span className="text-gray-400">
          Model: {MLModel.getCoefficientsSource() === 'api' ? '🌐 Live API' : '📁 Local Fallback'}
        </span>
      </div>

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
          <span className="font-medium">Note:</span> Predictions based on regression analysis with sensitivity calculations. 
          Always validate suggestions with full simulation before implementation. PDF report includes detailed calculations and charts.
        </p>
      </div>
    </div>
  );
};