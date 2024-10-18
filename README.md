<div align="right">
  <a href="#Simple-Database">English</a> | <a href="#简单数据库">中文</a>
</div>

# Simple Database

This is a powerful Obsidian plugin for creating and managing complex databases, supporting various advanced data types.

## Key Features

- Parse database tables from Markdown files
- Independent view for displaying and managing databases
- Export to CSV and JSON formats
- Import CSV and JSON files
- Configurable default sort direction
- Provide API for other plugins to use
- Support multiple advanced data types, including scientific and acoustic related types
- Use virtual scrolling technology for smooth display of large amounts of data

## Supported Data Types

This plugin supports a variety of advanced data types, including but not limited to:

- Basic types: string, number, boolean, date
- Scientific types: vector, matrix, complex number, time series
- Geographic data: geographic coordinates, polygon
- Acoustic data: audio signal, frequency response, sound pressure level
- Chemical data: molecule, chemical formula, chemical reaction
- Others: URL, email, phone number, tag, progress, category

For detailed data type descriptions and usage methods, please refer to `DATA_TYPES_GUIDE.md`.

## Installation

1. Open Obsidian settings
2. Go to "Third-party plugins"
3. Disable safe mode
4. Click "Browse community plugins"
5. Search for "Database Plugin"
6. Click install
7. Enable the plugin

## Usage

### Creating a Database Table

In a Markdown file, use the following format to create a database table:

```
db:TableName
class,class,class
field1,field2,field3
value1,value2,value3
value4,value5,value6
```

### Viewing and Managing Databases

1. Open a Markdown file containing database tables
2. Use the command palette (Ctrl/Cmd + P) to execute the "Open Database View" command
3. Or click the database icon in the left sidebar

In the database view, you can:
- Export data to CSV or JSON format
- Import CSV or JSON files

## Settings

In the plugin settings, you can:
- Set the default sort direction
- Configure display formats for specific data types

## API Support

This plugin provides a rich API allowing other plugins or scripts to access and manipulate database data. For detailed API documentation, please refer to `API_DOCUMENTATION.md`.

Example:
```javascript
const databaseData = app.plugins.plugins['simple-database'].getDatabaseData();
```

## Custom Styling

This plugin provides rich CSS styles. You can customize the appearance of the database view by modifying the `styles.css` file.

## Developer Information

This project is developed using TypeScript and built with Rollup. If you want to contribute code or build it yourself, please follow these steps:

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the project

## FAQ

Q: How to use advanced data types?
A: When creating a table, using specific field names (such as "frequency_response" or "audio_signal") will automatically be recognized as the corresponding data type.

Q: How to edit data in the database?
A: Currently, you need to edit the data in the original Markdown file. We plan to add direct editing functionality in a future version.

## Feedback and Support

If you encounter any issues or have suggestions for improvement, please submit an issue in the GitHub repository.

## License

This plugin is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Changelog

### 1.1.0 (2024-10-19)
- Added support for multiple advanced data types
- Optimized data type recognition and display
- Improved import/export functionality to support new data types
- Implemented virtual scrolling for better performance with large datasets

### 1.0.1 (2024-10-18)
- Added API interface
- Added JSON import/export functionality

### 1.0.0 (2024-10-17)
- Initial release
- Basic database parsing and display functionality
- CSV import/export functionality

## Roadmap

- [ ] Add functionality to directly edit database content
- [ ] Add support for more advanced data types


Welcome for community contributions. If you have any ideas or suggestions, please feel free to raise an issue or submit a pull request.

---

<div align="right">
  <a href="#Simple-Database">English</a> | <a href="#简单数据库">中文</a>
</div>

# Simple Database

这是一个功能强大的 Obsidian 插件,用于创建和管理复杂数据库,支持多种高级数据类型。

## 主要特性

- 解析 Markdown 文件中的数据库表格
- 独立视图显示和管理数据库
- 导出为 CSV 和 JSON 格式
- 导入 CSV 和 JSON 文件
- 可配置默认排序方向
- 提供 API 接口供其他插件使用
- 支持多种高级数据类型,包括科学和声学相关类型
- 使用虚拟滚动技术,支持大量数据的流畅显示

## 支持的数据类型

本插件支持多种高级数据类型,包括但不限于:

- 基本类型: 字符串、数字、布尔值、日期
- 科学类型: 向量、矩阵、复数、时间序列
- 地理数据: 地理坐标、多边形
- 声学数据: 音频信号、频率响应、声压级
- 化学数据: 分子、化学式、化学反应
- 其他: URL、电子邮件、电话号码、标签、进度、分类

详细的数据类型说明和使用方法请参考 `DATA_TYPES_GUIDE.md`。

## 安装

1. 打开 Obsidian 设置
2. 进入"第三方插件"
3. 禁用安全模式
4. 点击"浏览社区插件"
5. 搜索"数据库插件"
6. 点击安装
7. 启用插件

## 使用方法

### 创建数据库表

在 Markdown 文件中,使用以下格式创建数据库表:

```
db:表名
定义，定义，定义
字段1,字段2,字段3
值1,值2,值3
值4,值5,值6
```

### 查看和管理数据库

1. 打开包含数据库表的 Markdown 文件
2. 使用命令面板(Ctrl/Cmd + P)执行"打开数据库视图"命令
3. 或点击左侧栏的数据库图标

在数据库视图中,您可以:
- 导出数据为 CSV 或 JSON 格式
- 导入 CSV 或 JSON 文件

## 设置

在插件设置中,您可以:
- 设置默认排序方向
- 配置特定数据类型的显示格式

## API 支持

本插件提供了丰富的 API,允许其他插件或脚本访问和操作数据库数据。详细的 API 文档请参考 `API_DOCUMENTATION.md`。

示例:
```javascript
const databaseData = app.plugins.plugins['simple-database'].getDatabaseData();
```

## 样式自定义

本插件提供了丰富的 CSS 样式,您可以通过修改 `styles.css` 文件来自定义数据库视图的外观。

## 开发者信息

本项目使用 TypeScript 开发,使用 Rollup 进行构建。如果您想贡献代码或自行构建,请参考以下步骤:

1. 克隆仓库
2. 运行 `npm install` 安装依赖
3. 运行 `npm run build` 构建项目

## 常见问题

Q: 如何使用高级数据类型？
A: 在创建表格时,使用特定的字段名称(如 "frequency_response" 或 "audio_signal")会自动识别为相应的数据类型。

Q: 如何编辑数据库中的数据？
A: 目前,需要在原始 Markdown 文件中编辑数据。我们计划在未来版本中添加直接编辑功能。

## 反馈与支持

如果您遇到任何问题或有改进建议,请在 GitHub 仓库中提交 issue。

## 许可证

本插件采用 MIT 许可证。详情请见 [LICENSE](LICENSE) 文件。

## 更新日志

### 1.1.0 (2024-10-19)
- 添加多种高级数据类型支持
- 优化数据类型识别和显示
- 改进导入导出功能以支持新数据类型
- 实现虚拟滚动,提高大数据量下的性能

### 1.0.1 (2024-10-18)
- 添加 API 接口
- 增加 JSON 导入导出功能

### 1.0.0 (2024-10-17)
- 初始发布
- 基本的数据库解析和显示功能
- CSV 导入导出功能

## 路线图

- [ ] 添加直接编辑数据库内容的功能
- [ ] 添加更多高级数据类型支持


欢迎社区贡献,如果您有任何想法或建议,请随时提出 issue 或提交 pull request。