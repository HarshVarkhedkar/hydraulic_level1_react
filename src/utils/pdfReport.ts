import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { InputModel, DataPoint, CalculationStep } from '../types/simulator';
import { PredictionResult, Suggestion } from './mlModel';
import { HydroCalculator } from './hydraulicCalculator';

export interface PDFReportData {
  inputs: InputModel;
  data: DataPoint[];
  steps: CalculationStep[];
  predictions: PredictionResult;
  suggestions: Suggestion[];
  warnings: string[];
  tips: string[];
}

export class PDFReportGenerator {
  private pdf: jsPDF;
  private yPosition: number = 20;
  private readonly pageHeight = 280;
  private readonly margin = 20;
  private readonly lineHeight = 6;

  constructor() {
    this.pdf = new jsPDF();
  }

  async generateReport(reportData: PDFReportData): Promise<void> {
    try {
      this.addHeader();
      
      this.addInputParameters(reportData.inputs);
      this.addApplicationCalculations(reportData.inputs, reportData.steps);
      this.addAIPredictions(reportData.predictions);
      this.addAISuggestions(reportData.suggestions);
      this.addWarningsAndTips(reportData.warnings, reportData.tips);
      
      // Add charts with improved capture
      await this.addCharts();
      
      this.addPerformanceSummary(reportData.data);
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      this.pdf.save(`Hydraulic_Report_${timestamp}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF report:', error);
      throw new Error('Failed to generate PDF report');
    }
  }

  private addHeader(): void {
    this.pdf.setFontSize(20);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Hydraulic Press AI Simulator', this.margin, this.yPosition);
    this.yPosition += 15;

    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Professional Engineering Analysis Report', this.margin, this.yPosition);
    this.yPosition += 10;

    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'normal');
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    this.pdf.text(`Generated on: ${timestamp}`, this.margin, this.yPosition);
    this.yPosition += 15;

    this.pdf.setLineWidth(0.5);
    this.pdf.line(this.margin, this.yPosition, 190, this.yPosition);
    this.yPosition += 10;
  }

  private addInputParameters(inputs: InputModel): void {
    this.checkPageBreak(50);
    
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Input Parameters', this.margin, this.yPosition);
    this.yPosition += 10;

    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'normal');

    const parameters = [
      { label: 'Bore Diameter:', value: `${inputs.boreCm} cm` },
      { label: 'Rod Diameter:', value: `${inputs.rodCm} cm` },
      { label: 'Dead Load:', value: `${inputs.deadLoadTon} ton` },
      { label: 'Holding Load:', value: `${inputs.holdingLoadTon} ton` },
      { label: 'Motor RPM:', value: `${inputs.motorRpm}` },
      { label: 'Pump Efficiency:', value: `${(inputs.pumpEfficiency * 100).toFixed(1)}%` },
      { label: 'System Losses:', value: `${inputs.systemLossBar} bar` }
    ];

    parameters.forEach(param => {
      this.pdf.text(param.label, this.margin, this.yPosition);
      this.pdf.text(param.value, this.margin + 60, this.yPosition);
      this.yPosition += this.lineHeight;
    });

    this.yPosition += 10;
  }

  private addApplicationCalculations(inputs: InputModel, steps: CalculationStep[]): void {
    this.checkPageBreak(100);

    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Phase Calculations', this.margin, this.yPosition);
    this.yPosition += 12;

    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'normal');

    const pistonArea = HydroCalculator.pistonArea(inputs.boreCm);
    const rodArea = HydroCalculator.rodArea(inputs.boreCm, inputs.rodCm);

    const forceDead = HydroCalculator.forceFromTon(inputs.deadLoadTon);
    const forceHolding = HydroCalculator.forceFromTon(inputs.holdingLoadTon);

    const pressureDead = HydroCalculator.pressureBar(forceDead, pistonArea) + inputs.systemLossBar;
    const pressureHolding = HydroCalculator.pressureBar(forceHolding, pistonArea) + inputs.systemLossBar;

    const flowFast = (pistonArea * 0.136) * 60;
    const flowWorking = (pistonArea * 0.006) * 60;
    const flowHolding = 0.0;
    const flowUp = (rodArea * 0.136) * 60;

    const addCalc = (label: string, formula: string, substituted: string, result: string) => {
      this.checkPageBreak(25);
      this.pdf.text(`${label}`, this.margin + 5, this.yPosition);
      this.yPosition += this.lineHeight;

      this.checkPageBreak(15);
      this.pdf.text(`Formula: ${formula}`, this.margin + 10, this.yPosition);
      this.yPosition += this.lineHeight;

      this.checkPageBreak(15);
      this.pdf.text(`Substituted: ${substituted}`, this.margin + 10, this.yPosition);
      this.yPosition += this.lineHeight;

      this.checkPageBreak(15);
      this.pdf.text(`Result: ${result}`, this.margin + 10, this.yPosition);
      this.yPosition += this.lineHeight + 2;
    };

    const addPhase = (phase: string, pressure: number, flow: number, force: number, area: number) => {
      const hydPower = (pressure * flow) / 600;
      const motorPower = hydPower / inputs.pumpEfficiency;
      const displacement = (flow * 1000) / inputs.motorRpm;

      this.checkPageBreak(20);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(`[${phase}]`, this.margin, this.yPosition);
      this.yPosition += this.lineHeight;

      this.pdf.setFont('helvetica', 'normal');

      addCalc('Pressure',
        'Force / Area',
        `${force.toFixed(0)} N / ${(area * 10000).toFixed(2)} cm²`,
        `${pressure.toFixed(2)} bar`);

      addCalc('Flow',
        'Q = A × v × 60',
        `${(area * 10000).toFixed(2)} cm² × 0.136 m/s × 60`,
        `${flow.toFixed(2)} L/min`);

      addCalc('Hydraulic Power',
        'P = (p × Q) / 600',
        `${pressure.toFixed(2)} bar × ${flow.toFixed(2)} L/min / 600`,
        `${hydPower.toFixed(2)} kW`);

      addCalc('Motor Power',
        'Pmot = Phyd / η',
        `${hydPower.toFixed(2)} kW / ${inputs.pumpEfficiency.toFixed(2)}`,
        `${motorPower.toFixed(2)} kW`);

      addCalc('Pump Displacement',
        'D = (Q × 1000) / N',
        `${flow.toFixed(2)} × 1000 / ${inputs.motorRpm}`,
        `${displacement.toFixed(2)} cc/rev`);

      this.yPosition += 6;
    };

    addPhase('Fast Down Phase', pressureDead, flowFast, forceDead, pistonArea);
    addPhase('Working Phase', pressureHolding, flowWorking, forceHolding, pistonArea);
    addPhase('Holding Phase', pressureHolding, flowHolding, forceHolding, pistonArea);
    addPhase('Fasting Up', pressureDead, flowUp, forceDead, rodArea);
  }

  private addAIPredictions(predictions: PredictionResult): void {
    this.checkPageBreak(40);
    
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Predictions', this.margin, this.yPosition);
    this.yPosition += 10;

    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'normal');

    const predictionData = [
      { label: 'Max Pressure:', value: `${predictions.maxPressure.toFixed(1)} bar` },
      { label: 'System Efficiency:', value: `${(predictions.efficiency * 100).toFixed(1)}%` },
      { label: 'Cycle Time:', value: `${predictions.cycleTime.toFixed(2)} s` },
      { label: 'Confidence Level:', value: predictions.confidence.toUpperCase() }
    ];

    predictionData.forEach(pred => {
      this.pdf.text(pred.label, this.margin, this.yPosition);
      this.pdf.text(pred.value, this.margin + 60, this.yPosition);
      this.yPosition += this.lineHeight;
    });

    this.yPosition += 10;
  }

  private addAISuggestions(suggestions: Suggestion[]): void {
    if (suggestions.length === 0) return;

    this.checkPageBreak(60);
    
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Optimization Suggestions', this.margin, this.yPosition);
    this.yPosition += 10;

    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');

    suggestions.forEach((suggestion, index) => {
      this.checkPageBreak(25);
      
      const paramName = this.formatParameterName(suggestion.parameter);
      const unit = this.getParameterUnit(suggestion.parameter);
      
      this.pdf.text(`${index + 1}. ${paramName}:`, this.margin, this.yPosition);
      this.yPosition += this.lineHeight;
      
      this.pdf.text(`   Current: ${suggestion.currentValue.toFixed(1)} ${unit}`, this.margin, this.yPosition);
      this.yPosition += this.lineHeight;
      
      this.pdf.text(`   Suggested: ${suggestion.suggestedValue.toFixed(1)} ${unit} (${suggestion.change > 0 ? '+' : ''}${suggestion.change.toFixed(1)})`, this.margin, this.yPosition);
      this.yPosition += this.lineHeight;
      
      this.pdf.text(`   Impact: ${suggestion.impact}`, this.margin, this.yPosition);
      this.yPosition += this.lineHeight;
      
      this.pdf.text(`   Confidence: ${suggestion.confidence.toUpperCase()}`, this.margin, this.yPosition);
      this.yPosition += this.lineHeight;
      
      this.yPosition += 5;
    });

    this.yPosition += 5;
  }

  private addWarningsAndTips(warnings: string[], tips: string[]): void {
    if (warnings.length === 0 && tips.length === 0) return;

    this.checkPageBreak(40);

    if (warnings.length > 0) {
      this.pdf.setFontSize(14);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Warnings', this.margin, this.yPosition);
      this.yPosition += 8;

      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'normal');

      warnings.forEach(warning => {
        this.checkPageBreak(10);
        this.pdf.text(`• ${warning}`, this.margin, this.yPosition);
        this.yPosition += this.lineHeight;
      });

      this.yPosition += 8;
    }

    if (tips.length > 0) {
      this.pdf.setFontSize(14);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Optimization Tips', this.margin, this.yPosition);
      this.yPosition += 8;

      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'normal');

      tips.forEach(tip => {
        this.checkPageBreak(10);
        this.pdf.text(`• ${tip}`, this.margin, this.yPosition);
        this.yPosition += this.lineHeight;
      });

      this.yPosition += 8;
    }
  }

private async addCharts(): Promise<void> {
  const chartsContainer = document.getElementById('charts-container');
  if (!chartsContainer) {
    this.addChartPlaceholder();
    return;
  }

  try {
    this.checkPageBreak(40);
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Simulation Charts', this.margin, this.yPosition);
    this.yPosition += 15;

    const canvas = await html2canvas(chartsContainer, { scale: 2 });
    const imgData = canvas.toDataURL('image/png', 1.0);

    const imgWidth = 170;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (this.yPosition + imgHeight > this.pageHeight) {
      this.pdf.addPage();
      this.yPosition = 20;
    }

    this.pdf.addImage(imgData, 'PNG', this.margin, this.yPosition, imgWidth, imgHeight);
    this.yPosition += imgHeight + 10;

    console.log('✅ Charts screenshot added to PDF');
  } catch (err) {
    console.error("Charts screenshot failed:", err);
    this.addChartPlaceholder();
  }
}

  private addChartPlaceholder(): void {
    this.checkPageBreak(40);
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'italic');
    this.pdf.text('Charts could not be captured. Please view them in the application.', this.margin, this.yPosition);
    this.yPosition += 20;
  }

private addPerformanceSummary(data: DataPoint[]): void {
  if (!data || data.length === 0) return;

  this.checkPageBreak(40);

  this.pdf.setFontSize(16);
  this.pdf.setFont('helvetica', 'bold');
  this.pdf.text('Performance Summary', this.margin, this.yPosition);
  this.yPosition += 10;

  this.pdf.setFontSize(11);
  this.pdf.setFont('helvetica', 'normal');

  const maxPressure = Math.max(...data.map(d => d.pressureBar));
  const maxFlow = Math.max(...data.map(d => d.flowLpm));
  const maxHydPower = Math.max(...data.map(d => d.hydPowerKW));

  const summary = [
    { label: 'Max Pressure Observed:', value: `${maxPressure.toFixed(1)} bar` },
    { label: 'Max Flow Rate Observed:', value: `${maxFlow.toFixed(2)} L/min` },
    { label: 'Max Hydraulic Power Observed:', value: `${maxHydPower.toFixed(2)} kW` }
  ];

  summary.forEach(item => {
    this.pdf.text(item.label, this.margin, this.yPosition);
    this.pdf.text(item.value, this.margin + 70, this.yPosition);
    this.yPosition += this.lineHeight;
  });

  this.yPosition += 10;
}


  private formatParameterName(param: string): string {
    const mapping: Record<string, string> = {
      boreCm: 'Bore Diameter',
      rodCm: 'Rod Diameter',
      deadLoadTon: 'Dead Load',
      holdingLoadTon: 'Holding Load',
      motorRpm: 'Motor RPM',
      pumpEfficiency: 'Pump Efficiency',
      systemLossBar: 'System Losses'
    };
    return mapping[param] || param;
  }

  private getParameterUnit(param: string): string {
    const mapping: Record<string, string> = {
      boreCm: 'cm',
      rodCm: 'cm',
      deadLoadTon: 'ton',
      holdingLoadTon: 'ton',
      motorRpm: 'RPM',
      pumpEfficiency: '%',
      systemLossBar: 'bar'
    };
    return mapping[param] || '';
  }

  private checkPageBreak(requiredSpace: number): void {
    if (this.yPosition + requiredSpace > this.pageHeight) {
      this.pdf.addPage();
      this.yPosition = 20;
    }
  }
}
