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
      
      // Application Calculations with Phase Details
      this.addApplicationCalculations(reportData.inputs, reportData.steps);
      
      // AI Predictions
      this.addAIPredictions(reportData.predictions);
      
      // AI Suggestions
      this.addAISuggestions(reportData.suggestions);
      
      // Warnings and Tips
      this.addWarningsAndTips(reportData.warnings, reportData.tips);
      
      // Charts (ENHANCED - Multiple strategies)
      await this.addChartsEnhanced();
      
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
   * Add detailed application calculations with phase breakdown
   */
  private addApplicationCalculations(inputs: InputModel, steps: CalculationStep[]): void {
    this.checkPageBreak(120);
    
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

    const phases = [
      {
        name: 'Fast Down Phase',
        description: '200 mm stroke at 200 mm/s speed',
        calculations: [
          {
            formula: 'Piston Area = π × (Bore²) / 4',
            substituted: `π × (${inputs.boreCm}²) / 4`,
            result: `${(pistonArea * 10000).toFixed(2)} cm²`
          },
          {
            formula: 'Dead Load Force = Load × g',
            substituted: `${inputs.deadLoadTon} ton × 9.81`,
            result: `${forceDead.toFixed(0)} N`
          },
          {
            formula: 'Required Pressure = Force / Area',
            substituted: `${forceDead.toFixed(0)} N / ${(pistonArea * 10000).toFixed(2)} cm²`,
            result: `${pressureDead.toFixed(1)} bar`
          },
          {
            formula: 'Flow Rate = Area × Speed',
            substituted: `${(pistonArea * 10000).toFixed(2)} cm² × 200 mm/s`,
            result: `${HydroCalculator.flowLpm(pistonArea, 200).toFixed(1)} L/min`
          }
        ]
      },
      {
        name: 'Working Phase',
        description: '50 mm stroke at 10 mm/s speed',
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
          },
          {
            formula: 'Working Flow = Area × Speed',
            substituted: `${(pistonArea * 10000).toFixed(2)} cm² × 10 mm/s`,
            result: `${HydroCalculator.flowLpm(pistonArea, 10).toFixed(1)} L/min`
          },
          {
            formula: 'Hydraulic Power = P × Q / 600',
            substituted: `${pressureHolding.toFixed(1)} bar × ${HydroCalculator.flowLpm(pistonArea, 10).toFixed(1)} L/min / 600`,
            result: `${HydroCalculator.hydraulicPowerKW(pressureHolding, HydroCalculator.flowLpm(pistonArea, 10)).toFixed(2)} kW`
          }
        ]
      },
      {
        name: 'Holding Phase',
        description: '0 mm stroke, maintain pressure for 2 seconds',
        calculations: [
          {
            formula: 'Holding Pressure = Working Pressure',
            substituted: `${pressureHolding.toFixed(1)} bar`,
            result: `${pressureHolding.toFixed(1)} bar`
          },
          {
            formula: 'Flow Rate = 0 (no movement)',
            substituted: '0 mm/s × Area',
            result: '0 L/min'
          },
          {
            formula: 'Power = Minimal (leakage compensation)',
            substituted: 'P × Q_leakage',
            result: '< 0.5 kW'
          }
        ]
      },
      {
        name: 'Fast Up Phase',
        description: '250 mm stroke at 200 mm/s speed (return)',
        calculations: [
          {
            formula: 'Return Area = π × (Bore² - Rod²) / 4',
            substituted: `π × (${inputs.boreCm}² - ${inputs.rodCm}²) / 4`,
            result: `${(rodArea * 10000).toFixed(2)} cm²`
          },
          {
            formula: 'Return Flow = Return Area × Speed',
            substituted: `${(rodArea * 10000).toFixed(2)} cm² × 200 mm/s`,
            result: `${HydroCalculator.flowLpm(rodArea, 200).toFixed(1)} L/min`
          },
          {
            formula: 'Return Pressure = Dead Load / Return Area',
            substituted: `${forceDead.toFixed(0)} N / ${(rodArea * 10000).toFixed(2)} cm²`,
            result: `${HydroCalculator.pressureBar(forceDead, rodArea).toFixed(1)} bar`
          }
        ]
      }
    ];

    phases.forEach(phase => {
      this.checkPageBreak(40);
      
      this.pdf.setFontSize(12);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(`[${phase.name}]`, this.margin, this.yPosition);
      this.yPosition += 6;
      
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'italic');
      this.pdf.text(phase.description, this.margin + 5, this.yPosition);
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
   * ENHANCED chart capture with multiple strategies and better error handling
   */
  private async addChartsEnhanced(): Promise<void> {
    try {
      console.log('🔍 Starting chart capture...');
      
      // Wait for charts to fully render
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      let chartsContainer: HTMLElement | null = null;
      
      // Strategy 1: Look for main charts container
      chartsContainer = document.getElementById('charts-container');
      if (chartsContainer) {
        console.log('✅ Found charts container by ID');
      }
      
      // Strategy 2: Look for data attribute
      if (!chartsContainer) {
        chartsContainer = document.querySelector('[data-charts="simulation-charts"]') as HTMLElement;
        if (chartsContainer) {
          console.log('✅ Found charts container by data attribute');
        }
      }
      
      // Strategy 3: Create container from individual charts
      if (!chartsContainer) {
        const chartElements = document.querySelectorAll('[data-chart]');
        if (chartElements.length > 0) {
          chartsContainer = this.createChartsContainer(chartElements);
          console.log('✅ Created container from individual charts');
        }
      }
      
      // Strategy 4: Look for recharts elements
      if (!chartsContainer) {
        const recharts = document.querySelectorAll('.recharts-wrapper');
        if (recharts.length > 0) {
          chartsContainer = this.createChartsContainer(recharts);
          console.log('✅ Created container from recharts elements');
        }
      }
      
      if (!chartsContainer) {
        console.error('❌ No charts found for PDF export');
        this.addNoChartsMessage();
        return;
      }

      console.log('📊 Capturing charts...');
      
      this.checkPageBreak(150);
      
      this.pdf.setFontSize(16);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Simulation Charts', this.margin, this.yPosition);
      this.yPosition += 15;

      // Additional wait for SVG rendering
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Capture with high quality settings
      const canvas = await html2canvas(chartsContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#1f2937', // Dark background
        logging: false,
        width: chartsContainer.scrollWidth || chartsContainer.offsetWidth,
        height: chartsContainer.scrollHeight || chartsContainer.offsetHeight,
        onclone: (clonedDoc) => {
          console.log('🔧 Preparing cloned document for capture...');
          
          // Ensure SVGs are properly rendered
          const svgElements = clonedDoc.querySelectorAll('svg');
          svgElements.forEach(svg => {
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svg.style.display = 'block';
          });
          
          // Make sure text is visible
          const textElements = clonedDoc.querySelectorAll('text');
          textElements.forEach(text => {
            if (!text.getAttribute('fill')) {
              text.setAttribute('fill', '#ffffff');
            }
          });
          
          // Ensure all elements are visible
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach(el => {
            const element = el as HTMLElement;
            if (element.style) {
              element.style.visibility = 'visible';
              element.style.opacity = '1';
            }
          });
        }
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const imgWidth = 160;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Check if we need a new page for the image
      if (this.yPosition + imgHeight > this.pageHeight) {
        this.pdf.addPage();
        this.yPosition = 20;
      }

      this.pdf.addImage(imgData, 'PNG', this.margin, this.yPosition, imgWidth, Math.min(imgHeight, 180));
      this.yPosition += Math.min(imgHeight, 180) + 10;

      console.log(`✅ Charts captured successfully!`);

      // Clean up temporary container if we created one
      if (chartsContainer?.dataset?.temporary === 'true') {
        document.body.removeChild(chartsContainer);
      }
      
    } catch (error) {
      console.error('❌ Chart capture error:', error);
      this.addChartCaptureError();
    }
  }

  /**
   * Create a temporary container for multiple chart elements
   */
  private createChartsContainer(elements: NodeListOf<Element> | Element[]): HTMLElement {
    const container = document.createElement('div');
    container.style.backgroundColor = '#1f2937';
    container.style.padding = '20px';
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '900px';
    container.style.zIndex = '-1000';
    container.dataset.temporary = 'true';
    
    Array.from(elements).forEach((element, index) => {
      const wrapper = document.createElement('div');
      wrapper.style.backgroundColor = '#374151';
      wrapper.style.padding = '16px';
      wrapper.style.borderRadius = '8px';
      wrapper.style.marginBottom = '20px';
      
      // Clone the element
      const clone = element.cloneNode(true) as HTMLElement;
      wrapper.appendChild(clone);
      container.appendChild(wrapper);
    });
    
    document.body.appendChild(container);
    return container;
  }

  /**
   * Add message when no charts are found
   */
  private addNoChartsMessage(): void {
    this.checkPageBreak(30);
    
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Simulation Charts', this.margin, this.yPosition);
    this.yPosition += 15;
    
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'italic');
    this.pdf.text('Charts not available. Please run simulation first and ensure charts are visible.', this.margin, this.yPosition);
    this.yPosition += 15;
  }

  /**
   * Add chart capture error message
   */
  private addChartCaptureError(): void {
    this.checkPageBreak(30);
    
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Simulation Charts', this.margin, this.yPosition);
    this.yPosition += 15;
    
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'italic');
    this.pdf.text('Chart capture failed. Charts may be loading or not fully rendered.', this.margin, this.yPosition);
    this.yPosition += 15;
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