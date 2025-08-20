import React, { useMemo } from 'react';
import { Brain, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { InputModel } from '../types/simulator';
import { MLModel, Goal, PredictionResult, Suggestion } from '../utils/mlModel';

interface AIPredictionPanelProps {
  inputs: InputModel;
  goal: Goal;
}

export const AIPredictionPanel: React.FC<AIPredictionPanelProps> = ({ inputs, goal }) => {
  const prediction = useMemo(() => MLModel.predict(inputs), [inputs]);
  const suggestions = useMemo(() => MLModel.suggestImprovements(inputs, goal), [inputs, goal]);

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
      case 'motorRpm': return 'Motor RPM';
      default: return param;
    }
  };

  const formatParameterUnit = (param: string) => {
    switch (param) {
      case 'boreCm': return 'cm';
      case 'motorRpm': return 'RPM';
      default: return '';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="text-purple-400" size={20} />
        <h3 className="text-white font-semibold">AI Predictions & Suggestions</h3>
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
        <div>
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
                    Current: {suggestion.currentValue.toFixed(1)} {formatParameterUnit(suggestion.parameter)}
                  </div>
                  <div>
                    Suggested: {suggestion.suggestedValue.toFixed(1)} {formatParameterUnit(suggestion.parameter)}
                    <span className={`ml-2 ${suggestion.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ({suggestion.change > 0 ? '+' : ''}{suggestion.change.toFixed(1)})
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

      {/* Disclaimer */}
      <div className="mt-4 p-3 bg-gray-900 rounded border border-gray-600">
        <p className="text-xs text-gray-400">
          <span className="font-medium">Note:</span> Predictions based on local sensitivity analysis. 
          Always validate suggestions with full simulation before implementation.
        </p>
      </div>
    </div>
  );
};