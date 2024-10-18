import { debug, info } from './utils/logger';
import { DatabaseTable, DatabaseField, DatabaseFieldType } from './types';

export function parseDatabase(markdown: string): DatabaseTable[] {
  const tables: DatabaseTable[] = [];
  const lines = markdown.split('\n');
  let currentTable: DatabaseTable | null = null;
  let isParsingFields = false;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('db:')) {
      if (currentTable) {
        tables.push(currentTable);
      }
      currentTable = {
        name: trimmedLine.substring(3).trim(),
        fields: [],
        data: []
      };
      isParsingFields = true;
    } else if (currentTable) {
      const cells = trimmedLine.split(',').map(cell => cell.trim());
      if (isParsingFields) {
        // 解析字段类型
        currentTable!.fields = cells.map(cell => ({ name: '', type: cell as DatabaseFieldType }));
        isParsingFields = false;
      } else if (currentTable!.fields[0].name === '') {
        // 解析字段名称
        cells.forEach((cell, index) => {
          if (index < currentTable!.fields.length) {
            currentTable!.fields[index].name = cell;
          }
        });
      } else {
        // 解析数据行
        currentTable!.data.push(cells);
      }
    }
  }

  if (currentTable) {
    tables.push(currentTable);
  }

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
  } else if (lowerFieldName.includes('tensor')) {
    type = 'tensor';
  } else if (lowerFieldName.includes('graph')) {
    type = 'graph';
  } else if (lowerFieldName.includes('molecule')) {
    type = 'molecule';
  } else if (lowerFieldName.includes('sequence')) {
    type = 'sequence';
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
