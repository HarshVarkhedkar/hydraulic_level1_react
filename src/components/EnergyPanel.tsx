// src/components/EnergyPanel.tsx
import React from 'react';
import { aggregateEnergyByPhase } from '../utils/energyAnalysis';
import { DataPoint } from '../types/simulator';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: DataPoint[] | null;
}

export const EnergyPanel: React.FC<Props> = ({ data }) => {
  if (!data || data.length === 0) return null;

  const byPhase = aggregateEnergyByPhase(data);
  const chartData = byPhase.map(p => ({
    phase: p.phase,
    energy: parseFloat(p.energyKJ.toFixed(2))
  }));

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h4 className="text-white mb-2">Energy per Phase (kJ)</h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <XAxis dataKey="phase" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip />
          <Bar dataKey="energy" fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
