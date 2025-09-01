import { DataPoint, CalculationStep, InputModel } from '../types/simulator';
import { PDFReportGenerator } from './pdfReport';
import { MLModel } from './mlModel';

export class ExportUtils {
  /**
   * Download simulation data as CSV
   */
  static downloadCSV(data: DataPoint[], filename: string): void {
    const headers = [
      'Time (s)',
      'Stroke (mm)',
      'Flow (L/min)',
      'Pressure (bar)',
      'Hydraulic Power (kW)',
      'Pump Power (kW)',
      'Actuator Power (kW)'
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(row => [
        row.timeSec,
        row.strokeMm,
        row.flowLpm,
        row.pressureBar,
        row.hydPowerKW,
        row.pumpPowerKW,
        row.actuatorPowerKW
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Generate comprehensive PDF report
   */
  static async generatePDF(
    inputs: InputModel,
    data: DataPoint[],
    steps: CalculationStep[],
    warnings: string[],
    tips: string[]
  ): Promise<void> {
    try {
      // Get AI predictions and suggestions
      const predictions = await MLModel.predict(inputs);
      const suggestions = await MLModel.suggestImprovements(inputs, { targetCycleTimePct: -10 });

      const pdfGenerator = new PDFReportGenerator();
      await pdfGenerator.generateReport({
        inputs,
        data,
        steps,
        predictions,
        suggestions,
        warnings,
        tips
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF report');
    }
  }
}