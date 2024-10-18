import { ItemView, WorkspaceLeaf, App, TextComponent, DropdownComponent, ButtonComponent, Notice, MarkdownView, Modal, Setting, FuzzySuggestModal, TFolder } from 'obsidian';
import { DatabaseTable, DatabaseViewInterface, TableState, SortState, DatabasePluginInterface, DatabaseField, DatabaseFieldType } from './types';
import { debug, info, warn, error } from './utils/logger';

export const DATABASE_VIEW_TYPE = 'database-view';

export class DatabaseView extends ItemView implements DatabaseViewInterface {
  private tables: DatabaseTable[] = [];
  private tableStates: TableState[] = [];
  private sortStates: Map<DatabaseTable, SortState> = new Map();
  private tableElements: Map<DatabaseTable, HTMLElement> = new Map();
  private exportDropdown?: DropdownComponent;
  private exportButton?: ButtonComponent;
  private importButton?: ButtonComponent;
  private plugin: DatabasePluginInterface;
  private selectedTables: Set<string> = new Set();

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
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('database-view-container');

    const topBar = container.createEl('div', { cls: 'database-view-top-bar' });

    debug('创建顶部栏元素');

    this.exportDropdown = new DropdownComponent(topBar)
      .addOption('csv', 'CSV')
      .addOption('json', 'JSON')
      .setValue('csv');

    debug('导出下拉菜单已创建');

    this.exportButton = new ButtonComponent(topBar)
      .setButtonText('导出')
      .onClick(() => this.openExportModal());

    this.importButton = new ButtonComponent(topBar)
      .setButtonText('导入')
      .onClick(() => this.importData());

    debug('导出和导入按钮已创建');

    // 确保所有按钮都被添加到顶部栏
    topBar.appendChild(this.exportDropdown.selectEl);
    topBar.appendChild(this.exportButton.buttonEl);
    topBar.appendChild(this.importButton.buttonEl);

    // 确保在创建按钮后调用 renderTables
    this.renderTables();

    debug('表格已渲染');

    // 添加调试代码
    debug(`顶部栏是否存在: ${!!topBar}`);
    debug(`顶部栏HTML: ${topBar.outerHTML}`);
    debug(`导出下拉菜单是存在: ${!!this.exportDropdown}`);
    debug(`导出按钮是否存在: ${!!this.exportButton}`);
    debug(`导入按钮是否存在: ${!!this.importButton}`);
    if (this.exportButton && this.importButton) {
      debug(`导出按钮HTML: ${this.exportButton.buttonEl.outerHTML}`);
      debug(`导入按钮HTML: ${this.importButton.buttonEl.outerHTML}`);
    }

    this.checkButtonVisibility();

    // 在 onOpen 方法的末尾添加
    this.app.workspace.updateOptions();
  }

  async onClose() {
    // 清理工作
  }

  public setTables(tables: DatabaseTable[]): void {
    this.tables = tables;
    this.tableStates = tables.map((table, index) => ({
      table,
      id: index,
      searchTerm: ''
    }));
    
    this.renderTables();
    this.checkButtonVisibility();

    // 在 setTables 方法的末尾添加
    this.app.workspace.updateOptions();
  }

  public getTables(): DatabaseTable[] {
    return this.tables;
  }

  private renderTables() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('database-view-container');

    // 确保顶部栏在表格之前
    const topBar = container.createEl('div', { cls: 'database-view-top-bar' });
    if (this.exportDropdown) topBar.appendChild(this.exportDropdown.selectEl);
    if (this.exportButton) topBar.appendChild(this.exportButton.buttonEl);
    if (this.importButton) topBar.appendChild(this.importButton.buttonEl);

    this.tableStates.forEach(state => {
      const tableContainer = container.createEl('div', { cls: 'database-table-container' });
      tableContainer.createEl('h3', { text: state.table.name });

      const searchInput = new TextComponent(tableContainer)
        .setPlaceholder('搜索...')
        .onChange(value => {
          state.searchTerm = value;
          this.updateTable(state);
        });
      searchInput.inputEl.addClass('search-input');

      const tableElement = tableContainer.createEl('table', { cls: 'database-table' });
      this.renderTable(state, tableElement);
      this.tableElements.set(state.table, tableElement);
    });
  }

  private renderTable(state: TableState, tableElement: HTMLElement) {
    tableElement.empty();
    const { table } = state;

    const headerRow = tableElement.createEl('tr');
    table.fields.forEach(field => {
      const th = headerRow.createEl('th');
      th.setText(field.name);
      th.addEventListener('click', () => this.sortTable(table, field.name));
    });

    const filteredData = table.data.filter(row =>
      row.some(cell => String(cell).toLowerCase().includes(state.searchTerm.toLowerCase()))
    );

    filteredData.forEach(row => {
      const tr = tableElement.createEl('tr');
      row.forEach((cell, index) => {
        const td = tr.createEl('td');
        const field = table.fields[index];
        this.renderCell(td, cell, field);
      });
    });
  }

  private renderCell(td: HTMLElement, cell: any, field: DatabaseField) {
    switch (field.type) {
      case 'string':
      case 'number':
      case 'boolean':
        td.setText(String(cell));
        break;
      case 'date':
        td.setText(new Date(cell).toLocaleDateString());
        break;
      case 'decimal':
        td.setText(parseFloat(cell).toFixed(field.precision || 2));
        break;
      case 'geo':
        td.setText(`(${cell.lat}, ${cell.lng})`);
        break;
      case 'vector':
        td.setText(`[${cell.join(', ')}]`);
        break;
      case 'matrix':
      case 'tensor':
        td.setText(JSON.stringify(cell));
        break;
      case 'complex':
        td.setText(`${cell.real} + ${cell.imag}i`);
        break;
      case 'uncertainty':
        td.setText(`${cell.value} ± ${cell.uncertainty}`);
        break;
      case 'unit':
        td.setText(`${cell.value} ${cell.unit}`);
        break;
      case 'color':
        this.renderColorCell(td, cell, field);
        break;
      case 'spectrum':
      case 'histogram':
      case 'waveform':
        td.setText('[数据]'); // 可以根据需要显示更详细的信息
        break;
      case 'graph':
        td.setText(`[图: ${cell.nodes.length}节点, ${cell.edges.length}边]`);
        break;
      case 'molecule':
        td.setText(`[分子: ${cell.atoms.length}原子]`);
        break;
      case 'sequence':
        td.setText(cell.substring(0, 20) + (cell.length > 20 ? '...' : ''));
        break;
      // 新增的数据类型
      case 'audio_signal':
        td.setText(`[音频信号: ${field.sampleRate || 'N/A'}Hz]`);
        break;
      case 'frequency_response':
        td.setText(`[频率响应: ${field.frequencyRange?.[0] || 'N/A'}-${field.frequencyRange?.[1] || 'N/A'}Hz]`);
        break;
      case 'impulse_response':
      case 'transfer_function':
      case 'spectrogram':
      case 'directivity_pattern':
        td.setText(`[${field.type}]`);
        break;
      case 'acoustic_impedance':
      case 'reverberation_time':
      case 'noise_level':
      case 'sound_pressure_level':
        td.setText(`${cell} ${field.unit || ''}`);
        break;
      default:
        td.setText(String(cell));
    }
  }

  private renderColorCell(td: HTMLElement, cell: any, field: DatabaseField) {
    if (field.colorModel === 'RGB') {
      td.setText(`RGB(${cell.r}, ${cell.g}, ${cell.b})`);
      td.setAttr('style', `background-color: rgb(${cell.r}, ${cell.g}, ${cell.b}); color: ${this.getContrastColor(cell.r, cell.g, cell.b)}`);
    } else {
      td.setText(JSON.stringify(cell));
    }
  }

  private getContrastColor(r: number, g: number, b: number): string {
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? 'black' : 'white';
  }

  private updateTable(state: TableState) {
    const tableElement = this.tableElements.get(state.table);
    if (tableElement) {
      this.renderTable(state, tableElement);
    }
  }

  private sortTable(table: DatabaseTable, column: string) {
    const currentSort = this.sortStates.get(table) || { column: '', direction: 'asc' };
    const newDirection = currentSort.column === column && currentSort.direction === 'asc' ? 'desc' : 'asc';
    
    const columnIndex = table.fields.findIndex(field => field.name === column);
    table.data.sort((a, b) => {
      const valueA = String(a[columnIndex]).toLowerCase();
      const valueB = String(b[columnIndex]).toLowerCase();
      if (valueA < valueB) return newDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return newDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.sortStates.set(table, { column, direction: newDirection });
    this.renderTables();
  }

  private async exportData(selectedTables: string[], format: string | undefined) {
    if (!format) return;

    let content = '';
    const tablesToExport = this.tables.filter(table => selectedTables.includes(table.name));

    if (format === 'csv') {
      content = tablesToExport.map(table => 
        [table.fields.map(field => field.name).join(',')]
          .concat(table.data.map(row => row.join(',')))
          .join('\n')
      ).join('\n\n');
    } else if (format === 'json') {
      content = JSON.stringify(tablesToExport, null, 2);
    }

    // 使用 Electron 的 dialog API 让用户选择保存位置
    const { remote } = require('electron');
    const path = await remote.dialog.showSaveDialog({
      title: '选择保存位置',
      defaultPath: `exported_tables.${format}`,
      filters: [
        { name: format.toUpperCase(), extensions: [format] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });

    if (path.canceled) {
      new Notice('导出已取消');
      return;
    }

    // 使用 Obsidian 的 vault.adapter.writeBinary 方法保存文件
    await this.app.vault.adapter.writeBinary(path.filePath, new TextEncoder().encode(content));

    new Notice(`已导出 ${selectedTables.length} 个表格��� ${path.filePath}`);
  }

  private async importData() {
    new ImportMethodModal(this.app, async (method) => {
      if (method === 'file') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.json';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (file) {
            const content = await file.text();
            this.processImportedContent(content, file.name.endsWith('.json') ? 'json' : 'csv');
          }
        };
        input.click();
      } else if (method === 'clipboard') {
        const content = await navigator.clipboard.readText();
        this.processImportedContent(content);
      }
    }).open();
  }

  private async processImportedContent(content: string, format?: 'csv' | 'json') {
    let tables: DatabaseTable[] = [];
    if (!format) {
      try {
        JSON.parse(content);
        format = 'json';
      } catch {
        format = 'csv';
      }
    }

    if (format === 'csv') {
      const lines = content.split('\n').map(line => line.trim()).filter(line => line);
      const table: DatabaseTable = { name: 'Imported Table', fields: [], data: [] };
      table.fields = lines[0].split(',').map(fieldName => ({
        name: fieldName.trim(),
        type: 'string', // 默认类型，可以根据需要进行更复杂的类型推断
      }));
      table.data = lines.slice(1).map(line => line.split(',').map(cell => cell.trim()));
      tables = [table];
    } else if (format === 'json') {
      tables = JSON.parse(content);
    }

    this.setTables(tables);
    new Notice('数据导入成功');
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
      const exportButtonRect = this.exportButton.buttonEl.getBoundingClientRect();
      const importButtonRect = this.importButton.buttonEl.getBoundingClientRect();
      
      debug(`导出按钮位置: top=${exportButtonRect.top}, left=${exportButtonRect.left}, width=${exportButtonRect.width}, height=${exportButtonRect.height}`);
      debug(`导入按钮位置: top=${importButtonRect.top}, left=${importButtonRect.left}, width=${importButtonRect.width}, height=${importButtonRect.height}`);
    } else {
      warn('按钮未创建');
    }
  }

  private checkButtonVisibilityWithDelay() {
    setTimeout(() => {
      this.checkButtonVisibility();
    }, 100); // 100ms 延迟
  }

  private openExportModal() {
    new ExportModal(this.app, this.tables, (selectedTables) => {
      const format = this.exportDropdown?.getValue();
      this.exportData(selectedTables, format);
    }).open();
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
