import { DatabaseField } from '../types';

export function renderChemicalCell(td: HTMLElement, cell: any, field: DatabaseField) {
  td.addClass('chemical-cell');
  td.setAttribute('data-type', field.type);

  switch (field.type) {
    case 'molecule':
      renderMolecule(td, cell, field);
      break;
    case 'chemical_formula':
      renderChemicalFormula(td, cell, field);
      break;
    case 'reaction':
      renderReaction(td, cell, field);
      break;
    default:
      td.setText(String(cell));
  }
}

function renderMolecule(td: HTMLElement, molecule: string, field: DatabaseField) {
  const [atoms, bonds] = molecule.split(';');
  const atomCount = atoms.split('|').length;
  td.setText(`Molecule: ${atomCount} atoms`);
  td.setAttribute('title', `
Atoms: ${atoms.replace('|', ', ')}
Bonds: ${bonds}
  `.trim());
}

function renderChemicalFormula(td: HTMLElement, formula: string, field: DatabaseField) {
  td.setText(formula);
  td.setAttribute('title', `Chemical Formula: ${formula}`);
}

function renderReaction(td: HTMLElement, reaction: string, field: DatabaseField) {
  const [reactants, products, conditions] = reaction.split(';');
  const reactionString = `${reactants.replace('|', ' + ')} → ${products.replace('|', ' + ')}`;
  td.setText(reactionString);
  td.setAttribute('title', `
Reaction:
${reactionString}
${conditions ? `Conditions: ${conditions}` : ''}
  `.trim());
}
