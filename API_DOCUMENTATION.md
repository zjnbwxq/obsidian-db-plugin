# 数据库插件 API 文档

本文档详细说明了数据库插件提供的 API 功能,供其他插件或脚本使用。

## 获取插件实例

要使用数据库插件的 API,首先需要获取插件实例:

```javascript
const databasePlugin = app.plugins.plugins['simple-database'];
```

## API 方法

### getDatabaseData()

获取所有数据库表的数据。

**返回值:** `DatabaseTable[] | null`

**示例:**
```javascript
const allTables = databasePlugin.getDatabaseData();
```

### queryData(tableName: string, conditions: object)

根据条件查询指定表的数据。

**参数:**
- `tableName`: 表名
- `conditions`: 查询条件对象

**返回值:** `ComplexDataType[][] | null`

**示例:**
```javascript
const results = databasePlugin.queryData('员工表', { 部门: '技术部' });
```

### getTableSchema(tableName: string)

获取指定表的结构信息。

**参数:**
- `tableName`: 表名

**返回值:** `DatabaseField[] | null`

**示例:**
```javascript
const schema = databasePlugin.getTableSchema('产品表');
```

### onDataUpdate(callback: (updatedTables: string[]) => void)

注册数据更新事件的回调函数。

**参数:**
- `callback`: 当数据更新时调用的函数

**示例:**
```javascript
databasePlugin.onDataUpdate((updatedTables) => {
  console.log('更新的表:', updatedTables);
});
```

### getColumnStats(tableName: string, columnName: string)

获取指定列的统计信息。

**参数:**
- `tableName`: 表名
- `columnName`: 列名

**返回值:** 
```typescript
{
  min: number;
  max: number;
  average: number;
  median: number;
} | null
```

**示例:**
```javascript
const stats = databasePlugin.getColumnStats('销售表', '金额');
```

### getDataRange(tableName: string, columnName: string, start: number, end: number)

获取指定范围的数据。

**参数:**
- `tableName`: 表名
- `columnName`: 列名
- `start`: 起始索引
- `end`: 结束索引

**返回值:** `any[] | null`

**示例:**
```javascript
const rangeData = databasePlugin.getDataRange('日志表', '时间戳', 0, 100);
```

## 数据类型

API 方法中涉及的主要数据类型定义如下:

```typescript
interface DatabaseTable {
  name: string;
  fields: DatabaseField[];
  data: any[][];
}

interface DatabaseField {
  name: string;
  type: DatabaseFieldType;
  // ... 其他属性
}

type DatabaseFieldType = 'string' | 'number' | 'boolean' | 'date' | // ... 其他类型

interface ComplexDataType {
  type: DatabaseFieldType;
  value: any;
  metadata: Record<string, any>;
}
```

以下是所有支持的数据类型通过API解析后的内容结构:

1. 字符串 (string)
```typescript
{
  type: 'string',
  value: string,
  metadata: { 
    length: number 
  }
}
```

2. 数字 (number)
```typescript
{
  type: 'number',
  value: number,
  metadata: { 
    isInteger: boolean 
  }
}
```

3. 布尔值 (boolean)
```typescript
{
  type: 'boolean',
  value: boolean,
  metadata: {}
}
```

4. 日期 (date)
```typescript
{
  type: 'date',
  value: string,
  metadata: { 
    year: number,
    month: number,
    day: number,
    dayOfWeek: number
  }
}
```

5. 时间差 (timedelta)
```typescript
{
  type: 'timedelta',
  value: {
    amount: number,
    unit: string
  },
  metadata: {
    milliseconds: number
  }
}
```

6. 数组 (array)
```typescript
{
  type: 'array',
  value: any[],
  metadata: { 
    length: number 
  }
}
```

7. 对象 (object)
```typescript
{
  type: 'object',
  value: Record<string, string>,
  metadata: { 
    keys: string[],
    size: number
  }
}
```

8. 地理坐标 (geo)
```typescript
{
  type: 'geo',
  value: {
    lat: number,
    lng: number
  },
  metadata: { 
    latitude: number,
    longitude: number
  }
}
```

9. 多边形 (polygon)
```typescript
{
  type: 'polygon',
  value: Array<{ x: number, y: number }>,
  metadata: { 
    vertices: number,
    perimeter: number
  }
}
```

10. 向量 (vector)
```typescript
{
  type: 'vector',
  value: number[],
  metadata: { 
    dimensions: number,
    magnitude: number
  }
}
```

11. 矩阵 (matrix)
```typescript
{
  type: 'matrix',
  value: number[][],
  metadata: {
    rows: number,
    columns: number,
    isSquare: boolean
  }
}
```

12. 复数 (complex)
```typescript
{
  type: 'complex',
  value: {
    real: number,
    imag: number
  },
  metadata: {
    magnitude: number,
    phase: number
  }
}
```

13. 时间序列 (timeseries)
```typescript
{
  type: 'timeseries',
  value: Array<{ timestamp: number, value: number }>,
  metadata: {
    startTime: number,
    endTime: number,
    dataPoints: number
  }
}
```

14. 分子 (molecule)
```typescript
{
  type: 'molecule',
  value: {
    atoms: string,
    bonds: string
  },
  metadata: {
    atomCount: number,
    bondCount: number
  }
}
```

15. 化学式 (chemical_formula)
```typescript
{
  type: 'chemical_formula',
  value: string,
  metadata: {
    elements: string[],
    totalAtoms: number
  }
}
```

16. 化学反应 (reaction)
```typescript
{
  type: 'reaction',
  value: {
    reactants: string[],
    products: string[],
    conditions: string
  },
  metadata: {
    isBalanced: boolean
  }
}
```

17. 公式 (formula)
```typescript
{
  type: 'formula',
  value: string,
  metadata: {
    variables: string[]
  }
}
```

18. 分布 (distribution)
```typescript
{
  type: 'distribution',
  value: {
    type: string,
    params: Record<string, number>
  },
  metadata: {
    distributionType: string,
    parameterCount: number
  }
}
```

19. URL (url)
```typescript
{
  type: 'url',
  value: string,
  metadata: { 
    protocol: string,
    hostname: string,
    pathname: string
  }
}
```

20. 电子邮件 (email)
```typescript
{
  type: 'email',
  value: string,
  metadata: { 
    localPart: string, 
    domain: string 
  }
}
```

21. 电话号码 (phone)
```typescript
{
  type: 'phone',
  value: string,
  metadata: { 
    countryCode: string,
    number: string
  }
}
```

22. 标签 (tag)
```typescript
{
  type: 'tag',
  value: string,
  metadata: {}
}
```

23. 进度 (progress)
```typescript
{
  type: 'progress',
  value: number,
  metadata: { 
    percentage: number,
    isComplete: boolean
  }
}
```

24. 分类 (category)
```typescript
{
  type: 'category',
  value: string,
  metadata: {}
}
```

25. 二进制 (binary)
```typescript
{
  type: 'binary',
  value: string,
  metadata: { 
    length: number 
  }
}
```

26. 音频信号 (audio_signal)
```typescript
{
  type: 'audio_signal',
  value: {
    amplitude: number,
    frequency: number,
    duration: number
  },
  metadata: {
    maxAmplitude: number,
    period: number,
    wavelength: number
  }
}
```

27. 频率响应 (frequency_response)
```typescript
{
  type: 'frequency_response',
  value: Array<{ frequency: number, magnitude: number }>,
  metadata: {
    pointCount: number,
    minFrequency: number,
    maxFrequency: number,
    minMagnitude: number,
    maxMagnitude: number
  }
}
```

28. 声压级 (sound_pressure_level)
```typescript
{
  type: 'sound_pressure_level',
  value: number,
  metadata: {
    intensity: number, // W/m^2
    pressure: number // Pa
  }
}
```

## 注意事项

1. 在使用 API 之前,请确保数据库插件已经正确加载和初始化。
2. 某些 API 方法可能返回 `null`,请在使用时进行适当的空值检查。
3. 对于大型数据集,请考虑使用分页或范围查询以提高性能。

## 示例用法

以下是一个综合示例,展示了如何使用多个 API 方法:

```javascript
const databasePlugin = app.plugins.plugins['simple-database'];

// 获取所有表数据
const allTables = databasePlugin.getDatabaseData();
console.log('所有表:', allTables);

// 查询特定表的数据
const employeeData = databasePlugin.queryData('员工表', { 部门: '销售部' });
console.log('销售部员工:', employeeData);

// 获取表结构
const productSchema = databasePlugin.getTableSchema('产品表');
console.log('产品表结构:', productSchema);

// 注册数据更新回调
databasePlugin.onDataUpdate((updatedTables) => {
  console.log('数据已更新:', updatedTables);
});

// 获取列统计信息
const salaryStats = databasePlugin.getColumnStats('员工表', '薪资');
console.log('薪资统计:', salaryStats);

// 获取数据范围
const recentLogs = databasePlugin.getDataRange('日志表', '时间戳', 0, 50);
console.log('最近的日志:', recentLogs);
```

## 更新历史

- v1.0.0: 初始 API 发布
- v1.1.0: 添加 `getColumnStats` 和 `getDataRange` 方法
- v1.2.0: 增加对多种高级数据类型的支持

如有任何问题或建议,请联系插件作者或提交 issue。
