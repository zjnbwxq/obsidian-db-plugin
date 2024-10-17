import { ItemView, WorkspaceLeaf, ButtonComponent, TextComponent, DropdownComponent, Menu, Notice, MarkdownView, TFile, TFolder, FuzzySuggestModal, Modal, Setting } from 'obsidian';
import DatabasePlugin from './main';

interface DatabaseTable {
  name: string;
  fields: string[];
  data: any[][];
}

interface TableState {
  table: DatabaseTable;
  id: number;
  searchTerm: string;
}

interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

export const DATABASE_VIEW_TYPE = 'database-view';

export class DatabaseView extends ItemView {
  private tableStates: TableState[] = [];
  private sortStates: Map<DatabaseTable, SortState> = new Map();
  private tableElements: Map<DatabaseTable, HTMLElement> = new Map();
  private exportDropdown?: DropdownComponent;
  private exportButton?: ButtonComponent;
  private importButton?: ButtonComponent;
  private sortState: SortState | null = null;
  plugin: DatabasePlugin;

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

  async onClose() {
    // 清理工作（如果需要）
  }

  private renderView() {
    const container = this.containerEl.children[1];
    container.empty();

    const headerContainer = container.createEl('div', { cls: 'database-header' });
    const titleEl = headerContainer.createEl('h1', { text: this.leaf.getDisplayText(), cls: 'database-title' });
    const optionsContainer = headerContainer.createEl('div', { cls: 'database-options' });

    this.renderControls(optionsContainer);

    // 渲染表格
    this.tableStates.forEach((state, index) => {
      this.renderTableContainer(state, index);
    });

    this.addRowHoverEffect();
  }

  private renderControls(container: HTMLElement) {
    const controlsDiv = container.createEl('div', { cls: 'database-controls' });

    this.renderExportControl(controlsDiv);
    this.renderImportControl(controlsDiv);
    // 添加其他控件...
  }

  private renderExportControl(container: HTMLElement) {
    this.exportDropdown = new DropdownComponent(container)
      .addOption('all', '所有表格')
      .onChange(value => {
        if (this.exportButton) {
          this.exportButton.setDisabled(false);
        }
      });

    this.tableStates.forEach((state, index) => {
      this.exportDropdown?.addOption(index.toString(), state.table.name);
    });

    this.exportButton = new ButtonComponent(container)
      .setButtonText('导出 CSV')
      .setDisabled(true)
      .onClick(() => this.exportTablesToCSV());
  }

  private renderImportControl(container: HTMLElement) {
    this.importButton = new ButtonComponent(container)
      .setButtonText('导入 CSV')
      .onClick(() => this.importCSV());
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
    // 实现表格渲染逻辑
    // 返回一个 HTMLElement 表示渲染后的表格
    const tableEl = document.createElement('table');
    tableEl.className = 'database-table';
    // 实现表格渲染逻辑...
    return tableEl;
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

  private updateTable(table: DatabaseTable) {
    const tableEl = this.tableElements.get(table);
    if (tableEl) {
      const newTableEl = this.renderTable(table);
      tableEl.replaceWith(newTableEl);
      this.tableElements.set(table, newTableEl);
    }
  }

  private async editCell(table: DatabaseTable, rowIndex: number, cellIndex: number, cellElement: HTMLElement) {
    const currentValue = table.data[rowIndex][cellIndex];
    const input = document.createElement('input');
    input.value = currentValue;
    input.className = 'cell-edit-input';

    const saveEdit = async () => {
      const newValue = input.value;
      table.data[rowIndex][cellIndex] = newValue;
      this.plugin.savePluginData();
      this.renderView();
      new Notice('单元格已更新。点击同步图标以更新Markdown文件。');
    };

    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveEdit();
      }
    });

    cellElement.empty();
    cellElement.appendChild(input);
    input.focus();
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
        if (error instanceof Error) {
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

  private generateMarkdownContent(): string {
    let content = '';
    this.tableStates.forEach(state => {
      const { table } = state;
      content += `db:${table.name}\n`;
      content += table.fields.join(',') + '\n';
      table.data.forEach(row => {
        content += row.join(',') + '\n';
      });
      content += '\n';
    });
    return content.trim();
  }

  private async syncToFile() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice('没有活动的文件来同步数据');
      return;
    }

    const content = this.generateMarkdownContent();
    try {
      await this.app.vault.modify(activeFile, content);
      new Notice('数据已同步到文件');
    } catch (error) {
      console.error('同步到文件时出错:', error);
      new Notice('同步到文件失败');
    }
  }

  private async deleteRow(table: DatabaseTable, rowIndex: number) {
    table.data.splice(rowIndex, 1);
    this.plugin.savePluginData();
    this.renderView();
    new Notice('行已删除。点击同步图标以更新Markdown文件。');
  }

  private async addRow(table: DatabaseTable) {
    const newRow = table.fields.map(() => '');
    table.data.push(newRow);
    this.plugin.savePluginData();
    this.renderView();
    new Notice('新行已添加。点击同步图标以更新Markdown文件。');
  }

  setTables(tables: DatabaseTable[]) {
    this.tableStates = tables.map(table => ({
      table,
      id: Date.now(),
      searchTerm: ''
    }));
    this.renderView();
  }

  getTables(): DatabaseTable[] {
    return this.tableStates.map(state => state.table);
  }

  private addRowHoverEffect() {
    const tables = document.querySelectorAll('.database-table') as NodeListOf<HTMLElement>;
    tables.forEach((table: HTMLElement) => {
      table.addEventListener('mousemove', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const row = target.closest('tr');
        if (row) {
          const rect = row.getBoundingClientRect();
          const deleteButton = row.querySelector('.delete-button') as HTMLElement;
          if (deleteButton) {
            if (e.clientX > rect.right - 100) { // 当鼠标在行的最后100像素时
              deleteButton.style.opacity = '1';
            } else {
              deleteButton.style.opacity = '0';
            }
          }
        }
      });

      table.addEventListener('mouseleave', () => {
        const deleteButtons = table.querySelectorAll('.delete-button');
        deleteButtons.forEach((button) => {
          (button as HTMLElement).style.opacity = '0';
        });
      });
    });
  }

  private async updateMarkdownFile(table: DatabaseTable) {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return;

    const content = await this.app.vault.read(activeFile);
    const lines = content.split('\n');

    let startIndex = -1;
    let endIndex = -1;

    // 查找表格的开始和结束位置
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(`db:${table.name}`)) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].trim() === '') {
        endIndex = i;
        break;
      }
    }

    if (startIndex === -1) return;

    // 生成新的表格内容
    const newTableContent = [`db:${table.name}`];
    newTableContent.push(table.fields.join(','));
    table.data.forEach(row => {
      newTableContent.push(row.join(','));
    });

    // 替换原文件中的表格内容
    const newContent = [
      ...lines.slice(0, startIndex),
      ...newTableContent,
      ...lines.slice(endIndex)
    ].join('\n');

    // 更新文件
    await this.app.vault.modify(activeFile, newContent);
  }

  private async sortTable(table: DatabaseTable, column: string) {
    if (this.sortState && this.sortState.column === column) {
      this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortState = { column, direction: 'asc' };
    }
    this.renderView();
  }

  private async syncToMarkdown(table: DatabaseTable) {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return;

    const content = await this.app.vault.read(activeFile);
    const lines = content.split('\n');

    let startIndex = -1;
    let endIndex = -1;

    // 查找表格的开始和结束位置
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(`db:${table.name}`)) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].trim() === '') {
        endIndex = i;
        break;
      }
    }

    if (startIndex === -1) return;

    // 生成新的表格内容
    const newTableContent = [`db:${table.name}`];
    newTableContent.push(table.fields.join(','));
    table.data.forEach(row => {
      newTableContent.push(row.join(','));
    });

    // 替换原文件中的表格内容
    const newContent = [
      ...lines.slice(0, startIndex),
      ...newTableContent,
      ...lines.slice(endIndex)
    ].join('\n');

    // 更新文件
    await this.app.vault.modify(activeFile, newContent);
    new Notice('表格已同步到Markdown文件');
  }

  private async handleColumnAction(table: DatabaseTable, columnIndex: number, event: MouseEvent) {
    const action = await this.showActionMenu(['添加列', '删���列'], event);
    if (action === '添加列') {
      const newFieldName = `New Column ${table.fields.length + 1}`;
      table.fields.splice(columnIndex + 1, 0, newFieldName);
      table.data.forEach(row => row.splice(columnIndex + 1, 0, ''));
    } else if (action === '删除列') {
      table.fields.splice(columnIndex, 1);
      table.data.forEach(row => row.splice(columnIndex, 1));
    }
    this.renderView();
    this.plugin.savePluginData();
  }

  private async handleRowAction(table: DatabaseTable, rowIndex: number, event: MouseEvent) {
    const action = await this.showActionMenu(['添加行', '删除行'], event);
    if (action === '添加行') {
      const newRow = table.fields.map(() => '');
      table.data.splice(rowIndex + 1, 0, newRow);
    } else if (action === '删除行') {
      table.data.splice(rowIndex, 1);
    }
    this.renderView();
    this.plugin.savePluginData();
  }

  private async showActionMenu(options: string[], event: MouseEvent): Promise<string> {
    return new Promise((resolve) => {
      const menu = new Menu();
      options.forEach(option => {
        menu.addItem((item) => 
          item.setTitle(option).onClick(() => {
            resolve(option);
            menu.hide();
          })
        );
      });
      menu.showAtPosition({ x: event.clientX, y: event.clientY });
    });
  }

  private async showAllTables() {
    // 实现显示所有表格的逻辑
    console.log("显示所有表格");
    // 这里可以重新渲染所有表格或切换视图
  }

  private async exportCSV() {
    // 实现导出 CSV 的逻辑
    console.log("导出 CSV");
    // 这里可以调用插件的导出方法
    // await this.plugin.exportCSV();
  }

  private async importCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const content = await this.readFileContent(file);
        const data = this.parseCSV(content);
        if (data.length > 1) {
          const tableName = this.getTableNameFromFileName(file.name);
          const newTable: DatabaseTable = {
            name: tableName,
            fields: data[0],
            data: data.slice(1)
          };
          this.tableStates.push({
            table: newTable,
            id: Date.now(),
            searchTerm: ''
          });
          this.renderView();
          this.plugin.savePluginData();
          new Notice('CSV 导入完成');
        } else {
          new Notice('CSV 文件格式无效');
        }
      }
    };
    input.click();
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
    return content.split('\n').map(line => line.split(',').map(cell => cell.trim()));
  }

  private getTableNameFromFileName(fileName: string): string {
    return fileName.replace(/\.csv$/, '');
  }

  private handleSearch(table: DatabaseTable, query: string) {
    // 实现搜索逻辑
    console.log(`在表格 ${table.name} 中搜索: ${query}`);
    // 这里可以实现实际的搜索功能
  }

  private async exportTablesToCSV() {
    const selectedValue = this.exportDropdown?.getValue();
    let tablesToExport: DatabaseTable[];

    if (selectedValue === 'all') {
      tablesToExport = this.tableStates.map(state => state.table);
    } else {
      const index = parseInt(selectedValue || '');
      if (isNaN(index) || index < 0 || index >= this.tableStates.length) {
        new Notice('无效的表格选择');
        return;
      }
      tablesToExport = [this.tableStates[index].table];
    }

    for (const table of tablesToExport) {
      const csvContent = this.tableToCSV(table);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${table.name}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
    new Notice('CSV 导出完成');
  }

  private tableToCSV(table: DatabaseTable): string {
    const rows = [table.fields, ...table.data];
    return rows.map(row => row.map(String).join(',')).join('\n');
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
