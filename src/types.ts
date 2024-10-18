import { ItemView, Plugin, App } from "obsidian";

// 数据库表的结构
export interface DatabaseTable {
  name: string;
  fields: string[];
  data: string[][];
}

// 表格状态的接口
export interface TableState {
  table: DatabaseTable;
  id: number;
  searchTerm: string;
}

// 排序状态的接口
export interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

// 数据库视图的接口
export interface DatabaseViewInterface extends ItemView {
  setTables(tables: DatabaseTable[]): void;
  getTables(): DatabaseTable[];
  insertContent(content: string): void;
  checkButtonVisibility(): void;
}

// 插件设置的接口
export interface DatabasePluginSettings {
  defaultSortDirection: 'asc' | 'desc';
  // 其他设置...
}

// 插件 API 的接口
export interface SimpleDatabasePlugin extends Plugin {
  getDatabaseData(): DatabaseTable[] | null;
}

// 扩展 Obsidian 的类型定义
declare module "obsidian" {
  interface App {
    plugins: {
      simple_database: SimpleDatabasePlugin;
    };
  }
}

export interface DatabasePluginInterface {
  // ...
}
