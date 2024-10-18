import { ItemView, WorkspaceLeaf, App, TextComponent, DropdownComponent, ButtonComponent, Notice, MarkdownView, Modal, Setting, FuzzySuggestModal, TFolder, TFile } from 'obsidian';
import { DatabaseTable, DatabaseViewInterface, TableState, SortState, DatabasePluginInterface, DatabaseField, DatabaseFieldType } from './types';
import { debug, info, warn, error } from './utils/logger';
import { 
  renderBasicCell, 
  renderDateTimeCell, 
  renderGeospatialCell, 
  renderScientificCell, 
  renderAcousticCell, 
  renderChemicalCell, 
  renderVisualCell, 
  renderMiscCell 
} from './renderers';
import { VirtualScroller } from './VirtualScroller';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Decimal from 'decimal.js';

export const DATABASE_VIEW_TYPE = 'database-view';

export class DatabaseView extends ItemView implements DatabaseViewInterface {
  private tables: DatabaseTable[] = [];
  private tableStates: TableState[] = [];
  private sortStates: Map<DatabaseTable, { column: number; direction: 'asc' | 'desc' }> = new Map();
  private tableElements: Map<DatabaseTable, HTMLElement> = new Map();
  private exportDropdown?: DropdownComponent;
  private exportButton?: ButtonComponent;
  private importButton?: ButtonComponent;
  private plugin: DatabasePluginInterface;
  private selectedTables: Set<string> = new Set();
  private virtualScrollers: Map<string, VirtualScroller> = new Map();
  private pageSize: number = 100; // 每页加载的行数
  private currentPage: number = 0;
  private exportTypeSelect!: HTMLSelectElement;

  constructor(leaf: WorkspaceLeaf, plugin: DatabasePluginInterface) {
    super(leaf);
    this.plugin = plugin;
    this.tables = []; // 初始化为空数组
  }

  getViewType(): string {
    return DATABASE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return '数据库视图';
  }

  async onOpen() {
    debug("DatabaseView onOpen method called");
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('database-view-container');

    // 添加顶部栏
    const topBar = container.createEl('div', { cls: 'database-view-top-bar' });
    debug(`Top bar created: ${topBar ? 'success' : 'failed'}`);
    
    // 添加导出类型选择下拉框
    this.exportTypeSelect = topBar.createEl('select', { cls: 'export-type-select' });
    this.exportTypeSelect.createEl('option', { value: 'csv', text: 'CSV' });
    this.exportTypeSelect.createEl('option', { value: 'json', text: 'JSON' });

    // 加导出按钮
    this.exportButton = new ButtonComponent(topBar)
      .setButtonText('导出')
      .onClick(() => this.openExportModal());
    debug(`Export button created: ${this.exportButton ? 'success' : 'failed'}`);

    // 添加导入按钮
    this.importButton = new ButtonComponent(topBar)
      .setButtonText('导入')
      .onClick(() => this.importData());
    debug(`Import button created: ${this.importButton ? 'success' : 'failed'}`);

    // 渲染表格
    this.renderTables();
  }

  async onClose() {
    // 清理工作
  }

  public setTables(tables: DatabaseTable[]): void {
    this.tables = tables;
    this.tableStates = tables.map((table, index) => ({
      table,
      id: index,
      searchTerm: '',
      currentData: table.data.slice(1, this.pageSize + 1) // 从第二行开始加载数据
    }));
    
    debug(`Tables set: ${tables.length} tables`);
    this.renderTables();
    this.checkButtonVisibility();

    this.app.workspace.updateOptions();
  }

  public getTables(): DatabaseTable[] {
    return this.tables;
  }

  private renderTables() {
    debug(`Rendering tables: ${JSON.stringify(this.tableStates)}`);
    const container = this.containerEl.children[1];
    const tablesContainer = container.querySelector('.database-tables-container') || container.createEl('div', { cls: 'database-tables-container' });
    tablesContainer.empty();

    this.tableStates.forEach(state => {
      const tableContainer = tablesContainer.createEl('div', { cls: 'database-table-container' });
      
      const tableHeader = tableContainer.createEl('div', { cls: 'database-table-header' });
      tableHeader.createEl('h3', { text: state.table.name });

      const searchInput = new TextComponent(tableHeader)
        .setPlaceholder('搜索...')
        .onChange(value => {
          state.searchTerm = value;
          this.updateTable(state);
        });
      searchInput.inputEl.addClass('search-input');

      const tableElement = tableContainer.createEl('div', { cls: 'database-table' });
      this.createVirtualScroller(state, tableElement);
      
      // 确保数据加载
      this.loadPage(state, 0);
    });
  }

  private createVirtualScroller(state: TableState, container: HTMLElement) {
    console.log('Creating virtual scroller for table:', state.table.name);
    const headerRow = container.createEl('div', { cls: 'database-row header-row' });
    state.table.fields.forEach((field, index) => {
      const th = headerRow.createEl('div', { cls: 'database-cell header-cell', text: field.name });
      th.addEventListener('click', () => this.sortTable(state, index));
    });

    const virtualScroller = new VirtualScroller({
      container: container,
      rowHeight: 30,
      totalRows: state.table.data.length,
      renderRow: (index) => this.renderRow(state, index),
      onVisibleRangeChange: (startIndex, endIndex) => this.onVisibleRangeChange(state, startIndex, endIndex),
    });
    this.virtualScrollers.set(state.table.name, virtualScroller);
  }

  private renderRow(state: TableState, index: number) {
    console.log('Rendering row:', index, 'for table:', state.table.name);
    const row = state.table.data[index];
    const rowElement = document.createElement('div');
    rowElement.classList.add('database-row');

    row.forEach((cell, cellIndex) => {
      const cellElement = document.createElement('div');
      cellElement.classList.add('database-cell');
      const field = state.table.fields[cellIndex];
      this.renderCell(cellElement, cell, field);
      rowElement.appendChild(cellElement);
    });

    return rowElement;
  }

  private renderCell(td: HTMLElement, cell: any, field: DatabaseField) {
    switch (field.type) {
      case 'string':
      case 'number':
      case 'boolean':
      case 'array':
      case 'object':
        renderBasicCell(td, cell, field);
        break;
      case 'date':
      case 'timedelta':
        renderDateTimeCell(td, cell, field);
        break;
      case 'geo':
      case 'polygon':
        renderGeospatialCell(td, cell, field);
        break;
      case 'vector':
      case 'matrix':
      case 'complex':
      case 'decimal':
      case 'uncertainty':
      case 'unit':
      case 'timeseries':
      case 'binary':
      case 'formula':
      case 'distribution':
      case 'function':
      case 'interval':
      case 'currency':
      case 'regex':
      case 'ipaddress':
      case 'uuid':
      case 'version':
      case 'bitfield':
      case 'enum':
      case 'fuzzy':
      case 'quaternion':
        renderScientificCell(td, cell, field);
        break;
      case 'audio_signal':
      case 'frequency_response':
      case 'sound_pressure_level':
        renderAcousticCell(td, cell, field);
        break;
      case 'molecule':
      case 'chemical_formula':
      case 'reaction':
        renderChemicalCell(td, cell, field);
        break;
      case 'color':
        renderVisualCell(td, cell, field);
        break;
      case 'url':
      case 'email':
      case 'phone':
      case 'tag':
      case 'progress':
      case 'category':
        renderMiscCell(td, cell, field);
        break;
      default:
        td.setText(String(cell));
    }

    // 添加完整信息作为 title 属性
    const fullInfo = this.getFullInfo(cell, field);
    td.setAttribute('title', fullInfo);
  }

  private getFullInfo(cell: any, field: DatabaseField): string {
    switch (field.type) {
      case 'string':
      case 'number':
      case 'boolean':
        return String(cell);
      case 'date':
        return new Date(cell).toLocaleString();
      case 'array':
        return JSON.stringify(cell);
      case 'object':
        return JSON.stringify(cell, null, 2);
      // 添加其他类型的处理...
      default:
        return String(cell);
    }
  }

  private sortTable(state: TableState, columnIndex: number) {
    const field = state.table.fields[columnIndex];
    const currentDirection = this.sortStates.get(state.table)?.direction || 'asc';
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';

    state.currentData = [...state.currentData].sort((a, b) => {
      const valueA = a[columnIndex];
      const valueB = b[columnIndex];
      
      let comparison = 0;
      if (valueA < valueB) comparison = -1;
      if (valueA > valueB) comparison = 1;

      return newDirection === 'asc' ? comparison : -comparison;
    });

    this.sortStates.set(state.table, { column: columnIndex, direction: newDirection });
    this.renderTables();
  }

  private openExportModal() {
    new ExportModal(this.app, this.tables, (selectedTables: string[]) => {
      const format = this.exportTypeSelect.value as 'csv' | 'json';
      if (format) {
        this.exportData(selectedTables, format);
      } else {
        new Notice('请选择导出格式');
      }
    }).open();
  }

  private exportData(selectedTables: string[], format: 'csv' | 'json') {
    const tables = this.tables.filter(table => selectedTables.includes(table.name));
    
    let content = '';
    if (format === 'csv') {
      content = this.generateCSVContent(tables);
    } else if (format === 'json') {
      content = this.generateJSONContent(tables);
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `database_export.${format}`);
  }

  private generateCSVContent(tables: DatabaseTable[]): string {
    return tables.map(table => {
      const header = `db:${table.name}\n${table.fields.map(f => f.type).join(',')}\n${table.fields.map(f => f.name).join(',')}`;
      const rows = table.data.map(row => 
        row.map((cell, index) => this.formatCellForCSV(cell, table.fields[index].type)).join(',')
      );
      return `${header}\n${rows.join('\n')}`;
    }).join('\n\n');
  }

  private generateJSONContent(tables: DatabaseTable[]): string {
    const data = tables.map(table => ({
      name: table.name,
      fields: table.fields,
      data: table.data.map(row => 
        row.map((cell, index) => this.formatCellForJSON(cell, table.fields[index].type))
      )
    }));
    return JSON.stringify(data, null, 2);
  }

  private formatCellForCSV(value: string, type: DatabaseFieldType): string {
    switch (type) {
      case 'array':
      case 'object':
        return `"${value.replace(/"/g, '""')}"`;
      case 'number':
      case 'boolean':
        return value;
      default:
        return `"${value.replace(/"/g, '""')}"`;
    }
  }

  private formatCellForJSON(value: string, type: DatabaseFieldType): any {
    switch (type) {
      case 'array':
        return value.split(';').map(item => item.trim());
      case 'object':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      case 'number':
        return Number(value);
      case 'boolean':
        return value.toLowerCase() === 'true';
      default:
        return value;
    }
  }

  private async importData() {
    new ImportMethodModal(this.app, async (method) => {
      let content = '';
      if (method === 'file') {
        const file = await this.selectFile();
        content = await file.text();
      } else if (method === 'clipboard') {
        content = await navigator.clipboard.readText();
      }

      try {
        const cleanedContent = this.cleanImportedContent(content);
        const tables = this.parseImportedData(cleanedContent);
        if (tables.length === 0) {
          throw new Error('没有解析到任何表格数据');
        }
        
        // 让用户选择目标 Markdown 文件
        const targetFile = await this.selectTargetFile();
        if (!targetFile) {
          throw new Error('未选择目标文件');
        }

        // 将数据写入选择的文件
        const currentContent = await this.app.vault.read(targetFile);
        const newContent = this.formatTablesForOriginalFormat(tables);
        await this.app.vault.modify(targetFile, currentContent + '\n\n' + newContent);

        // 重新读取文件并更新视图
        await this.reloadFileAndUpdateView(targetFile);

        new Notice('数据导入成功,请手动添加表格命名和定义行');
      } catch (error) {
        console.error('导入失败:', error);
        new Notice('导入失败,请检查数据格式');
      }
    }).open();
  }

  private cleanImportedContent(content: string): string {
    // 去除可能被 Obsidian 识别为特殊语法的字符
    return content.replace(/["'\[\]{}]/g, '');
  }

  private parseImportedData(content: string): DatabaseTable[] {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 1) throw new Error('导入的数据格式不正确');

    const table: DatabaseTable = {
      name: 'ImportedTable',
      fields: [],
      data: []
    };

    // 将所有数据作为字符串处理
    for (let i = 0; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      table.data.push(values);
    }

    return [table];
  }

  private formatTablesForOriginalFormat(tables: DatabaseTable[]): string {
    return tables.map(table => {
      const rows = table.data.map(row => row.join(','));
      return `db:${table.name}\n${rows.join('\n')}`;
    }).join('\n\n');
  }

  private async selectTargetFile(): Promise<TFile | null> {
    return new Promise((resolve) => {
      const files = this.app.vault.getMarkdownFiles();
      const modal = new FileSuggestModal(this.app, files, (file) => {
        resolve(file);
      });
      modal.open();
    });
  }

  private async reloadFileAndUpdateView(file: TFile) {
    const content = await this.app.vault.read(file);
    const tables = this.parseTablesFromMarkdown(content);
    this.setTables(tables);
  }

  private parseTablesFromMarkdown(content: string): DatabaseTable[] {
    const tables: DatabaseTable[] = [];
    const lines = content.split('\n');
    let currentTable: DatabaseTable | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('db:')) {
        if (currentTable) {
          tables.push(currentTable);
        }
        currentTable = {
          name: line.substring(3).trim(),
          fields: [],
          data: []
        };
      } else if (currentTable) {
        const values = this.parseCSVLine(line);
        if (values.length > 0) {
          currentTable.data.push(values);
        }
      }
    }

    if (currentTable) {
      tables.push(currentTable);
    }

    return tables;
  }

  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim().replace(/^"(.*)"$/, '$1'));
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim().replace(/^"(.*)"$/, '$1'));

    return values;
  }

  public insertContent(content: string) {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView) {
      const editor = activeView.editor;
      const cursor = editor.getCursor();
      editor.replaceRange(content, cursor);
    } else {
      new Notice('请先打开一个 Markdown 文件');
    }
  }

  public checkButtonVisibility() {
    if (this.exportButton && this.importButton) {
      const exportButtonEl = this.exportButton.buttonEl;
      const importButtonEl = this.importButton.buttonEl;
      debug(`Export button visibility: ${exportButtonEl.offsetParent !== null}`);
      debug(`Import button visibility: ${importButtonEl.offsetParent !== null}`);
    } else {
      warn('Export or import button not initialized');
    }
  }

  private checkButtonVisibilityWithDelay() {
    (setTimeout as Window['setTimeout'])(() => {
      this.checkButtonVisibility();
    }, 100); // 100ms 延迟
  }

  private async loadPage(state: TableState, page: number) {
    const start = page * this.pageSize;
    const end = Math.min(start + this.pageSize, state.table.data.length);
    
    state.currentData = state.table.data.slice(start, end);
    this.updateTable(state);
  }

  private async fetchDataRange(table: DatabaseTable, start: number, end: number): Promise<any[][]> {
    // 这里应该实现实际的数据获取逻辑
    // 为了示例，我们只返回一个数据子集
    return table.data.slice(start, end);
  }

  private onVisibleRangeChange(state: TableState, startIndex: number, endIndex: number) {
    const requiredPage = Math.floor(startIndex / this.pageSize);
    if (requiredPage !== this.currentPage) {
      this.loadPage(state, requiredPage);
    }
  }

  private updateCell(state: TableState, rowIndex: number, columnIndex: number, newValue: any) {
    state.currentData[rowIndex][columnIndex] = newValue;
    const virtualScroller = this.virtualScrollers.get(state.table.name);
    if (virtualScroller) {
      virtualScroller.invalidateRow(rowIndex);
    }
  }

  private updateTable(state: TableState) {
    const virtualScroller = this.virtualScrollers.get(state.table.name);
    if (virtualScroller) {
      virtualScroller.setTotalRows(state.currentData.length);
      virtualScroller.refresh();
    }
    this.updateSortIndicators(state);
  }

  private updateSortIndicators(state: TableState) {
    const headerCells = this.containerEl.querySelectorAll('.header-cell');
    headerCells.forEach((cell, index) => {
      cell.classList.remove('sorted', 'asc', 'desc');
      const sortState = this.sortStates.get(state.table);
      if (sortState && sortState.column === index) {
        cell.classList.add('sorted', sortState.direction);
      }
    });
  }

  private initializeTableState(table: DatabaseTable): TableState {
    return {
      table: table,
      searchTerm: '',
      currentData: [...table.data], // 创建数据的副本
    };
  }

  private async selectFile(): Promise<File> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,.json';
      input.onchange = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) resolve(file);
      };
      input.click();
    });
  }
}

class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
  constructor(app: App, private callback: (folder: TFolder) => void) {
    super(app);
  }

  getItems(): TFolder[] {
    return this.app.vault.getAllLoadedFiles()
      .filter((file): file is TFolder => file instanceof TFolder);
  }

  getItemText(folder: TFolder): string {
    return folder.path;
  }

  onChooseItem(folder: TFolder, evt: MouseEvent | KeyboardEvent): void {
    this.callback(folder);
  }
}

class ImportMethodModal extends Modal {
  constructor(app: App, private callback: (method: 'file' | 'clipboard') => void) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: '选择导入方式' });

    new Setting(contentEl)
      .setName('从文件导入')
      .setDesc('选择一个 CSV 或 JSON 文件')
      .addButton(button => button
        .setButtonText('选择文件')
        .onClick(() => {
          this.close();
          this.callback('file');
        }));

    new Setting(contentEl)
      .setName('从剪贴板导入')
      .setDesc('从剪贴板粘贴 CSV 或 JSON 数据')
      .addButton(button => button
        .setButtonText('从剪贴板导')
        .onClick(() => {
          this.close();
          this.callback('clipboard');
        }));
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class ExportModal extends Modal {
  private selectedTables: Set<string> = new Set();

  constructor(
    app: App,
    private tables: DatabaseTable[],
    private onSubmit: (selectedTables: string[]) => void
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: '选择要导出的表格' });

    this.tables.forEach(table => {
      new Setting(contentEl)
        .setName(table.name)
        .addToggle(toggle => toggle
          .setValue(this.selectedTables.has(table.name))
          .onChange(value => {
            if (value) {
              this.selectedTables.add(table.name);
            } else {
              this.selectedTables.delete(table.name);
            }
          }));
    });

    new Setting(contentEl)
      .addButton(button => button
        .setButtonText('导出')
        .setCta()
        .onClick(() => {
          this.onSubmit(Array.from(this.selectedTables));
          this.close();
        }));
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class FileSuggestModal extends FuzzySuggestModal<TFile> {
  constructor(
    app: App,
    private files: TFile[],
    private onChoose: (file: TFile) => void
  ) {
    super(app);
  }

  getItems(): TFile[] {
    return this.files;
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile, evt: MouseEvent | KeyboardEvent): void {
    this.onChoose(file);
  }
}
