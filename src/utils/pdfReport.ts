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

  /**
   * Generate comprehensive PDF report
   */
  async generateReport(reportData: PDFReportData): Promise<void> {
    try {
      // Header
      this.addHeader();
      
      // Input Parameters
      this.addInputParameters(reportData.inputs);
      
      // Application Calculations
      this.addApplicationCalculations(reportData.inputs, reportData.steps);
      
      // AI Predictions
      this.addAIPredictions(reportData.predictions);
      
      // AI Suggestions
      this.addAISuggestions(reportData.suggestions);
      
      // Warnings and Tips
      this.addWarningsAndTips(reportData.warnings, reportData.tips);
      
      // Charts (if available)
      await this.addCharts();
      
      // Performance Summary
      this.addPerformanceSummary(reportData.data);
      
      // Save PDF
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      this.pdf.save(`Hydraulic_Report_${timestamp}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF report:', error);
      throw new Error('Failed to generate PDF report');
    }
  }

  /**
   * Add report header with title and timestamp
   */
  private addHeader(): void {
    // Title
    this.pdf.setFontSize(20);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Hydraulic Press AI Simulator', this.margin, this.yPosition);
    this.yPosition += 15;

    // Subtitle
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Professional Engineering Analysis Report', this.margin, this.yPosition);
    this.yPosition += 10;

    // Generation timestamp
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

    // Separator line
    this.pdf.setLineWidth(0.5);
    this.pdf.line(this.margin, this.yPosition, 190, this.yPosition);
    this.yPosition += 10;
  }

  /**
   * Add input parameters section
   */
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

  /**
   * Add application calculations section
   */
  private addApplicationCalculations(inputs: InputModel, steps: CalculationStep[]): void {
    this.checkPageBreak(80);
    
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Application Calculations', this.margin, this.yPosition);
    this.yPosition += 10;

    // Calculate key hydraulic parameters
    const pistonArea = HydroCalculator.pistonArea(inputs.boreCm);
    const rodArea = HydroCalculator.rodArea(inputs.boreCm, inputs.rodCm);
    const forceDead = HydroCalculator.forceFromTon(inputs.deadLoadTon);
    const forceHolding = HydroCalculator.forceFromTon(inputs.holdingLoadTon);
    const pressureDead = HydroCalculator.pressureBar(forceDead, pistonArea);
    const pressureHolding = HydroCalculator.pressureBar(forceHolding, pistonArea);

    const calculations = [
      {
        phase: 'Fast Down Phase',
        calculations: [
          {
            formula: 'Piston Area = π × (Bore²) / 4',
            substituted: `π × (${inputs.boreCm}²) / 4`,
            result: `${(pistonArea * 10000).toFixed(2)} cm²`
          },
          {
            formula: 'Required Pressure = Force / Area',
            substituted: `${forceDead.toFixed(0)} N / ${(pistonArea * 10000).toFixed(2)} cm²`,
            result: `${pressureDead.toFixed(1)} bar`
          }
        ]
      },
      {
        phase: 'Working Phase',
        calculations: [
          {
            formula: 'Working Force = Load × g',
            substituted: `${inputs.holdingLoadTon} ton × 9.81`,
            result: `${forceHolding.toFixed(0)} N`
          },
          {
            formula: 'Working Pressure = Force / Area',
            substituted: `${forceHolding.toFixed(0)} N / ${(pistonArea * 10000).toFixed(2)} cm²`,
            result: `${pressureHolding.toFixed(1)} bar`
          }
        ]
      },
      {
        phase: 'Return Phase',
        calculations: [
          {
            formula: 'Return Area = π × (Bore² - Rod²) / 4',
            substituted: `π × (${inputs.boreCm}² - ${inputs.rodCm}²) / 4`,
            result: `${(rodArea * 10000).toFixed(2)} cm²`
          }
        ]
      }
    ];

    calculations.forEach(phase => {
      this.checkPageBreak(30);
      
      this.pdf.setFontSize(12);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(`[${phase.phase}]`, this.margin, this.yPosition);
      this.yPosition += 8;

      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'normal');

      phase.calculations.forEach(calc => {
        this.pdf.text(`Formula: ${calc.formula}`, this.margin + 5, this.yPosition);
        this.yPosition += this.lineHeight;
        this.pdf.text(`Substituted: ${calc.substituted}`, this.margin + 5, this.yPosition);
        this.yPosition += this.lineHeight;
        this.pdf.text(`Result: ${calc.result}`, this.margin + 5, this.yPosition);
        this.yPosition += this.lineHeight + 2;
      });

      this.yPosition += 5;
    });
  }

  /**
   * Add AI predictions section
   */
  private addAIPredictions(predictions: PredictionResult): void {
    this.checkPageBreak(40);
    
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('AI Predictions', this.margin, this.yPosition);
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

  /**
   * Add AI suggestions section
   */
  private addAISuggestions(suggestions: Suggestion[]): void {
    if (suggestions.length === 0) return;

    this.checkPageBreak(60);
    
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('AI Optimization Suggestions', this.margin, this.yPosition);
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
      
      if (suggestion.outOfRange) {
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text('   ⚠ Warning: Outside recommended range', this.margin, this.yPosition);
        this.pdf.setFont('helvetica', 'normal');
        this.yPosition += this.lineHeight;
      }
      
      this.yPosition += 5;
    });

    this.yPosition += 5;
  }

  /**
   * Add warnings and tips section
   */
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

  /**
   * Add charts section by capturing DOM elements
   */
  private async addCharts(): Promise<void> {
    try {
      // Wait for charts to be fully rendered
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try multiple strategies to find charts
      let chartsContainer = document.querySelector('[data-charts="simulation-charts"]') as HTMLElement;
      
      if (!chartsContainer) {
        chartsContainer = document.getElementById('charts-container') as HTMLElement;
      }
      
      if (!chartsContainer) {
        // Look for individual chart containers
        const chartElements = document.querySelectorAll('[data-chart]');
        if (chartElements.length > 0) {
          // Create a temporary container
          chartsContainer = document.createElement('div');
          chartsContainer.style.backgroundColor = '#1f2937';
          chartsContainer.style.padding = '20px';
          chartsContainer.style.borderRadius = '8px';
          
          chartElements.forEach((chart) => {
            const chartClone = chart.cloneNode(true) as HTMLElement;
            chartsContainer!.appendChild(chartClone);
          });
          
          document.body.appendChild(chartsContainer);
        } else {
          // Final fallback: look for recharts containers
          const rechartContainers = document.querySelectorAll('.recharts-wrapper');
          if (rechartContainers.length > 0) {
            chartsContainer = document.createElement('div');
            chartsContainer.style.backgroundColor = '#1f2937';
            chartsContainer.style.padding = '20px';
            chartsContainer.style.borderRadius = '8px';
            
            rechartContainers.forEach((chart, index) => {
              const wrapper = document.createElement('div');
              wrapper.style.marginBottom = '20px';
              wrapper.style.backgroundColor = '#374151';
              wrapper.style.padding = '16px';
              wrapper.style.borderRadius = '8px';
              
              const title = document.createElement('h3');
              title.style.color = 'white';
              title.style.marginBottom = '16px';
              title.style.fontSize = '16px';
              title.style.fontWeight = '600';
              
              const titles = ['Flow vs Time', 'Pressure vs Time', 'Power vs Time'];
              title.textContent = titles[index] || `Chart ${index + 1}`;
              
              const chartClone = chart.cloneNode(true) as HTMLElement;
              
              wrapper.appendChild(title);
              wrapper.appendChild(chartClone);
              chartsContainer!.appendChild(wrapper);
            });
            
            document.body.appendChild(chartsContainer);
          }
        }
      }
      
      if (!chartsContainer) {
        console.warn('No charts found for PDF export');
        return;
      }

      this.checkPageBreak(120);
      
      this.pdf.setFontSize(16);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Simulation Charts', this.margin, this.yPosition);
      this.yPosition += 15;

      // Additional wait for any dynamic content
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capture charts as image with better options
      const canvas = await html2canvas(chartsContainer, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#1f2937',
        width: chartsContainer.scrollWidth,
        height: chartsContainer.scrollHeight,
        logging: false,
        removeContainer: false,
        onclone: (clonedDoc) => {
          // Ensure SVG elements render properly
          const svgElements = clonedDoc.querySelectorAll('svg');
          svgElements.forEach(svg => {
            svg.style.backgroundColor = 'transparent';
            svg.style.display = 'block';
          });
          
          // Ensure text elements are visible
          const textElements = clonedDoc.querySelectorAll('text');
          textElements.forEach(text => {
            if (!text.getAttribute('fill')) {
              text.setAttribute('fill', '#ffffff');
            }
          });
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 170;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Check if we need a new page for the image
      if (this.yPosition + imgHeight > this.pageHeight) {
        this.pdf.addPage();
        this.yPosition = 20;
      }

      this.pdf.addImage(imgData, 'PNG', this.margin, this.yPosition, imgWidth, imgHeight);
      this.yPosition += imgHeight + 10;

      // Clean up temporary container if we created one
      if (chartsContainer && chartsContainer.parentElement === document.body) {
        document.body.removeChild(chartsContainer);
      }
    } catch (error) {
      console.warn('Could not capture charts for PDF:', error);
      
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'italic');
      this.pdf.text('Charts could not be captured. Please run simulation first and ensure charts are visible.', this.margin, this.yPosition);
      this.yPosition += 15;
    }
  }

  /**
   * Add performance summary section
   */
  private addPerformanceSummary(data: DataPoint[]): void {
    if (!data || data.length === 0) return;

    this.checkPageBreak(50);
    
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Performance Summary', this.margin, this.yPosition);
    this.yPosition += 10;

    const maxFlow = Math.max(...data.map(d => d.flowLpm));
    const maxPressure = Math.max(...data.map(d => d.pressureBar));
    const maxHydPower = Math.max(...data.map(d => d.hydPowerKW));
    const maxPumpPower = Math.max(...data.map(d => d.pumpPowerKW));
    const totalCycleTime = Math.max(...data.map(d => d.timeSec));
    const avgFlow = data.reduce((sum, d) => sum + d.flowLpm, 0) / data.length;

    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'normal');

    const summaryData = [
      { label: 'Total Cycle Time:', value: `${totalCycleTime.toFixed(2)} s` },
      { label: 'Maximum Flow Rate:', value: `${maxFlow.toFixed(1)} L/min` },
      { label: 'Average Flow Rate:', value: `${avgFlow.toFixed(1)} L/min` },
      { label: 'Maximum Pressure:', value: `${maxPressure.toFixed(1)} bar` },
      { label: 'Peak Hydraulic Power:', value: `${maxHydPower.toFixed(1)} kW` },
      { label: 'Peak Pump Power:', value: `${maxPumpPower.toFixed(1)} kW` }
    ];

    summaryData.forEach(item => {
      this.pdf.text(item.label, this.margin, this.yPosition);
      this.pdf.text(item.value, this.margin + 80, this.yPosition);
      this.yPosition += this.lineHeight;
    });

    this.yPosition += 10;

    // Add footer note
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'italic');
    this.pdf.text('Note: AI predictions are based on regression analysis. Always validate with full simulation.', this.margin, this.yPosition);
  }

  /**
   * Check if we need a page break and add one if necessary
   */
  private checkPageBreak(requiredSpace: number): void {
    if (this.yPosition + requiredSpace > this.pageHeight) {
      this.pdf.addPage();
      this.yPosition = 20;
    }
  }

  /**
   * Format parameter names for display
   */
  private formatParameterName(param: string): string {
    switch (param) {
      case 'boreCm': return 'Bore Diameter';
      case 'rodCm': return 'Rod Diameter';
      case 'motorRpm': return 'Motor RPM';
      case 'pumpEfficiency': return 'Pump Efficiency';
      default: return param;
    }
  }

  /**
   * Get parameter units
   */
  private getParameterUnit(param: string): string {
    switch (param) {
      case 'boreCm': return 'cm';
      case 'rodCm': return 'cm';
      case 'motorRpm': return 'RPM';
      case 'pumpEfficiency': return '';
      default: return '';
    }
  }
}