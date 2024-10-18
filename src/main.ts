import { Plugin, Notice, TFile, MarkdownView, Events, App, PluginManifest, PluginSettingTab, Setting, ButtonComponent } from 'obsidian';
import { DatabaseView, DATABASE_VIEW_TYPE } from './DatabaseView';
import { parseDatabase, DatabaseTable } from './databaseParser';
import { debug, info, warn, error } from './utils/logger';
import '../styles.css';

interface DatabasePluginSettings {
  defaultSortDirection: 'asc' | 'desc';
}

const DEFAULT_SETTINGS: DatabasePluginSettings = {
  defaultSortDirection: 'asc'
};

export default class DatabasePlugin extends Plugin {
  private databaseView: DatabaseView | null = null;
  settings: DatabasePluginSettings = DEFAULT_SETTINGS;

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
    
    this.databaseView = leaf.view as DatabaseView;
    info(`数据库视图已激活: ${this.databaseView ? 'success' : 'fail'}`);
    
    if (!this.databaseView) {
      error('激活数据库视图失败');
      new Notice('无法创建数据库视图');
    }
  }

  onunload() {
    info('卸载数据库插件');
  }

  async saveData() {
    await this.saveSettings();
  }

  async saveSettings() {
    await (this.saveData as (data: any) => Promise<void>)(JSON.stringify(this.settings));
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
