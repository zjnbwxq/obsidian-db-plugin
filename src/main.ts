import { Plugin, Notice, TFile, MarkdownView, Events } from 'obsidian';
import { DatabaseView, DATABASE_VIEW_TYPE } from './DatabaseView';
import { parseDatabase, DatabaseTable } from './databaseParser';
import '../styles.css';

export default class DatabasePlugin extends Plugin {
  private databaseView: DatabaseView | null = null;
  private lastContent: string = '';

  async onload() {
    console.log('加载数据库插件');

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
  }

  async parseAndUpdateView() {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView) {
      const content = activeView.getViewData();
      console.log('获取到的文件内容:', content);
      const tables = parseDatabase(content);
      console.log('解析后的表格数据:', tables);

      if (Array.isArray(tables) && tables.length > 0) {
        await this.activateView();
        if (this.databaseView) {
          console.log('更新数据库视图');
          this.databaseView.setTables(tables);
          new Notice('数据库视图已更新');
        } else {
          console.error('无法创建或获取数据库视图');
          new Notice('更新数据库视图失败');
        }
      } else {
        console.error('解析结果无效:', tables);
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
    
    // 等待视图完全加载
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.databaseView = leaf.view as DatabaseView;
    console.log('数据库视图已激活:', this.databaseView);
    
    if (!this.databaseView) {
      console.error('激活数据库视图失败');
      new Notice('无法创建数据库视图');
    }
  }

  onunload() {
    console.log('卸载数据库插件');
  }
}
