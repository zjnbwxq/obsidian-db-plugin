export interface DatabaseTable {
  name: string;
  fields: string[];
  data: string[][];
}

export function parseDatabase(markdown: string): DatabaseTable[] {
  console.log('开始解析数据库，输入内容:', markdown);
  const tables: DatabaseTable[] = [];
  const lines = markdown.split('\n');
  let currentTable: DatabaseTable | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    console.log('处理行:', trimmedLine);
    if (trimmedLine.startsWith('db:')) {
      console.log('发现新表:', trimmedLine);
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
          console.log('设置字段:', cells);
          currentTable.fields = cells;
        } else {
          console.log('添加数据行:', cells);
          currentTable.data.push(cells);
        }
      }
    }
  }

  if (currentTable) {
    tables.push(currentTable);
  }

  console.log('解析完成，结果:', tables);
  return tables;
}
