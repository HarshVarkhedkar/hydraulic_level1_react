import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { DataPoint } from '../types/simulator';

interface ChartsPanelProps {
  data: DataPoint[] | null;
}

export const ChartsPanel: React.FC<ChartsPanelProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
        <div className="text-center text-gray-400">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold mb-2">No Data to Display</h3>
          <p>Run a simulation to see interactive charts</p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{`Time: ${label}s`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.name}: ${entry.value.toFixed(2)} ${entry.unit || ''}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      id="charts-container" 
      className="space-y-6" 
      data-charts="simulation-charts"
      style={{ backgroundColor: '#1f2937', padding: '20px', borderRadius: '8px' }}
    >
      {/* Flow Chart */}
      <div 
        className="bg-gray-800 rounded-lg p-6 border border-gray-700" 
        data-chart="flow"
        id="flow-chart-container"
      >
        <h3 className="text-white font-semibold mb-4">Flow vs Time</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="timeSec" 
              stroke="#9CA3AF"
              label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
            />
            <YAxis 
              stroke="#9CA3AF"
              label={{ value: 'Flow (L/min)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="flowLpm" 
              stroke="#14B8A6" 
              strokeWidth={2}
              dot={false}
              name="Flow"
              unit=" L/min"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pressure Chart */}
      <div 
        className="bg-gray-800 rounded-lg p-6 border border-gray-700" 
        data-chart="pressure"
        id="pressure-chart-container"
      >
        <h3 className="text-white font-semibold mb-4">Pressure vs Time</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="timeSec" 
              stroke="#9CA3AF"
              label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
            />
            <YAxis 
              stroke="#9CA3AF"
              label={{ value: 'Pressure (bar)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="pressureBar" 
              stroke="#F59E0B" 
              strokeWidth={2}
              dot={false}
              name="Pressure"
              unit=" bar"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Power Chart */}
      <div 
        className="bg-gray-800 rounded-lg p-6 border border-gray-700" 
        data-chart="power"
        id="power-chart-container"
      >
        <h3 className="text-white font-semibold mb-4">Power vs Time</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="timeSec" 
              stroke="#9CA3AF"
              label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
            />
            <YAxis 
              stroke="#9CA3AF"
              label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="hydPowerKW" 
              stroke="#EF4444" 
              strokeWidth={2}
              dot={false}
              name="Hydraulic Power"
              unit=" kW"
            />
            <Line 
              type="monotone" 
              dataKey="pumpPowerKW" 
              stroke="#8B5CF6" 
              strokeWidth={2}
              dot={false}
              name="Pump Power"
              unit=" kW"
            />
            <Line 
              type="monotone" 
              dataKey="actuatorPowerKW" 
              stroke="#10B981" 
              strokeWidth={2}
              dot={false}
              name="Actuator Power"
              unit=" kW"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};