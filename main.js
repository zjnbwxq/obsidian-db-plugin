'use strict';

var obsidian = require('obsidian');

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (LogLevel = {}));
let currentLogLevel = LogLevel.INFO;
function log(level, message) {
    if (level >= currentLogLevel) {
        const timestamp = new Date().toISOString();
        const levelName = LogLevel[level];
        console.log(`[${timestamp}] [${levelName}] ${message}`);
    }
}
function debug(message) {
    log(LogLevel.DEBUG, message);
}
function info(message) {
    log(LogLevel.INFO, message);
}
function warn(message) {
    log(LogLevel.WARN, message);
}
function error(message) {
    log(LogLevel.ERROR, message);
}

const DATABASE_VIEW_TYPE = 'database-view';
class DatabaseView extends obsidian.ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.tableStates = [];
        this.sortStates = new Map();
        this.tableElements = new Map();
        this.plugin = plugin;
    }
    getViewType() {
        return DATABASE_VIEW_TYPE;
    }
    getDisplayText() {
        return '数据库视图';
    }
    onOpen() {
        return __awaiter(this, void 0, void 0, function* () {
            this.renderView();
        });
    }
    setTables(tables) {
        if (Array.isArray(tables)) {
            this.tableStates = tables.map((table, index) => ({ table, id: index + 1, searchTerm: '' }));
            this.renderView();
        }
        else {
            error(`setTables 收到无效数据: ${JSON.stringify(tables).substring(0, 100)}...`);
        }
    }
    renderView() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('database-view-container');
        this.renderHeader(contentEl);
        this.renderTables(contentEl);
    }
    renderHeader(container) {
        const headerDiv = container.createEl('div', { cls: 'database-header' });
        headerDiv.createEl('h4', { text: '数据库视图' });
        const controlsDiv = headerDiv.createEl('div', { cls: 'database-controls' });
        this.renderExportControls(controlsDiv);
        this.renderImportControl(controlsDiv);
    }
    renderExportControls(container) {
        this.exportDropdown = new obsidian.DropdownComponent(container)
            .addOption('all', '所有表格')
            .onChange(() => {
            if (this.exportButton) {
                this.exportButton.setDisabled(false);
            }
        });
        this.tableStates.forEach((state, index) => {
            var _a;
            (_a = this.exportDropdown) === null || _a === void 0 ? void 0 : _a.addOption(`${index}`, `${state.table.name} (${state.id})`);
        });
        this.exportButton = new obsidian.ButtonComponent(container)
            .setButtonText('导出 CSV')
            .onClick(() => this.exportTablesToCSV())
            .setDisabled(true);
    }
    renderTables(container) {
        if (this.tableStates.length === 0) {
            container.createEl('p', { text: '还没有解析到任何数据库表' });
            return;
        }
        this.tableStates.forEach(this.renderTableContainer.bind(this));
    }
    renderTableContainer(tableState, index) {
        const { contentEl } = this;
        const { table, id, searchTerm } = tableState;
        const tableContainer = contentEl.createEl('div', { cls: 'table-container' });
        const tableHeader = tableContainer.createEl('div', { cls: 'table-header' });
        tableHeader.createEl('h5', { text: table.name });
        this.renderTableControls(tableHeader, tableState, index);
        const tableEl = this.renderTable(table);
        tableContainer.appendChild(tableEl);
        this.tableElements.set(table, tableEl);
    }
    renderTableControls(container, tableState, index) {
        new obsidian.TextComponent(container)
            .setPlaceholder('编号')
            .setValue(tableState.id.toString())
            .onChange(value => {
            this.tableStates[index].id = parseInt(value) || 0;
        })
            .inputEl.addClass('id-input');
        new obsidian.TextComponent(container)
            .setPlaceholder('搜...')
            .setValue(tableState.searchTerm)
            .onChange(value => {
            this.tableStates[index].searchTerm = value;
            this.updateTable(tableState.table);
        })
            .inputEl.addClass('search-input');
    }
    renderTable(table) {
        const tableEl = createEl('table', { cls: 'database-table' });
        this.renderTableHeader(tableEl, table);
        this.renderTableBody(tableEl, table);
        return tableEl;
    }
    renderTableHeader(tableEl, table) {
        const headerRow = tableEl.createEl('tr');
        table.fields.forEach(field => {
            const th = headerRow.createEl('th');
            th.createEl('span', { text: field, cls: 'column-name' });
            const sortIndicator = th.createEl('span', { cls: 'sort-indicator' });
            th.addEventListener('click', () => this.handleSort(table, field));
            this.updateSortIndicator(th, sortIndicator, table, field);
        });
    }
    updateSortIndicator(th, sortIndicator, table, field) {
        const sortState = this.sortStates.get(table);
        if (sortState && sortState.column === field) {
            th.addClass('sorted');
            th.addClass(sortState.direction);
            sortIndicator.setText(sortState.direction === 'asc' ? '▲' : '▼');
        }
        else {
            sortIndicator.setText('⇅');
        }
    }
    handleSort(table, column) {
        const currentSortState = this.sortStates.get(table);
        if (currentSortState && currentSortState.column === column) {
            currentSortState.direction = currentSortState.direction === 'asc' ? 'desc' : 'asc';
        }
        else {
            this.sortStates.set(table, { column, direction: 'asc' });
        }
        this.updateTable(table);
    }
    renderTableBody(tableEl, table) {
        const tbody = tableEl.createEl('tbody');
        const tableState = this.tableStates.find(state => state.table === table);
        if (!tableState)
            return;
        const filteredAndSortedData = this.getFilteredAndSortedData(table, tableState.searchTerm);
        filteredAndSortedData.forEach(row => {
            const rowEl = tbody.createEl('tr');
            row.forEach(cell => rowEl.createEl('td', { text: cell }));
        });
    }
    updateTable(table) {
        var _a;
        const tableEl = this.tableElements.get(table);
        if (!tableEl)
            return;
        (_a = tableEl.querySelector('tbody')) === null || _a === void 0 ? void 0 : _a.remove();
        this.renderTableBody(tableEl, table);
    }
    getFilteredAndSortedData(table, searchTerm) {
        let filteredData = this.filterData(table.data, searchTerm);
        return this.sortData(filteredData, table);
    }
    filterData(data, searchTerm) {
        if (!searchTerm)
            return data;
        const lowerSearchTerm = searchTerm.toLowerCase();
        return data.filter(row => row.some(cell => cell.toLowerCase().includes(lowerSearchTerm)));
    }
    sortData(data, table) {
        const sortState = this.sortStates.get(table);
        if (!sortState)
            return data;
        const columnIndex = table.fields.indexOf(sortState.column);
        if (columnIndex === -1)
            return data;
        return data.sort((a, b) => this.compareValues(a[columnIndex], b[columnIndex], sortState.direction));
    }
    compareValues(valueA, valueB, direction) {
        const numA = Number(valueA);
        const numB = Number(valueB);
        if (!isNaN(numA) && !isNaN(numB)) {
            return direction === 'asc' ? numA - numB : numB - numA;
        }
        return direction === 'asc'
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
    }
    exportTablesToCSV() {
        var _a;
        if (!this.exportDropdown)
            return;
        const selectedValue = this.exportDropdown.getValue();
        const tablesToExport = selectedValue === 'all'
            ? this.tableStates.map(state => state.table)
            : [(_a = this.tableStates[parseInt(selectedValue)]) === null || _a === void 0 ? void 0 : _a.table].filter(Boolean);
        if (tablesToExport.length === 0) {
            error('No tables to export');
            return;
        }
        const csvContent = tablesToExport.map(this.tableToCSV).join('\n\n');
        this.downloadCSV(csvContent, tablesToExport.length > 1 ? 'database_tables.csv' : `${tablesToExport[0].name}.csv`);
    }
    tableToCSV(table) {
        const headers = table.fields.join(',');
        const dataRows = table.data.map(row => row.map(cell => cell.includes(',') || cell.includes('"') || cell.includes('\n')
            ? `"${cell.replace(/"/g, '""')}"`
            : cell).join(','));
        return [table.name, headers, ...dataRows].join('\n');
    }
    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }
    importCSV() {
        return __awaiter(this, void 0, void 0, function* () {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.csv';
            fileInput.onchange = (e) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const file = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
                if (file) {
                    const content = yield this.readFileContent(file);
                    const parsedData = this.parseCSV(content);
                    const dbContent = this.convertToMarkdown(parsedData);
                    const choice = yield this.chooseImportMethod();
                    if (choice === 'new') {
                        yield this.createNewFileWithContent(file.name, dbContent);
                    }
                    else if (choice === 'insert') {
                        yield this.insertContentIntoCurrentFile(dbContent);
                    }
                }
            });
            fileInput.click();
        });
    }
    chooseImportMethod() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                const modal = new ImportMethodModal(this.app, (result) => {
                    resolve(result);
                });
                modal.open();
            });
        });
    }
    createNewFileWithContent(originalFileName, content) {
        return __awaiter(this, void 0, void 0, function* () {
            const folderPath = yield this.selectFolder();
            if (folderPath) {
                const tableName = originalFileName.replace('.csv', '');
                const fileName = `${tableName}.md`;
                try {
                    yield this.app.vault.create(`${folderPath}/${fileName}`, content);
                    new obsidian.Notice(`已创建数据库笔记: ${fileName}`);
                }
                catch (err) {
                    error(`创建数据库笔记时出错: ${err instanceof Error ? err.message : String(err)}`);
                    if (err instanceof Error) {
                        new obsidian.Notice(`创建数据库笔记失败: ${err.message}`);
                    }
                    else {
                        new obsidian.Notice('创建数据库笔记失败: 未知错误');
                    }
                }
            }
        });
    }
    insertContentIntoCurrentFile(content) {
        return __awaiter(this, void 0, void 0, function* () {
            const activeView = this.app.workspace.getActiveViewOfType(DatabaseView);
            if (activeView) {
                activeView.insertContent(content);
            }
            else {
                const markdownView = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
                if (markdownView) {
                    const editor = markdownView.editor;
                    const cursor = editor.getCursor();
                    editor.replaceRange(content + '\n\n', cursor);
                    new obsidian.Notice('已在当前 Markdown 文档中插入数据库内容');
                }
                else {
                    new obsidian.Notice('无法插入内容：没有打开的数据库视图或 Markdown 文档');
                }
            }
        });
    }
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => { var _a; return resolve((_a = e.target) === null || _a === void 0 ? void 0 : _a.result); };
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }
    parseCSV(content) {
        return content.split('\n').map(line => line.split(',').map(cell => cell.trim().replace(/^"(.*)"$/, '$1')));
    }
    convertToMarkdown(data) {
        const [header, ...rows] = data;
        const tableName = this.getTableNameFromFileName() || 'ImportedTable';
        let content = `db:${tableName}\n`;
        content += header.join(',') + '\n';
        rows.forEach(row => {
            content += row.join(',') + '\n';
        });
        return content.trim();
    }
    getTableNameFromFileName() {
        const file = this.app.workspace.getActiveFile();
        return file ? file.basename.replace('.csv', '') : null;
    }
    selectFolder() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                const modal = new FolderSuggestModal(this.app, (folder) => {
                    resolve(folder ? folder.path : null);
                });
                modal.open();
            });
        });
    }
    renderImportControl(container) {
        this.importButton = new obsidian.ButtonComponent(container)
            .setButtonText('导入 CSV')
            .onClick(() => this.importCSV());
    }
    insertContent(content) {
        debug(`Inserting content into DatabaseView: ${content.substring(0, 100)}...`);
        const newTables = this.parseCSVContent(content);
        if (newTables.length > 0) {
            newTables.forEach(newTable => {
                this.tableStates.push({
                    table: newTable,
                    id: Date.now(),
                    searchTerm: ''
                });
            });
            this.renderView();
            new obsidian.Notice(`已在数据库视图中插入 ${newTables.length} 个新表格`);
        }
        else {
            warn('无法解析导入的内容');
            new obsidian.Notice('无法解析导入的内容');
        }
    }
    parseCSVContent(content) {
        const lines = content.trim().split('\n');
        const tables = [];
        let currentTable = null;
        lines.forEach(line => {
            if (line.startsWith('db:')) {
                if (currentTable) {
                    tables.push(currentTable);
                }
                currentTable = {
                    name: line.slice(3).trim(),
                    fields: [],
                    data: []
                };
            }
            else if (currentTable) {
                if (currentTable.fields.length === 0) {
                    currentTable.fields = line.split(',').map(field => field.trim());
                }
                else {
                    currentTable.data.push(line.split(',').map(cell => cell.trim()));
                }
            }
        });
        if (currentTable) {
            tables.push(currentTable);
        }
        return tables;
    }
}
class FolderSuggestModal extends obsidian.FuzzySuggestModal {
    constructor(app, onChooseFolder) {
        super(app);
        this.onChooseFolder = onChooseFolder;
    }
    getItems() {
        return this.app.vault.getAllLoadedFiles()
            .filter((file) => file instanceof obsidian.TFolder);
    }
    getItemText(item) {
        return item.path;
    }
    onChooseItem(item, evt) {
        this.onChooseFolder(item);
    }
}
class ImportMethodModal extends obsidian.Modal {
    constructor(app, onChoose) {
        super(app);
        this.onChoose = onChoose;
        this.result = null;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: '选择导入方式' });
        new obsidian.Setting(contentEl)
            .setName('创建新文件')
            .setDesc('将导入的数据创建为新的 Markdown 文件')
            .addButton((btn) => btn.setButtonText('选择').onClick(() => {
            this.result = 'new';
            this.close();
        }));
        new obsidian.Setting(contentEl)
            .setName('插入到当前文档')
            .setDesc('将导入的数据插入到当前文档的光标位置')
            .addButton((btn) => btn.setButtonText('选择').onClick(() => {
            this.result = 'insert';
            this.close();
        }));
    }
    onClose() {
        this.onChoose(this.result);
    }
}

function parseDatabase(markdown) {
    debug(`开始解析数据库，输入内容: ${markdown.substring(0, 100)}...`);
    const tables = [];
    const lines = markdown.split('\n');
    let currentTable = null;
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
        }
        else if (currentTable) {
            const cells = trimmedLine.split(',').map(cell => cell.trim());
            if (cells.length > 1) {
                if (currentTable.fields.length === 0) {
                    debug(`设置字段: ${cells.join(', ')}`);
                    currentTable.fields = cells;
                }
                else {
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

const DEFAULT_SETTINGS = {
    defaultSortDirection: 'asc'
};
class DatabasePlugin extends obsidian.Plugin {
    constructor() {
        super(...arguments);
        this.databaseView = null;
        this.settings = DEFAULT_SETTINGS;
    }
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadSettings();
            info('加载数据库插件');
            this.registerView(DATABASE_VIEW_TYPE, (leaf) => new DatabaseView(leaf, this));
            this.addCommand({
                id: 'parse-current-file',
                name: '解析当前文件中的数据库',
                callback: () => this.parseAndUpdateView()
            });
            this.registerEvent(this.app.workspace.on('file-open', (file) => {
                if (file && file.extension === 'md') {
                    this.parseAndUpdateView();
                }
            }));
            this.registerEvent(this.app.vault.on('modify', (file) => {
                if (file instanceof obsidian.TFile && file.extension === 'md') {
                    this.parseAndUpdateView();
                }
            }));
            this.addRibbonIcon('database', '打开数据库视图', () => {
                this.activateView();
            });
            this.addCommand({
                id: 'open-database-view',
                name: '打开数据库视图',
                callback: () => this.activateView()
            });
            this.addSettingTab(new DatabasePluginSettingTab(this.app, this));
        });
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            const loadedData = yield this.loadData();
            const parsedData = loadedData ? JSON.parse(loadedData) : {};
            this.settings = Object.assign({}, DEFAULT_SETTINGS, parsedData);
        });
    }
    parseAndUpdateView() {
        return __awaiter(this, void 0, void 0, function* () {
            const activeView = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
            if (activeView) {
                const content = activeView.getViewData();
                debug(`获取到的文件内容: ${content}`);
                const tables = parseDatabase(content);
                debug(`解析后的表格数据: ${JSON.stringify(tables)}`);
                if (Array.isArray(tables) && tables.length > 0) {
                    yield this.activateView();
                    if (this.databaseView) {
                        info('更新数据库视图');
                        this.databaseView.setTables(tables);
                        new obsidian.Notice('数据库视图已更新');
                    }
                    else {
                        error('无法创建或获取数据库视图');
                        new obsidian.Notice('更新数据库视图失败');
                    }
                }
                else {
                    error(`解析结果无效: ${JSON.stringify(tables)}`);
                    new obsidian.Notice('解析数据库失败，请检查文件格式');
                }
            }
            else {
                new obsidian.Notice('请打开一个 Markdown 文件');
            }
        });
    }
    activateView() {
        return __awaiter(this, void 0, void 0, function* () {
            const { workspace } = this.app;
            let leaf = workspace.getLeavesOfType(DATABASE_VIEW_TYPE)[0];
            if (!leaf) {
                leaf = workspace.getRightLeaf(false);
                yield leaf.setViewState({ type: DATABASE_VIEW_TYPE, active: true });
            }
            workspace.revealLeaf(leaf);
            yield new Promise(resolve => setTimeout(resolve, 100));
            this.databaseView = leaf.view;
            info(`数据库视图已激活: ${this.databaseView ? 'success' : 'fail'}`);
            if (!this.databaseView) {
                error('激活数据库视图失败');
                new obsidian.Notice('无法创建数据库视图');
            }
        });
    }
    onunload() {
        info('卸载数据库插件');
    }
    saveData() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveSettings();
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveData(JSON.stringify(this.settings));
        });
    }
}
class DatabasePluginSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        let { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: '数据库插件设置' });
        new obsidian.Setting(containerEl)
            .setName('默认排序方向')
            .setDesc('设置表格的默认排序方向')
            .addDropdown(dropdown => dropdown
            .addOption('asc', '升序')
            .addOption('desc', '降序')
            .setValue(this.plugin.settings.defaultSortDirection)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.defaultSortDirection = value;
            yield this.plugin.saveSettings();
        })));
    }
}

module.exports = DatabasePlugin;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInNyYy91dGlscy9sb2dnZXIudHMiLCJzcmMvRGF0YWJhc2VWaWV3LnRzIiwic3JjL2RhdGFiYXNlUGFyc2VyLnRzIiwic3JjL21haW4udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG5Db3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi5cclxuXHJcblBlcm1pc3Npb24gdG8gdXNlLCBjb3B5LCBtb2RpZnksIGFuZC9vciBkaXN0cmlidXRlIHRoaXMgc29mdHdhcmUgZm9yIGFueVxyXG5wdXJwb3NlIHdpdGggb3Igd2l0aG91dCBmZWUgaXMgaGVyZWJ5IGdyYW50ZWQuXHJcblxyXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiIEFORCBUSEUgQVVUSE9SIERJU0NMQUlNUyBBTEwgV0FSUkFOVElFUyBXSVRIXHJcblJFR0FSRCBUTyBUSElTIFNPRlRXQVJFIElOQ0xVRElORyBBTEwgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWVxyXG5BTkQgRklUTkVTUy4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUiBCRSBMSUFCTEUgRk9SIEFOWSBTUEVDSUFMLCBESVJFQ1QsXHJcbklORElSRUNULCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVMgT1IgQU5ZIERBTUFHRVMgV0hBVFNPRVZFUiBSRVNVTFRJTkcgRlJPTVxyXG5MT1NTIE9GIFVTRSwgREFUQSBPUiBQUk9GSVRTLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgTkVHTElHRU5DRSBPUlxyXG5PVEhFUiBUT1JUSU9VUyBBQ1RJT04sIEFSSVNJTkcgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgVVNFIE9SXHJcblBFUkZPUk1BTkNFIE9GIFRISVMgU09GVFdBUkUuXHJcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqICovXHJcbi8qIGdsb2JhbCBSZWZsZWN0LCBQcm9taXNlLCBTdXBwcmVzc2VkRXJyb3IsIFN5bWJvbCwgSXRlcmF0b3IgKi9cclxuXHJcbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwgcCkpIGRbcF0gPSBiW3BdOyB9O1xyXG4gICAgcmV0dXJuIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHRlbmRzKGQsIGIpIHtcclxuICAgIGlmICh0eXBlb2YgYiAhPT0gXCJmdW5jdGlvblwiICYmIGIgIT09IG51bGwpXHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNsYXNzIGV4dGVuZHMgdmFsdWUgXCIgKyBTdHJpbmcoYikgKyBcIiBpcyBub3QgYSBjb25zdHJ1Y3RvciBvciBudWxsXCIpO1xyXG4gICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XHJcbiAgICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gX19hc3NpZ24odCkge1xyXG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpIHRbcF0gPSBzW3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH1cclxuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXN0KHMsIGUpIHtcclxuICAgIHZhciB0ID0ge307XHJcbiAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcclxuICAgICAgICB0W3BdID0gc1twXTtcclxuICAgIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChlLmluZGV4T2YocFtpXSkgPCAwICYmIE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChzLCBwW2ldKSlcclxuICAgICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xyXG4gICAgICAgIH1cclxuICAgIHJldHVybiB0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXNEZWNvcmF0ZShjdG9yLCBkZXNjcmlwdG9ySW4sIGRlY29yYXRvcnMsIGNvbnRleHRJbiwgaW5pdGlhbGl6ZXJzLCBleHRyYUluaXRpYWxpemVycykge1xyXG4gICAgZnVuY3Rpb24gYWNjZXB0KGYpIHsgaWYgKGYgIT09IHZvaWQgMCAmJiB0eXBlb2YgZiAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRnVuY3Rpb24gZXhwZWN0ZWRcIik7IHJldHVybiBmOyB9XHJcbiAgICB2YXIga2luZCA9IGNvbnRleHRJbi5raW5kLCBrZXkgPSBraW5kID09PSBcImdldHRlclwiID8gXCJnZXRcIiA6IGtpbmQgPT09IFwic2V0dGVyXCIgPyBcInNldFwiIDogXCJ2YWx1ZVwiO1xyXG4gICAgdmFyIHRhcmdldCA9ICFkZXNjcmlwdG9ySW4gJiYgY3RvciA/IGNvbnRleHRJbltcInN0YXRpY1wiXSA/IGN0b3IgOiBjdG9yLnByb3RvdHlwZSA6IG51bGw7XHJcbiAgICB2YXIgZGVzY3JpcHRvciA9IGRlc2NyaXB0b3JJbiB8fCAodGFyZ2V0ID8gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGNvbnRleHRJbi5uYW1lKSA6IHt9KTtcclxuICAgIHZhciBfLCBkb25lID0gZmFsc2U7XHJcbiAgICBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgIHZhciBjb250ZXh0ID0ge307XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4pIGNvbnRleHRbcF0gPSBwID09PSBcImFjY2Vzc1wiID8ge30gOiBjb250ZXh0SW5bcF07XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4uYWNjZXNzKSBjb250ZXh0LmFjY2Vzc1twXSA9IGNvbnRleHRJbi5hY2Nlc3NbcF07XHJcbiAgICAgICAgY29udGV4dC5hZGRJbml0aWFsaXplciA9IGZ1bmN0aW9uIChmKSB7IGlmIChkb25lKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGFkZCBpbml0aWFsaXplcnMgYWZ0ZXIgZGVjb3JhdGlvbiBoYXMgY29tcGxldGVkXCIpOyBleHRyYUluaXRpYWxpemVycy5wdXNoKGFjY2VwdChmIHx8IG51bGwpKTsgfTtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gKDAsIGRlY29yYXRvcnNbaV0pKGtpbmQgPT09IFwiYWNjZXNzb3JcIiA/IHsgZ2V0OiBkZXNjcmlwdG9yLmdldCwgc2V0OiBkZXNjcmlwdG9yLnNldCB9IDogZGVzY3JpcHRvcltrZXldLCBjb250ZXh0KTtcclxuICAgICAgICBpZiAoa2luZCA9PT0gXCJhY2Nlc3NvclwiKSB7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IHZvaWQgMCkgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IG51bGwgfHwgdHlwZW9mIHJlc3VsdCAhPT0gXCJvYmplY3RcIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBleHBlY3RlZFwiKTtcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmdldCkpIGRlc2NyaXB0b3IuZ2V0ID0gXztcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LnNldCkpIGRlc2NyaXB0b3Iuc2V0ID0gXztcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmluaXQpKSBpbml0aWFsaXplcnMudW5zaGlmdChfKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoXyA9IGFjY2VwdChyZXN1bHQpKSB7XHJcbiAgICAgICAgICAgIGlmIChraW5kID09PSBcImZpZWxkXCIpIGluaXRpYWxpemVycy51bnNoaWZ0KF8pO1xyXG4gICAgICAgICAgICBlbHNlIGRlc2NyaXB0b3Jba2V5XSA9IF87XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRhcmdldCkgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgY29udGV4dEluLm5hbWUsIGRlc2NyaXB0b3IpO1xyXG4gICAgZG9uZSA9IHRydWU7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19ydW5Jbml0aWFsaXplcnModGhpc0FyZywgaW5pdGlhbGl6ZXJzLCB2YWx1ZSkge1xyXG4gICAgdmFyIHVzZVZhbHVlID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGluaXRpYWxpemVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhbHVlID0gdXNlVmFsdWUgPyBpbml0aWFsaXplcnNbaV0uY2FsbCh0aGlzQXJnLCB2YWx1ZSkgOiBpbml0aWFsaXplcnNbaV0uY2FsbCh0aGlzQXJnKTtcclxuICAgIH1cclxuICAgIHJldHVybiB1c2VWYWx1ZSA/IHZhbHVlIDogdm9pZCAwO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcHJvcEtleSh4KSB7XHJcbiAgICByZXR1cm4gdHlwZW9mIHggPT09IFwic3ltYm9sXCIgPyB4IDogXCJcIi5jb25jYXQoeCk7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zZXRGdW5jdGlvbk5hbWUoZiwgbmFtZSwgcHJlZml4KSB7XHJcbiAgICBpZiAodHlwZW9mIG5hbWUgPT09IFwic3ltYm9sXCIpIG5hbWUgPSBuYW1lLmRlc2NyaXB0aW9uID8gXCJbXCIuY29uY2F0KG5hbWUuZGVzY3JpcHRpb24sIFwiXVwiKSA6IFwiXCI7XHJcbiAgICByZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnR5KGYsIFwibmFtZVwiLCB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSwgdmFsdWU6IHByZWZpeCA/IFwiXCIuY29uY2F0KHByZWZpeCwgXCIgXCIsIG5hbWUpIDogbmFtZSB9KTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX21ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKSB7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QubWV0YWRhdGEgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIFJlZmxlY3QubWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdGVyKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XHJcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cclxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZ2VuZXJhdG9yKHRoaXNBcmcsIGJvZHkpIHtcclxuICAgIHZhciBfID0geyBsYWJlbDogMCwgc2VudDogZnVuY3Rpb24oKSB7IGlmICh0WzBdICYgMSkgdGhyb3cgdFsxXTsgcmV0dXJuIHRbMV07IH0sIHRyeXM6IFtdLCBvcHM6IFtdIH0sIGYsIHksIHQsIGcgPSBPYmplY3QuY3JlYXRlKCh0eXBlb2YgSXRlcmF0b3IgPT09IFwiZnVuY3Rpb25cIiA/IEl0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpO1xyXG4gICAgcmV0dXJuIGcubmV4dCA9IHZlcmIoMCksIGdbXCJ0aHJvd1wiXSA9IHZlcmIoMSksIGdbXCJyZXR1cm5cIl0gPSB2ZXJiKDIpLCB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgKGdbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSksIGc7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgcmV0dXJuIGZ1bmN0aW9uICh2KSB7IHJldHVybiBzdGVwKFtuLCB2XSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHN0ZXAob3ApIHtcclxuICAgICAgICBpZiAoZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7XHJcbiAgICAgICAgd2hpbGUgKGcgJiYgKGcgPSAwLCBvcFswXSAmJiAoXyA9IDApKSwgXykgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKGYgPSAxLCB5ICYmICh0ID0gb3BbMF0gJiAyID8geVtcInJldHVyblwiXSA6IG9wWzBdID8geVtcInRocm93XCJdIHx8ICgodCA9IHlbXCJyZXR1cm5cIl0pICYmIHQuY2FsbCh5KSwgMCkgOiB5Lm5leHQpICYmICEodCA9IHQuY2FsbCh5LCBvcFsxXSkpLmRvbmUpIHJldHVybiB0O1xyXG4gICAgICAgICAgICBpZiAoeSA9IDAsIHQpIG9wID0gW29wWzBdICYgMiwgdC52YWx1ZV07XHJcbiAgICAgICAgICAgIHN3aXRjaCAob3BbMF0pIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgMDogY2FzZSAxOiB0ID0gb3A7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA0OiBfLmxhYmVsKys7IHJldHVybiB7IHZhbHVlOiBvcFsxXSwgZG9uZTogZmFsc2UgfTtcclxuICAgICAgICAgICAgICAgIGNhc2UgNTogXy5sYWJlbCsrOyB5ID0gb3BbMV07IG9wID0gWzBdOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGNhc2UgNzogb3AgPSBfLm9wcy5wb3AoKTsgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEodCA9IF8udHJ5cywgdCA9IHQubGVuZ3RoID4gMCAmJiB0W3QubGVuZ3RoIC0gMV0pICYmIChvcFswXSA9PT0gNiB8fCBvcFswXSA9PT0gMikpIHsgXyA9IDA7IGNvbnRpbnVlOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSAzICYmICghdCB8fCAob3BbMV0gPiB0WzBdICYmIG9wWzFdIDwgdFszXSkpKSB7IF8ubGFiZWwgPSBvcFsxXTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDYgJiYgXy5sYWJlbCA8IHRbMV0pIHsgXy5sYWJlbCA9IHRbMV07IHQgPSBvcDsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodCAmJiBfLmxhYmVsIDwgdFsyXSkgeyBfLmxhYmVsID0gdFsyXTsgXy5vcHMucHVzaChvcCk7IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRbMl0pIF8ub3BzLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIF8udHJ5cy5wb3AoKTsgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgb3AgPSBib2R5LmNhbGwodGhpc0FyZywgXyk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkgeyBvcCA9IFs2LCBlXTsgeSA9IDA7IH0gZmluYWxseSB7IGYgPSB0ID0gMDsgfVxyXG4gICAgICAgIGlmIChvcFswXSAmIDUpIHRocm93IG9wWzFdOyByZXR1cm4geyB2YWx1ZTogb3BbMF0gPyBvcFsxXSA6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fY3JlYXRlQmluZGluZyA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobSwgayk7XHJcbiAgICBpZiAoIWRlc2MgfHwgKFwiZ2V0XCIgaW4gZGVzYyA/ICFtLl9fZXNNb2R1bGUgOiBkZXNjLndyaXRhYmxlIHx8IGRlc2MuY29uZmlndXJhYmxlKSkge1xyXG4gICAgICAgIGRlc2MgPSB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH07XHJcbiAgICB9XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIGRlc2MpO1xyXG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIG9bazJdID0gbVtrXTtcclxufSk7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHBvcnRTdGFyKG0sIG8pIHtcclxuICAgIGZvciAodmFyIHAgaW4gbSkgaWYgKHAgIT09IFwiZGVmYXVsdFwiICYmICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobywgcCkpIF9fY3JlYXRlQmluZGluZyhvLCBtLCBwKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fdmFsdWVzKG8pIHtcclxuICAgIHZhciBzID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIFN5bWJvbC5pdGVyYXRvciwgbSA9IHMgJiYgb1tzXSwgaSA9IDA7XHJcbiAgICBpZiAobSkgcmV0dXJuIG0uY2FsbChvKTtcclxuICAgIGlmIChvICYmIHR5cGVvZiBvLmxlbmd0aCA9PT0gXCJudW1iZXJcIikgcmV0dXJuIHtcclxuICAgICAgICBuZXh0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmIChvICYmIGkgPj0gby5sZW5ndGgpIG8gPSB2b2lkIDA7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiBvICYmIG9baSsrXSwgZG9uZTogIW8gfTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihzID8gXCJPYmplY3QgaXMgbm90IGl0ZXJhYmxlLlwiIDogXCJTeW1ib2wuaXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZWFkKG8sIG4pIHtcclxuICAgIHZhciBtID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9bU3ltYm9sLml0ZXJhdG9yXTtcclxuICAgIGlmICghbSkgcmV0dXJuIG87XHJcbiAgICB2YXIgaSA9IG0uY2FsbChvKSwgciwgYXIgPSBbXSwgZTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgd2hpbGUgKChuID09PSB2b2lkIDAgfHwgbi0tID4gMCkgJiYgIShyID0gaS5uZXh0KCkpLmRvbmUpIGFyLnB1c2goci52YWx1ZSk7XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZXJyb3IpIHsgZSA9IHsgZXJyb3I6IGVycm9yIH07IH1cclxuICAgIGZpbmFsbHkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChyICYmICFyLmRvbmUgJiYgKG0gPSBpW1wicmV0dXJuXCJdKSkgbS5jYWxsKGkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmaW5hbGx5IHsgaWYgKGUpIHRocm93IGUuZXJyb3I7IH1cclxuICAgIH1cclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuLyoqIEBkZXByZWNhdGVkICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZCgpIHtcclxuICAgIGZvciAodmFyIGFyID0gW10sIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgIGFyID0gYXIuY29uY2F0KF9fcmVhZChhcmd1bWVudHNbaV0pKTtcclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuLyoqIEBkZXByZWNhdGVkICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZEFycmF5cygpIHtcclxuICAgIGZvciAodmFyIHMgPSAwLCBpID0gMCwgaWwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgaWw7IGkrKykgcyArPSBhcmd1bWVudHNbaV0ubGVuZ3RoO1xyXG4gICAgZm9yICh2YXIgciA9IEFycmF5KHMpLCBrID0gMCwgaSA9IDA7IGkgPCBpbDsgaSsrKVxyXG4gICAgICAgIGZvciAodmFyIGEgPSBhcmd1bWVudHNbaV0sIGogPSAwLCBqbCA9IGEubGVuZ3RoOyBqIDwgamw7IGorKywgaysrKVxyXG4gICAgICAgICAgICByW2tdID0gYVtqXTtcclxuICAgIHJldHVybiByO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheSh0bywgZnJvbSwgcGFjaykge1xyXG4gICAgaWYgKHBhY2sgfHwgYXJndW1lbnRzLmxlbmd0aCA9PT0gMikgZm9yICh2YXIgaSA9IDAsIGwgPSBmcm9tLmxlbmd0aCwgYXI7IGkgPCBsOyBpKyspIHtcclxuICAgICAgICBpZiAoYXIgfHwgIShpIGluIGZyb20pKSB7XHJcbiAgICAgICAgICAgIGlmICghYXIpIGFyID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZnJvbSwgMCwgaSk7XHJcbiAgICAgICAgICAgIGFyW2ldID0gZnJvbVtpXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdG8uY29uY2F0KGFyIHx8IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZyb20pKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXQodikge1xyXG4gICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfX2F3YWl0ID8gKHRoaXMudiA9IHYsIHRoaXMpIDogbmV3IF9fYXdhaXQodik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jR2VuZXJhdG9yKHRoaXNBcmcsIF9hcmd1bWVudHMsIGdlbmVyYXRvcikge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBnID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pLCBpLCBxID0gW107XHJcbiAgICByZXR1cm4gaSA9IE9iamVjdC5jcmVhdGUoKHR5cGVvZiBBc3luY0l0ZXJhdG9yID09PSBcImZ1bmN0aW9uXCIgPyBBc3luY0l0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpLCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIsIGF3YWl0UmV0dXJuKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gYXdhaXRSZXR1cm4oZikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh2KS50aGVuKGYsIHJlamVjdCk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpZiAoZ1tuXSkgeyBpW25dID0gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChhLCBiKSB7IHEucHVzaChbbiwgdiwgYSwgYl0pID4gMSB8fCByZXN1bWUobiwgdik7IH0pOyB9OyBpZiAoZikgaVtuXSA9IGYoaVtuXSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gcmVzdW1lKG4sIHYpIHsgdHJ5IHsgc3RlcChnW25dKHYpKTsgfSBjYXRjaCAoZSkgeyBzZXR0bGUocVswXVszXSwgZSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gc3RlcChyKSB7IHIudmFsdWUgaW5zdGFuY2VvZiBfX2F3YWl0ID8gUHJvbWlzZS5yZXNvbHZlKHIudmFsdWUudikudGhlbihmdWxmaWxsLCByZWplY3QpIDogc2V0dGxlKHFbMF1bMl0sIHIpOyB9XHJcbiAgICBmdW5jdGlvbiBmdWxmaWxsKHZhbHVlKSB7IHJlc3VtZShcIm5leHRcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiByZWplY3QodmFsdWUpIHsgcmVzdW1lKFwidGhyb3dcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUoZiwgdikgeyBpZiAoZih2KSwgcS5zaGlmdCgpLCBxLmxlbmd0aCkgcmVzdW1lKHFbMF1bMF0sIHFbMF1bMV0pOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jRGVsZWdhdG9yKG8pIHtcclxuICAgIHZhciBpLCBwO1xyXG4gICAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiLCBmdW5jdGlvbiAoZSkgeyB0aHJvdyBlOyB9KSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpW25dID0gb1tuXSA/IGZ1bmN0aW9uICh2KSB7IHJldHVybiAocCA9ICFwKSA/IHsgdmFsdWU6IF9fYXdhaXQob1tuXSh2KSksIGRvbmU6IGZhbHNlIH0gOiBmID8gZih2KSA6IHY7IH0gOiBmOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jVmFsdWVzKG8pIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xyXG4gICAgcmV0dXJuIG0gPyBtLmNhbGwobykgOiAobyA9IHR5cGVvZiBfX3ZhbHVlcyA9PT0gXCJmdW5jdGlvblwiID8gX192YWx1ZXMobykgOiBvW1N5bWJvbC5pdGVyYXRvcl0oKSwgaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGkpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IGlbbl0gPSBvW25dICYmIGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IHYgPSBvW25dKHYpLCBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCB2LmRvbmUsIHYudmFsdWUpOyB9KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tYWtlVGVtcGxhdGVPYmplY3QoY29va2VkLCByYXcpIHtcclxuICAgIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvb2tlZCwgXCJyYXdcIiwgeyB2YWx1ZTogcmF3IH0pOyB9IGVsc2UgeyBjb29rZWQucmF3ID0gcmF3OyB9XHJcbiAgICByZXR1cm4gY29va2VkO1xyXG59O1xyXG5cclxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xyXG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydFN0YXIobW9kKSB7XHJcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKGsgIT09IFwiZGVmYXVsdFwiICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xyXG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydERlZmF1bHQobW9kKSB7XHJcbiAgICByZXR1cm4gKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgPyBtb2QgOiB7IGRlZmF1bHQ6IG1vZCB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZEdldChyZWNlaXZlciwgc3RhdGUsIGtpbmQsIGYpIHtcclxuICAgIGlmIChraW5kID09PSBcImFcIiAmJiAhZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByaXZhdGUgYWNjZXNzb3Igd2FzIGRlZmluZWQgd2l0aG91dCBhIGdldHRlclwiKTtcclxuICAgIGlmICh0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyICE9PSBzdGF0ZSB8fCAhZiA6ICFzdGF0ZS5oYXMocmVjZWl2ZXIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHJlYWQgcHJpdmF0ZSBtZW1iZXIgZnJvbSBhbiBvYmplY3Qgd2hvc2UgY2xhc3MgZGlkIG5vdCBkZWNsYXJlIGl0XCIpO1xyXG4gICAgcmV0dXJuIGtpbmQgPT09IFwibVwiID8gZiA6IGtpbmQgPT09IFwiYVwiID8gZi5jYWxsKHJlY2VpdmVyKSA6IGYgPyBmLnZhbHVlIDogc3RhdGUuZ2V0KHJlY2VpdmVyKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRTZXQocmVjZWl2ZXIsIHN0YXRlLCB2YWx1ZSwga2luZCwgZikge1xyXG4gICAgaWYgKGtpbmQgPT09IFwibVwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBtZXRob2QgaXMgbm90IHdyaXRhYmxlXCIpO1xyXG4gICAgaWYgKGtpbmQgPT09IFwiYVwiICYmICFmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBhY2Nlc3NvciB3YXMgZGVmaW5lZCB3aXRob3V0IGEgc2V0dGVyXCIpO1xyXG4gICAgaWYgKHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgIT09IHN0YXRlIHx8ICFmIDogIXN0YXRlLmhhcyhyZWNlaXZlcikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3Qgd3JpdGUgcHJpdmF0ZSBtZW1iZXIgdG8gYW4gb2JqZWN0IHdob3NlIGNsYXNzIGRpZCBub3QgZGVjbGFyZSBpdFwiKTtcclxuICAgIHJldHVybiAoa2luZCA9PT0gXCJhXCIgPyBmLmNhbGwocmVjZWl2ZXIsIHZhbHVlKSA6IGYgPyBmLnZhbHVlID0gdmFsdWUgOiBzdGF0ZS5zZXQocmVjZWl2ZXIsIHZhbHVlKSksIHZhbHVlO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZEluKHN0YXRlLCByZWNlaXZlcikge1xyXG4gICAgaWYgKHJlY2VpdmVyID09PSBudWxsIHx8ICh0eXBlb2YgcmVjZWl2ZXIgIT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHJlY2VpdmVyICE9PSBcImZ1bmN0aW9uXCIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHVzZSAnaW4nIG9wZXJhdG9yIG9uIG5vbi1vYmplY3RcIik7XHJcbiAgICByZXR1cm4gdHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciA9PT0gc3RhdGUgOiBzdGF0ZS5oYXMocmVjZWl2ZXIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hZGREaXNwb3NhYmxlUmVzb3VyY2UoZW52LCB2YWx1ZSwgYXN5bmMpIHtcclxuICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdm9pZCAwKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgdmFsdWUgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBleHBlY3RlZC5cIik7XHJcbiAgICAgICAgdmFyIGRpc3Bvc2UsIGlubmVyO1xyXG4gICAgICAgIGlmIChhc3luYykge1xyXG4gICAgICAgICAgICBpZiAoIVN5bWJvbC5hc3luY0Rpc3Bvc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNEaXNwb3NlIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgICAgICAgICAgZGlzcG9zZSA9IHZhbHVlW1N5bWJvbC5hc3luY0Rpc3Bvc2VdO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoZGlzcG9zZSA9PT0gdm9pZCAwKSB7XHJcbiAgICAgICAgICAgIGlmICghU3ltYm9sLmRpc3Bvc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuZGlzcG9zZSBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICAgICAgICAgIGRpc3Bvc2UgPSB2YWx1ZVtTeW1ib2wuZGlzcG9zZV07XHJcbiAgICAgICAgICAgIGlmIChhc3luYykgaW5uZXIgPSBkaXNwb3NlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodHlwZW9mIGRpc3Bvc2UgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBub3QgZGlzcG9zYWJsZS5cIik7XHJcbiAgICAgICAgaWYgKGlubmVyKSBkaXNwb3NlID0gZnVuY3Rpb24oKSB7IHRyeSB7IGlubmVyLmNhbGwodGhpcyk7IH0gY2F0Y2ggKGUpIHsgcmV0dXJuIFByb21pc2UucmVqZWN0KGUpOyB9IH07XHJcbiAgICAgICAgZW52LnN0YWNrLnB1c2goeyB2YWx1ZTogdmFsdWUsIGRpc3Bvc2U6IGRpc3Bvc2UsIGFzeW5jOiBhc3luYyB9KTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGFzeW5jKSB7XHJcbiAgICAgICAgZW52LnN0YWNrLnB1c2goeyBhc3luYzogdHJ1ZSB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiB2YWx1ZTtcclxuXHJcbn1cclxuXHJcbnZhciBfU3VwcHJlc3NlZEVycm9yID0gdHlwZW9mIFN1cHByZXNzZWRFcnJvciA9PT0gXCJmdW5jdGlvblwiID8gU3VwcHJlc3NlZEVycm9yIDogZnVuY3Rpb24gKGVycm9yLCBzdXBwcmVzc2VkLCBtZXNzYWdlKSB7XHJcbiAgICB2YXIgZSA9IG5ldyBFcnJvcihtZXNzYWdlKTtcclxuICAgIHJldHVybiBlLm5hbWUgPSBcIlN1cHByZXNzZWRFcnJvclwiLCBlLmVycm9yID0gZXJyb3IsIGUuc3VwcHJlc3NlZCA9IHN1cHByZXNzZWQsIGU7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kaXNwb3NlUmVzb3VyY2VzKGVudikge1xyXG4gICAgZnVuY3Rpb24gZmFpbChlKSB7XHJcbiAgICAgICAgZW52LmVycm9yID0gZW52Lmhhc0Vycm9yID8gbmV3IF9TdXBwcmVzc2VkRXJyb3IoZSwgZW52LmVycm9yLCBcIkFuIGVycm9yIHdhcyBzdXBwcmVzc2VkIGR1cmluZyBkaXNwb3NhbC5cIikgOiBlO1xyXG4gICAgICAgIGVudi5oYXNFcnJvciA9IHRydWU7XHJcbiAgICB9XHJcbiAgICB2YXIgciwgcyA9IDA7XHJcbiAgICBmdW5jdGlvbiBuZXh0KCkge1xyXG4gICAgICAgIHdoaWxlIChyID0gZW52LnN0YWNrLnBvcCgpKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXIuYXN5bmMgJiYgcyA9PT0gMSkgcmV0dXJuIHMgPSAwLCBlbnYuc3RhY2sucHVzaChyKSwgUHJvbWlzZS5yZXNvbHZlKCkudGhlbihuZXh0KTtcclxuICAgICAgICAgICAgICAgIGlmIChyLmRpc3Bvc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gci5kaXNwb3NlLmNhbGwoci52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHIuYXN5bmMpIHJldHVybiBzIHw9IDIsIFByb21pc2UucmVzb2x2ZShyZXN1bHQpLnRoZW4obmV4dCwgZnVuY3Rpb24oZSkgeyBmYWlsKGUpOyByZXR1cm4gbmV4dCgpOyB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgcyB8PSAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICBmYWlsKGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChzID09PSAxKSByZXR1cm4gZW52Lmhhc0Vycm9yID8gUHJvbWlzZS5yZWplY3QoZW52LmVycm9yKSA6IFByb21pc2UucmVzb2x2ZSgpO1xyXG4gICAgICAgIGlmIChlbnYuaGFzRXJyb3IpIHRocm93IGVudi5lcnJvcjtcclxuICAgIH1cclxuICAgIHJldHVybiBuZXh0KCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3Jld3JpdGVSZWxhdGl2ZUltcG9ydEV4dGVuc2lvbihwYXRoLCBwcmVzZXJ2ZUpzeCkge1xyXG4gICAgaWYgKHR5cGVvZiBwYXRoID09PSBcInN0cmluZ1wiICYmIC9eXFwuXFwuP1xcLy8udGVzdChwYXRoKSkge1xyXG4gICAgICAgIHJldHVybiBwYXRoLnJlcGxhY2UoL1xcLih0c3gpJHwoKD86XFwuZCk/KSgoPzpcXC5bXi4vXSs/KT8pXFwuKFtjbV0/KXRzJC9pLCBmdW5jdGlvbiAobSwgdHN4LCBkLCBleHQsIGNtKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0c3ggPyBwcmVzZXJ2ZUpzeCA/IFwiLmpzeFwiIDogXCIuanNcIiA6IGQgJiYgKCFleHQgfHwgIWNtKSA/IG0gOiAoZCArIGV4dCArIFwiLlwiICsgY20udG9Mb3dlckNhc2UoKSArIFwianNcIik7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcGF0aDtcclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQge1xyXG4gICAgX19leHRlbmRzOiBfX2V4dGVuZHMsXHJcbiAgICBfX2Fzc2lnbjogX19hc3NpZ24sXHJcbiAgICBfX3Jlc3Q6IF9fcmVzdCxcclxuICAgIF9fZGVjb3JhdGU6IF9fZGVjb3JhdGUsXHJcbiAgICBfX3BhcmFtOiBfX3BhcmFtLFxyXG4gICAgX19lc0RlY29yYXRlOiBfX2VzRGVjb3JhdGUsXHJcbiAgICBfX3J1bkluaXRpYWxpemVyczogX19ydW5Jbml0aWFsaXplcnMsXHJcbiAgICBfX3Byb3BLZXk6IF9fcHJvcEtleSxcclxuICAgIF9fc2V0RnVuY3Rpb25OYW1lOiBfX3NldEZ1bmN0aW9uTmFtZSxcclxuICAgIF9fbWV0YWRhdGE6IF9fbWV0YWRhdGEsXHJcbiAgICBfX2F3YWl0ZXI6IF9fYXdhaXRlcixcclxuICAgIF9fZ2VuZXJhdG9yOiBfX2dlbmVyYXRvcixcclxuICAgIF9fY3JlYXRlQmluZGluZzogX19jcmVhdGVCaW5kaW5nLFxyXG4gICAgX19leHBvcnRTdGFyOiBfX2V4cG9ydFN0YXIsXHJcbiAgICBfX3ZhbHVlczogX192YWx1ZXMsXHJcbiAgICBfX3JlYWQ6IF9fcmVhZCxcclxuICAgIF9fc3ByZWFkOiBfX3NwcmVhZCxcclxuICAgIF9fc3ByZWFkQXJyYXlzOiBfX3NwcmVhZEFycmF5cyxcclxuICAgIF9fc3ByZWFkQXJyYXk6IF9fc3ByZWFkQXJyYXksXHJcbiAgICBfX2F3YWl0OiBfX2F3YWl0LFxyXG4gICAgX19hc3luY0dlbmVyYXRvcjogX19hc3luY0dlbmVyYXRvcixcclxuICAgIF9fYXN5bmNEZWxlZ2F0b3I6IF9fYXN5bmNEZWxlZ2F0b3IsXHJcbiAgICBfX2FzeW5jVmFsdWVzOiBfX2FzeW5jVmFsdWVzLFxyXG4gICAgX19tYWtlVGVtcGxhdGVPYmplY3Q6IF9fbWFrZVRlbXBsYXRlT2JqZWN0LFxyXG4gICAgX19pbXBvcnRTdGFyOiBfX2ltcG9ydFN0YXIsXHJcbiAgICBfX2ltcG9ydERlZmF1bHQ6IF9faW1wb3J0RGVmYXVsdCxcclxuICAgIF9fY2xhc3NQcml2YXRlRmllbGRHZXQ6IF9fY2xhc3NQcml2YXRlRmllbGRHZXQsXHJcbiAgICBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0OiBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0LFxyXG4gICAgX19jbGFzc1ByaXZhdGVGaWVsZEluOiBfX2NsYXNzUHJpdmF0ZUZpZWxkSW4sXHJcbiAgICBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZTogX19hZGREaXNwb3NhYmxlUmVzb3VyY2UsXHJcbiAgICBfX2Rpc3Bvc2VSZXNvdXJjZXM6IF9fZGlzcG9zZVJlc291cmNlcyxcclxuICAgIF9fcmV3cml0ZVJlbGF0aXZlSW1wb3J0RXh0ZW5zaW9uOiBfX3Jld3JpdGVSZWxhdGl2ZUltcG9ydEV4dGVuc2lvbixcclxufTtcclxuIiwiZW51bSBMb2dMZXZlbCB7XHJcbiAgREVCVUcgPSAwLFxyXG4gIElORk8gPSAxLFxyXG4gIFdBUk4gPSAyLFxyXG4gIEVSUk9SID0gM1xyXG59XHJcblxyXG5sZXQgY3VycmVudExvZ0xldmVsOiBMb2dMZXZlbCA9IExvZ0xldmVsLklORk87XHJcblxyXG5mdW5jdGlvbiBzZXRMb2dMZXZlbChsZXZlbDogTG9nTGV2ZWwpOiB2b2lkIHtcclxuICBpZiAoT2JqZWN0LnZhbHVlcyhMb2dMZXZlbCkuaW5jbHVkZXMobGV2ZWwpKSB7XHJcbiAgICBjdXJyZW50TG9nTGV2ZWwgPSBsZXZlbDtcclxuICB9IGVsc2Uge1xyXG4gICAgY29uc29sZS5lcnJvcign5peg5pWI55qE5pel5b+X57qn5YirJyk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBsb2cobGV2ZWw6IExvZ0xldmVsLCBtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcclxuICBpZiAobGV2ZWwgPj0gY3VycmVudExvZ0xldmVsKSB7XHJcbiAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICBjb25zdCBsZXZlbE5hbWUgPSBMb2dMZXZlbFtsZXZlbF07XHJcbiAgICBjb25zb2xlLmxvZyhgWyR7dGltZXN0YW1wfV0gWyR7bGV2ZWxOYW1lfV0gJHttZXNzYWdlfWApO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZGVidWcobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XHJcbiAgbG9nKExvZ0xldmVsLkRFQlVHLCBtZXNzYWdlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gaW5mbyhtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcclxuICBsb2coTG9nTGV2ZWwuSU5GTywgbWVzc2FnZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHdhcm4obWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XHJcbiAgbG9nKExvZ0xldmVsLldBUk4sIG1lc3NhZ2UpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBlcnJvcihtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcclxuICBsb2coTG9nTGV2ZWwuRVJST1IsIG1lc3NhZ2UpO1xyXG59XHJcblxyXG5leHBvcnQge1xyXG4gIExvZ0xldmVsLFxyXG4gIHNldExvZ0xldmVsLFxyXG4gIGRlYnVnLFxyXG4gIGluZm8sXHJcbiAgd2FybixcclxuICBlcnJvclxyXG59O1xyXG4iLCJpbXBvcnQgeyBJdGVtVmlldywgV29ya3NwYWNlTGVhZiwgQXBwLCBUZXh0Q29tcG9uZW50LCBEcm9wZG93bkNvbXBvbmVudCwgQnV0dG9uQ29tcG9uZW50LCBOb3RpY2UsIE1hcmtkb3duVmlldywgTW9kYWwsIFNldHRpbmcgfSBmcm9tICdvYnNpZGlhbic7XHJcbmltcG9ydCB7IERhdGFiYXNlVGFibGUgfSBmcm9tICcuL2RhdGFiYXNlUGFyc2VyJztcclxuaW1wb3J0IERhdGFiYXNlUGx1Z2luIGZyb20gJy4vbWFpbic7XHJcbmltcG9ydCB7IEZ1enp5U3VnZ2VzdE1vZGFsLCBURm9sZGVyIH0gZnJvbSAnb2JzaWRpYW4nO1xyXG5pbXBvcnQgeyBkZWJ1ZywgaW5mbywgd2FybiwgZXJyb3IgfSBmcm9tICcuL3V0aWxzL2xvZ2dlcic7XHJcblxyXG5leHBvcnQgY29uc3QgREFUQUJBU0VfVklFV19UWVBFID0gJ2RhdGFiYXNlLXZpZXcnO1xyXG5cclxuaW50ZXJmYWNlIFNvcnRTdGF0ZSB7XHJcbiAgY29sdW1uOiBzdHJpbmc7XHJcbiAgZGlyZWN0aW9uOiAnYXNjJyB8ICdkZXNjJztcclxufVxyXG5cclxuaW50ZXJmYWNlIFRhYmxlU3RhdGUge1xyXG4gIHRhYmxlOiBEYXRhYmFzZVRhYmxlO1xyXG4gIGlkOiBudW1iZXI7XHJcbiAgc2VhcmNoVGVybTogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRGF0YWJhc2VWaWV3IGV4dGVuZHMgSXRlbVZpZXcge1xyXG4gIHByaXZhdGUgdGFibGVTdGF0ZXM6IFRhYmxlU3RhdGVbXSA9IFtdO1xyXG4gIHByaXZhdGUgc29ydFN0YXRlczogTWFwPERhdGFiYXNlVGFibGUsIFNvcnRTdGF0ZT4gPSBuZXcgTWFwKCk7XHJcbiAgcHJpdmF0ZSB0YWJsZUVsZW1lbnRzOiBNYXA8RGF0YWJhc2VUYWJsZSwgSFRNTEVsZW1lbnQ+ID0gbmV3IE1hcCgpO1xyXG4gIHByaXZhdGUgZXhwb3J0RHJvcGRvd24/OiBEcm9wZG93bkNvbXBvbmVudDtcclxuICBwcml2YXRlIGV4cG9ydEJ1dHRvbj86IEJ1dHRvbkNvbXBvbmVudDtcclxuICBwcml2YXRlIGltcG9ydEJ1dHRvbj86IEJ1dHRvbkNvbXBvbmVudDtcclxuICBwcml2YXRlIHBsdWdpbjogRGF0YWJhc2VQbHVnaW47XHJcblxyXG4gIGNvbnN0cnVjdG9yKGxlYWY6IFdvcmtzcGFjZUxlYWYsIHBsdWdpbjogRGF0YWJhc2VQbHVnaW4pIHtcclxuICAgIHN1cGVyKGxlYWYpO1xyXG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcbiAgfVxyXG5cclxuICBnZXRWaWV3VHlwZSgpIHtcclxuICAgIHJldHVybiBEQVRBQkFTRV9WSUVXX1RZUEU7XHJcbiAgfVxyXG5cclxuICBnZXREaXNwbGF5VGV4dCgpIHtcclxuICAgIHJldHVybiAn5pWw5o2u5bqT6KeG5Zu+JztcclxuICB9XHJcblxyXG4gIGFzeW5jIG9uT3BlbigpIHtcclxuICAgIHRoaXMucmVuZGVyVmlldygpO1xyXG4gIH1cclxuXHJcbiAgc2V0VGFibGVzKHRhYmxlczogRGF0YWJhc2VUYWJsZVtdKSB7XHJcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0YWJsZXMpKSB7XHJcbiAgICAgIHRoaXMudGFibGVTdGF0ZXMgPSB0YWJsZXMubWFwKCh0YWJsZSwgaW5kZXgpID0+ICh7IHRhYmxlLCBpZDogaW5kZXggKyAxLCBzZWFyY2hUZXJtOiAnJyB9KSk7XHJcbiAgICAgIHRoaXMucmVuZGVyVmlldygpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZXJyb3IoYHNldFRhYmxlcyDmlLbliLDml6DmlYjmlbDmja46ICR7SlNPTi5zdHJpbmdpZnkodGFibGVzKS5zdWJzdHJpbmcoMCwgMTAwKX0uLi5gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJlbmRlclZpZXcoKSB7XHJcbiAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xyXG4gICAgY29udGVudEVsLmFkZENsYXNzKCdkYXRhYmFzZS12aWV3LWNvbnRhaW5lcicpO1xyXG5cclxuICAgIHRoaXMucmVuZGVySGVhZGVyKGNvbnRlbnRFbCk7XHJcbiAgICB0aGlzLnJlbmRlclRhYmxlcyhjb250ZW50RWwpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSByZW5kZXJIZWFkZXIoY29udGFpbmVyOiBIVE1MRWxlbWVudCkge1xyXG4gICAgY29uc3QgaGVhZGVyRGl2ID0gY29udGFpbmVyLmNyZWF0ZUVsKCdkaXYnLCB7IGNsczogJ2RhdGFiYXNlLWhlYWRlcicgfSk7XHJcbiAgICBoZWFkZXJEaXYuY3JlYXRlRWwoJ2g0JywgeyB0ZXh0OiAn5pWw5o2u5bqT6KeG5Zu+JyB9KTtcclxuXHJcbiAgICBjb25zdCBjb250cm9sc0RpdiA9IGhlYWRlckRpdi5jcmVhdGVFbCgnZGl2JywgeyBjbHM6ICdkYXRhYmFzZS1jb250cm9scycgfSk7XHJcbiAgICB0aGlzLnJlbmRlckV4cG9ydENvbnRyb2xzKGNvbnRyb2xzRGl2KTtcclxuICAgIHRoaXMucmVuZGVySW1wb3J0Q29udHJvbChjb250cm9sc0Rpdik7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlbmRlckV4cG9ydENvbnRyb2xzKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpIHtcclxuICAgIHRoaXMuZXhwb3J0RHJvcGRvd24gPSBuZXcgRHJvcGRvd25Db21wb25lbnQoY29udGFpbmVyKVxyXG4gICAgICAuYWRkT3B0aW9uKCdhbGwnLCAn5omA5pyJ6KGo5qC8JylcclxuICAgICAgLm9uQ2hhbmdlKCgpID0+IHtcclxuICAgICAgICBpZiAodGhpcy5leHBvcnRCdXR0b24pIHtcclxuICAgICAgICAgIHRoaXMuZXhwb3J0QnV0dG9uLnNldERpc2FibGVkKGZhbHNlKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgIHRoaXMudGFibGVTdGF0ZXMuZm9yRWFjaCgoc3RhdGUsIGluZGV4KSA9PiB7XHJcbiAgICAgIHRoaXMuZXhwb3J0RHJvcGRvd24/LmFkZE9wdGlvbihgJHtpbmRleH1gLCBgJHtzdGF0ZS50YWJsZS5uYW1lfSAoJHtzdGF0ZS5pZH0pYCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmV4cG9ydEJ1dHRvbiA9IG5ldyBCdXR0b25Db21wb25lbnQoY29udGFpbmVyKVxyXG4gICAgICAuc2V0QnV0dG9uVGV4dCgn5a+85Ye6IENTVicpXHJcbiAgICAgIC5vbkNsaWNrKCgpID0+IHRoaXMuZXhwb3J0VGFibGVzVG9DU1YoKSlcclxuICAgICAgLnNldERpc2FibGVkKHRydWUpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSByZW5kZXJUYWJsZXMoY29udGFpbmVyOiBIVE1MRWxlbWVudCkge1xyXG4gICAgaWYgKHRoaXMudGFibGVTdGF0ZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIGNvbnRhaW5lci5jcmVhdGVFbCgncCcsIHsgdGV4dDogJ+i/mOayoeacieino+aekOWIsOS7u+S9leaVsOaNruW6k+ihqCcgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnRhYmxlU3RhdGVzLmZvckVhY2godGhpcy5yZW5kZXJUYWJsZUNvbnRhaW5lci5iaW5kKHRoaXMpKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcmVuZGVyVGFibGVDb250YWluZXIodGFibGVTdGF0ZTogVGFibGVTdGF0ZSwgaW5kZXg6IG51bWJlcikge1xyXG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICBjb25zdCB7IHRhYmxlLCBpZCwgc2VhcmNoVGVybSB9ID0gdGFibGVTdGF0ZTtcclxuXHJcbiAgICBjb25zdCB0YWJsZUNvbnRhaW5lciA9IGNvbnRlbnRFbC5jcmVhdGVFbCgnZGl2JywgeyBjbHM6ICd0YWJsZS1jb250YWluZXInIH0pO1xyXG4gICAgY29uc3QgdGFibGVIZWFkZXIgPSB0YWJsZUNvbnRhaW5lci5jcmVhdGVFbCgnZGl2JywgeyBjbHM6ICd0YWJsZS1oZWFkZXInIH0pO1xyXG4gICAgdGFibGVIZWFkZXIuY3JlYXRlRWwoJ2g1JywgeyB0ZXh0OiB0YWJsZS5uYW1lIH0pO1xyXG5cclxuICAgIHRoaXMucmVuZGVyVGFibGVDb250cm9scyh0YWJsZUhlYWRlciwgdGFibGVTdGF0ZSwgaW5kZXgpO1xyXG5cclxuICAgIGNvbnN0IHRhYmxlRWwgPSB0aGlzLnJlbmRlclRhYmxlKHRhYmxlKTtcclxuICAgIHRhYmxlQ29udGFpbmVyLmFwcGVuZENoaWxkKHRhYmxlRWwpO1xyXG4gICAgdGhpcy50YWJsZUVsZW1lbnRzLnNldCh0YWJsZSwgdGFibGVFbCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlbmRlclRhYmxlQ29udHJvbHMoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgdGFibGVTdGF0ZTogVGFibGVTdGF0ZSwgaW5kZXg6IG51bWJlcikge1xyXG4gICAgbmV3IFRleHRDb21wb25lbnQoY29udGFpbmVyKVxyXG4gICAgICAuc2V0UGxhY2Vob2xkZXIoJ+e8luWPtycpXHJcbiAgICAgIC5zZXRWYWx1ZSh0YWJsZVN0YXRlLmlkLnRvU3RyaW5nKCkpXHJcbiAgICAgIC5vbkNoYW5nZSh2YWx1ZSA9PiB7XHJcbiAgICAgICAgdGhpcy50YWJsZVN0YXRlc1tpbmRleF0uaWQgPSBwYXJzZUludCh2YWx1ZSkgfHwgMDtcclxuICAgICAgfSlcclxuICAgICAgLmlucHV0RWwuYWRkQ2xhc3MoJ2lkLWlucHV0Jyk7XHJcblxyXG4gICAgbmV3IFRleHRDb21wb25lbnQoY29udGFpbmVyKVxyXG4gICAgICAuc2V0UGxhY2Vob2xkZXIoJ+aQnC4uLicpXHJcbiAgICAgIC5zZXRWYWx1ZSh0YWJsZVN0YXRlLnNlYXJjaFRlcm0pXHJcbiAgICAgIC5vbkNoYW5nZSh2YWx1ZSA9PiB7XHJcbiAgICAgICAgdGhpcy50YWJsZVN0YXRlc1tpbmRleF0uc2VhcmNoVGVybSA9IHZhbHVlO1xyXG4gICAgICAgIHRoaXMudXBkYXRlVGFibGUodGFibGVTdGF0ZS50YWJsZSk7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5pbnB1dEVsLmFkZENsYXNzKCdzZWFyY2gtaW5wdXQnKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcmVuZGVyVGFibGUodGFibGU6IERhdGFiYXNlVGFibGUpOiBIVE1MRWxlbWVudCB7XHJcbiAgICBjb25zdCB0YWJsZUVsID0gY3JlYXRlRWwoJ3RhYmxlJywgeyBjbHM6ICdkYXRhYmFzZS10YWJsZScgfSk7XHJcbiAgICB0aGlzLnJlbmRlclRhYmxlSGVhZGVyKHRhYmxlRWwsIHRhYmxlKTtcclxuICAgIHRoaXMucmVuZGVyVGFibGVCb2R5KHRhYmxlRWwsIHRhYmxlKTtcclxuICAgIHJldHVybiB0YWJsZUVsO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSByZW5kZXJUYWJsZUhlYWRlcih0YWJsZUVsOiBIVE1MRWxlbWVudCwgdGFibGU6IERhdGFiYXNlVGFibGUpIHtcclxuICAgIGNvbnN0IGhlYWRlclJvdyA9IHRhYmxlRWwuY3JlYXRlRWwoJ3RyJyk7XHJcbiAgICB0YWJsZS5maWVsZHMuZm9yRWFjaChmaWVsZCA9PiB7XHJcbiAgICAgIGNvbnN0IHRoID0gaGVhZGVyUm93LmNyZWF0ZUVsKCd0aCcpO1xyXG4gICAgICB0aC5jcmVhdGVFbCgnc3BhbicsIHsgdGV4dDogZmllbGQsIGNsczogJ2NvbHVtbi1uYW1lJyB9KTtcclxuICAgICAgY29uc3Qgc29ydEluZGljYXRvciA9IHRoLmNyZWF0ZUVsKCdzcGFuJywgeyBjbHM6ICdzb3J0LWluZGljYXRvcicgfSk7XHJcbiAgICAgIFxyXG4gICAgICB0aC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuaGFuZGxlU29ydCh0YWJsZSwgZmllbGQpKTtcclxuICAgICAgXHJcbiAgICAgIHRoaXMudXBkYXRlU29ydEluZGljYXRvcih0aCwgc29ydEluZGljYXRvciwgdGFibGUsIGZpZWxkKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSB1cGRhdGVTb3J0SW5kaWNhdG9yKHRoOiBIVE1MRWxlbWVudCwgc29ydEluZGljYXRvcjogSFRNTEVsZW1lbnQsIHRhYmxlOiBEYXRhYmFzZVRhYmxlLCBmaWVsZDogc3RyaW5nKSB7XHJcbiAgICBjb25zdCBzb3J0U3RhdGUgPSB0aGlzLnNvcnRTdGF0ZXMuZ2V0KHRhYmxlKTtcclxuICAgIGlmIChzb3J0U3RhdGUgJiYgc29ydFN0YXRlLmNvbHVtbiA9PT0gZmllbGQpIHtcclxuICAgICAgdGguYWRkQ2xhc3MoJ3NvcnRlZCcpO1xyXG4gICAgICB0aC5hZGRDbGFzcyhzb3J0U3RhdGUuZGlyZWN0aW9uKTtcclxuICAgICAgc29ydEluZGljYXRvci5zZXRUZXh0KHNvcnRTdGF0ZS5kaXJlY3Rpb24gPT09ICdhc2MnID8gJ+KWsicgOiAn4pa8Jyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBzb3J0SW5kaWNhdG9yLnNldFRleHQoJ+KHhScpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBoYW5kbGVTb3J0KHRhYmxlOiBEYXRhYmFzZVRhYmxlLCBjb2x1bW46IHN0cmluZykge1xyXG4gICAgY29uc3QgY3VycmVudFNvcnRTdGF0ZSA9IHRoaXMuc29ydFN0YXRlcy5nZXQodGFibGUpO1xyXG4gICAgaWYgKGN1cnJlbnRTb3J0U3RhdGUgJiYgY3VycmVudFNvcnRTdGF0ZS5jb2x1bW4gPT09IGNvbHVtbikge1xyXG4gICAgICBjdXJyZW50U29ydFN0YXRlLmRpcmVjdGlvbiA9IGN1cnJlbnRTb3J0U3RhdGUuZGlyZWN0aW9uID09PSAnYXNjJyA/ICdkZXNjJyA6ICdhc2MnO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5zb3J0U3RhdGVzLnNldCh0YWJsZSwgeyBjb2x1bW4sIGRpcmVjdGlvbjogJ2FzYycgfSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLnVwZGF0ZVRhYmxlKHRhYmxlKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcmVuZGVyVGFibGVCb2R5KHRhYmxlRWw6IEhUTUxFbGVtZW50LCB0YWJsZTogRGF0YWJhc2VUYWJsZSkge1xyXG4gICAgY29uc3QgdGJvZHkgPSB0YWJsZUVsLmNyZWF0ZUVsKCd0Ym9keScpO1xyXG4gICAgY29uc3QgdGFibGVTdGF0ZSA9IHRoaXMudGFibGVTdGF0ZXMuZmluZChzdGF0ZSA9PiBzdGF0ZS50YWJsZSA9PT0gdGFibGUpO1xyXG4gICAgaWYgKCF0YWJsZVN0YXRlKSByZXR1cm47XHJcblxyXG4gICAgY29uc3QgZmlsdGVyZWRBbmRTb3J0ZWREYXRhID0gdGhpcy5nZXRGaWx0ZXJlZEFuZFNvcnRlZERhdGEodGFibGUsIHRhYmxlU3RhdGUuc2VhcmNoVGVybSk7XHJcbiAgICBmaWx0ZXJlZEFuZFNvcnRlZERhdGEuZm9yRWFjaChyb3cgPT4ge1xyXG4gICAgICBjb25zdCByb3dFbCA9IHRib2R5LmNyZWF0ZUVsKCd0cicpO1xyXG4gICAgICByb3cuZm9yRWFjaChjZWxsID0+IHJvd0VsLmNyZWF0ZUVsKCd0ZCcsIHsgdGV4dDogY2VsbCB9KSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgdXBkYXRlVGFibGUodGFibGU6IERhdGFiYXNlVGFibGUpIHtcclxuICAgIGNvbnN0IHRhYmxlRWwgPSB0aGlzLnRhYmxlRWxlbWVudHMuZ2V0KHRhYmxlKTtcclxuICAgIGlmICghdGFibGVFbCkgcmV0dXJuO1xyXG5cclxuICAgIHRhYmxlRWwucXVlcnlTZWxlY3RvcigndGJvZHknKT8ucmVtb3ZlKCk7XHJcbiAgICB0aGlzLnJlbmRlclRhYmxlQm9keSh0YWJsZUVsLCB0YWJsZSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdldEZpbHRlcmVkQW5kU29ydGVkRGF0YSh0YWJsZTogRGF0YWJhc2VUYWJsZSwgc2VhcmNoVGVybTogc3RyaW5nKTogc3RyaW5nW11bXSB7XHJcbiAgICBsZXQgZmlsdGVyZWREYXRhID0gdGhpcy5maWx0ZXJEYXRhKHRhYmxlLmRhdGEsIHNlYXJjaFRlcm0pO1xyXG4gICAgcmV0dXJuIHRoaXMuc29ydERhdGEoZmlsdGVyZWREYXRhLCB0YWJsZSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGZpbHRlckRhdGEoZGF0YTogc3RyaW5nW11bXSwgc2VhcmNoVGVybTogc3RyaW5nKTogc3RyaW5nW11bXSB7XHJcbiAgICBpZiAoIXNlYXJjaFRlcm0pIHJldHVybiBkYXRhO1xyXG4gICAgY29uc3QgbG93ZXJTZWFyY2hUZXJtID0gc2VhcmNoVGVybS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgcmV0dXJuIGRhdGEuZmlsdGVyKHJvdyA9PiByb3cuc29tZShjZWxsID0+IGNlbGwudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlclNlYXJjaFRlcm0pKSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHNvcnREYXRhKGRhdGE6IHN0cmluZ1tdW10sIHRhYmxlOiBEYXRhYmFzZVRhYmxlKTogc3RyaW5nW11bXSB7XHJcbiAgICBjb25zdCBzb3J0U3RhdGUgPSB0aGlzLnNvcnRTdGF0ZXMuZ2V0KHRhYmxlKTtcclxuICAgIGlmICghc29ydFN0YXRlKSByZXR1cm4gZGF0YTtcclxuXHJcbiAgICBjb25zdCBjb2x1bW5JbmRleCA9IHRhYmxlLmZpZWxkcy5pbmRleE9mKHNvcnRTdGF0ZS5jb2x1bW4pO1xyXG4gICAgaWYgKGNvbHVtbkluZGV4ID09PSAtMSkgcmV0dXJuIGRhdGE7XHJcblxyXG4gICAgcmV0dXJuIGRhdGEuc29ydCgoYSwgYikgPT4gdGhpcy5jb21wYXJlVmFsdWVzKGFbY29sdW1uSW5kZXhdLCBiW2NvbHVtbkluZGV4XSwgc29ydFN0YXRlLmRpcmVjdGlvbikpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjb21wYXJlVmFsdWVzKHZhbHVlQTogc3RyaW5nLCB2YWx1ZUI6IHN0cmluZywgZGlyZWN0aW9uOiAnYXNjJyB8ICdkZXNjJyk6IG51bWJlciB7XHJcbiAgICBjb25zdCBudW1BID0gTnVtYmVyKHZhbHVlQSk7XHJcbiAgICBjb25zdCBudW1CID0gTnVtYmVyKHZhbHVlQik7XHJcbiAgICBpZiAoIWlzTmFOKG51bUEpICYmICFpc05hTihudW1CKSkge1xyXG4gICAgICByZXR1cm4gZGlyZWN0aW9uID09PSAnYXNjJyA/IG51bUEgLSBudW1CIDogbnVtQiAtIG51bUE7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBkaXJlY3Rpb24gPT09ICdhc2MnIFxyXG4gICAgICA/IHZhbHVlQS5sb2NhbGVDb21wYXJlKHZhbHVlQikgXHJcbiAgICAgIDogdmFsdWVCLmxvY2FsZUNvbXBhcmUodmFsdWVBKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZXhwb3J0VGFibGVzVG9DU1YoKSB7XHJcbiAgICBpZiAoIXRoaXMuZXhwb3J0RHJvcGRvd24pIHJldHVybjtcclxuXHJcbiAgICBjb25zdCBzZWxlY3RlZFZhbHVlID0gdGhpcy5leHBvcnREcm9wZG93bi5nZXRWYWx1ZSgpO1xyXG4gICAgY29uc3QgdGFibGVzVG9FeHBvcnQgPSBzZWxlY3RlZFZhbHVlID09PSAnYWxsJyBcclxuICAgICAgPyB0aGlzLnRhYmxlU3RhdGVzLm1hcChzdGF0ZSA9PiBzdGF0ZS50YWJsZSlcclxuICAgICAgOiBbdGhpcy50YWJsZVN0YXRlc1twYXJzZUludChzZWxlY3RlZFZhbHVlKV0/LnRhYmxlXS5maWx0ZXIoQm9vbGVhbik7XHJcblxyXG4gICAgaWYgKHRhYmxlc1RvRXhwb3J0Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBlcnJvcignTm8gdGFibGVzIHRvIGV4cG9ydCcpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgY3N2Q29udGVudCA9IHRhYmxlc1RvRXhwb3J0Lm1hcCh0aGlzLnRhYmxlVG9DU1YpLmpvaW4oJ1xcblxcbicpO1xyXG4gICAgdGhpcy5kb3dubG9hZENTVihjc3ZDb250ZW50LCB0YWJsZXNUb0V4cG9ydC5sZW5ndGggPiAxID8gJ2RhdGFiYXNlX3RhYmxlcy5jc3YnIDogYCR7dGFibGVzVG9FeHBvcnRbMF0ubmFtZX0uY3N2YCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHRhYmxlVG9DU1YodGFibGU6IERhdGFiYXNlVGFibGUpOiBzdHJpbmcge1xyXG4gICAgY29uc3QgaGVhZGVycyA9IHRhYmxlLmZpZWxkcy5qb2luKCcsJyk7XHJcbiAgICBjb25zdCBkYXRhUm93cyA9IHRhYmxlLmRhdGEubWFwKHJvdyA9PiBcclxuICAgICAgcm93Lm1hcChjZWxsID0+IFxyXG4gICAgICAgIGNlbGwuaW5jbHVkZXMoJywnKSB8fCBjZWxsLmluY2x1ZGVzKCdcIicpIHx8IGNlbGwuaW5jbHVkZXMoJ1xcbicpIFxyXG4gICAgICAgICAgPyBgXCIke2NlbGwucmVwbGFjZSgvXCIvZywgJ1wiXCInKX1cImBcclxuICAgICAgICAgIDogY2VsbFxyXG4gICAgICApLmpvaW4oJywnKVxyXG4gICAgKTtcclxuICAgIHJldHVybiBbdGFibGUubmFtZSwgaGVhZGVycywgLi4uZGF0YVJvd3NdLmpvaW4oJ1xcbicpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBkb3dubG9hZENTVihjb250ZW50OiBzdHJpbmcsIGZpbGVuYW1lOiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbY29udGVudF0sIHsgdHlwZTogJ3RleHQvY3N2O2NoYXJzZXQ9dXRmLTg7JyB9KTtcclxuICAgIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XHJcbiAgICBjb25zdCBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xyXG4gICAgbGluay5ocmVmID0gdXJsO1xyXG4gICAgbGluay5kb3dubG9hZCA9IGZpbGVuYW1lO1xyXG4gICAgbGluay5jbGljaygpO1xyXG4gICAgVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBpbXBvcnRDU1YoKSB7XHJcbiAgICBjb25zdCBmaWxlSW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xyXG4gICAgZmlsZUlucHV0LnR5cGUgPSAnZmlsZSc7XHJcbiAgICBmaWxlSW5wdXQuYWNjZXB0ID0gJy5jc3YnO1xyXG5cclxuICAgIGZpbGVJbnB1dC5vbmNoYW5nZSA9IGFzeW5jIChlOiBFdmVudCkgPT4ge1xyXG4gICAgICBjb25zdCBmaWxlID0gKGUudGFyZ2V0IGFzIEhUTUxJbnB1dEVsZW1lbnQpLmZpbGVzPy5bMF07XHJcbiAgICAgIGlmIChmaWxlKSB7XHJcbiAgICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMucmVhZEZpbGVDb250ZW50KGZpbGUpO1xyXG4gICAgICAgIGNvbnN0IHBhcnNlZERhdGEgPSB0aGlzLnBhcnNlQ1NWKGNvbnRlbnQpO1xyXG4gICAgICAgIGNvbnN0IGRiQ29udGVudCA9IHRoaXMuY29udmVydFRvTWFya2Rvd24ocGFyc2VkRGF0YSk7XHJcbiAgICAgICAgXHJcblxyXG4gICAgICAgIGNvbnN0IGNob2ljZSA9IGF3YWl0IHRoaXMuY2hvb3NlSW1wb3J0TWV0aG9kKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKGNob2ljZSA9PT0gJ25ldycpIHtcclxuICAgICAgICAgIGF3YWl0IHRoaXMuY3JlYXRlTmV3RmlsZVdpdGhDb250ZW50KGZpbGUubmFtZSwgZGJDb250ZW50KTtcclxuICAgICAgICB9IGVsc2UgaWYgKGNob2ljZSA9PT0gJ2luc2VydCcpIHtcclxuICAgICAgICAgIGF3YWl0IHRoaXMuaW5zZXJ0Q29udGVudEludG9DdXJyZW50RmlsZShkYkNvbnRlbnQpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBmaWxlSW5wdXQuY2xpY2soKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgY2hvb3NlSW1wb3J0TWV0aG9kKCk6IFByb21pc2U8J25ldycgfCAnaW5zZXJ0JyB8IG51bGw+IHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4gICAgICBjb25zdCBtb2RhbCA9IG5ldyBJbXBvcnRNZXRob2RNb2RhbCh0aGlzLmFwcCwgKHJlc3VsdCkgPT4ge1xyXG4gICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgfSk7XHJcbiAgICAgIG1vZGFsLm9wZW4oKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBjcmVhdGVOZXdGaWxlV2l0aENvbnRlbnQob3JpZ2luYWxGaWxlTmFtZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IGZvbGRlclBhdGggPSBhd2FpdCB0aGlzLnNlbGVjdEZvbGRlcigpO1xyXG4gICAgaWYgKGZvbGRlclBhdGgpIHtcclxuICAgICAgY29uc3QgdGFibGVOYW1lID0gb3JpZ2luYWxGaWxlTmFtZS5yZXBsYWNlKCcuY3N2JywgJycpO1xyXG4gICAgICBjb25zdCBmaWxlTmFtZSA9IGAke3RhYmxlTmFtZX0ubWRgO1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShgJHtmb2xkZXJQYXRofS8ke2ZpbGVOYW1lfWAsIGNvbnRlbnQpO1xyXG4gICAgICAgIG5ldyBOb3RpY2UoYOW3suWIm+W7uuaVsOaNruW6k+eslOiusDogJHtmaWxlTmFtZX1gKTtcclxuICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgZXJyb3IoYOWIm+W7uuaVsOaNruW6k+eslOiusOaXtuWHuumUmTogJHtlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogU3RyaW5nKGVycil9YCk7XHJcbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIEVycm9yKSB7XHJcbiAgICAgICAgICBuZXcgTm90aWNlKGDliJvlu7rmlbDmja7lupPnrJTorrDlpLHotKU6ICR7ZXJyLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIG5ldyBOb3RpY2UoJ+WIm+W7uuaVsOaNruW6k+eslOiusOWksei0pTog5pyq55+l6ZSZ6K+vJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIGluc2VydENvbnRlbnRJbnRvQ3VycmVudEZpbGUoY29udGVudDogc3RyaW5nKSB7XHJcbiAgICBjb25zdCBhY3RpdmVWaWV3ID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZVZpZXdPZlR5cGUoRGF0YWJhc2VWaWV3KTtcclxuICAgIGlmIChhY3RpdmVWaWV3KSB7XHJcbiAgICAgIGFjdGl2ZVZpZXcuaW5zZXJ0Q29udGVudChjb250ZW50KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnN0IG1hcmtkb3duVmlldyA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVWaWV3T2ZUeXBlKE1hcmtkb3duVmlldyk7XHJcbiAgICAgIGlmIChtYXJrZG93blZpZXcpIHtcclxuICAgICAgICBjb25zdCBlZGl0b3IgPSBtYXJrZG93blZpZXcuZWRpdG9yO1xyXG4gICAgICAgIGNvbnN0IGN1cnNvciA9IGVkaXRvci5nZXRDdXJzb3IoKTtcclxuICAgICAgICBlZGl0b3IucmVwbGFjZVJhbmdlKGNvbnRlbnQgKyAnXFxuXFxuJywgY3Vyc29yKTtcclxuICAgICAgICBuZXcgTm90aWNlKCflt7LlnKjlvZPliY0gTWFya2Rvd24g5paH5qGj5Lit5o+S5YWl5pWw5o2u5bqT5YaF5a65Jyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbmV3IE5vdGljZSgn5peg5rOV5o+S5YWl5YaF5a6577ya5rKh5pyJ5omT5byA55qE5pWw5o2u5bqT6KeG5Zu+5oiWIE1hcmtkb3duIOaWh+ahoycpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlYWRGaWxlQ29udGVudChmaWxlOiBGaWxlKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcbiAgICAgIHJlYWRlci5vbmxvYWQgPSAoZSkgPT4gcmVzb2x2ZShlLnRhcmdldD8ucmVzdWx0IGFzIHN0cmluZyk7XHJcbiAgICAgIHJlYWRlci5vbmVycm9yID0gKGUpID0+IHJlamVjdChlKTtcclxuICAgICAgcmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcGFyc2VDU1YoY29udGVudDogc3RyaW5nKTogc3RyaW5nW11bXSB7XHJcblxyXG4gICAgcmV0dXJuIGNvbnRlbnQuc3BsaXQoJ1xcbicpLm1hcChsaW5lID0+IFxyXG4gICAgICBsaW5lLnNwbGl0KCcsJykubWFwKGNlbGwgPT4gY2VsbC50cmltKCkucmVwbGFjZSgvXlwiKC4qKVwiJC8sICckMScpKVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY29udmVydFRvTWFya2Rvd24oZGF0YTogc3RyaW5nW11bXSk6IHN0cmluZyB7XHJcbiAgICBjb25zdCBbaGVhZGVyLCAuLi5yb3dzXSA9IGRhdGE7XHJcbiAgICBjb25zdCB0YWJsZU5hbWUgPSB0aGlzLmdldFRhYmxlTmFtZUZyb21GaWxlTmFtZSgpIHx8ICdJbXBvcnRlZFRhYmxlJztcclxuICAgIFxyXG5cclxuICAgIGxldCBjb250ZW50ID0gYGRiOiR7dGFibGVOYW1lfVxcbmA7XHJcbiAgICBcclxuXHJcbiAgICBjb250ZW50ICs9IGhlYWRlci5qb2luKCcsJykgKyAnXFxuJztcclxuXHJcbiAgICByb3dzLmZvckVhY2gocm93ID0+IHtcclxuICAgICAgY29udGVudCArPSByb3cuam9pbignLCcpICsgJ1xcbic7XHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgcmV0dXJuIGNvbnRlbnQudHJpbSgpOyBcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2V0VGFibGVOYW1lRnJvbUZpbGVOYW1lKCk6IHN0cmluZyB8IG51bGwge1xyXG4gICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk7XHJcbiAgICByZXR1cm4gZmlsZSA/IGZpbGUuYmFzZW5hbWUucmVwbGFjZSgnLmNzdicsICcnKSA6IG51bGw7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHNlbGVjdEZvbGRlcigpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4gICAgICBjb25zdCBtb2RhbCA9IG5ldyBGb2xkZXJTdWdnZXN0TW9kYWwodGhpcy5hcHAsIChmb2xkZXIpID0+IHtcclxuICAgICAgICByZXNvbHZlKGZvbGRlciA/IGZvbGRlci5wYXRoIDogbnVsbCk7XHJcbiAgICAgIH0pO1xyXG4gICAgICBtb2RhbC5vcGVuKCk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcmVuZGVySW1wb3J0Q29udHJvbChjb250YWluZXI6IEhUTUxFbGVtZW50KSB7XHJcbiAgICB0aGlzLmltcG9ydEJ1dHRvbiA9IG5ldyBCdXR0b25Db21wb25lbnQoY29udGFpbmVyKVxyXG4gICAgICAuc2V0QnV0dG9uVGV4dCgn5a+85YWlIENTVicpXHJcbiAgICAgIC5vbkNsaWNrKCgpID0+IHRoaXMuaW1wb3J0Q1NWKCkpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGluc2VydENvbnRlbnQoY29udGVudDogc3RyaW5nKSB7XHJcbiAgICBkZWJ1ZyhgSW5zZXJ0aW5nIGNvbnRlbnQgaW50byBEYXRhYmFzZVZpZXc6ICR7Y29udGVudC5zdWJzdHJpbmcoMCwgMTAwKX0uLi5gKTtcclxuICAgIGNvbnN0IG5ld1RhYmxlcyA9IHRoaXMucGFyc2VDU1ZDb250ZW50KGNvbnRlbnQpO1xyXG4gICAgaWYgKG5ld1RhYmxlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIG5ld1RhYmxlcy5mb3JFYWNoKG5ld1RhYmxlID0+IHtcclxuICAgICAgICB0aGlzLnRhYmxlU3RhdGVzLnB1c2goe1xyXG4gICAgICAgICAgdGFibGU6IG5ld1RhYmxlLFxyXG4gICAgICAgICAgaWQ6IERhdGUubm93KCksXHJcbiAgICAgICAgICBzZWFyY2hUZXJtOiAnJ1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KTtcclxuICAgICAgdGhpcy5yZW5kZXJWaWV3KCk7XHJcbiAgICAgIG5ldyBOb3RpY2UoYOW3suWcqOaVsOaNruW6k+inhuWbvuS4reaPkuWFpSAke25ld1RhYmxlcy5sZW5ndGh9IOS4quaWsOihqOagvGApO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgd2Fybign5peg5rOV6Kej5p6Q5a+85YWl55qE5YaF5a65Jyk7XHJcbiAgICAgIG5ldyBOb3RpY2UoJ+aXoOazleino+aekOWvvOWFpeeahOWGheWuuScpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBwYXJzZUNTVkNvbnRlbnQoY29udGVudDogc3RyaW5nKTogRGF0YWJhc2VUYWJsZVtdIHtcclxuICAgIGNvbnN0IGxpbmVzID0gY29udGVudC50cmltKCkuc3BsaXQoJ1xcbicpO1xyXG4gICAgY29uc3QgdGFibGVzOiBEYXRhYmFzZVRhYmxlW10gPSBbXTtcclxuICAgIGxldCBjdXJyZW50VGFibGU6IERhdGFiYXNlVGFibGUgfCBudWxsID0gbnVsbDtcclxuXHJcbiAgICBsaW5lcy5mb3JFYWNoKGxpbmUgPT4ge1xyXG4gICAgICBpZiAobGluZS5zdGFydHNXaXRoKCdkYjonKSkge1xyXG5cclxuICAgICAgICBpZiAoY3VycmVudFRhYmxlKSB7XHJcbiAgICAgICAgICB0YWJsZXMucHVzaChjdXJyZW50VGFibGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdXJyZW50VGFibGUgPSB7XHJcbiAgICAgICAgICBuYW1lOiBsaW5lLnNsaWNlKDMpLnRyaW0oKSxcclxuICAgICAgICAgIGZpZWxkczogW10sXHJcbiAgICAgICAgICBkYXRhOiBbXVxyXG4gICAgICAgIH07XHJcbiAgICAgIH0gZWxzZSBpZiAoY3VycmVudFRhYmxlKSB7XHJcbiAgICAgICAgaWYgKGN1cnJlbnRUYWJsZS5maWVsZHMubGVuZ3RoID09PSAwKSB7XHJcblxyXG4gICAgICAgICAgY3VycmVudFRhYmxlLmZpZWxkcyA9IGxpbmUuc3BsaXQoJywnKS5tYXAoZmllbGQgPT4gZmllbGQudHJpbSgpKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICAgIGN1cnJlbnRUYWJsZS5kYXRhLnB1c2gobGluZS5zcGxpdCgnLCcpLm1hcChjZWxsID0+IGNlbGwudHJpbSgpKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcblxyXG4gICAgaWYgKGN1cnJlbnRUYWJsZSkge1xyXG4gICAgICB0YWJsZXMucHVzaChjdXJyZW50VGFibGUpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0YWJsZXM7XHJcbiAgfVxyXG59XHJcblxyXG5jbGFzcyBGb2xkZXJTdWdnZXN0TW9kYWwgZXh0ZW5kcyBGdXp6eVN1Z2dlc3RNb2RhbDxURm9sZGVyPiB7XHJcbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHByaXZhdGUgb25DaG9vc2VGb2xkZXI6IChmb2xkZXI6IFRGb2xkZXIgfCBudWxsKSA9PiB2b2lkKSB7XHJcbiAgICBzdXBlcihhcHApO1xyXG4gIH1cclxuXHJcbiAgZ2V0SXRlbXMoKTogVEZvbGRlcltdIHtcclxuICAgIHJldHVybiB0aGlzLmFwcC52YXVsdC5nZXRBbGxMb2FkZWRGaWxlcygpXHJcbiAgICAgIC5maWx0ZXIoKGZpbGUpOiBmaWxlIGlzIFRGb2xkZXIgPT4gZmlsZSBpbnN0YW5jZW9mIFRGb2xkZXIpO1xyXG4gIH1cclxuXHJcbiAgZ2V0SXRlbVRleHQoaXRlbTogVEZvbGRlcik6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gaXRlbS5wYXRoO1xyXG4gIH1cclxuXHJcbiAgb25DaG9vc2VJdGVtKGl0ZW06IFRGb2xkZXIsIGV2dDogTW91c2VFdmVudCB8IEtleWJvYXJkRXZlbnQpOiB2b2lkIHtcclxuICAgIHRoaXMub25DaG9vc2VGb2xkZXIoaXRlbSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBpc0Vycm9yKGVycm9yOiB1bmtub3duKTogZXJyb3IgaXMgRXJyb3Ige1xyXG4gIHJldHVybiBlcnJvciBpbnN0YW5jZW9mIEVycm9yO1xyXG59XHJcblxyXG5jbGFzcyBJbXBvcnRNZXRob2RNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuICByZXN1bHQ6ICduZXcnIHwgJ2luc2VydCcgfCBudWxsID0gbnVsbDtcclxuXHJcbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHByaXZhdGUgb25DaG9vc2U6IChyZXN1bHQ6ICduZXcnIHwgJ2luc2VydCcgfCBudWxsKSA9PiB2b2lkKSB7XHJcbiAgICBzdXBlcihhcHApO1xyXG4gIH1cclxuXHJcbiAgb25PcGVuKCkge1xyXG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcblxyXG4gICAgY29udGVudEVsLmNyZWF0ZUVsKCdoMicsIHsgdGV4dDogJ+mAieaLqeWvvOWFpeaWueW8jycgfSk7XHJcblxyXG4gICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxyXG4gICAgICAuc2V0TmFtZSgn5Yib5bu65paw5paH5Lu2JylcclxuICAgICAgLnNldERlc2MoJ+WwhuWvvOWFpeeahOaVsOaNruWIm+W7uuS4uuaWsOeahCBNYXJrZG93biDmlofku7YnKVxyXG4gICAgICAuYWRkQnV0dG9uKChidG4pID0+XHJcbiAgICAgICAgYnRuLnNldEJ1dHRvblRleHQoJ+mAieaLqScpLm9uQ2xpY2soKCkgPT4ge1xyXG4gICAgICAgICAgdGhpcy5yZXN1bHQgPSAnbmV3JztcclxuICAgICAgICAgIHRoaXMuY2xvc2UoKTtcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG5cclxuICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuICAgICAgLnNldE5hbWUoJ+aPkuWFpeWIsOW9k+WJjeaWh+ahoycpXHJcbiAgICAgIC5zZXREZXNjKCflsIblr7zlhaXnmoTmlbDmja7mj5LlhaXliLDlvZPliY3mlofmoaPnmoTlhYnmoIfkvY3nva4nKVxyXG4gICAgICAuYWRkQnV0dG9uKChidG4pID0+XHJcbiAgICAgICAgYnRuLnNldEJ1dHRvblRleHQoJ+mAieaLqScpLm9uQ2xpY2soKCkgPT4ge1xyXG4gICAgICAgICAgdGhpcy5yZXN1bHQgPSAnaW5zZXJ0JztcclxuICAgICAgICAgIHRoaXMuY2xvc2UoKTtcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG4gIH1cclxuXHJcbiAgb25DbG9zZSgpIHtcclxuICAgIHRoaXMub25DaG9vc2UodGhpcy5yZXN1bHQpO1xyXG4gIH1cclxufVxyXG4iLCJpbXBvcnQgeyBkZWJ1ZywgaW5mbyB9IGZyb20gJy4vdXRpbHMvbG9nZ2VyJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRGF0YWJhc2VUYWJsZSB7XHJcbiAgbmFtZTogc3RyaW5nO1xyXG4gIGZpZWxkczogc3RyaW5nW107XHJcbiAgZGF0YTogc3RyaW5nW11bXTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlRGF0YWJhc2UobWFya2Rvd246IHN0cmluZyk6IERhdGFiYXNlVGFibGVbXSB7XHJcbiAgZGVidWcoYOW8gOWni+ino+aekOaVsOaNruW6k++8jOi+k+WFpeWGheWuuTogJHttYXJrZG93bi5zdWJzdHJpbmcoMCwgMTAwKX0uLi5gKTtcclxuICBjb25zdCB0YWJsZXM6IERhdGFiYXNlVGFibGVbXSA9IFtdO1xyXG4gIGNvbnN0IGxpbmVzID0gbWFya2Rvd24uc3BsaXQoJ1xcbicpO1xyXG4gIGxldCBjdXJyZW50VGFibGU6IERhdGFiYXNlVGFibGUgfCBudWxsID0gbnVsbDtcclxuXHJcbiAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XHJcbiAgICBjb25zdCB0cmltbWVkTGluZSA9IGxpbmUudHJpbSgpO1xyXG4gICAgZGVidWcoYOWkhOeQhuihjDogJHt0cmltbWVkTGluZX1gKTtcclxuICAgIGlmICh0cmltbWVkTGluZS5zdGFydHNXaXRoKCdkYjonKSkge1xyXG4gICAgICBkZWJ1Zyhg5Y+R546w5paw6KGoOiAke3RyaW1tZWRMaW5lfWApO1xyXG4gICAgICBpZiAoY3VycmVudFRhYmxlKSB7XHJcbiAgICAgICAgdGFibGVzLnB1c2goY3VycmVudFRhYmxlKTtcclxuICAgICAgfVxyXG4gICAgICBjdXJyZW50VGFibGUgPSB7XHJcbiAgICAgICAgbmFtZTogdHJpbW1lZExpbmUuc3Vic3RyaW5nKDMpLnRyaW0oKSxcclxuICAgICAgICBmaWVsZHM6IFtdLFxyXG4gICAgICAgIGRhdGE6IFtdXHJcbiAgICAgIH07XHJcbiAgICB9IGVsc2UgaWYgKGN1cnJlbnRUYWJsZSkge1xyXG4gICAgICBjb25zdCBjZWxscyA9IHRyaW1tZWRMaW5lLnNwbGl0KCcsJykubWFwKGNlbGwgPT4gY2VsbC50cmltKCkpO1xyXG4gICAgICBpZiAoY2VsbHMubGVuZ3RoID4gMSkge1xyXG4gICAgICAgIGlmIChjdXJyZW50VGFibGUuZmllbGRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgZGVidWcoYOiuvue9ruWtl+autTogJHtjZWxscy5qb2luKCcsICcpfWApO1xyXG4gICAgICAgICAgY3VycmVudFRhYmxlLmZpZWxkcyA9IGNlbGxzO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBkZWJ1Zyhg5re75Yqg5pWw5o2u6KGMOiAke2NlbGxzLmpvaW4oJywgJyl9YCk7XHJcbiAgICAgICAgICBjdXJyZW50VGFibGUuZGF0YS5wdXNoKGNlbGxzKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmIChjdXJyZW50VGFibGUpIHtcclxuICAgIHRhYmxlcy5wdXNoKGN1cnJlbnRUYWJsZSk7XHJcbiAgfVxyXG5cclxuICBpbmZvKGDop6PmnpDlrozmiJDvvIznu5Pmnpw6ICR7SlNPTi5zdHJpbmdpZnkodGFibGVzKS5zdWJzdHJpbmcoMCwgMTAwKX0uLi5gKTtcclxuICByZXR1cm4gdGFibGVzO1xyXG59XHJcbiIsImltcG9ydCB7IFBsdWdpbiwgTm90aWNlLCBURmlsZSwgTWFya2Rvd25WaWV3LCBFdmVudHMsIEFwcCwgUGx1Z2luTWFuaWZlc3QsIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcsIEJ1dHRvbkNvbXBvbmVudCB9IGZyb20gJ29ic2lkaWFuJztcclxuaW1wb3J0IHsgRGF0YWJhc2VWaWV3LCBEQVRBQkFTRV9WSUVXX1RZUEUgfSBmcm9tICcuL0RhdGFiYXNlVmlldyc7XHJcbmltcG9ydCB7IHBhcnNlRGF0YWJhc2UsIERhdGFiYXNlVGFibGUgfSBmcm9tICcuL2RhdGFiYXNlUGFyc2VyJztcclxuaW1wb3J0IHsgZGVidWcsIGluZm8sIHdhcm4sIGVycm9yIH0gZnJvbSAnLi91dGlscy9sb2dnZXInO1xyXG5pbXBvcnQgJy4uL3N0eWxlcy5jc3MnO1xyXG5cclxuaW50ZXJmYWNlIERhdGFiYXNlUGx1Z2luU2V0dGluZ3Mge1xyXG4gIGRlZmF1bHRTb3J0RGlyZWN0aW9uOiAnYXNjJyB8ICdkZXNjJztcclxufVxyXG5cclxuY29uc3QgREVGQVVMVF9TRVRUSU5HUzogRGF0YWJhc2VQbHVnaW5TZXR0aW5ncyA9IHtcclxuICBkZWZhdWx0U29ydERpcmVjdGlvbjogJ2FzYydcclxufTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIERhdGFiYXNlUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcclxuICBwcml2YXRlIGRhdGFiYXNlVmlldzogRGF0YWJhc2VWaWV3IHwgbnVsbCA9IG51bGw7XHJcbiAgc2V0dGluZ3M6IERhdGFiYXNlUGx1Z2luU2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTO1xyXG5cclxuICBhc3luYyBvbmxvYWQoKSB7XHJcbiAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xyXG4gICAgaW5mbygn5Yqg6L295pWw5o2u5bqT5o+S5Lu2Jyk7XHJcblxyXG4gICAgdGhpcy5yZWdpc3RlclZpZXcoXHJcbiAgICAgIERBVEFCQVNFX1ZJRVdfVFlQRSxcclxuICAgICAgKGxlYWYpID0+IG5ldyBEYXRhYmFzZVZpZXcobGVhZiwgdGhpcylcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgaWQ6ICdwYXJzZS1jdXJyZW50LWZpbGUnLFxyXG4gICAgICBuYW1lOiAn6Kej5p6Q5b2T5YmN5paH5Lu25Lit55qE5pWw5o2u5bqTJyxcclxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMucGFyc2VBbmRVcGRhdGVWaWV3KClcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMucmVnaXN0ZXJFdmVudChcclxuICAgICAgdGhpcy5hcHAud29ya3NwYWNlLm9uKCdmaWxlLW9wZW4nLCAoZmlsZSkgPT4ge1xyXG4gICAgICAgIGlmIChmaWxlICYmIGZpbGUuZXh0ZW5zaW9uID09PSAnbWQnKSB7XHJcbiAgICAgICAgICB0aGlzLnBhcnNlQW5kVXBkYXRlVmlldygpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KFxyXG4gICAgICB0aGlzLmFwcC52YXVsdC5vbignbW9kaWZ5JywgKGZpbGUpID0+IHtcclxuICAgICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlICYmIGZpbGUuZXh0ZW5zaW9uID09PSAnbWQnKSB7XHJcbiAgICAgICAgICB0aGlzLnBhcnNlQW5kVXBkYXRlVmlldygpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5hZGRSaWJib25JY29uKCdkYXRhYmFzZScsICfmiZPlvIDmlbDmja7lupPop4blm74nLCAoKSA9PiB7XHJcbiAgICAgIHRoaXMuYWN0aXZhdGVWaWV3KCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xyXG4gICAgICBpZDogJ29wZW4tZGF0YWJhc2UtdmlldycsXHJcbiAgICAgIG5hbWU6ICfmiZPlvIDmlbDmja7lupPop4blm74nLFxyXG4gICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5hY3RpdmF0ZVZpZXcoKVxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBEYXRhYmFzZVBsdWdpblNldHRpbmdUYWIodGhpcy5hcHAsIHRoaXMpKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpIHtcclxuICAgIGNvbnN0IGxvYWRlZERhdGEgPSBhd2FpdCB0aGlzLmxvYWREYXRhKCk7XHJcbiAgICBjb25zdCBwYXJzZWREYXRhID0gbG9hZGVkRGF0YSA/IEpTT04ucGFyc2UobG9hZGVkRGF0YSkgOiB7fTtcclxuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBwYXJzZWREYXRhKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHBhcnNlQW5kVXBkYXRlVmlldygpIHtcclxuICAgIGNvbnN0IGFjdGl2ZVZpZXcgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlVmlld09mVHlwZShNYXJrZG93blZpZXcpO1xyXG4gICAgaWYgKGFjdGl2ZVZpZXcpIHtcclxuICAgICAgY29uc3QgY29udGVudCA9IGFjdGl2ZVZpZXcuZ2V0Vmlld0RhdGEoKTtcclxuICAgICAgZGVidWcoYOiOt+WPluWIsOeahOaWh+S7tuWGheWuuTogJHtjb250ZW50fWApO1xyXG4gICAgICBjb25zdCB0YWJsZXMgPSBwYXJzZURhdGFiYXNlKGNvbnRlbnQpO1xyXG4gICAgICBkZWJ1Zyhg6Kej5p6Q5ZCO55qE6KGo5qC85pWw5o2uOiAke0pTT04uc3RyaW5naWZ5KHRhYmxlcyl9YCk7XHJcblxyXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh0YWJsZXMpICYmIHRhYmxlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5hY3RpdmF0ZVZpZXcoKTtcclxuICAgICAgICBpZiAodGhpcy5kYXRhYmFzZVZpZXcpIHtcclxuICAgICAgICAgIGluZm8oJ+abtOaWsOaVsOaNruW6k+inhuWbvicpO1xyXG4gICAgICAgICAgdGhpcy5kYXRhYmFzZVZpZXcuc2V0VGFibGVzKHRhYmxlcyk7XHJcbiAgICAgICAgICBuZXcgTm90aWNlKCfmlbDmja7lupPop4blm77lt7Lmm7TmlrAnKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgZXJyb3IoJ+aXoOazleWIm+W7uuaIluiOt+WPluaVsOaNruW6k+inhuWbvicpO1xyXG4gICAgICAgICAgbmV3IE5vdGljZSgn5pu05paw5pWw5o2u5bqT6KeG5Zu+5aSx6LSlJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGVycm9yKGDop6PmnpDnu5Pmnpzml6DmlYg6ICR7SlNPTi5zdHJpbmdpZnkodGFibGVzKX1gKTtcclxuICAgICAgICBuZXcgTm90aWNlKCfop6PmnpDmlbDmja7lupPlpLHotKXvvIzor7fmo4Dmn6Xmlofku7bmoLzlvI8nKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgbmV3IE5vdGljZSgn6K+35omT5byA5LiA5LiqIE1hcmtkb3duIOaWh+S7ticpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgYWN0aXZhdGVWaWV3KCkge1xyXG4gICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuYXBwO1xyXG4gICAgbGV0IGxlYWYgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKERBVEFCQVNFX1ZJRVdfVFlQRSlbMF07XHJcbiAgICBpZiAoIWxlYWYpIHtcclxuICAgICAgbGVhZiA9IHdvcmtzcGFjZS5nZXRSaWdodExlYWYoZmFsc2UpO1xyXG4gICAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IERBVEFCQVNFX1ZJRVdfVFlQRSwgYWN0aXZlOiB0cnVlIH0pO1xyXG4gICAgfVxyXG4gICAgd29ya3NwYWNlLnJldmVhbExlYWYobGVhZik7XHJcbiAgICBcclxuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKTtcclxuICAgIFxyXG4gICAgdGhpcy5kYXRhYmFzZVZpZXcgPSBsZWFmLnZpZXcgYXMgRGF0YWJhc2VWaWV3O1xyXG4gICAgaW5mbyhg5pWw5o2u5bqT6KeG5Zu+5bey5r+A5rS7OiAke3RoaXMuZGF0YWJhc2VWaWV3ID8gJ3N1Y2Nlc3MnIDogJ2ZhaWwnfWApO1xyXG4gICAgXHJcbiAgICBpZiAoIXRoaXMuZGF0YWJhc2VWaWV3KSB7XHJcbiAgICAgIGVycm9yKCfmv4DmtLvmlbDmja7lupPop4blm77lpLHotKUnKTtcclxuICAgICAgbmV3IE5vdGljZSgn5peg5rOV5Yib5bu65pWw5o2u5bqT6KeG5Zu+Jyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBvbnVubG9hZCgpIHtcclxuICAgIGluZm8oJ+WNuOi9veaVsOaNruW6k+aPkuS7ticpO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgc2F2ZURhdGEoKSB7XHJcbiAgICBhd2FpdCB0aGlzLnNhdmVTZXR0aW5ncygpO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCkge1xyXG4gICAgYXdhaXQgKHRoaXMuc2F2ZURhdGEgYXMgKGRhdGE6IGFueSkgPT4gUHJvbWlzZTx2b2lkPikoSlNPTi5zdHJpbmdpZnkodGhpcy5zZXR0aW5ncykpO1xyXG4gIH1cclxufVxyXG5cclxuY2xhc3MgRGF0YWJhc2VQbHVnaW5TZXR0aW5nVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XHJcbiAgcGx1Z2luOiBEYXRhYmFzZVBsdWdpbjtcclxuXHJcbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogRGF0YWJhc2VQbHVnaW4pIHtcclxuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcclxuICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG4gIH1cclxuXHJcbiAgZGlzcGxheSgpOiB2b2lkIHtcclxuICAgIGxldCB7Y29udGFpbmVyRWx9ID0gdGhpcztcclxuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XHJcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDInLCB7dGV4dDogJ+aVsOaNruW6k+aPkuS7tuiuvue9rid9KTtcclxuXHJcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgLnNldE5hbWUoJ+m7mOiupOaOkuW6j+aWueWQkScpXHJcbiAgICAgIC5zZXREZXNjKCforr7nva7ooajmoLznmoTpu5jorqTmjpLluo/mlrnlkJEnKVxyXG4gICAgICAuYWRkRHJvcGRvd24oZHJvcGRvd24gPT4gZHJvcGRvd25cclxuICAgICAgICAuYWRkT3B0aW9uKCdhc2MnLCAn5Y2H5bqPJylcclxuICAgICAgICAuYWRkT3B0aW9uKCdkZXNjJywgJ+mZjeW6jycpXHJcbiAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRTb3J0RGlyZWN0aW9uKVxyXG4gICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRTb3J0RGlyZWN0aW9uID0gdmFsdWUgYXMgJ2FzYycgfCAnZGVzYyc7XHJcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICB9KSk7XHJcbiAgfVxyXG59XHJcbiJdLCJuYW1lcyI6WyJJdGVtVmlldyIsIkRyb3Bkb3duQ29tcG9uZW50IiwiQnV0dG9uQ29tcG9uZW50IiwiVGV4dENvbXBvbmVudCIsIk5vdGljZSIsIk1hcmtkb3duVmlldyIsIkZ1enp5U3VnZ2VzdE1vZGFsIiwiVEZvbGRlciIsIk1vZGFsIiwiU2V0dGluZyIsIlBsdWdpbiIsIlRGaWxlIiwiUGx1Z2luU2V0dGluZ1RhYiJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFvR0E7QUFDTyxTQUFTLFNBQVMsQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUU7QUFDN0QsSUFBSSxTQUFTLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPLEtBQUssWUFBWSxDQUFDLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLFVBQVUsT0FBTyxFQUFFLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7QUFDaEgsSUFBSSxPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxPQUFPLENBQUMsRUFBRSxVQUFVLE9BQU8sRUFBRSxNQUFNLEVBQUU7QUFDL0QsUUFBUSxTQUFTLFNBQVMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO0FBQ25HLFFBQVEsU0FBUyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMs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
