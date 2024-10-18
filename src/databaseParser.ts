import { debug, info } from './utils/logger';
import { DatabaseTable, DatabaseField, DatabaseFieldType } from './types';

export function parseDatabase(markdown: string): DatabaseTable[] {
  debug(`开始解析数据库，输入内容: ${markdown.substring(0, 100)}...`);
  const tables: DatabaseTable[] = [];
  const lines = markdown.split('\n');
  let currentTable: DatabaseTable | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    debug(`处理行: ${trimmedLine}`);
    if (trimmedLine.startsWith('db:')) {
      debug(`发现新表: ${trimmedLine}`);
      if (currentTable) {
        inferFieldTypes(currentTable);
        tables.push(currentTable);
      }
      currentTable = {
        name: trimmedLine.substring(3).trim(),
        fields: [],
        data: []
      };
    } else if (currentTable) {
      const cells = trimmedLine.split(',').map(cell => cell.trim());
      if (cells.length > 1) {
        if (currentTable.fields.length === 0) {
          debug(`设置字段: ${cells.join(', ')}`);
          currentTable.fields = cells.map(cell => ({ name: cell, type: 'string' }));
        } else {
          debug(`添加数据行: ${cells.join(', ')}`);
          currentTable.data.push(cells);
        }
      }
    }
  }

  if (currentTable) {
    inferFieldTypes(currentTable);
    tables.push(currentTable);
  }

  info(`解析完成，结果: ${JSON.stringify(tables).substring(0, 100)}...`);
  return tables;
}

function inferFieldTypes(table: DatabaseTable): void {
  if (table.data.length > 0) {
    table.fields = table.fields.map((field, index) => 
      inferFieldType(field.name, table.data[0][index])
    );
  }
}

function inferFieldType(fieldName: string, sampleData: string): DatabaseField {
  const lowerFieldName = fieldName.toLowerCase();
  let type: DatabaseFieldType = 'string';
  let unit: string | undefined;
  let sampleRate: number | undefined;
  let frequencyRange: [number, number] | undefined;
  let precision: number | undefined;
  let options: string[] | undefined;
  let format: string | undefined;
  let dimensions: number | undefined;
  let colorModel: 'RGB' | 'HSL' | 'CMYK' | undefined;

  if (lowerFieldName.includes('date') || lowerFieldName.includes('time')) {
    type = 'date';
    format = 'YYYY-MM-DD'; // 默认日期格式
  } else if (lowerFieldName.includes('price') || lowerFieldName.includes('amount')) {
    type = 'decimal';
    precision = 2;
    unit = lowerFieldName.includes('price') ? '$' : undefined;
  } else if (lowerFieldName.includes('quantity') || lowerFieldName.includes('number')) {
    type = 'number';
  } else if (lowerFieldName.includes('is') || lowerFieldName.includes('has')) {
    type = 'boolean';
  } else if (lowerFieldName.includes('category') || lowerFieldName.includes('type')) {
    type = 'category';
    options = []; // 这里可以根据实际情况设置选项
  } else if (lowerFieldName.includes('coordinate') || lowerFieldName.includes('location')) {
    type = 'geo';
  } else if (lowerFieldName.includes('series')) {
    type = 'timeseries';
  } else if (sampleData.startsWith('[') && sampleData.endsWith(']')) {
    if (sampleData.includes('[')) {
      type = 'matrix';
      dimensions = 2; // 假设是2D矩阵
    } else {
      type = 'vector';
      dimensions = sampleData.split(',').length;
    }
  } else if (sampleData.startsWith('{') && sampleData.endsWith('}')) {
    if (sampleData.includes('real') && sampleData.includes('imag')) {
      type = 'complex';
    } else if (sampleData.includes('value') && sampleData.includes('uncertainty')) {
      type = 'uncertainty';
    } else if (sampleData.includes('r') && sampleData.includes('g') && sampleData.includes('b')) {
      type = 'color';
      colorModel = 'RGB';
    } else {
      type = 'object';
    }
  } else if (lowerFieldName.includes('formula') || lowerFieldName.includes('equation')) {
    type = 'formula';
  } else if (lowerFieldName.includes('distribution')) {
    type = 'distribution';
  } else if (lowerFieldName.includes('spectrum')) {
    type = 'spectrum';
  } else if (lowerFieldName.includes('histogram')) {
    type = 'histogram';
  } else if (lowerFieldName.includes('tensor')) {
    type = 'tensor';
  } else if (lowerFieldName.includes('waveform')) {
    type = 'waveform';
  } else if (lowerFieldName.includes('graph')) {
    type = 'graph';
  } else if (lowerFieldName.includes('molecule')) {
    type = 'molecule';
  } else if (lowerFieldName.includes('sequence')) {
    type = 'sequence';
  } else if (lowerFieldName.includes('image')) {
    type = 'image';
  } else if (lowerFieldName.includes('function')) {
    type = 'function';
  } else if (lowerFieldName.includes('interval')) {
    type = 'interval';
  } else if (lowerFieldName.includes('fuzzy')) {
    type = 'fuzzy';
  } else if (lowerFieldName.includes('quaternion')) {
    type = 'quaternion';
  } else if (lowerFieldName.includes('polygon')) {
    type = 'polygon';
  } else if (lowerFieldName.includes('timedelta')) {
    type = 'timedelta';
  } else if (lowerFieldName.includes('currency')) {
    type = 'currency';
  } else if (lowerFieldName.includes('regex')) {
    type = 'regex';
  } else if (lowerFieldName.includes('url')) {
    type = 'url';
  } else if (lowerFieldName.includes('ip')) {
    type = 'ipaddress';
  } else if (lowerFieldName.includes('uuid')) {
    type = 'uuid';
  } else if (lowerFieldName.includes('version')) {
    type = 'version';
  } else if (lowerFieldName.includes('bitfield')) {
    type = 'bitfield';
  } else if (lowerFieldName.includes('enum')) {
    type = 'enum';
    options = []; // 这里可以根据实际情况设置选项
  } else if (lowerFieldName.includes('audio') || lowerFieldName.includes('signal')) {
    type = 'audio_signal';
    sampleRate = 44100; // 默认采样率
  } else if (lowerFieldName.includes('frequency_response')) {
    type = 'frequency_response';
    frequencyRange = [20, 20000]; // 默认人耳可听范围
  } else if (lowerFieldName.includes('impulse_response')) {
    type = 'impulse_response';
  } else if (lowerFieldName.includes('transfer_function')) {
    type = 'transfer_function';
  } else if (lowerFieldName.includes('spectrogram')) {
    type = 'spectrogram';
  } else if (lowerFieldName.includes('impedance')) {
    type = 'acoustic_impedance';
    unit = 'Pa·s/m';
  } else if (lowerFieldName.includes('reverberation')) {
    type = 'reverberation_time';
    unit = 's';
  } else if (lowerFieldName.includes('noise')) {
    type = 'noise_level';
    unit = 'dB';
  } else if (lowerFieldName.includes('spl') || lowerFieldName.includes('sound_pressure')) {
    type = 'sound_pressure_level';
    unit = 'dB';
  } else if (lowerFieldName.includes('directivity')) {
    type = 'directivity_pattern';
  }

  const field: DatabaseField = { name: fieldName, type };
  if (unit) field.unit = unit;
  if (sampleRate) field.sampleRate = sampleRate;
  if (frequencyRange) field.frequencyRange = frequencyRange;
  if (precision) field.precision = precision;
  if (options) field.options = options;
  if (format) field.format = format;
  if (dimensions) field.dimensions = dimensions;
  if (colorModel) field.colorModel = colorModel;

  return field;
}
