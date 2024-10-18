import { Plugin, Notice, TFile, MarkdownView, Events, App, PluginManifest, PluginSettingTab, Setting, ButtonComponent } from 'obsidian';
import { DatabaseView, DATABASE_VIEW_TYPE } from './DatabaseView';
import { parseDatabase } from './databaseParser';
import { debug, info, warn, error } from './utils/logger';
import '../styles.css';
import { DatabasePluginSettings, SimpleDatabasePlugin, DatabaseTable, DatabaseField, DatabaseViewInterface } from './types';

const DEFAULT_SETTINGS: DatabasePluginSettings = {
  defaultSortDirection: 'asc'
};

export default class DatabasePlugin extends Plugin implements SimpleDatabasePlugin {
  private databaseView: DatabaseViewInterface | null = null;
  settings: DatabasePluginSettings = DEFAULT_SETTINGS;
  private dataUpdateCallbacks: ((updatedTables: string[]) => void)[] = [];

  async onload() {
    await this.loadSettings();
    info('加载数据库插件');

    this.registerView(
      DATABASE_VIEW_TYPE,
      (leaf) => new DatabaseView(leaf, this)
    );

    this.addCommand({
      id: 'parse-current-file',
      name: '解析当前文件中的数据库',
      callback: () => this.parseAndUpdateView()
    });

    this.registerEvent(
      this.app.workspace.on('file-open', (file) => {
        if (file && file.extension === 'md') {
          this.parseAndUpdateView();
        }
      })
    );

    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.parseAndUpdateView();
        }
      })
    );

    this.addRibbonIcon('database', '打开数据库视图', () => {
      this.activateView();
    });

    this.addCommand({
      id: 'open-database-view',
      name: '打开数据库视图',
      callback: () => this.activateView()
    });

    this.addSettingTab(new DatabasePluginSettingTab(this.app, this));

    // 暴露接口给其他插件
    (this.app as any).plugins.simple_database = this;
  }

  async loadSettings() {
    const loadedData = await this.loadData();
    const parsedData = loadedData ? JSON.parse(loadedData) : {};
    this.settings = Object.assign({}, DEFAULT_SETTINGS, parsedData);
  }

  async parseAndUpdateView() {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView) {
      const content = activeView.getViewData();
      debug(`获取到的文件内容: ${content}`);
      const tables = parseDatabase(content);
      debug(`解析后的表格数据: ${JSON.stringify(tables)}`);

      if (Array.isArray(tables) && tables.length > 0) {
        await this.activateView();
        if (this.databaseView) {
          info('更新数据库视图');
          this.databaseView.setTables(tables);
          new Notice('数据库视图已更新');
        } else {
          error('无法创建或获取数据库视图');
          new Notice('更新数据库视图失败');
        }
      } else {
        error(`解析结果无效: ${JSON.stringify(tables)}`);
        new Notice('解析数据库失败，请检查文件格式');
      }
    } else {
      new Notice('请打开一个 Markdown 文件');
    }
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(DATABASE_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({ type: DATABASE_VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.databaseView = leaf.view as DatabaseViewInterface;
    info(`数据库视图已激活: ${this.databaseView ? 'success' : 'fail'}`);
    
    if (!this.databaseView) {
      error('激活数据库视图失败');
      new Notice('无法创建数据库视图');
    }
  }

  onunload() {
    info('卸载数据库插件');

    // 移除暴露的接口
    delete (this.app as any).plugins.simple_database;
  }

  async saveData() {
    await this.saveSettings();
  }

  async saveSettings() {
    await (this.saveData as (data: any) => Promise<void>)(JSON.stringify(this.settings));
  }

  public getDatabaseData(): DatabaseTable[] | null {
    if (this.databaseView) {
      return this.databaseView.getTables();
    }
    return null;
  }

  public queryData(tableName: string, conditions: object): any[][] | null {
    const tables = this.getDatabaseData();
    if (!tables) return null;

    const table = tables.find(t => t.name === tableName);
    if (!table) return null;

    return table.data.filter(row => {
      return Object.entries(conditions).every(([key, value]) => {
        const index = table.fields.findIndex(f => f.name === key);
        return row[index] === value;
      });
    });
  }

  public getTableSchema(tableName: string): DatabaseField[] | null {
    const tables = this.getDatabaseData();
    if (!tables) return null;

    const table = tables.find(t => t.name === tableName);
    return table ? table.fields : null;
  }

  public onDataUpdate(callback: (updatedTables: string[]) => void): void {
    this.dataUpdateCallbacks.push(callback);
  }

  public getColumnStats(tableName: string, columnName: string): { min: number; max: number; average: number; median: number; } | null {
    const tables = this.getDatabaseData();
    if (!tables) return null;

    const table = tables.find(t => t.name === tableName);
    if (!table) return null;

    const columnIndex = table.fields.findIndex(f => f.name === columnName);
    if (columnIndex === -1) return null;

    const columnData = table.data.map(row => parseFloat(row[columnIndex])).filter(value => !isNaN(value));
    if (columnData.length === 0) return null;

    columnData.sort((a, b) => a - b);
    const min = columnData[0];
    const max = columnData[columnData.length - 1];
    const sum = columnData.reduce((a, b) => a + b, 0);
    const average = sum / columnData.length;
    const median = columnData.length % 2 === 0
      ? (columnData[columnData.length / 2 - 1] + columnData[columnData.length / 2]) / 2
      : columnData[Math.floor(columnData.length / 2)];

    return { min, max, average, median };
  }

  public getDataRange(tableName: string, columnName: string, start: number, end: number): any[] | null {
    const tables = this.getDatabaseData();
    if (!tables) return null;

    const table = tables.find(t => t.name === tableName);
    if (!table) return null;

    const columnIndex = table.fields.findIndex(f => f.name === columnName);
    if (columnIndex === -1) return null;

    return table.data.slice(start, end + 1).map(row => row[columnIndex]);
  }

  // 添加一个方法来触发数据更新回调
  private triggerDataUpdate(updatedTables: string[]): void {
    this.dataUpdateCallbacks.forEach(callback => callback(updatedTables));
  }

  // 在数据更新时调用此方法
  private updateData(updatedTables: string[]): void {
    // 更新数据的逻辑
    // ...

    // 触发数据更新回调
    this.triggerDataUpdate(updatedTables);
  }
}

class DatabasePluginSettingTab extends PluginSettingTab {
  plugin: DatabasePlugin;

  constructor(app: App, plugin: DatabasePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let {containerEl} = this;
    containerEl.empty();
    containerEl.createEl('h2', {text: '数据库插件设置'});

    new Setting(containerEl)
      .setName('默认排序方向')
      .setDesc('设置表格的默认排序方向')
      .addDropdown(dropdown => dropdown
        .addOption('asc', '升序')
        .addOption('desc', '降序')
        .setValue(this.plugin.settings.defaultSortDirection)
        .onChange(async (value) => {
          this.plugin.settings.defaultSortDirection = value as 'asc' | 'desc';
          await this.plugin.saveSettings();
        }));
  }
}
