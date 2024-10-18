import { DatabaseField } from '../types';

export function renderMiscCell(td: HTMLElement, cell: any, field: DatabaseField) {
  td.addClass('misc-cell');
  td.setAttribute('data-type', field.type);

  switch (field.type) {
    case 'url':
      renderUrl(td, cell, field);
      break;
    case 'email':
      renderEmail(td, cell, field);
      break;
    case 'phone':
      renderPhone(td, cell, field);
      break;
    case 'tag':
      renderTag(td, cell, field);
      break;
    case 'progress':
      renderProgress(td, cell, field);
      break;
    case 'category':
      renderCategory(td, cell, field);
      break;
    default:
      td.setText(String(cell));
  }
}

function renderUrl(td: HTMLElement, url: string, field: DatabaseField) {
  td.setText(url);
  td.setAttribute('title', `URL: ${url}`);
}

function renderEmail(td: HTMLElement, email: string, field: DatabaseField) {
  td.setText(email);
  td.setAttribute('title', `Email: ${email}`);
}

function renderPhone(td: HTMLElement, phone: string, field: DatabaseField) {
  td.setText(phone);
  td.setAttribute('title', `Phone: ${phone}`);
}

function renderTag(td: HTMLElement, tags: string, field: DatabaseField) {
  td.setText(tags);
  td.setAttribute('title', `Tags: ${tags}`);
}

function renderProgress(td: HTMLElement, progress: string, field: DatabaseField) {
  const progressValue = parseInt(progress);
  td.setText(`${progressValue}%`);
  td.setAttribute('title', `Progress: ${progressValue}%`);
}

function renderCategory(td: HTMLElement, category: string, field: DatabaseField) {
  td.setText(category);

  let title = `Category: ${category}`;
  
  if (field.categories) {
    let categories: string[];
    if (typeof field.categories === 'string') {
      categories = field.categories.split(';');
    } else if (Array.isArray(field.categories)) {
      categories = field.categories;
    } else {
      categories = [];
    }
    
    const index = categories.indexOf(category);
    if (index !== -1) {
      title = `Category ${index + 1} of ${categories.length}`;
    }
  }

  td.setAttribute('title', title);
}
