import { ItemView, WorkspaceLeaf, App, TextComponent, DropdownComponent, ButtonComponent } from 'obsidian';
import { DatabaseTable } from './databaseParser';
import DatabasePlugin from './main';

export const DATABASE_VIEW_TYPE = 'database-view';

interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

interface TableState {
  table: DatabaseTable;
  id: number;
  searchTerm: string;
}

export class DatabaseView extends ItemView {
  private tableStates: TableState[] = [];
  private sortStates: Map<DatabaseTable, SortState> = new Map();
  private tableElements: Map<DatabaseTable, HTMLElement> = new Map();
  private exportDropdown?: DropdownComponent;
  private exportButton?: ButtonComponent;

  constructor(leaf: WorkspaceLeaf, private plugin: DatabasePlugin) {
    super(leaf);
  }

  getViewType() {
    return DATABASE_VIEW_TYPE;
  }

  getDisplayText() {
    return '数据库视图';
  }

  async onOpen() {
    this.renderView();
  }

  setTables(tables: DatabaseTable[]) {
    if (Array.isArray(tables)) {
      this.tableStates = tables.map((table, index) => ({ table, id: index + 1, searchTerm: '' }));
      this.renderView();
    } else {
      console.error('setTables 收到无效数据:', tables);
    }
  }

  renderView() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('database-view-container');

    this.renderHeader(contentEl);
    this.renderTables(contentEl);
  }

  private renderHeader(container: HTMLElement) {
    const headerDiv = container.createEl('div', { cls: 'database-header' });
    headerDiv.createEl('h4', { text: '数据库视图' });

    const exportControls = headerDiv.createEl('div', { cls: 'export-controls' });
    this.renderExportControls(exportControls);
  }

  private renderExportControls(container: HTMLElement) {
    this.exportDropdown = new DropdownComponent(container)
      .addOption('all', '所有表格')
      .onChange(() => {
        if (this.exportButton) {
          this.exportButton.setDisabled(false);
        }
      });

    this.tableStates.forEach((state, index) => {
      this.exportDropdown?.addOption(`${index}`, `${state.table.name} (${state.id})`);
    });

    this.exportButton = new ButtonComponent(container)
      .setButtonText('导出 CSV')
      .onClick(() => this.exportTablesToCSV())
      .setDisabled(true);
  }

  private renderTables(container: HTMLElement) {
    if (this.tableStates.length === 0) {
      container.createEl('p', { text: '还没有解析到任何数据库表' });
      return;
    }

    this.tableStates.forEach(this.renderTableContainer.bind(this));
  }

  private renderTableContainer(tableState: TableState, index: number) {
    const { contentEl } = this;
    const { table, id, searchTerm } = tableState;

    const tableContainer = contentEl.createEl('div', { cls: 'table-container' });
    const tableHeader = tableContainer.createEl('div', { cls: 'table-header' });
    tableHeader.createEl('h5', { text: table.name });

    this.renderTableControls(tableHeader, tableState, index);

    const tableEl = this.renderTable(table);
    tableContainer.appendChild(tableEl);
    this.tableElements.set(table, tableEl);
  }

  private renderTableControls(container: HTMLElement, tableState: TableState, index: number) {
    new TextComponent(container)
      .setPlaceholder('编号')
      .setValue(tableState.id.toString())
      .onChange(value => {
        this.tableStates[index].id = parseInt(value) || 0;
      })
      .inputEl.addClass('id-input');

    new TextComponent(container)
      .setPlaceholder('搜索...')
      .setValue(tableState.searchTerm)
      .onChange(value => {
        this.tableStates[index].searchTerm = value;
        this.updateTable(tableState.table);
      })
      .inputEl.addClass('search-input');
  }

  private renderTable(table: DatabaseTable): HTMLElement {
    const tableEl = createEl('table', { cls: 'database-table' });
    this.renderTableHeader(tableEl, table);
    this.renderTableBody(tableEl, table);
    return tableEl;
  }

  private renderTableHeader(tableEl: HTMLElement, table: DatabaseTable) {
    const headerRow = tableEl.createEl('tr');
    table.fields.forEach(field => {
      const th = headerRow.createEl('th');
      th.createEl('span', { text: field, cls: 'column-name' });
      const sortIndicator = th.createEl('span', { cls: 'sort-indicator' });
      
      th.addEventListener('click', () => this.handleSort(table, field));
      
      this.updateSortIndicator(th, sortIndicator, table, field);
    });
  }

  private updateSortIndicator(th: HTMLElement, sortIndicator: HTMLElement, table: DatabaseTable, field: string) {
    const sortState = this.sortStates.get(table);
    if (sortState && sortState.column === field) {
      th.addClass('sorted');
      th.addClass(sortState.direction);
      sortIndicator.setText(sortState.direction === 'asc' ? '▲' : '▼');
    } else {
      sortIndicator.setText('⇅');
    }
  }

  private handleSort(table: DatabaseTable, column: string) {
    const currentSortState = this.sortStates.get(table);
    if (currentSortState && currentSortState.column === column) {
      currentSortState.direction = currentSortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortStates.set(table, { column, direction: 'asc' });
    }
    this.updateTable(table);
  }

  private renderTableBody(tableEl: HTMLElement, table: DatabaseTable) {
    const tbody = tableEl.createEl('tbody');
    const tableState = this.tableStates.find(state => state.table === table);
    if (!tableState) return;

    const filteredAndSortedData = this.getFilteredAndSortedData(table, tableState.searchTerm);
    filteredAndSortedData.forEach(row => {
      const rowEl = tbody.createEl('tr');
      row.forEach(cell => rowEl.createEl('td', { text: cell }));
    });
  }

  private updateTable(table: DatabaseTable) {
    const tableEl = this.tableElements.get(table);
    if (!tableEl) return;

    tableEl.querySelector('tbody')?.remove();
    this.renderTableBody(tableEl, table);
  }

  private getFilteredAndSortedData(table: DatabaseTable, searchTerm: string): string[][] {
    let filteredData = this.filterData(table.data, searchTerm);
    return this.sortData(filteredData, table);
  }

  private filterData(data: string[][], searchTerm: string): string[][] {
    if (!searchTerm) return data;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return data.filter(row => row.some(cell => cell.toLowerCase().includes(lowerSearchTerm)));
  }

  private sortData(data: string[][], table: DatabaseTable): string[][] {
    const sortState = this.sortStates.get(table);
    if (!sortState) return data;

    const columnIndex = table.fields.indexOf(sortState.column);
    if (columnIndex === -1) return data;

    return data.sort((a, b) => this.compareValues(a[columnIndex], b[columnIndex], sortState.direction));
  }

  private compareValues(valueA: string, valueB: string, direction: 'asc' | 'desc'): number {
    const numA = Number(valueA);
    const numB = Number(valueB);
    if (!isNaN(numA) && !isNaN(numB)) {
      return direction === 'asc' ? numA - numB : numB - numA;
    }
    
    return direction === 'asc' 
      ? valueA.localeCompare(valueB) 
      : valueB.localeCompare(valueA);
  }

  private exportTablesToCSV() {
    if (!this.exportDropdown) return;

    const selectedValue = this.exportDropdown.getValue();
    const tablesToExport = selectedValue === 'all' 
      ? this.tableStates.map(state => state.table)
      : [this.tableStates[parseInt(selectedValue)]?.table].filter(Boolean);

    if (tablesToExport.length === 0) {
      console.error('No tables to export');
      return;
    }

    const csvContent = tablesToExport.map(this.tableToCSV).join('\n\n');
    this.downloadCSV(csvContent, tablesToExport.length > 1 ? 'database_tables.csv' : `${tablesToExport[0].name}.csv`);
  }

  private tableToCSV(table: DatabaseTable): string {
    const headers = table.fields.join(',');
    const dataRows = table.data.map(row => 
      row.map(cell => 
        cell.includes(',') || cell.includes('"') || cell.includes('\n') 
          ? `"${cell.replace(/"/g, '""')}"`
          : cell
      ).join(',')
    );
    return [table.name, headers, ...dataRows].join('\n');
  }

  private downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
