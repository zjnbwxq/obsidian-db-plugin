import { DatabaseField } from '../types';

export function renderVisualCell(td: HTMLElement, cell: any, field: DatabaseField) {
  td.addClass('visual-cell');
  td.setAttribute('data-type', field.type);

  switch (field.type) {
    case 'color':
      renderColor(td, cell, field);
      break;
    default:
      td.setText(String(cell));
  }
}

function renderColor(td: HTMLElement, color: string, field: DatabaseField) {
  td.setText(color);
  td.style.backgroundColor = color;
  td.style.color = getContrastColor(color);
  td.setAttribute('title', `Color: ${color}`);
}

function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.substr(1,2), 16);
  const g = parseInt(hexColor.substr(3,2), 16);
  const b = parseInt(hexColor.substr(5,2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? 'black' : 'white';
}
