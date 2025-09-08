// src/components/SensorControlPanel.tsx
import React, { useState, useEffect, useRef } from 'react';
import { startSensorSimulation, exportSensorDataToCSV, SensorRow } from '../utils/sensorGenerator';

export const SensorControlPanel: React.FC = () => {
  const [running, setRunning] = useState(false);
  const simRef = useRef<any>(null);
  const [rows, setRows] = useState<SensorRow[]>([]);
  const [latest, setLatest] = useState<SensorRow | null>(null);

  useEffect(() => {
    return () => simRef.current?.stop?.();
  }, []);

  const start = () => {
    if (running) return;
    simRef.current = startSensorSimulation((row) => {
      setRows(prev => [...prev, row]);
      setLatest(row);
    }, { intervalMs: 500 });
    setRunning(true);
  };

  const stop = () => {
    simRef.current?.stop();
    setRunning(false);
  };

  const download = () => {
    exportSensorDataToCSV(rows, "sensor_data.csv");
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h4 className="text-white font-medium mb-2">Sensor Simulation</h4>
      <div className="flex gap-2 mb-3">
        <button onClick={start} className="px-3 py-2 bg-green-600 rounded">Start</button>
        <button onClick={stop} className="px-3 py-2 bg-red-600 rounded">Stop</button>
        <button onClick={download} className="px-3 py-2 bg-blue-600 rounded">Export CSV</button>
      </div>

      {latest && (
        <div className="text-sm text-gray-300 space-y-1">
          <div>Pressure: {latest.pressureBar} bar</div>
          <div>Temp: {latest.temperatureC} °C</div>
          <div>Vibration: {latest.vibration}</div>
          <div>Flow: {latest.flowLpm} L/min</div>
        </div>
      )}
    </div>
  );
};
