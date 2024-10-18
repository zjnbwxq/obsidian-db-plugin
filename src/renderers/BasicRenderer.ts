import { DatabaseField, DatabaseFieldType } from '../types';

export function renderBasicCell(td: HTMLElement, cell: any, field: DatabaseField) {
  switch (field.type as DatabaseFieldType) {
    case 'string':
      td.setText(String(cell));
      break;
    case 'number':
      td.setText(Number(cell).toString());
      break;
    case 'boolean':
      td.setText(Boolean(cell).toString());
      break;
    case 'array':
      renderArray(td, cell, field);
      break;
    case 'object':
      renderObject(td, cell, field);
      break;
    default:
      td.setText(String(cell));
  }
}

function renderArray(td: HTMLElement, array: string, field: DatabaseField) {
  const elements = array.split(';');
  td.setText(`Array (${elements.length})`);
  const tooltip = elements.map((item, index) => `${index}: ${item}`).join('\n');
  td.setAttribute('title', tooltip);
}

function renderObject(td: HTMLElement, obj: string, field: DatabaseField) {
  const pairs = obj.split('|');
  td.setText('Object');
  const tooltip = pairs.map(pair => {
    const [key, value] = pair.split(':');
    return `${key}: ${value}`;
  }).join('\n');
  td.setAttribute('title', tooltip);
}
