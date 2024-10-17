export interface Translations {
  views: {
    databaseView: string;
  };
  commands: {
    parseCurrentFile: string;
    openDatabaseView: string;
  };
  settings: {
    pluginName: string;
    defaultSortDirection: string;
    defaultSortDirectionDesc: string;
    ascending: string;
    descending: string;
    language: string;
    languageDesc: string;
  };
  notices: {
    databaseViewUpdated: string;
    updateFailed: string;
    parseFailed: string;
    openMarkdownFile: string;
    databaseContentInserted: string;
    cannotInsertContent: string;
    tablesInserted: (count: number) => string;
    cannotParseImportedContent: string;
    databaseNoteCreated: (fileName: string) => string;
    createDatabaseNoteFailed: (errorMessage: string) => string;
    createDatabaseNoteFailedUnknown: string;
  };
  errors: {
    cannotCreateDatabaseView: string;
    invalidSetTablesData: string;
    noTablesToExport: string;
    createDatabaseNoteFailed: string;
  };
  logs: {
    pluginLoaded: string;
    pluginUnloaded: string;
    fileContentObtained: string;
    parsedTableData: string;
    updatingDatabaseView: string;
    databaseViewActivated: string;
    insertingContent: string;
  };
  controls: {
    allTables: string;
    exportCSV: string;
    importCSV: string;
    choose: string;
  };
  placeholders: {
    id: string;
    search: string;
  };
  messages: {
    noTablesFound: string;
  };
  modals: {
    chooseImportMethod: string;
    createNewFile: string;
    createNewFileDesc: string;
    insertIntoCurrentDocument: string;
    insertIntoCurrentDocumentDesc: string;
  };
}

const en: Translations = {
  views: {
    databaseView: "Database View",
  },
  commands: {
    parseCurrentFile: "Parse database in current file",
    openDatabaseView: "Open database view",
  },
  settings: {
    pluginName: "Database Plugin",
    defaultSortDirection: "Default Sort Direction",
    defaultSortDirectionDesc: "Set the default sort direction for tables",
    ascending: "Ascending",
    descending: "Descending",
    language: "Language",
    languageDesc: "Choose the plugin language",
  },
  notices: {
    databaseViewUpdated: "Database view updated",
    updateFailed: "Failed to update database view",
    parseFailed: "Failed to parse database, please check file format",
    openMarkdownFile: "Please open a Markdown file",
    databaseContentInserted: "Database content inserted",
    cannotInsertContent: "Cannot insert content",
    tablesInserted: (count) => `${count} table(s) inserted`,
    cannotParseImportedContent: "Cannot parse imported content",
    databaseNoteCreated: (fileName) => `Database note created: ${fileName}`,
    createDatabaseNoteFailed: (errorMessage) => `Failed to create database note: ${errorMessage}`,
    createDatabaseNoteFailedUnknown: "Failed to create database note due to an unknown error",
  },
  errors: {
    cannotCreateDatabaseView: "Cannot create database view",
    invalidSetTablesData: "Invalid data for setTables",
    noTablesToExport: "No tables to export",
    createDatabaseNoteFailed: "Failed to create database note",
  },
  logs: {
    pluginLoaded: "Database plugin loaded",
    pluginUnloaded: "Database plugin unloaded",
    fileContentObtained: "File content obtained:",
    parsedTableData: "Parsed table data:",
    updatingDatabaseView: "Updating database view",
    databaseViewActivated: "Database view activated:",
    insertingContent: "Inserting content:",
  },
  controls: {
    allTables: "All Tables",
    exportCSV: "Export CSV",
    importCSV: "Import CSV",
    choose: "Choose",
  },
  placeholders: {
    id: "ID",
    search: "Search...",
  },
  messages: {
    noTablesFound: "No tables found",
  },
  modals: {
    chooseImportMethod: "Choose Import Method",
    createNewFile: "Create New File",
    createNewFileDesc: "Create a new file with the imported content",
    insertIntoCurrentDocument: "Insert Into Current Document",
    insertIntoCurrentDocumentDesc: "Insert the imported content into the current document",
  },
};

const zhCN: Translations = {
  views: {
    databaseView: "数据库视图",
  },
  commands: {
    parseCurrentFile: "解析当前文件中的数据库",
    openDatabaseView: "打开数据库视图",
  },
  settings: {
    pluginName: "数据库插件",
    defaultSortDirection: "默认排序方向",
    defaultSortDirectionDesc: "设置表格的默认排序方向",
    ascending: "升序",
    descending: "降序",
    language: "语言",
    languageDesc: "选择插件语言",
  },
  notices: {
    databaseViewUpdated: "数据库视图已更新",
    updateFailed: "更新数据库视图失败",
    parseFailed: "解析数据库失败，请检查文件格式",
    openMarkdownFile: "请打开一个 Markdown 文件",
    databaseContentInserted: "数据库内容已插入",
    cannotInsertContent: "无法插入内容",
    tablesInserted: (count) => `已插入 ${count} 个表格`,
    cannotParseImportedContent: "无法解析导入的内容",
    databaseNoteCreated: (fileName) => `数据库笔记已创建：${fileName}`,
    createDatabaseNoteFailed: (errorMessage) => `创建数据库笔记失败：${errorMessage}`,
    createDatabaseNoteFailedUnknown: "由于未知错误，创建数据库笔记失败",
  },
  errors: {
    cannotCreateDatabaseView: "无法创建数据库视图",
    invalidSetTablesData: "setTables 的数据无效",
    noTablesToExport: "没有可导出的表格",
    createDatabaseNoteFailed: "创建数据库笔记失败",
  },
  logs: {
    pluginLoaded: "数据库插件已加载",
    pluginUnloaded: "数据库插件已卸载",
    fileContentObtained: "获取到的文件内容：",
    parsedTableData: "解析后的表格数据：",
    updatingDatabaseView: "正在更新数据库视图",
    databaseViewActivated: "数据库视图已激活：",
    insertingContent: "正在插入内容：",
  },
  controls: {
    allTables: "所有表格",
    exportCSV: "导出 CSV",
    importCSV: "导入 CSV",
    choose: "选择",
  },
  placeholders: {
    id: "ID",
    search: "搜索...",
  },
  messages: {
    noTablesFound: "未找到表格",
  },
  modals: {
    chooseImportMethod: "选择导入方式",
    createNewFile: "创建新文件",
    createNewFileDesc: "创建一个包含导入内容的新文件",
    insertIntoCurrentDocument: "插入到当前文档",
    insertIntoCurrentDocumentDesc: "将导入的内容插入到当前文档中",
  },
};

export const translations = {
  en,
  "zh-CN": zhCN,
};

export type LanguageCode = keyof typeof translations;
