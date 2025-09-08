import React, { useState, useEffect } from 'react';
import { Settings, Activity, BarChart3 } from 'lucide-react';
import { InputModel, DataPoint, ValidationResult, CalculationStep } from './types/simulator';
import { ValidationUtils } from './utils/validation';
import { Simulator } from './utils/simulator';
import { InputPanel } from './components/InputPanel';
import { OutputPanel } from './components/OutputPanel';
import { ChartsPanel } from './components/ChartsPanel';
import { SummaryPanel } from './components/SummaryPanel';
import { AIPredictionPanel } from './components/AIPredictionPanel';

// ✅ new imports
import { EnergyPanel } from './components/EnergyPanel';
import { SensorControlPanel } from './components/SensorControlPanel';

function App() {
  const [inputs, setInputs] = useState<Partial<InputModel>>({
    boreCm: 6.5,
    rodCm: 3.0,
    deadLoadTon: 2.0,
    holdingLoadTon: 8.0,
    motorRpm: 1800,
    pumpEfficiency: 0.9,
    systemLossBar: 5.0,
  });

  const [validation, setValidation] = useState<ValidationResult>({
    isValid: false,
    warnings: [],
    tips: [],
  });

  const [simulationData, setSimulationData] = useState<DataPoint[] | null>(null);
  const [calculationSteps, setCalculationSteps] = useState<CalculationStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'inputs' | 'charts' | 'summary'>('inputs');

  useEffect(() => {
    const validationResult = ValidationUtils.validateInputs(inputs);
    setValidation(validationResult);
  }, [inputs]);

  const runSimulation = async () => {
    if (!validation.isValid) return;

    setIsRunning(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const simulator = new Simulator(inputs as InputModel);
      const result = simulator.runSimulation();

      setSimulationData(result.data);
      setCalculationSteps(result.steps);
      setActiveTab('charts');
    } catch (error) {
      console.error('Simulation failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const TabButton = ({
    tab,
    icon: Icon,
    label,
    isActive,
  }: {
    tab: 'inputs' | 'charts' | 'summary';
    icon: any;
    label: string;
    isActive: boolean;
  }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white">Hydraulic Press Simulator</h1>
          <p className="text-gray-400 mt-1">
            Advanced hydraulic system simulation and analysis
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Mobile layout */}
        <div className="lg:hidden mb-6">
          <div className="flex space-x-2 mb-6">
            <TabButton
              tab="inputs"
              icon={Settings}
              label="Setup"
              isActive={activeTab === 'inputs'}
            />
            <TabButton
              tab="charts"
              icon={BarChart3}
              label="Charts"
              isActive={activeTab === 'charts'}
            />
            <TabButton
              tab="summary"
              icon={Activity}
              label="Summary"
              isActive={activeTab === 'summary'}
            />
          </div>

          <div className="space-y-6">
            {activeTab === 'inputs' && (
              <>
                <InputPanel
                  inputs={inputs}
                  onChange={setInputs}
                  onRunSimulation={runSimulation}
                  validation={validation}
                  isRunning={isRunning}
                />
                <OutputPanel
                  validation={validation}
                  data={simulationData}
                  steps={calculationSteps}
                  inputs={inputs}
                />
              </>
            )}
            {activeTab === 'charts' && (
              <>
                <ChartsPanel data={simulationData} />
                <EnergyPanel data={simulationData} /> {/* ✅ new */}
              </>
            )}
            {activeTab === 'summary' && (
              <>
                {simulationData && (
                  <SummaryPanel inputs={inputs as InputModel} data={simulationData} />
                )}
                <AIPredictionPanel
                  inputs={inputs as InputModel}
                  goal={{ targetCycleTimePct: -10 }}
                  data={simulationData}
                  steps={calculationSteps}
                  warnings={validation.warnings}
                  tips={validation.tips}
                />
                <SensorControlPanel /> {/* ✅ new */}
              </>
            )}
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Left sidebar */}
          <div className="lg:col-span-3 space-y-6">
            <InputPanel
              inputs={inputs}
              onChange={setInputs}
              onRunSimulation={runSimulation}
              validation={validation}
              isRunning={isRunning}
            />
            <OutputPanel
              validation={validation}
              data={simulationData}
              steps={calculationSteps}
              inputs={inputs}
            />
          </div>

          {/* Center charts */}
          <div className="lg:col-span-6 space-y-6">
            <ChartsPanel data={simulationData} />
            <EnergyPanel data={simulationData} /> {/* ✅ new */}
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-3 space-y-6">
            {simulationData && (
              <SummaryPanel inputs={inputs as InputModel} data={simulationData} />
            )}
            <AIPredictionPanel
              inputs={inputs as InputModel}
              goal={{ targetCycleTimePct: -10 }}
              data={simulationData}
              steps={calculationSteps}
              warnings={validation.warnings}
              tips={validation.tips}
            />
            <SensorControlPanel /> {/* ✅ new */}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 px-6 py-4 mt-16">
        <div className="max-w-7xl mx-auto text-center text-gray-400 text-sm">
          <p>Hydraulic Press Simulator - Professional Engineering Analysis Tool</p>
          <p className="mt-1">Built with React, TypeScript, and Recharts</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
