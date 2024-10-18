import { debug, info } from './utils/logger';

export interface DatabaseTable {
  name: string;
  fields: string[];
  data: string[][];
}

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
          currentTable.fields = cells;
        } else {
          debug(`添加数据行: ${cells.join(', ')}`);
          currentTable.data.push(cells);
        }
      }
    }
  }

  if (currentTable) {
    tables.push(currentTable);
  }

  info(`解析完成，结果: ${JSON.stringify(tables).substring(0, 100)}...`);
  return tables;
}
