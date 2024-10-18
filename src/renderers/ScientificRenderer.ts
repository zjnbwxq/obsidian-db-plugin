import { DatabaseField } from '../types';

export function renderScientificCell(td: HTMLElement, cell: any, field: DatabaseField) {
  switch (field.type) {
    case 'vector':
      renderVector(td, cell, field);
      break;
    case 'matrix':
      renderMatrix(td, cell, field);
      break;
    case 'complex':
      renderComplex(td, cell, field);
      break;
    case 'decimal':
      renderDecimal(td, cell, field);
      break;
    case 'uncertainty':
      renderUncertainty(td, cell, field);
      break;
    case 'unit':
      renderUnit(td, cell, field);
      break;
    case 'timeseries':
      renderTimeseries(td, cell, field);
      break;
    case 'binary':
      renderBinary(td, cell, field);
      break;
    case 'formula':
      renderFormula(td, cell, field);
      break;
    case 'distribution':
      renderDistribution(td, cell, field);
      break;
    default:
      td.setText(String(cell));
  }
}

function renderVector(td: HTMLElement, vector: string, field: DatabaseField) {
  const elements = vector.split(';').map(Number);
  td.setText(`[${elements.join(', ')}]`);
  td.setAttribute('title', `Vector: ${elements.join(', ')}`);
}

function renderMatrix(td: HTMLElement, matrix: string, field: DatabaseField) {
  const rows = matrix.split(';').map(row => row.split('|').map(Number));
  td.setText(`Matrix: ${rows.length}x${rows[0].length}`);
  const matrixString = rows.map(row => row.join('\t')).join('\n');
  td.setAttribute('title', matrixString);
}

function renderComplex(td: HTMLElement, complex: string, field: DatabaseField) {
  const [real, imag] = complex.split('|').map(Number);
  td.setText(`${real} + ${imag}i`);
  td.setAttribute('title', `Complex: ${real} + ${imag}i`);
}

function renderDecimal(td: HTMLElement, decimal: string, field: DatabaseField) {
  const value = parseFloat(decimal);
  const precision = field.precision !== undefined ? field.precision : 2;
  td.setText(value.toFixed(precision));
}

function renderUncertainty(td: HTMLElement, uncertainty: string, field: DatabaseField) {
  const [value, error] = uncertainty.split('|').map(Number);
  td.setText(`${value} ± ${error}`);
  td.setAttribute('title', `Value: ${value}\nUncertainty: ${error}`);
}

function renderUnit(td: HTMLElement, unit: string, field: DatabaseField) {
  const [value, unitSymbol] = unit.split('|');
  td.setText(`${value} ${unitSymbol}`);
  td.setAttribute('title', `Value: ${value}\nUnit: ${unitSymbol}`);
}

function renderTimeseries(td: HTMLElement, timeseries: string, field: DatabaseField) {
  const points = timeseries.split(';').map(point => point.split('|').map(Number));
  td.setText(`Timeseries: ${points.length} points`);
  const tooltip = points.map(([time, value]) => `${new Date(time).toISOString()}: ${value}`).join('\n');
  td.setAttribute('title', tooltip);
}

function renderBinary(td: HTMLElement, binary: string, field: DatabaseField) {
  td.setText(`Binary: ${binary.length} bytes`);
  td.setAttribute('title', `Binary data: ${binary.substring(0, 20)}...`);
}

function renderFormula(td: HTMLElement, formula: string, field: DatabaseField) {
  td.setText(formula);
  td.setAttribute('title', `Formula: ${formula}`);
}

function renderDistribution(td: HTMLElement, distribution: string, field: DatabaseField) {
  const [type, params] = distribution.split('|');
  td.setText(`Distribution: ${type}`);
  td.setAttribute('title', `Type: ${type}\nParameters: ${params}`);
}
