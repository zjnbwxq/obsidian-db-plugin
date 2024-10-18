import { DatabaseField } from '../types';

export function renderDateTimeCell(td: HTMLElement, cell: any, field: DatabaseField) {
  switch (field.type) {
    case 'date':
      td.setText(new Date(cell).toLocaleDateString());
      break;
    case 'timedelta':
      td.setText(formatTimeDelta(parseInt(cell)));
      break;
    default:
      td.setText(String(cell));
  }
}

function formatTimeDelta(timeDelta: number): string {
  const days = Math.floor(timeDelta / (24 * 60 * 60 * 1000));
  const hours = Math.floor((timeDelta % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((timeDelta % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((timeDelta % (60 * 1000)) / 1000);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
