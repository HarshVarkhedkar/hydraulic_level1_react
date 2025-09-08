// src/utils/sensorGenerator.ts
export interface SensorRow {
  timestamp: string;
  pressureBar: number;
  temperatureC: number;
  vibration: number;
  flowLpm: number;
}

/**
 * Start a fake sensor simulation.
 * Generates random sensor values at a fixed interval
 * and passes each row to the callback.
 */
export function startSensorSimulation(
  onData: (row: SensorRow) => void,
  opts: { intervalMs?: number; base?: Partial<SensorRow> } = {}
) {
  const intervalMs = opts.intervalMs ?? 500; // default: 0.5 sec
  const base = {
    pressureBar: opts.base?.pressureBar ?? 60,
    temperatureC: opts.base?.temperatureC ?? 45,
    vibration: opts.base?.vibration ?? 0.8,
    flowLpm: opts.base?.flowLpm ?? 200,
  };

  let running = true;
  const id = setInterval(() => {
    if (!running) return;
    const row: SensorRow = {
      timestamp: new Date().toISOString(),
      pressureBar: +(base.pressureBar + (Math.random() - 0.5) * 6).toFixed(2),
      temperatureC: +(base.temperatureC + (Math.random() - 0.5) * 6).toFixed(2),
      vibration: +(base.vibration + (Math.random() - 0.5) * 1.2).toFixed(3),
      flowLpm: +(base.flowLpm + (Math.random() - 0.5) * 20).toFixed(2),
    };
    onData(row);
  }, intervalMs);

  return {
    stop() {
      running = false;
      clearInterval(id);
    },
  };
}

/**
 * Export collected sensor rows to a downloadable CSV file.
 */
export function exportSensorDataToCSV(rows: SensorRow[], filename = "sensor_data.csv") {
  if (!rows || rows.length === 0) return;

  const header = Object.keys(rows[0]).join(",");
  const lines = rows.map(r => Object.values(r).join(","));
  const csvContent = [header, ...lines].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
