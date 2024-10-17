import { ItemView, WorkspaceLeaf, MarkdownView, App, TextComponent } from 'obsidian';
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
  tableStates: TableState[] = [];
  plugin: DatabasePlugin;
  app: App;
  sortStates: Map<DatabaseTable, SortState> = new Map();
  tableElements: Map<DatabaseTable, HTMLElement> = new Map();

  constructor(leaf: WorkspaceLeaf, plugin: DatabasePlugin) {
    super(leaf);
    this.plugin = plugin;
    this.app = plugin.app;
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
      console.log('setTables 被调用，表数量:', tables.length);
      this.tableStates = tables.map((table, index) => ({ table, id: index + 1, searchTerm: '' }));
      this.renderView();
    } else {
      console.error('setTables 收到无效数据:', tables);
    }
  }

  renderView() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('database-view-container');

    const headerDiv = container.createEl('div', { cls: 'database-header' });
    headerDiv.createEl('h4', { text: '数据库视图' });

    if (this.tableStates.length === 0) {
      container.createEl('p', { text: '还没有解析到任何数据库表' });
      return;
    }

    this.tableStates.forEach((tableState, index) => {
      const { table, id, searchTerm } = tableState;
      if (table && table.name && Array.isArray(table.fields) && Array.isArray(table.data)) {
        const tableContainer = container.createEl('div', { cls: 'table-container' });
        const tableHeader = tableContainer.createEl('div', { cls: 'table-header' });
        tableHeader.createEl('h5', { text: table.name });

        const idInput = new TextComponent(tableHeader)
          .setPlaceholder('编号')
          .setValue(id.toString())
          .onChange(value => {
            const newId = parseInt(value) || 0;
            this.tableStates[index].id = newId;
          });
        idInput.inputEl.addClass('id-input');

        const searchInput = new TextComponent(tableHeader)
          .setPlaceholder('搜索...')
          .setValue(searchTerm)
          .onChange(value => {
            this.tableStates[index].searchTerm = value;
            this.updateTable(table);
          });
        searchInput.inputEl.addClass('search-input');

        const tableEl = this.renderTable(table);
        tableContainer.appendChild(tableEl);
        this.tableElements.set(table, tableEl);
      } else {
        console.error('Invalid table structure:', table);
      }
    });
  }

  renderTable(table: DatabaseTable): HTMLElement {
    const tableEl = createEl('table', { cls: 'database-table' });
    const headerRow = tableEl.createEl('tr');
    
    table.fields.forEach(field => {
      const th = headerRow.createEl('th');
      th.createEl('span', { text: field, cls: 'column-name' });
      const sortIndicator = th.createEl('span', { cls: 'sort-indicator' });
      
      th.addEventListener('click', () => {
        this.sortTable(table, field);
        this.updateTable(table);
      });
      
      const sortState = this.sortStates.get(table);
      if (sortState && sortState.column === field) {
        th.addClass('sorted');
        th.addClass(sortState.direction);
        sortIndicator.setText(sortState.direction === 'asc' ? '▲' : '▼');
      } else {
        sortIndicator.setText('⇅');
      }
    });
    
    this.renderTableBody(tableEl, table);
    
    return tableEl;
  }

  renderTableBody(tableEl: HTMLElement, table: DatabaseTable) {
    const tableState = this.tableStates.find(state => state.table === table);
    if (!tableState) return;

    const tbody = tableEl.createEl('tbody');
    const filteredAndSortedData = this.getFilteredAndSortedData(table, tableState.searchTerm);
    filteredAndSortedData.forEach(row => {
      const rowEl = tbody.createEl('tr');
      row.forEach(cell => {
        rowEl.createEl('td', { text: cell });
      });
    });
  }

  updateTable(table: DatabaseTable) {
    const tableEl = this.tableElements.get(table);
    if (!tableEl) return;

    const tbody = tableEl.querySelector('tbody');
    if (tbody) {
      tbody.remove();
    }
    this.renderTableBody(tableEl, table);
  }

  sortTable(table: DatabaseTable, column: string) {
    const currentSortState = this.sortStates.get(table);
    if (currentSortState && currentSortState.column === column) {
      currentSortState.direction = currentSortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortStates.set(table, { column, direction: 'asc' });
    }
    this.renderView();
  }

  getFilteredAndSortedData(table: DatabaseTable, searchTerm: string): string[][] {
    let filteredData = table.data;
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filteredData = table.data.filter(row => 
        row.some(cell => cell.toLowerCase().includes(lowerSearchTerm))
      );
    }

    const sortState = this.sortStates.get(table);
    if (!sortState) return filteredData;

    const columnIndex = table.fields.indexOf(sortState.column);
    if (columnIndex === -1) return filteredData;

    return filteredData.sort((a, b) => {
      const valueA = a[columnIndex];
      const valueB = b[columnIndex];
      return this.compareValues(valueA, valueB, sortState.direction);
    });
  }

  compareValues(valueA: string, valueB: string, direction: 'asc' | 'desc'): number {
    const numA = Number(valueA);
    const numB = Number(valueB);
    if (!isNaN(numA) && !isNaN(numB)) {
      return direction === 'asc' ? numA - numB : numB - numA;
    }
    
    if (valueA < valueB) return direction === 'asc' ? -1 : 1;
    if (valueA > valueB) return direction === 'asc' ? 1 : -1;
    return 0;
  }

  async onClose() {
    // 清理工作（如果需要）
  }
}
