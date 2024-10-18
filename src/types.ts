import { ItemView, Plugin, App } from "obsidian";

// 数据库表的结构
export interface DatabaseTable {
  name: string;
  fields: DatabaseField[];
  data: any[][];
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
  queryData(tableName: string, conditions: object): any[][] | null;
  getTableSchema(tableName: string): DatabaseField[] | null;
  onDataUpdate(callback: (updatedTables: string[]) => void): void;
  getColumnStats(tableName: string, columnName: string): {
    min: number;
    max: number;
    average: number;
    median: number;
  } | null;
  getDataRange(tableName: string, columnName: string, start: number, end: number): any[] | null;
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

// 更新数据库字段的定义
export type DatabaseFieldType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'decimal'
  | 'array'
  | 'object'
  | 'geo'
  | 'timeseries'
  | 'category'
  | 'binary'
  | 'vector'
  | 'matrix'
  | 'complex'
  | 'uncertainty'
  | 'unit'
  | 'formula'
  | 'distribution'
  | 'color'
  | 'spectrum'
  | 'histogram'
  | 'tensor'
  | 'waveform'
  | 'graph'
  | 'molecule'
  | 'sequence'
  | 'image'
  | 'function'
  | 'interval'
  | 'fuzzy'
  | 'quaternion'
  | 'polygon'
  | 'timedelta'
  | 'currency'
  | 'regex'
  | 'url'
  | 'ipaddress'
  | 'uuid'
  | 'version'
  | 'bitfield'
  | 'enum'
  | 'audio_signal'
  | 'frequency_response'
  | 'impulse_response'
  | 'transfer_function'
  | 'spectrogram'
  | 'acoustic_impedance'
  | 'reverberation_time'
  | 'noise_level'
  | 'sound_pressure_level'
  | 'directivity_pattern';

export interface DatabaseField {
  name: string;
  type: DatabaseFieldType;
  precision?: number;
  options?: string[];
  format?: string;
  dimensions?: number; // 用于向量和矩阵
  colorModel?: 'RGB' | 'HSL' | 'CMYK'; // 用于颜色类型
  sampleRate?: number; // 用于音频相关类型
  frequencyRange?: [number, number]; // 用于频率相关类型
  unit?: string; // 用于声学测量
  // 可以根据需要添加更多属性
}
