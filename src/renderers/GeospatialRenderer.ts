import { DatabaseField } from '../types';

export function renderGeospatialCell(td: HTMLElement, cell: any, field: DatabaseField) {
  switch (field.type) {
    case 'geo':
      renderGeo(td, cell, field);
      break;
    case 'polygon':
      renderPolygon(td, cell, field);
      break;
    default:
      td.setText(String(cell));
  }

  td.addClass('geospatial-cell');
}

function renderGeo(td: HTMLElement, geo: string, field: DatabaseField) {
  const [lat, lng] = geo.split('|').map(Number);
  td.setText(`(${lat.toFixed(4)}, ${lng.toFixed(4)})`);
  td.setAttribute('title', `Latitude: ${lat}\nLongitude: ${lng}`);
}

function renderPolygon(td: HTMLElement, polygon: string, field: DatabaseField) {
  const points = polygon.split(';').map(point => point.split('|').map(Number));
  td.setText(`Polygon: ${points.length} points`);
  const pointsString = points.map((point, index) => 
    `Point ${index + 1}: (${point[0].toFixed(4)}, ${point[1].toFixed(4)})`
  ).join('\n');
  td.setAttribute('title', pointsString);
}
