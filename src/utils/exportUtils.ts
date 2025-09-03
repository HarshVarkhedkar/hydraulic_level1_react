import { DataPoint, CalculationStep } from '../types/simulator';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export class ExportUtils {
  static downloadCSV(data: DataPoint[], filename: string = 'simulation_results.csv'): void {
    const headers = 'Time(s),Stroke(mm),Flow(L/min),Pressure(bar),HydPower(kW),PumpPower(kW),ActuatorPower(kW)\n';
    const csvContent = headers + data.map(dp => 
      `${dp.timeSec},${dp.strokeMm},${dp.flowLpm},${dp.pressureBar},${dp.hydPowerKW},${dp.pumpPowerKW},${dp.actuatorPowerKW}`
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  static async generatePDF(
    inputs: any,
    data: DataPoint[],
    steps: CalculationStep[],
    warnings: string[],
    tips: string[]
  ): Promise<void> {
    const pdf = new jsPDF();
    let yPosition = 20;

    pdf.setFontSize(20);
    pdf.text('Hydraulic Press Simulation Report', 20, yPosition);
    yPosition += 20;

    pdf.setFontSize(12);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPosition);
    yPosition += 20;

    pdf.setFontSize(14);
    pdf.text('Input Parameters:', 20, yPosition);
    yPosition += 10;
    pdf.setFontSize(10);
    pdf.text(`Bore: ${inputs.boreCm} cm`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Rod Diameter: ${inputs.rodCm} cm`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Dead Load: ${inputs.deadLoadTon} ton`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Holding Load: ${inputs.holdingLoadTon} ton`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Motor RPM: ${inputs.motorRpm}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Pump Efficiency: ${inputs.pumpEfficiency}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`System Losses: ${inputs.systemLossBar} bar`, 20, yPosition);
    yPosition += 20;

    if (warnings.length > 0) {
      pdf.setFontSize(14);
      pdf.text('Warnings:', 20, yPosition);
      yPosition += 10;
      pdf.setFontSize(10);
      warnings.forEach(warning => {
        pdf.text(`• ${warning}`, 20, yPosition);
        yPosition += 8;
      });
      yPosition += 10;
    }

    if (tips.length > 0) {
      pdf.setFontSize(14);
      pdf.text('Optimization Tips:', 20, yPosition);
      yPosition += 10;
      pdf.setFontSize(10);
      tips.forEach(tip => {
        pdf.text(`• ${tip}`, 20, yPosition);
        yPosition += 8;
      });
      yPosition += 10;
    }

    pdf.addPage();
    yPosition = 20;
    pdf.setFontSize(14);
    pdf.text('Calculation Steps:', 20, yPosition);
    yPosition += 15;
    pdf.setFontSize(10);

    steps.forEach(step => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }
      pdf.text(step.formula, 20, yPosition);
      yPosition += 8;
      pdf.text(`= ${step.calculation}`, 25, yPosition);
      yPosition += 8;
      pdf.text(`= ${step.result}`, 25, yPosition);
      yPosition += 12;
    });

    try {
      const chartsContainer = document.getElementById('charts-container');
      if (chartsContainer) {
        const canvas = await html2canvas(chartsContainer, { scale: 1 });
        const imgData = canvas.toDataURL('image/png');
        
        pdf.addPage();
        pdf.setFontSize(14);
        pdf.text('Simulation Charts', 20, 20);
        pdf.addImage(imgData, 'PNG', 20, 30, 170, 120);
      }
    } catch (error) {
      console.warn('Could not capture charts for PDF:', error);
    }

    pdf.save('hydraulic_simulation_report.pdf');
  }
}