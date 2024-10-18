import { Plugin, Notice, TFile, MarkdownView, Events, App, PluginManifest, PluginSettingTab, Setting, ButtonComponent } from 'obsidian';
import { DatabaseView, DATABASE_VIEW_TYPE } from './DatabaseView';
import { parseDatabase } from './databaseParser';
import { debug, info, warn, error } from './utils/logger';
import '../styles.css';
import { DatabasePluginSettings, SimpleDatabasePlugin, DatabaseTable, DatabaseField, DatabaseViewInterface, ComplexDataType } from './types';


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
      new Notice('无法创建');
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

  public queryData(tableName: string, conditions: object): ComplexDataType[][] | null {
    const tables = this.getDatabaseData();
    if (!tables) return null;

    const table = tables.find(t => t.name === tableName);
    if (!table) return null;

    return table.data.filter(row => {
      return Object.entries(conditions).every(([key, value]) => {
        const index = table.fields.findIndex(f => f.name === key);
        const fieldType = table.fields[index].type;
        const rowValue = this.parseComplexDataType(row[index], table.fields[index]);

        switch (fieldType) {
          case 'string':
          case 'number':
          case 'boolean':
          case 'date':
          case 'timedelta':
          case 'url':
          case 'email':
          case 'phone':
          case 'progress':
          case 'category':
          case 'tag':
          case 'binary':
            return rowValue.value === value;

          case 'array':
            return rowValue.value.every((item: any) => item === value);

          case 'object':
            // 对于对象类型，检查是否包含指定的键值对
            return Object.entries(value as Record<string, any>).every(([k, v]) => rowValue.value[k] === v);

          case 'polygon':
            // 对于多边形类型，检查是否包含指定的点
            const point = value as { x: number, y: number };
            return this.isPointInPolygon(point, rowValue.value);

          case 'vector':
            // 对于向量类型，检查是否在指定范围内
            const queryVector = value as number[];
            const rowVector = rowValue.value as number[];
            return this.areVectorsEqual(queryVector, rowVector, 0.01); // 允许0.01的误差

          case 'matrix':
            // 对于矩阵类型，检查是否所有元素都相等
            const queryMatrix = value as number[][];
            const rowMatrix = rowValue.value as number[][];
            return this.areMatricesEqual(queryMatrix, rowMatrix, 0.01); // 允许0.01的误差

          case 'complex':
            // 对于复数类型，检查实部和虚部是否在指定范围内
            const queryComplex = value as { real: number, imag: number };
            const rowComplex = rowValue.value as { real: number, imag: number };
            return Math.abs(queryComplex.real - rowComplex.real) <= 0.01 &&
                   Math.abs(queryComplex.imag - rowComplex.imag) <= 0.01; // 允许0.01的误差

          case 'molecule':
            debug(`解析分子数据: ${value}`);
            const [atoms, bonds] = value.split(';');
            const atomList: Array<{ element: string; count: number }> = atoms.split('|').map((atom: string) => {
              const [element, count] = atom.split(':');
              return { element, count: parseInt(count) };
            });
            const bondList: Array<{ atom1: number; atom2: number }> = bonds ? bonds.split('|').map((bond: string) => {
              const [atom1, atom2] = bond.split('-').map(Number);
              return { atom1, atom2 };
            }) : [];
            const moleculeValue = { atoms: atomList, bonds: bondList };
            info(`分子解析结果: ${JSON.stringify(moleculeValue)}`);
            return { type: 'molecule', value: moleculeValue, metadata: {
              atomCount: atomList.reduce((sum, atom) => sum + atom.count, 0),
              bondCount: bondList.length
            }};

          case 'chemical_formula':
            debug(`解析化学式数据: ${value}`);
            const elements = value.match(/([A-Z][a-z]*)(\d*)/g) || [];
            const formulaValue: Array<{ symbol: string; count: number }> = elements.map((element: string) => {
              const [, symbol, count] = element.match(/([A-Z][a-z]*)(\d*)/) || [];
              return { symbol, count: count ? parseInt(count) : 1 };
            });
            info(`化学式解析结果: ${JSON.stringify(formulaValue)}`);
            return { type: 'chemical_formula', value: formulaValue, metadata: {
              elementCount: formulaValue.length,
              totalAtoms: formulaValue.reduce((sum, element) => sum + element.count, 0)
            }};

          case 'reaction':
            debug(`解析化学反应数据: ${value}`);
            const [reactants, products] = value.split('->').map((side: string) => 
              side.trim().split('+').map((compound: string) => compound.trim())
            );
            const reactionValue: { reactants: string[]; products: string[] } = { reactants, products };
            info(`化学反应解析结果: ${JSON.stringify(reactionValue)}`);
            return { type: 'reaction', value: reactionValue, metadata: {
              reactantCount: reactants.length,
              productCount: products.length,
              isBalanced: this.isReactionBalanced(reactants, products)
            }};

          case 'timeseries':
            debug(`解析时间序列数据: ${value}`);
            const timeseriesPoints = value.split('|').map((point: string) => {
              const [timestamp, dataValue] = point.split(',');
              return { timestamp: new Date(timestamp), value: Number(dataValue) };
            });
            info(`时间序列解析结果: ${JSON.stringify(timeseriesPoints)}`);
            return { type: 'timeseries', value: timeseriesPoints, metadata: {
              pointCount: timeseriesPoints.length,
              startTime: timeseriesPoints[0].timestamp,
              endTime: timeseriesPoints[timeseriesPoints.length - 1].timestamp,
              minValue: Math.min(...timeseriesPoints.map((p: { value: number }) => p.value)),
              maxValue: Math.max(...timeseriesPoints.map((p: { value: number }) => p.value))
            }};

          case 'formula':
            debug(`解析公式数据: ${value}`);
            info(`公式解析结果: ${value}`);
            return { type: 'formula', value, metadata: {
              variables: value.match(/[a-zA-Z]+/g) || [],
              operators: value.match(/[\+\-\*\/\^\(\)]/g) || []
            }};

          case 'distribution':
            debug(`解析分布数据: ${value}`);
            const [distributionType, ...params] = value.split('|');
            const distributionParams = Object.fromEntries(
              params.map((param: string) => {
                const [key, val] = param.split(':');
                return [key, Number(val)];
              })
            );
            info(`分布解析结果: ${JSON.stringify({ type: distributionType, params: distributionParams })}`);
            return { type: 'distribution', value: { type: distributionType, params: distributionParams }, metadata: {
              distributionType,
              parameterCount: Object.keys(distributionParams).length
            }};

          default:
            return rowValue.value === value;
        }
      });
    }).map(row => row.map((cell, index) => this.parseComplexDataType(cell, table.fields[index])));
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

  public getDataRange(tableName: string, columnName: string, start: number, end: number): ComplexDataType[] | null {
    const tables = this.getDatabaseData();
    if (!tables) return null;

    const table = tables.find(t => t.name === tableName);
    if (!table) return null;

    const columnIndex = table.fields.findIndex(f => f.name === columnName);
    if (columnIndex === -1) return null;

    return table.data.slice(start, end + 1).map(row => this.parseComplexDataType(row[columnIndex], table.fields[columnIndex]));
  }

  // 添加一个方法来触发数据更新回调
  private triggerDataUpdate(updatedTables: string[]): void {
    this.dataUpdateCallbacks.forEach(callback => callback(updatedTables));
  }

  // 在数据更新时用此方法
  private updateData(updatedTables: string[]): void {
    // 更新数据的逻辑
    // ...

    // 触发数据更新回调
    this.triggerDataUpdate(updatedTables);
  }

  private parseComplexDataType(value: any, field: DatabaseField): ComplexDataType {
    const metadata: Record<string, any> = field.metadata || {};

    switch (field.type) {
      case 'string':
        return { type: 'string', value, metadata: { length: value.length } };

      case 'number':
        return { type: 'number', value, metadata: { isInteger: Number.isInteger(value) } };

      case 'boolean':
        return { type: 'boolean', value, metadata: {} };

      case 'date':
        const date = new Date(value);
        return { type: 'date', value, metadata: { 
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate(),
          dayOfWeek: date.getDay()
        }};

      case 'timedelta':
        debug(`解析时间差数据: ${value}`);
        const [amount, unit] = value.split(' ');
        const timeDeltaValue = { amount: Number(amount), unit };
        info(`时间差解析结果: ${JSON.stringify(timeDeltaValue)}`);
        return { type: 'timedelta', value: timeDeltaValue, metadata: {
          milliseconds: this.convertToMilliseconds(Number(amount), unit)
        }};

      case 'url':
        const url = new URL(value);
        return { type: 'url', value, metadata: { 
          protocol: url.protocol,
          hostname: url.hostname,
          pathname: url.pathname
        }};

      case 'email':
        const [localPart, domain] = value.split('@');
        return { type: 'email', value, metadata: { localPart, domain } };

      case 'phone':
        return { type: 'phone', value, metadata: { 
          countryCode: value.split(' ')[0],
          number: value.split(' ').slice(1).join('')
        }};

      case 'progress':
        const progress = Number(value);
        return { type: 'progress', value, metadata: { 
          percentage: progress,
          isComplete: progress === 100
        }};

      case 'category':
      case 'tag':
        return { type: field.type, value, metadata: {} };

      case 'binary':
        return { type: 'binary', value, metadata: { length: value.length } };

      case 'array':
        const arrayValue = value.split(';').map((item: string) => item.trim());
        return { type: 'array', value: arrayValue, metadata: { length: arrayValue.length } };

      case 'object':
        debug(`解析对象类型数据: ${value}`);
        const objectValue: Record<string, string> = {};
        value.split('|').forEach((pair: string) => {
          const [key, val] = pair.split(':');
          objectValue[key.trim()] = val.trim();
        });
        info(`对象解析结果: ${JSON.stringify(objectValue)}`);
        return { type: 'object', value: objectValue, metadata: { 
          keys: Object.keys(objectValue),
          size: Object.keys(objectValue).length
        }};

      case 'geo':
        debug(`解析地理坐标数据: ${value}`);
        const [lat, lng] = value.split('|').map(Number);
        const geoValue = { lat, lng };
        info(`地理坐标解析结果: ${JSON.stringify(geoValue)}`);
        return { type: 'geo', value: geoValue, metadata: { 
          latitude: lat,
          longitude: lng
        }};

      case 'polygon':
        debug(`解析多边形数据: ${value}`);
        const points = value.split('|').map((point: string) => {
          const [x, y] = point.split(',').map(Number);
          return { x, y };
        });
        info(`多边形解析结果: ${JSON.stringify(points)}`);
        return { type: 'polygon', value: points, metadata: { 
          vertices: points.length,
          perimeter: this.calculatePolygonPerimeter(points)
        }};

      case 'vector':
        debug(`解析向量数据: ${value}`);
        const components = value.split(',').map(Number);
        info(`向量解析结果: ${JSON.stringify(components)}`);
        return { type: 'vector', value: components, metadata: { 
          dimensions: components.length,
          magnitude: Math.sqrt(components.reduce((sum: number, comp: number) => sum + comp * comp, 0))
        }};

      case 'matrix':
        debug(`解析矩阵数据: ${value}`);
        const rows = value.split('|').map((row: string) => row.split(',').map(Number));
        info(`矩阵解析结果: ${JSON.stringify(rows)}`);
        return { type: 'matrix', value: rows, metadata: {
          rows: rows.length,
          columns: rows[0].length,
          isSquare: rows.length === rows[0].length
        }};

      case 'complex':
        debug(`解析复数数据: ${value}`);
        const [real, imag] = value.split(',').map(Number);
        const complexValue = { real, imag };
        info(`复数解析结果: ${JSON.stringify(complexValue)}`);
        return { type: 'complex', value: complexValue, metadata: {
          magnitude: Math.sqrt(real * real + imag * imag),
          angle: Math.atan2(imag, real)
        }};

      case 'audio_signal':
        debug(`解析音频信号数据: ${value}`);
        const [amplitude, frequency, duration] = value.split(',').map(Number);
        const audioSignalValue = { amplitude, frequency, duration };
        info(`音频信号解析结果: ${JSON.stringify(audioSignalValue)}`);
        return { type: 'audio_signal', value: audioSignalValue, metadata: {
          maxAmplitude: amplitude,
          period: 1 / frequency,
          wavelength: 343 / frequency // 设声速为343m/s
        }};

      case 'frequency_response':
        debug(`解析频率响应数据: ${value}`);
        const frequencyResponsePoints: Array<{ frequency: number; magnitude: number }> = value.split('|').map((point: string) => {
          const [freq, magnitude] = point.split(',').map(Number);
          return { frequency: freq, magnitude };
        });
        info(`频率响应解析结果: ${JSON.stringify(frequencyResponsePoints)}`);
        return { type: 'frequency_response', value: frequencyResponsePoints, metadata: {
          pointCount: frequencyResponsePoints.length,
          minFrequency: Math.min(...frequencyResponsePoints.map(p => p.frequency)),
          maxFrequency: Math.max(...frequencyResponsePoints.map(p => p.frequency)),
          minMagnitude: Math.min(...frequencyResponsePoints.map(p => p.magnitude)),
          maxMagnitude: Math.max(...frequencyResponsePoints.map(p => p.magnitude))
        }};

      case 'sound_pressure_level':
        debug(`解析声压级数据: ${value}`);
        const spl = Number(value);
        info(`声压级解析结果: ${spl}`);
        return { type: 'sound_pressure_level', value: spl, metadata: {
          intensity: Math.pow(10, spl / 10) * 1e-12, // W/m^2
          pressure: Math.pow(10, spl / 20) * 2e-5 // Pa
        }};

      default:
        return { type: field.type, value, metadata };
    }
  }

  private calculatePolygonPerimeter(points: { x: number, y: number }[]): number {
    let perimeter = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    return perimeter;
  }

  private isPointInPolygon(point: { x: number, y: number }, polygon: { x: number, y: number }[]): boolean {
    // 实现点是否在多边形内的检查逻辑
    // 这里使用射线法来判断点是否多边形内
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y))
          && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private areVectorsEqual(v1: number[], v2: number[], epsilon: number): boolean {
    if (v1.length !== v2.length) return false;
    return v1.every((value, index) => Math.abs(value - v2[index]) <= epsilon);
  }

  private areMatricesEqual(m1: number[][], m2: number[][], epsilon: number): boolean {
    if (m1.length !== m2.length || m1[0].length !== m2[0].length) return false;
    for (let i = 0; i < m1.length; i++) {
      for (let j = 0; j < m1[0].length; j++) {
        if (Math.abs(m1[i][j] - m2[i][j]) > epsilon) return false;
      }
    }
    return true;
  }

  private convertToMilliseconds(amount: number, unit: string): number {
    const conversions: Record<string, number> = {
      'ms': 1,
      's': 1000,
      'm': 60000,
      'h': 3600000,
      'd': 86400000
    };
    return amount * (conversions[unit] || 0);
  }

  private isReactionBalanced(reactants: string[], products: string[]): boolean {
    // 这里应该实现一个检查化学反应是否平衡的逻辑
    // 由于这需要复杂的化学计算，这里只是一个简单的占位实现
    return reactants.length === products.length;
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
