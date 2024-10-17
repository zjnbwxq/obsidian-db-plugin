import { ItemView, WorkspaceLeaf, App, TextComponent, DropdownComponent, ButtonComponent, Notice, MarkdownView, Modal, Setting } from 'obsidian';
import { DatabaseTable } from './databaseParser';
import DatabasePlugin from './main';
import { FuzzySuggestModal, TFolder } from 'obsidian';

export const DATABASE_VIEW_TYPE = 'database-view';

interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

interface TableState {
  table: DatabaseTable;
  searchTerm: string;
}

export class DatabaseView extends ItemView {
  private tableStates: TableState[] = [];
  private sortStates: Map<DatabaseTable, SortState> = new Map();
  private tableElements: Map<DatabaseTable, HTMLElement> = new Map();
  private exportDropdown?: DropdownComponent;
  private exportButton?: ButtonComponent;
  private importButton?: ButtonComponent;
  private plugin: DatabasePlugin;

  constructor(leaf: WorkspaceLeaf, plugin: DatabasePlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return DATABASE_VIEW_TYPE;
  }

  getDisplayText() {
    return this.plugin.t.views.databaseView;
  }

  async onOpen() {
    this.renderView();
  }

  setTables(tables: DatabaseTable[]) {
    if (Array.isArray(tables)) {
      this.tableStates = tables.map(table => ({ table, searchTerm: '' }));
      this.renderView();
    } else {
      console.error(this.plugin.t.errors.invalidSetTablesData, tables);
    }
  }

  renderView() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('database-view-container');

    const controlsContainer = contentEl.createEl('div', { cls: 'database-controls' });
    this.renderExportControls(controlsContainer);
    this.renderImportControl(controlsContainer);

    this.renderTables(contentEl);
  }

  private renderTables(container: HTMLElement) {
    if (this.tableStates.length === 0) {
      container.createEl('p', { text: this.plugin.t.messages.noTablesFound });
      return;
    }

    this.tableStates.forEach(tableState => this.renderTableContainer(tableState, container));
  }

  private renderTableContainer(tableState: TableState, container: HTMLElement) {
    const { table } = tableState;

    const tableContainer = container.createEl('div', { cls: 'table-container' });
    const tableHeader = tableContainer.createEl('div', { cls: 'table-header' });
    tableHeader.createEl('h5', { text: table.name });

    this.renderTableControls(tableHeader, tableState);

    const tableEl = this.renderTable(tableState, tableContainer);
    if (tableEl instanceof HTMLElement) {
      tableContainer.appendChild(tableEl);
      this.tableElements.set(tableState.table, tableEl);
    } else {
      console.error('renderTable did not return an HTMLElement');
    }
  }

  private renderTableControls(container: HTMLElement, tableState: TableState) {
    const searchContainer = container.createEl('div', { cls: 'table-search-container' });
    new TextComponent(searchContainer)
      .setPlaceholder(this.plugin.t.placeholders.search)
      .setValue(tableState.searchTerm)
      .onChange(value => {
        tableState.searchTerm = value;
        const tableEl = this.tableElements.get(tableState.table);
        if (tableEl) {
          this.updateTableContent(tableState, tableEl);
        }
      })
      .inputEl.addClass('search-input');
  }

  private renderTable(state: TableState, container: HTMLElement): HTMLElement {
    const tableEl = container.createEl('div', { cls: 'database-table' });
    this.updateTableContent(state, tableEl);
    return tableEl;
  }

  private updateTableContent(state: TableState, tableEl: HTMLElement) {
    tableEl.empty();
    const table = tableEl.createEl('table');
    
    this.renderTableHeader(table, state);

    const tbody = table.createEl('tbody');
    const filteredData = this.filterAndSortData(state);

    filteredData.forEach((row) => {
      const tr = tbody.createEl('tr');
      row.forEach((cellValue) => {
        tr.createEl('td', { text: cellValue || '' });
      });
    });
  }

  private filterAndSortData(state: TableState): string[][] {
    let data = [...state.table.data];

    if (state.searchTerm) {
      const searchTerm = state.searchTerm.toLowerCase();
      data = data.filter((row) =>
        row.some((value) =>
          String(value).toLowerCase().includes(searchTerm)
        )
      );
    }

    const sortState = this.sortStates.get(state.table);
    if (sortState) {
      const columnIndex = state.table.fields.indexOf(sortState.column);
      if (columnIndex !== -1) {
        data.sort((a, b) => {
          const aValue = a[columnIndex];
          const bValue = b[columnIndex];
          return sortState.direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        });
      }
    }

    return data;
  }

  private sortTable(state: TableState, column: string) {
    const currentSort = this.sortStates.get(state.table);
    const newDirection =
      currentSort && currentSort.column === column && currentSort.direction === 'asc'
        ? 'desc'
        : 'asc';
    this.sortStates.set(state.table, { column, direction: newDirection });
    
    const tableEl = this.tableElements.get(state.table);
    if (tableEl) {
      this.updateTableContent(state, tableEl);
    }
  }

  private updateTable(table: DatabaseTable) {
    const tableEl = this.tableElements.get(table);
    if (!tableEl) return;

    const tbody = tableEl.querySelector('tbody');
    if (tbody) {
      tbody.remove();
    }

    const tableState = this.tableStates.find(state => state.table === table);
    if (tableState) {
      this.renderTableBody(tableEl, tableState);
    }
  }

  private renderTableBody(tableEl: HTMLElement, tableState: TableState) {
    const tbody = tableEl.createEl('tbody');
    const filteredData = this.filterAndSortData(tableState);

    filteredData.forEach((row) => {
      const tr = tbody.createEl('tr');
      row.forEach((cell) => {
        tr.createEl('td', { text: cell || '' });
      });
    });
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
      : [this.tableStates[parseInt(selectedValue)]?.table].filter((table): table is DatabaseTable => table !== undefined);

    if (tablesToExport.length === 0) {
      new Notice(this.plugin.t.errors.noTablesToExport);
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

  private async importCSV() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';

    fileInput.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const content = await this.readFileContent(file);
        const importMethod = await this.chooseImportMethod();
        
        if (importMethod === 'new') {
          await this.createNewFileWithContent(file.name, this.convertToMarkdown(this.parseCSV(content)));
        } else if (importMethod === 'insert') {
          await this.insertContentIntoCurrentFile(this.convertToMarkdown(this.parseCSV(content)));
        }
      }
    };

    fileInput.click();
  }

  private async chooseImportMethod(): Promise<'new' | 'insert' | null> {
    return new Promise((resolve) => {
      const modal = new ImportMethodModal(this.app, this.plugin, (result) => {
        resolve(result);
      });
      modal.open();
    });
  }

  private async createNewFileWithContent(originalFileName: string, content: string) {
    const folderPath = await this.selectFolder();
    if (folderPath) {
      const tableName = originalFileName.replace('.csv', '');
      const fileName = `${tableName}.md`;
      try {
        await this.app.vault.create(`${folderPath}/${fileName}`, content);
        new Notice(this.plugin.t.notices.databaseNoteCreated(fileName));
      } catch (error) {
        console.error(this.plugin.t.errors.createDatabaseNoteFailed, error);
        if (isError(error)) {
          new Notice(this.plugin.t.notices.createDatabaseNoteFailed(error.message));
        } else {
          new Notice(this.plugin.t.notices.createDatabaseNoteFailedUnknown);
        }
      }
    }
  }

  private async insertContentIntoCurrentFile(content: string) {
    const activeView = this.app.workspace.getActiveViewOfType(DatabaseView);
    if (activeView) {
      activeView.insertContent(content);
    } else {
      const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (markdownView) {
        const editor = markdownView.editor;
        const cursor = editor.getCursor();
        editor.replaceRange(content + '\n\n', cursor);
        new Notice(this.plugin.t.notices.databaseContentInserted);
      } else {
        new Notice(this.plugin.t.notices.cannotInsertContent);
      }
    }
  }

  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  private parseCSV(content: string): string[][] {
    return content.split('\n').map(line => 
      line.split(',').map(cell => cell.trim().replace(/^"(.*)"$/, '$1'))
    );
  }

  private convertToMarkdown(data: string[][]): string {
    const [header, ...rows] = data;
    const tableName = this.getTableNameFromFileName() || 'ImportedTable';
    
    let content = `db:${tableName}\n`;
    content += header.join(',') + '\n';
    rows.forEach(row => {
      content += row.join(',') + '\n';
    });
    
    return content.trim();
  }

  private getTableNameFromFileName(): string | null {
    const file = this.app.workspace.getActiveFile();
    return file ? file.basename.replace('.csv', '') : null;
  }

  private async selectFolder(): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = new FolderSuggestModal(this.app, (folder) => {
        resolve(folder ? folder.path : null);
      });
      modal.open();
    });
  }

  private renderImportControl(container: HTMLElement) {
    this.importButton = new ButtonComponent(container)
      .setButtonText(this.plugin.t.controls.importCSV)
      .onClick(() => this.importCSV());
  }

  public insertContent(content: string) {
    console.log(this.plugin.t.logs.insertingContent, content);
    const newTables = this.parseCSVContent(content);
    if (newTables.length > 0) {
      newTables.forEach(newTable => {
        this.tableStates.push({
          table: newTable,
          searchTerm: ''
        });
      });
      this.renderView();
      new Notice(this.plugin.t.notices.tablesInserted(newTables.length));
    } else {
      new Notice(this.plugin.t.notices.cannotParseImportedContent);
    }
  }

  private parseCSVContent(content: string): DatabaseTable[] {
    const lines = content.trim().split('\n');
    const tables: DatabaseTable[] = [];
    let currentTable: DatabaseTable | null = null;

    lines.forEach(line => {
      if (line.startsWith('db:')) {
        if (currentTable) {
          tables.push(currentTable);
        }
        currentTable = {
          name: line.slice(3).trim(),
          fields: [],
          data: []
        };
      } else if (currentTable) {
        if (currentTable.fields.length === 0) {
          currentTable.fields = line.split(',').map(field => field.trim());
        } else {
          currentTable.data.push(line.split(',').map(cell => cell.trim()));
        }
      }
    });

    if (currentTable) {
      tables.push(currentTable);
    }

    return tables;
  }

  private renderTableHeader(table: HTMLElement, state: TableState) {
    const thead = table.createEl('thead');
    const headerRow = thead.createEl('tr');

    state.table.fields.forEach((field) => {
      const th = headerRow.createEl('th');
      th.createEl('span', { text: field, cls: 'column-name' });
      const sortIndicator = th.createEl('span', { cls: 'sort-indicator' });
      sortIndicator.innerHTML = '&#9650;&#9660;'; // 使用粗的上下三角形

      th.addEventListener('click', () => this.sortTable(state, field));
      this.updateSortIndicator(th, state, field);
    });
  }

  private updateSortIndicator(th: HTMLElement, state: TableState, field: string) {
    const sortState = this.sortStates.get(state.table);
    const indicator = th.querySelector('.sort-indicator');
    if (indicator) {
      if (sortState && sortState.column === field) {
        indicator.innerHTML = sortState.direction === 'asc' ? '&#9650;' : '&#9660;';
        indicator.classList.add('active');
      } else {
        indicator.innerHTML = '&#9650;&#9660;';
        indicator.classList.remove('active');
      }
    }
  }

  private renderExportControls(container: HTMLElement) {
    const exportContainer = container.createEl('div', { cls: 'export-container' });
    this.exportDropdown = new DropdownComponent(exportContainer)
      .addOption('all', this.plugin.t.controls.allTables)
      .onChange(() => {
        if (this.exportButton) {
          this.exportButton.setDisabled(false);
        }
      });

    this.tableStates.forEach((state, index) => {
      this.exportDropdown?.addOption(index.toString(), state.table.name);
    });

    this.exportButton = new ButtonComponent(exportContainer)
      .setButtonText(this.plugin.t.controls.exportCSV)
      .setDisabled(true)
      .onClick(() => this.exportTablesToCSV());
  }
}

class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
  constructor(app: App, private onChooseFolder: (folder: TFolder | null) => void) {
    super(app);
  }

  getItems(): TFolder[] {
    return this.app.vault.getAllLoadedFiles()
      .filter((file): file is TFolder => file instanceof TFolder);
  }

  getItemText(item: TFolder): string {
    return item.path;
  }

  onChooseItem(item: TFolder, evt: MouseEvent | KeyboardEvent): void {
    this.onChooseFolder(item);
  }
}

function isError(error: unknown): error is Error {
  return error instanceof Error;
}

class ImportMethodModal extends Modal {
  result: 'new' | 'insert' | null = null;
  private plugin: DatabasePlugin;

  constructor(app: App, plugin: DatabasePlugin, private onChoose: (result: 'new' | 'insert' | null) => void) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: this.plugin.t.modals.chooseImportMethod });

    new Setting(contentEl)
      .setName(this.plugin.t.modals.createNewFile)
      .setDesc(this.plugin.t.modals.createNewFileDesc)
      .addButton((btn) =>
        btn.setButtonText(this.plugin.t.controls.choose).onClick(() => {
          this.result = 'new';
          this.close();
        })
      );

    new Setting(contentEl)
      .setName(this.plugin.t.modals.insertIntoCurrentDocument)
      .setDesc(this.plugin.t.modals.insertIntoCurrentDocumentDesc)
      .addButton((btn) =>
        btn.setButtonText(this.plugin.t.controls.choose).onClick(() => {
          this.result = 'insert';
          this.close();
        })
      );
  }

  onClose() {
    this.onChoose(this.result);
  }
}
