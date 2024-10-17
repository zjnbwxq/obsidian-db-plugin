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
  id: number;
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

    const controlsDiv = headerDiv.createEl('div', { cls: 'database-controls' });
    this.renderExportControls(controlsDiv);
    this.renderImportControl(controlsDiv);
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
      .setPlaceholder('搜...')
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

  private async importCSV() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';

    fileInput.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const content = await this.readFileContent(file);
        const parsedData = this.parseCSV(content);
        const dbContent = this.convertToMarkdown(parsedData);
        

        const choice = await this.chooseImportMethod();
        
        if (choice === 'new') {
          await this.createNewFileWithContent(file.name, dbContent);
        } else if (choice === 'insert') {
          await this.insertContentIntoCurrentFile(dbContent);
        }
      }
    };

    fileInput.click();
  }

  private async chooseImportMethod(): Promise<'new' | 'insert' | null> {
    return new Promise((resolve) => {
      const modal = new ImportMethodModal(this.app, (result) => {
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
        new Notice(`已创建数据库笔记: ${fileName}`);
      } catch (error) {
        console.error('创建数据库笔记时出错:', error);
        if (isError(error)) {
          new Notice(`创建数据库笔记失败: ${error.message}`);
        } else {
          new Notice('创建数据库笔记失败: 未知错误');
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
        new Notice('已在当前 Markdown 文档中插入数据库内容');
      } else {
        new Notice('无法插入内容：没有打开的数据库视图或 Markdown 文档');
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
      .setButtonText('导入 CSV')
      .onClick(() => this.importCSV());
  }

  public insertContent(content: string) {
    console.log("Inserting content into DatabaseView:", content);
    const newTables = this.parseCSVContent(content);
    if (newTables.length > 0) {
      newTables.forEach(newTable => {
        this.tableStates.push({
          table: newTable,
          id: Date.now(),
          searchTerm: ''
        });
      });
      this.renderView();
      new Notice(`已在数据库视图中插入 ${newTables.length} 个新表格`);
    } else {
      new Notice('无法解析导入的内容');
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

  constructor(app: App, private onChoose: (result: 'new' | 'insert' | null) => void) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: '选择导入方式' });

    new Setting(contentEl)
      .setName('创建新文件')
      .setDesc('将导入的数据创建为新的 Markdown 文件')
      .addButton((btn) =>
        btn.setButtonText('选择').onClick(() => {
          this.result = 'new';
          this.close();
        })
      );

    new Setting(contentEl)
      .setName('插入到当前文档')
      .setDesc('将导入的数据插入到当前文档的光标位置')
      .addButton((btn) =>
        btn.setButtonText('选择').onClick(() => {
          this.result = 'insert';
          this.close();
        })
      );
  }

  onClose() {
    this.onChoose(this.result);
  }
}
