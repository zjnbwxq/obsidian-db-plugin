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
function setLogLevel(level) {
    if (Object.values(LogLevel).includes(level)) {
        currentLogLevel = level;
    }
    else {
        console.error('无效的日志级别');
    }
}
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
setLogLevel(LogLevel.DEBUG);

const DATABASE_VIEW_TYPE = 'database-view';
class DatabaseView extends obsidian.ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.tables = [];
        this.tableStates = [];
        this.sortStates = new Map();
        this.tableElements = new Map();
        this.selectedTables = new Set();
        this.plugin = plugin;
        this.tables = []; // 初始化为空数组
    }
    getViewType() {
        return DATABASE_VIEW_TYPE;
    }
    getDisplayText() {
        return '数据库视图';
    }
    onOpen() {
        return __awaiter(this, void 0, void 0, function* () {
            const container = this.containerEl.children[1];
            container.empty();
            container.addClass('database-view-container');
            const topBar = container.createEl('div', { cls: 'database-view-top-bar' });
            debug('创建顶部栏元素');
            this.exportDropdown = new obsidian.DropdownComponent(topBar)
                .addOption('csv', 'CSV')
                .addOption('json', 'JSON')
                .setValue('csv');
            debug('导出下拉菜单已创建');
            this.exportButton = new obsidian.ButtonComponent(topBar)
                .setButtonText('导出')
                .onClick(() => this.openExportModal());
            this.importButton = new obsidian.ButtonComponent(topBar)
                .setButtonText('导入')
                .onClick(() => this.importData());
            debug('导出和导入按钮已创建');
            // 确保所有按钮都被添加到顶部栏
            topBar.appendChild(this.exportDropdown.selectEl);
            topBar.appendChild(this.exportButton.buttonEl);
            topBar.appendChild(this.importButton.buttonEl);
            // 确保在创建按钮后调用 renderTables
            this.renderTables();
            debug('表格已渲染');
            // 添加调试代码
            debug(`顶部栏是否存在: ${!!topBar}`);
            debug(`顶部栏HTML: ${topBar.outerHTML}`);
            debug(`导出下拉菜单是否存在: ${!!this.exportDropdown}`);
            debug(`导出按钮是否存在: ${!!this.exportButton}`);
            debug(`导入按钮是否存在: ${!!this.importButton}`);
            if (this.exportButton && this.importButton) {
                debug(`导出按钮HTML: ${this.exportButton.buttonEl.outerHTML}`);
                debug(`导入按钮HTML: ${this.importButton.buttonEl.outerHTML}`);
            }
            this.checkButtonVisibility();
            // 在 onOpen 方法的末尾添加
            this.app.workspace.updateOptions();
        });
    }
    onClose() {
        return __awaiter(this, void 0, void 0, function* () {
            // 清理工作
        });
    }
    setTables(tables) {
        this.tables = tables;
        this.tableStates = tables.map((table, index) => ({
            table,
            id: index,
            searchTerm: ''
        }));
        this.renderTables();
        this.checkButtonVisibility();
        // 在 setTables 方法的末尾添加
        this.app.workspace.updateOptions();
    }
    getTables() {
        return this.tables;
    }
    renderTables() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('database-view-container');
        // 确保顶部栏在表格之前
        const topBar = container.createEl('div', { cls: 'database-view-top-bar' });
        if (this.exportDropdown)
            topBar.appendChild(this.exportDropdown.selectEl);
        if (this.exportButton)
            topBar.appendChild(this.exportButton.buttonEl);
        if (this.importButton)
            topBar.appendChild(this.importButton.buttonEl);
        this.tableStates.forEach(state => {
            const tableContainer = container.createEl('div', { cls: 'database-table-container' });
            tableContainer.createEl('h3', { text: state.table.name });
            const searchInput = new obsidian.TextComponent(tableContainer)
                .setPlaceholder('搜索...')
                .onChange(value => {
                state.searchTerm = value;
                this.updateTable(state);
            });
            searchInput.inputEl.addClass('search-input');
            const tableElement = tableContainer.createEl('table', { cls: 'database-table' });
            this.renderTable(state, tableElement);
            this.tableElements.set(state.table, tableElement);
        });
    }
    renderTable(state, tableElement) {
        tableElement.empty();
        const { table } = state;
        const headerRow = tableElement.createEl('tr');
        table.fields.forEach(field => {
            const th = headerRow.createEl('th');
            const headerContent = th.createEl('div', { cls: 'header-content' });
            headerContent.createEl('span', { text: field, cls: 'column-name' });
            const sortIndicator = headerContent.createEl('span', { cls: 'sort-indicator' });
            const currentSort = this.sortStates.get(table);
            if (currentSort && currentSort.column === field) {
                th.addClass('sorted');
                th.addClass(currentSort.direction);
                sortIndicator.setText(currentSort.direction === 'asc' ? '▲' : '▼');
            }
            else {
                sortIndicator.setText('⇅');
            }
            th.addEventListener('click', () => this.sortTable(table, field));
        });
        const filteredData = table.data.filter(row => row.some(cell => cell.toLowerCase().includes(state.searchTerm.toLowerCase())));
        filteredData.forEach(row => {
            const tr = tableElement.createEl('tr');
            row.forEach(cell => {
                tr.createEl('td', { text: cell });
            });
        });
    }
    updateTable(state) {
        const tableElement = this.tableElements.get(state.table);
        if (tableElement) {
            this.renderTable(state, tableElement);
        }
    }
    sortTable(table, column) {
        const currentSort = this.sortStates.get(table) || { column: '', direction: 'asc' };
        const newDirection = currentSort.column === column && currentSort.direction === 'asc' ? 'desc' : 'asc';
        const columnIndex = table.fields.indexOf(column);
        table.data.sort((a, b) => {
            const valueA = a[columnIndex].toLowerCase();
            const valueB = b[columnIndex].toLowerCase();
            if (valueA < valueB)
                return newDirection === 'asc' ? -1 : 1;
            if (valueA > valueB)
                return newDirection === 'asc' ? 1 : -1;
            return 0;
        });
        this.sortStates.set(table, { column, direction: newDirection });
        this.renderTables();
    }
    exportData(selectedTables, format) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!format)
                return;
            let content = '';
            const tablesToExport = this.tables.filter(table => selectedTables.includes(table.name));
            if (format === 'csv') {
                content = tablesToExport.map(table => [table.fields.join(',')]
                    .concat(table.data.map(row => row.join(',')))
                    .join('\n')).join('\n\n');
            }
            else if (format === 'json') {
                content = JSON.stringify(tablesToExport, null, 2);
            }
            // 使用 Electron 的 dialog API 让用户选择保存位置
            const { remote } = require('electron');
            const path = yield remote.dialog.showSaveDialog({
                title: '选择保存位置',
                defaultPath: `exported_tables.${format}`,
                filters: [
                    { name: format.toUpperCase(), extensions: [format] },
                    { name: '所有文件', extensions: ['*'] }
                ]
            });
            if (path.canceled) {
                new obsidian.Notice('导出已取消');
                return;
            }
            // 使用 Obsidian 的 vault.adapter.writeBinary 方法保存文件
            yield this.app.vault.adapter.writeBinary(path.filePath, new TextEncoder().encode(content));
            new obsidian.Notice(`已导出 ${selectedTables.length} 个表格到 ${path.filePath}`);
        });
    }
    importData() {
        return __awaiter(this, void 0, void 0, function* () {
            new ImportMethodModal(this.app, (method) => __awaiter(this, void 0, void 0, function* () {
                if (method === 'file') {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.csv,.json';
                    input.onchange = () => __awaiter(this, void 0, void 0, function* () {
                        var _a;
                        const file = (_a = input.files) === null || _a === void 0 ? void 0 : _a[0];
                        if (file) {
                            const content = yield file.text();
                            this.processImportedContent(content, file.name.endsWith('.json') ? 'json' : 'csv');
                        }
                    });
                    input.click();
                }
                else if (method === 'clipboard') {
                    const content = yield navigator.clipboard.readText();
                    this.processImportedContent(content);
                }
            })).open();
        });
    }
    processImportedContent(content, format) {
        return __awaiter(this, void 0, void 0, function* () {
            let tables = [];
            if (!format) {
                try {
                    JSON.parse(content);
                    format = 'json';
                }
                catch (_a) {
                    format = 'csv';
                }
            }
            if (format === 'csv') {
                const lines = content.split('\n').map(line => line.trim()).filter(line => line);
                const table = { name: 'Imported Table', fields: [], data: [] };
                table.fields = lines[0].split(',').map(field => field.trim());
                table.data = lines.slice(1).map(line => line.split(',').map(cell => cell.trim()));
                tables = [table];
            }
            else if (format === 'json') {
                tables = JSON.parse(content);
            }
            this.setTables(tables);
            new obsidian.Notice('数据导入成功');
        });
    }
    insertContent(content) {
        const activeView = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        if (activeView) {
            const editor = activeView.editor;
            const cursor = editor.getCursor();
            editor.replaceRange(content, cursor);
        }
        else {
            new obsidian.Notice('请先打开一个 Markdown 文件');
        }
    }
    checkButtonVisibility() {
        if (this.exportButton && this.importButton) {
            const exportButtonRect = this.exportButton.buttonEl.getBoundingClientRect();
            const importButtonRect = this.importButton.buttonEl.getBoundingClientRect();
            debug(`导出按钮位置: top=${exportButtonRect.top}, left=${exportButtonRect.left}, width=${exportButtonRect.width}, height=${exportButtonRect.height}`);
            debug(`导入按钮位置: top=${importButtonRect.top}, left=${importButtonRect.left}, width=${importButtonRect.width}, height=${importButtonRect.height}`);
        }
        else {
            warn('按钮未创建');
        }
    }
    checkButtonVisibilityWithDelay() {
        setTimeout(() => {
            this.checkButtonVisibility();
        }, 100); // 100ms 延迟
    }
    openExportModal() {
        new ExportModal(this.app, this.tables, (selectedTables) => {
            var _a;
            const format = (_a = this.exportDropdown) === null || _a === void 0 ? void 0 : _a.getValue();
            this.exportData(selectedTables, format);
        }).open();
    }
}
class ImportMethodModal extends obsidian.Modal {
    constructor(app, callback) {
        super(app);
        this.callback = callback;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: '选择导入方式' });
        new obsidian.Setting(contentEl)
            .setName('从文件导入')
            .setDesc('选择一个 CSV 或 JSON 文件')
            .addButton(button => button
            .setButtonText('选择文件')
            .onClick(() => {
            this.close();
            this.callback('file');
        }));
        new obsidian.Setting(contentEl)
            .setName('从剪贴板导入')
            .setDesc('从剪贴板粘贴 CSV 或 JSON 数据')
            .addButton(button => button
            .setButtonText('从剪贴板导入')
            .onClick(() => {
            this.close();
            this.callback('clipboard');
        }));
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
class ExportModal extends obsidian.Modal {
    constructor(app, tables, onSubmit) {
        super(app);
        this.tables = tables;
        this.onSubmit = onSubmit;
        this.selectedTables = new Set();
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: '选择要导出的表格' });
        this.tables.forEach(table => {
            new obsidian.Setting(contentEl)
                .setName(table.name)
                .addToggle(toggle => toggle
                .setValue(this.selectedTables.has(table.name))
                .onChange(value => {
                if (value) {
                    this.selectedTables.add(table.name);
                }
                else {
                    this.selectedTables.delete(table.name);
                }
            }));
        });
        new obsidian.Setting(contentEl)
            .addButton(button => button
            .setButtonText('导出')
            .setCta()
            .onClick(() => {
            this.onSubmit(Array.from(this.selectedTables));
            this.close();
        }));
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
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
            // 暴露接口给其他插件
            this.app.plugins.simple_database = this;
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
        // 移除暴露的接口
        delete this.app.plugins.simple_database;
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
    getDatabaseData() {
        if (this.databaseView) {
            return this.databaseView.getTables();
        }
        return null;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInNyYy91dGlscy9sb2dnZXIudHMiLCJzcmMvRGF0YWJhc2VWaWV3LnRzIiwic3JjL2RhdGFiYXNlUGFyc2VyLnRzIiwic3JjL21haW4udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG5Db3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi5cclxuXHJcblBlcm1pc3Npb24gdG8gdXNlLCBjb3B5LCBtb2RpZnksIGFuZC9vciBkaXN0cmlidXRlIHRoaXMgc29mdHdhcmUgZm9yIGFueVxyXG5wdXJwb3NlIHdpdGggb3Igd2l0aG91dCBmZWUgaXMgaGVyZWJ5IGdyYW50ZWQuXHJcblxyXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiIEFORCBUSEUgQVVUSE9SIERJU0NMQUlNUyBBTEwgV0FSUkFOVElFUyBXSVRIXHJcblJFR0FSRCBUTyBUSElTIFNPRlRXQVJFIElOQ0xVRElORyBBTEwgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWVxyXG5BTkQgRklUTkVTUy4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUiBCRSBMSUFCTEUgRk9SIEFOWSBTUEVDSUFMLCBESVJFQ1QsXHJcbklORElSRUNULCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVMgT1IgQU5ZIERBTUFHRVMgV0hBVFNPRVZFUiBSRVNVTFRJTkcgRlJPTVxyXG5MT1NTIE9GIFVTRSwgREFUQSBPUiBQUk9GSVRTLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgTkVHTElHRU5DRSBPUlxyXG5PVEhFUiBUT1JUSU9VUyBBQ1RJT04sIEFSSVNJTkcgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgVVNFIE9SXHJcblBFUkZPUk1BTkNFIE9GIFRISVMgU09GVFdBUkUuXHJcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqICovXHJcbi8qIGdsb2JhbCBSZWZsZWN0LCBQcm9taXNlLCBTdXBwcmVzc2VkRXJyb3IsIFN5bWJvbCwgSXRlcmF0b3IgKi9cclxuXHJcbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwgcCkpIGRbcF0gPSBiW3BdOyB9O1xyXG4gICAgcmV0dXJuIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHRlbmRzKGQsIGIpIHtcclxuICAgIGlmICh0eXBlb2YgYiAhPT0gXCJmdW5jdGlvblwiICYmIGIgIT09IG51bGwpXHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNsYXNzIGV4dGVuZHMgdmFsdWUgXCIgKyBTdHJpbmcoYikgKyBcIiBpcyBub3QgYSBjb25zdHJ1Y3RvciBvciBudWxsXCIpO1xyXG4gICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XHJcbiAgICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gX19hc3NpZ24odCkge1xyXG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpIHRbcF0gPSBzW3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH1cclxuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXN0KHMsIGUpIHtcclxuICAgIHZhciB0ID0ge307XHJcbiAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcclxuICAgICAgICB0W3BdID0gc1twXTtcclxuICAgIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChlLmluZGV4T2YocFtpXSkgPCAwICYmIE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChzLCBwW2ldKSlcclxuICAgICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xyXG4gICAgICAgIH1cclxuICAgIHJldHVybiB0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXNEZWNvcmF0ZShjdG9yLCBkZXNjcmlwdG9ySW4sIGRlY29yYXRvcnMsIGNvbnRleHRJbiwgaW5pdGlhbGl6ZXJzLCBleHRyYUluaXRpYWxpemVycykge1xyXG4gICAgZnVuY3Rpb24gYWNjZXB0KGYpIHsgaWYgKGYgIT09IHZvaWQgMCAmJiB0eXBlb2YgZiAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRnVuY3Rpb24gZXhwZWN0ZWRcIik7IHJldHVybiBmOyB9XHJcbiAgICB2YXIga2luZCA9IGNvbnRleHRJbi5raW5kLCBrZXkgPSBraW5kID09PSBcImdldHRlclwiID8gXCJnZXRcIiA6IGtpbmQgPT09IFwic2V0dGVyXCIgPyBcInNldFwiIDogXCJ2YWx1ZVwiO1xyXG4gICAgdmFyIHRhcmdldCA9ICFkZXNjcmlwdG9ySW4gJiYgY3RvciA/IGNvbnRleHRJbltcInN0YXRpY1wiXSA/IGN0b3IgOiBjdG9yLnByb3RvdHlwZSA6IG51bGw7XHJcbiAgICB2YXIgZGVzY3JpcHRvciA9IGRlc2NyaXB0b3JJbiB8fCAodGFyZ2V0ID8gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGNvbnRleHRJbi5uYW1lKSA6IHt9KTtcclxuICAgIHZhciBfLCBkb25lID0gZmFsc2U7XHJcbiAgICBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgIHZhciBjb250ZXh0ID0ge307XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4pIGNvbnRleHRbcF0gPSBwID09PSBcImFjY2Vzc1wiID8ge30gOiBjb250ZXh0SW5bcF07XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4uYWNjZXNzKSBjb250ZXh0LmFjY2Vzc1twXSA9IGNvbnRleHRJbi5hY2Nlc3NbcF07XHJcbiAgICAgICAgY29udGV4dC5hZGRJbml0aWFsaXplciA9IGZ1bmN0aW9uIChmKSB7IGlmIChkb25lKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGFkZCBpbml0aWFsaXplcnMgYWZ0ZXIgZGVjb3JhdGlvbiBoYXMgY29tcGxldGVkXCIpOyBleHRyYUluaXRpYWxpemVycy5wdXNoKGFjY2VwdChmIHx8IG51bGwpKTsgfTtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gKDAsIGRlY29yYXRvcnNbaV0pKGtpbmQgPT09IFwiYWNjZXNzb3JcIiA/IHsgZ2V0OiBkZXNjcmlwdG9yLmdldCwgc2V0OiBkZXNjcmlwdG9yLnNldCB9IDogZGVzY3JpcHRvcltrZXldLCBjb250ZXh0KTtcclxuICAgICAgICBpZiAoa2luZCA9PT0gXCJhY2Nlc3NvclwiKSB7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IHZvaWQgMCkgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IG51bGwgfHwgdHlwZW9mIHJlc3VsdCAhPT0gXCJvYmplY3RcIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBleHBlY3RlZFwiKTtcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmdldCkpIGRlc2NyaXB0b3IuZ2V0ID0gXztcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LnNldCkpIGRlc2NyaXB0b3Iuc2V0ID0gXztcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmluaXQpKSBpbml0aWFsaXplcnMudW5zaGlmdChfKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoXyA9IGFjY2VwdChyZXN1bHQpKSB7XHJcbiAgICAgICAgICAgIGlmIChraW5kID09PSBcImZpZWxkXCIpIGluaXRpYWxpemVycy51bnNoaWZ0KF8pO1xyXG4gICAgICAgICAgICBlbHNlIGRlc2NyaXB0b3Jba2V5XSA9IF87XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRhcmdldCkgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgY29udGV4dEluLm5hbWUsIGRlc2NyaXB0b3IpO1xyXG4gICAgZG9uZSA9IHRydWU7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19ydW5Jbml0aWFsaXplcnModGhpc0FyZywgaW5pdGlhbGl6ZXJzLCB2YWx1ZSkge1xyXG4gICAgdmFyIHVzZVZhbHVlID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGluaXRpYWxpemVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhbHVlID0gdXNlVmFsdWUgPyBpbml0aWFsaXplcnNbaV0uY2FsbCh0aGlzQXJnLCB2YWx1ZSkgOiBpbml0aWFsaXplcnNbaV0uY2FsbCh0aGlzQXJnKTtcclxuICAgIH1cclxuICAgIHJldHVybiB1c2VWYWx1ZSA/IHZhbHVlIDogdm9pZCAwO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcHJvcEtleSh4KSB7XHJcbiAgICByZXR1cm4gdHlwZW9mIHggPT09IFwic3ltYm9sXCIgPyB4IDogXCJcIi5jb25jYXQoeCk7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zZXRGdW5jdGlvbk5hbWUoZiwgbmFtZSwgcHJlZml4KSB7XHJcbiAgICBpZiAodHlwZW9mIG5hbWUgPT09IFwic3ltYm9sXCIpIG5hbWUgPSBuYW1lLmRlc2NyaXB0aW9uID8gXCJbXCIuY29uY2F0KG5hbWUuZGVzY3JpcHRpb24sIFwiXVwiKSA6IFwiXCI7XHJcbiAgICByZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnR5KGYsIFwibmFtZVwiLCB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSwgdmFsdWU6IHByZWZpeCA/IFwiXCIuY29uY2F0KHByZWZpeCwgXCIgXCIsIG5hbWUpIDogbmFtZSB9KTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX21ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKSB7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QubWV0YWRhdGEgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIFJlZmxlY3QubWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdGVyKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XHJcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cclxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZ2VuZXJhdG9yKHRoaXNBcmcsIGJvZHkpIHtcclxuICAgIHZhciBfID0geyBsYWJlbDogMCwgc2VudDogZnVuY3Rpb24oKSB7IGlmICh0WzBdICYgMSkgdGhyb3cgdFsxXTsgcmV0dXJuIHRbMV07IH0sIHRyeXM6IFtdLCBvcHM6IFtdIH0sIGYsIHksIHQsIGcgPSBPYmplY3QuY3JlYXRlKCh0eXBlb2YgSXRlcmF0b3IgPT09IFwiZnVuY3Rpb25cIiA/IEl0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpO1xyXG4gICAgcmV0dXJuIGcubmV4dCA9IHZlcmIoMCksIGdbXCJ0aHJvd1wiXSA9IHZlcmIoMSksIGdbXCJyZXR1cm5cIl0gPSB2ZXJiKDIpLCB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgKGdbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSksIGc7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgcmV0dXJuIGZ1bmN0aW9uICh2KSB7IHJldHVybiBzdGVwKFtuLCB2XSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHN0ZXAob3ApIHtcclxuICAgICAgICBpZiAoZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7XHJcbiAgICAgICAgd2hpbGUgKGcgJiYgKGcgPSAwLCBvcFswXSAmJiAoXyA9IDApKSwgXykgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKGYgPSAxLCB5ICYmICh0ID0gb3BbMF0gJiAyID8geVtcInJldHVyblwiXSA6IG9wWzBdID8geVtcInRocm93XCJdIHx8ICgodCA9IHlbXCJyZXR1cm5cIl0pICYmIHQuY2FsbCh5KSwgMCkgOiB5Lm5leHQpICYmICEodCA9IHQuY2FsbCh5LCBvcFsxXSkpLmRvbmUpIHJldHVybiB0O1xyXG4gICAgICAgICAgICBpZiAoeSA9IDAsIHQpIG9wID0gW29wWzBdICYgMiwgdC52YWx1ZV07XHJcbiAgICAgICAgICAgIHN3aXRjaCAob3BbMF0pIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgMDogY2FzZSAxOiB0ID0gb3A7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA0OiBfLmxhYmVsKys7IHJldHVybiB7IHZhbHVlOiBvcFsxXSwgZG9uZTogZmFsc2UgfTtcclxuICAgICAgICAgICAgICAgIGNhc2UgNTogXy5sYWJlbCsrOyB5ID0gb3BbMV07IG9wID0gWzBdOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGNhc2UgNzogb3AgPSBfLm9wcy5wb3AoKTsgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEodCA9IF8udHJ5cywgdCA9IHQubGVuZ3RoID4gMCAmJiB0W3QubGVuZ3RoIC0gMV0pICYmIChvcFswXSA9PT0gNiB8fCBvcFswXSA9PT0gMikpIHsgXyA9IDA7IGNvbnRpbnVlOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSAzICYmICghdCB8fCAob3BbMV0gPiB0WzBdICYmIG9wWzFdIDwgdFszXSkpKSB7IF8ubGFiZWwgPSBvcFsxXTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDYgJiYgXy5sYWJlbCA8IHRbMV0pIHsgXy5sYWJlbCA9IHRbMV07IHQgPSBvcDsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodCAmJiBfLmxhYmVsIDwgdFsyXSkgeyBfLmxhYmVsID0gdFsyXTsgXy5vcHMucHVzaChvcCk7IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRbMl0pIF8ub3BzLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIF8udHJ5cy5wb3AoKTsgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgb3AgPSBib2R5LmNhbGwodGhpc0FyZywgXyk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkgeyBvcCA9IFs2LCBlXTsgeSA9IDA7IH0gZmluYWxseSB7IGYgPSB0ID0gMDsgfVxyXG4gICAgICAgIGlmIChvcFswXSAmIDUpIHRocm93IG9wWzFdOyByZXR1cm4geyB2YWx1ZTogb3BbMF0gPyBvcFsxXSA6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fY3JlYXRlQmluZGluZyA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobSwgayk7XHJcbiAgICBpZiAoIWRlc2MgfHwgKFwiZ2V0XCIgaW4gZGVzYyA/ICFtLl9fZXNNb2R1bGUgOiBkZXNjLndyaXRhYmxlIHx8IGRlc2MuY29uZmlndXJhYmxlKSkge1xyXG4gICAgICAgIGRlc2MgPSB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH07XHJcbiAgICB9XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIGRlc2MpO1xyXG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIG9bazJdID0gbVtrXTtcclxufSk7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHBvcnRTdGFyKG0sIG8pIHtcclxuICAgIGZvciAodmFyIHAgaW4gbSkgaWYgKHAgIT09IFwiZGVmYXVsdFwiICYmICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobywgcCkpIF9fY3JlYXRlQmluZGluZyhvLCBtLCBwKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fdmFsdWVzKG8pIHtcclxuICAgIHZhciBzID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIFN5bWJvbC5pdGVyYXRvciwgbSA9IHMgJiYgb1tzXSwgaSA9IDA7XHJcbiAgICBpZiAobSkgcmV0dXJuIG0uY2FsbChvKTtcclxuICAgIGlmIChvICYmIHR5cGVvZiBvLmxlbmd0aCA9PT0gXCJudW1iZXJcIikgcmV0dXJuIHtcclxuICAgICAgICBuZXh0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmIChvICYmIGkgPj0gby5sZW5ndGgpIG8gPSB2b2lkIDA7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiBvICYmIG9baSsrXSwgZG9uZTogIW8gfTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihzID8gXCJPYmplY3QgaXMgbm90IGl0ZXJhYmxlLlwiIDogXCJTeW1ib2wuaXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZWFkKG8sIG4pIHtcclxuICAgIHZhciBtID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9bU3ltYm9sLml0ZXJhdG9yXTtcclxuICAgIGlmICghbSkgcmV0dXJuIG87XHJcbiAgICB2YXIgaSA9IG0uY2FsbChvKSwgciwgYXIgPSBbXSwgZTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgd2hpbGUgKChuID09PSB2b2lkIDAgfHwgbi0tID4gMCkgJiYgIShyID0gaS5uZXh0KCkpLmRvbmUpIGFyLnB1c2goci52YWx1ZSk7XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZXJyb3IpIHsgZSA9IHsgZXJyb3I6IGVycm9yIH07IH1cclxuICAgIGZpbmFsbHkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChyICYmICFyLmRvbmUgJiYgKG0gPSBpW1wicmV0dXJuXCJdKSkgbS5jYWxsKGkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmaW5hbGx5IHsgaWYgKGUpIHRocm93IGUuZXJyb3I7IH1cclxuICAgIH1cclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuLyoqIEBkZXByZWNhdGVkICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZCgpIHtcclxuICAgIGZvciAodmFyIGFyID0gW10sIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgIGFyID0gYXIuY29uY2F0KF9fcmVhZChhcmd1bWVudHNbaV0pKTtcclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuLyoqIEBkZXByZWNhdGVkICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZEFycmF5cygpIHtcclxuICAgIGZvciAodmFyIHMgPSAwLCBpID0gMCwgaWwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgaWw7IGkrKykgcyArPSBhcmd1bWVudHNbaV0ubGVuZ3RoO1xyXG4gICAgZm9yICh2YXIgciA9IEFycmF5KHMpLCBrID0gMCwgaSA9IDA7IGkgPCBpbDsgaSsrKVxyXG4gICAgICAgIGZvciAodmFyIGEgPSBhcmd1bWVudHNbaV0sIGogPSAwLCBqbCA9IGEubGVuZ3RoOyBqIDwgamw7IGorKywgaysrKVxyXG4gICAgICAgICAgICByW2tdID0gYVtqXTtcclxuICAgIHJldHVybiByO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheSh0bywgZnJvbSwgcGFjaykge1xyXG4gICAgaWYgKHBhY2sgfHwgYXJndW1lbnRzLmxlbmd0aCA9PT0gMikgZm9yICh2YXIgaSA9IDAsIGwgPSBmcm9tLmxlbmd0aCwgYXI7IGkgPCBsOyBpKyspIHtcclxuICAgICAgICBpZiAoYXIgfHwgIShpIGluIGZyb20pKSB7XHJcbiAgICAgICAgICAgIGlmICghYXIpIGFyID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZnJvbSwgMCwgaSk7XHJcbiAgICAgICAgICAgIGFyW2ldID0gZnJvbVtpXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdG8uY29uY2F0KGFyIHx8IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZyb20pKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXQodikge1xyXG4gICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfX2F3YWl0ID8gKHRoaXMudiA9IHYsIHRoaXMpIDogbmV3IF9fYXdhaXQodik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jR2VuZXJhdG9yKHRoaXNBcmcsIF9hcmd1bWVudHMsIGdlbmVyYXRvcikge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBnID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pLCBpLCBxID0gW107XHJcbiAgICByZXR1cm4gaSA9IE9iamVjdC5jcmVhdGUoKHR5cGVvZiBBc3luY0l0ZXJhdG9yID09PSBcImZ1bmN0aW9uXCIgPyBBc3luY0l0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpLCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIsIGF3YWl0UmV0dXJuKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gYXdhaXRSZXR1cm4oZikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh2KS50aGVuKGYsIHJlamVjdCk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpZiAoZ1tuXSkgeyBpW25dID0gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChhLCBiKSB7IHEucHVzaChbbiwgdiwgYSwgYl0pID4gMSB8fCByZXN1bWUobiwgdik7IH0pOyB9OyBpZiAoZikgaVtuXSA9IGYoaVtuXSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gcmVzdW1lKG4sIHYpIHsgdHJ5IHsgc3RlcChnW25dKHYpKTsgfSBjYXRjaCAoZSkgeyBzZXR0bGUocVswXVszXSwgZSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gc3RlcChyKSB7IHIudmFsdWUgaW5zdGFuY2VvZiBfX2F3YWl0ID8gUHJvbWlzZS5yZXNvbHZlKHIudmFsdWUudikudGhlbihmdWxmaWxsLCByZWplY3QpIDogc2V0dGxlKHFbMF1bMl0sIHIpOyB9XHJcbiAgICBmdW5jdGlvbiBmdWxmaWxsKHZhbHVlKSB7IHJlc3VtZShcIm5leHRcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiByZWplY3QodmFsdWUpIHsgcmVzdW1lKFwidGhyb3dcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUoZiwgdikgeyBpZiAoZih2KSwgcS5zaGlmdCgpLCBxLmxlbmd0aCkgcmVzdW1lKHFbMF1bMF0sIHFbMF1bMV0pOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jRGVsZWdhdG9yKG8pIHtcclxuICAgIHZhciBpLCBwO1xyXG4gICAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiLCBmdW5jdGlvbiAoZSkgeyB0aHJvdyBlOyB9KSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpW25dID0gb1tuXSA/IGZ1bmN0aW9uICh2KSB7IHJldHVybiAocCA9ICFwKSA/IHsgdmFsdWU6IF9fYXdhaXQob1tuXSh2KSksIGRvbmU6IGZhbHNlIH0gOiBmID8gZih2KSA6IHY7IH0gOiBmOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jVmFsdWVzKG8pIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xyXG4gICAgcmV0dXJuIG0gPyBtLmNhbGwobykgOiAobyA9IHR5cGVvZiBfX3ZhbHVlcyA9PT0gXCJmdW5jdGlvblwiID8gX192YWx1ZXMobykgOiBvW1N5bWJvbC5pdGVyYXRvcl0oKSwgaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGkpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IGlbbl0gPSBvW25dICYmIGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IHYgPSBvW25dKHYpLCBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCB2LmRvbmUsIHYudmFsdWUpOyB9KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tYWtlVGVtcGxhdGVPYmplY3QoY29va2VkLCByYXcpIHtcclxuICAgIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvb2tlZCwgXCJyYXdcIiwgeyB2YWx1ZTogcmF3IH0pOyB9IGVsc2UgeyBjb29rZWQucmF3ID0gcmF3OyB9XHJcbiAgICByZXR1cm4gY29va2VkO1xyXG59O1xyXG5cclxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xyXG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydFN0YXIobW9kKSB7XHJcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKGsgIT09IFwiZGVmYXVsdFwiICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xyXG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydERlZmF1bHQobW9kKSB7XHJcbiAgICByZXR1cm4gKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgPyBtb2QgOiB7IGRlZmF1bHQ6IG1vZCB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZEdldChyZWNlaXZlciwgc3RhdGUsIGtpbmQsIGYpIHtcclxuICAgIGlmIChraW5kID09PSBcImFcIiAmJiAhZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByaXZhdGUgYWNjZXNzb3Igd2FzIGRlZmluZWQgd2l0aG91dCBhIGdldHRlclwiKTtcclxuICAgIGlmICh0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyICE9PSBzdGF0ZSB8fCAhZiA6ICFzdGF0ZS5oYXMocmVjZWl2ZXIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHJlYWQgcHJpdmF0ZSBtZW1iZXIgZnJvbSBhbiBvYmplY3Qgd2hvc2UgY2xhc3MgZGlkIG5vdCBkZWNsYXJlIGl0XCIpO1xyXG4gICAgcmV0dXJuIGtpbmQgPT09IFwibVwiID8gZiA6IGtpbmQgPT09IFwiYVwiID8gZi5jYWxsKHJlY2VpdmVyKSA6IGYgPyBmLnZhbHVlIDogc3RhdGUuZ2V0KHJlY2VpdmVyKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRTZXQocmVjZWl2ZXIsIHN0YXRlLCB2YWx1ZSwga2luZCwgZikge1xyXG4gICAgaWYgKGtpbmQgPT09IFwibVwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBtZXRob2QgaXMgbm90IHdyaXRhYmxlXCIpO1xyXG4gICAgaWYgKGtpbmQgPT09IFwiYVwiICYmICFmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBhY2Nlc3NvciB3YXMgZGVmaW5lZCB3aXRob3V0IGEgc2V0dGVyXCIpO1xyXG4gICAgaWYgKHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgIT09IHN0YXRlIHx8ICFmIDogIXN0YXRlLmhhcyhyZWNlaXZlcikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3Qgd3JpdGUgcHJpdmF0ZSBtZW1iZXIgdG8gYW4gb2JqZWN0IHdob3NlIGNsYXNzIGRpZCBub3QgZGVjbGFyZSBpdFwiKTtcclxuICAgIHJldHVybiAoa2luZCA9PT0gXCJhXCIgPyBmLmNhbGwocmVjZWl2ZXIsIHZhbHVlKSA6IGYgPyBmLnZhbHVlID0gdmFsdWUgOiBzdGF0ZS5zZXQocmVjZWl2ZXIsIHZhbHVlKSksIHZhbHVlO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZEluKHN0YXRlLCByZWNlaXZlcikge1xyXG4gICAgaWYgKHJlY2VpdmVyID09PSBudWxsIHx8ICh0eXBlb2YgcmVjZWl2ZXIgIT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHJlY2VpdmVyICE9PSBcImZ1bmN0aW9uXCIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHVzZSAnaW4nIG9wZXJhdG9yIG9uIG5vbi1vYmplY3RcIik7XHJcbiAgICByZXR1cm4gdHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciA9PT0gc3RhdGUgOiBzdGF0ZS5oYXMocmVjZWl2ZXIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hZGREaXNwb3NhYmxlUmVzb3VyY2UoZW52LCB2YWx1ZSwgYXN5bmMpIHtcclxuICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdm9pZCAwKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgdmFsdWUgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBleHBlY3RlZC5cIik7XHJcbiAgICAgICAgdmFyIGRpc3Bvc2UsIGlubmVyO1xyXG4gICAgICAgIGlmIChhc3luYykge1xyXG4gICAgICAgICAgICBpZiAoIVN5bWJvbC5hc3luY0Rpc3Bvc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNEaXNwb3NlIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgICAgICAgICAgZGlzcG9zZSA9IHZhbHVlW1N5bWJvbC5hc3luY0Rpc3Bvc2VdO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoZGlzcG9zZSA9PT0gdm9pZCAwKSB7XHJcbiAgICAgICAgICAgIGlmICghU3ltYm9sLmRpc3Bvc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuZGlzcG9zZSBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICAgICAgICAgIGRpc3Bvc2UgPSB2YWx1ZVtTeW1ib2wuZGlzcG9zZV07XHJcbiAgICAgICAgICAgIGlmIChhc3luYykgaW5uZXIgPSBkaXNwb3NlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodHlwZW9mIGRpc3Bvc2UgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBub3QgZGlzcG9zYWJsZS5cIik7XHJcbiAgICAgICAgaWYgKGlubmVyKSBkaXNwb3NlID0gZnVuY3Rpb24oKSB7IHRyeSB7IGlubmVyLmNhbGwodGhpcyk7IH0gY2F0Y2ggKGUpIHsgcmV0dXJuIFByb21pc2UucmVqZWN0KGUpOyB9IH07XHJcbiAgICAgICAgZW52LnN0YWNrLnB1c2goeyB2YWx1ZTogdmFsdWUsIGRpc3Bvc2U6IGRpc3Bvc2UsIGFzeW5jOiBhc3luYyB9KTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGFzeW5jKSB7XHJcbiAgICAgICAgZW52LnN0YWNrLnB1c2goeyBhc3luYzogdHJ1ZSB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiB2YWx1ZTtcclxuXHJcbn1cclxuXHJcbnZhciBfU3VwcHJlc3NlZEVycm9yID0gdHlwZW9mIFN1cHByZXNzZWRFcnJvciA9PT0gXCJmdW5jdGlvblwiID8gU3VwcHJlc3NlZEVycm9yIDogZnVuY3Rpb24gKGVycm9yLCBzdXBwcmVzc2VkLCBtZXNzYWdlKSB7XHJcbiAgICB2YXIgZSA9IG5ldyBFcnJvcihtZXNzYWdlKTtcclxuICAgIHJldHVybiBlLm5hbWUgPSBcIlN1cHByZXNzZWRFcnJvclwiLCBlLmVycm9yID0gZXJyb3IsIGUuc3VwcHJlc3NlZCA9IHN1cHByZXNzZWQsIGU7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kaXNwb3NlUmVzb3VyY2VzKGVudikge1xyXG4gICAgZnVuY3Rpb24gZmFpbChlKSB7XHJcbiAgICAgICAgZW52LmVycm9yID0gZW52Lmhhc0Vycm9yID8gbmV3IF9TdXBwcmVzc2VkRXJyb3IoZSwgZW52LmVycm9yLCBcIkFuIGVycm9yIHdhcyBzdXBwcmVzc2VkIGR1cmluZyBkaXNwb3NhbC5cIikgOiBlO1xyXG4gICAgICAgIGVudi5oYXNFcnJvciA9IHRydWU7XHJcbiAgICB9XHJcbiAgICB2YXIgciwgcyA9IDA7XHJcbiAgICBmdW5jdGlvbiBuZXh0KCkge1xyXG4gICAgICAgIHdoaWxlIChyID0gZW52LnN0YWNrLnBvcCgpKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXIuYXN5bmMgJiYgcyA9PT0gMSkgcmV0dXJuIHMgPSAwLCBlbnYuc3RhY2sucHVzaChyKSwgUHJvbWlzZS5yZXNvbHZlKCkudGhlbihuZXh0KTtcclxuICAgICAgICAgICAgICAgIGlmIChyLmRpc3Bvc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gci5kaXNwb3NlLmNhbGwoci52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHIuYXN5bmMpIHJldHVybiBzIHw9IDIsIFByb21pc2UucmVzb2x2ZShyZXN1bHQpLnRoZW4obmV4dCwgZnVuY3Rpb24oZSkgeyBmYWlsKGUpOyByZXR1cm4gbmV4dCgpOyB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgcyB8PSAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICBmYWlsKGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChzID09PSAxKSByZXR1cm4gZW52Lmhhc0Vycm9yID8gUHJvbWlzZS5yZWplY3QoZW52LmVycm9yKSA6IFByb21pc2UucmVzb2x2ZSgpO1xyXG4gICAgICAgIGlmIChlbnYuaGFzRXJyb3IpIHRocm93IGVudi5lcnJvcjtcclxuICAgIH1cclxuICAgIHJldHVybiBuZXh0KCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3Jld3JpdGVSZWxhdGl2ZUltcG9ydEV4dGVuc2lvbihwYXRoLCBwcmVzZXJ2ZUpzeCkge1xyXG4gICAgaWYgKHR5cGVvZiBwYXRoID09PSBcInN0cmluZ1wiICYmIC9eXFwuXFwuP1xcLy8udGVzdChwYXRoKSkge1xyXG4gICAgICAgIHJldHVybiBwYXRoLnJlcGxhY2UoL1xcLih0c3gpJHwoKD86XFwuZCk/KSgoPzpcXC5bXi4vXSs/KT8pXFwuKFtjbV0/KXRzJC9pLCBmdW5jdGlvbiAobSwgdHN4LCBkLCBleHQsIGNtKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0c3ggPyBwcmVzZXJ2ZUpzeCA/IFwiLmpzeFwiIDogXCIuanNcIiA6IGQgJiYgKCFleHQgfHwgIWNtKSA/IG0gOiAoZCArIGV4dCArIFwiLlwiICsgY20udG9Mb3dlckNhc2UoKSArIFwianNcIik7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcGF0aDtcclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQge1xyXG4gICAgX19leHRlbmRzOiBfX2V4dGVuZHMsXHJcbiAgICBfX2Fzc2lnbjogX19hc3NpZ24sXHJcbiAgICBfX3Jlc3Q6IF9fcmVzdCxcclxuICAgIF9fZGVjb3JhdGU6IF9fZGVjb3JhdGUsXHJcbiAgICBfX3BhcmFtOiBfX3BhcmFtLFxyXG4gICAgX19lc0RlY29yYXRlOiBfX2VzRGVjb3JhdGUsXHJcbiAgICBfX3J1bkluaXRpYWxpemVyczogX19ydW5Jbml0aWFsaXplcnMsXHJcbiAgICBfX3Byb3BLZXk6IF9fcHJvcEtleSxcclxuICAgIF9fc2V0RnVuY3Rpb25OYW1lOiBfX3NldEZ1bmN0aW9uTmFtZSxcclxuICAgIF9fbWV0YWRhdGE6IF9fbWV0YWRhdGEsXHJcbiAgICBfX2F3YWl0ZXI6IF9fYXdhaXRlcixcclxuICAgIF9fZ2VuZXJhdG9yOiBfX2dlbmVyYXRvcixcclxuICAgIF9fY3JlYXRlQmluZGluZzogX19jcmVhdGVCaW5kaW5nLFxyXG4gICAgX19leHBvcnRTdGFyOiBfX2V4cG9ydFN0YXIsXHJcbiAgICBfX3ZhbHVlczogX192YWx1ZXMsXHJcbiAgICBfX3JlYWQ6IF9fcmVhZCxcclxuICAgIF9fc3ByZWFkOiBfX3NwcmVhZCxcclxuICAgIF9fc3ByZWFkQXJyYXlzOiBfX3NwcmVhZEFycmF5cyxcclxuICAgIF9fc3ByZWFkQXJyYXk6IF9fc3ByZWFkQXJyYXksXHJcbiAgICBfX2F3YWl0OiBfX2F3YWl0LFxyXG4gICAgX19hc3luY0dlbmVyYXRvcjogX19hc3luY0dlbmVyYXRvcixcclxuICAgIF9fYXN5bmNEZWxlZ2F0b3I6IF9fYXN5bmNEZWxlZ2F0b3IsXHJcbiAgICBfX2FzeW5jVmFsdWVzOiBfX2FzeW5jVmFsdWVzLFxyXG4gICAgX19tYWtlVGVtcGxhdGVPYmplY3Q6IF9fbWFrZVRlbXBsYXRlT2JqZWN0LFxyXG4gICAgX19pbXBvcnRTdGFyOiBfX2ltcG9ydFN0YXIsXHJcbiAgICBfX2ltcG9ydERlZmF1bHQ6IF9faW1wb3J0RGVmYXVsdCxcclxuICAgIF9fY2xhc3NQcml2YXRlRmllbGRHZXQ6IF9fY2xhc3NQcml2YXRlRmllbGRHZXQsXHJcbiAgICBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0OiBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0LFxyXG4gICAgX19jbGFzc1ByaXZhdGVGaWVsZEluOiBfX2NsYXNzUHJpdmF0ZUZpZWxkSW4sXHJcbiAgICBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZTogX19hZGREaXNwb3NhYmxlUmVzb3VyY2UsXHJcbiAgICBfX2Rpc3Bvc2VSZXNvdXJjZXM6IF9fZGlzcG9zZVJlc291cmNlcyxcclxuICAgIF9fcmV3cml0ZVJlbGF0aXZlSW1wb3J0RXh0ZW5zaW9uOiBfX3Jld3JpdGVSZWxhdGl2ZUltcG9ydEV4dGVuc2lvbixcclxufTtcclxuIiwiZW51bSBMb2dMZXZlbCB7XHJcbiAgREVCVUcgPSAwLFxyXG4gIElORk8gPSAxLFxyXG4gIFdBUk4gPSAyLFxyXG4gIEVSUk9SID0gM1xyXG59XHJcblxyXG5sZXQgY3VycmVudExvZ0xldmVsOiBMb2dMZXZlbCA9IExvZ0xldmVsLklORk87XHJcblxyXG5mdW5jdGlvbiBzZXRMb2dMZXZlbChsZXZlbDogTG9nTGV2ZWwpOiB2b2lkIHtcclxuICBpZiAoT2JqZWN0LnZhbHVlcyhMb2dMZXZlbCkuaW5jbHVkZXMobGV2ZWwpKSB7XHJcbiAgICBjdXJyZW50TG9nTGV2ZWwgPSBsZXZlbDtcclxuICB9IGVsc2Uge1xyXG4gICAgY29uc29sZS5lcnJvcign5peg5pWI55qE5pel5b+X57qn5YirJyk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBsb2cobGV2ZWw6IExvZ0xldmVsLCBtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcclxuICBpZiAobGV2ZWwgPj0gY3VycmVudExvZ0xldmVsKSB7XHJcbiAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICBjb25zdCBsZXZlbE5hbWUgPSBMb2dMZXZlbFtsZXZlbF07XHJcbiAgICBjb25zb2xlLmxvZyhgWyR7dGltZXN0YW1wfV0gWyR7bGV2ZWxOYW1lfV0gJHttZXNzYWdlfWApO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZGVidWcobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XHJcbiAgbG9nKExvZ0xldmVsLkRFQlVHLCBtZXNzYWdlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gaW5mbyhtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcclxuICBsb2coTG9nTGV2ZWwuSU5GTywgbWVzc2FnZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHdhcm4obWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XHJcbiAgbG9nKExvZ0xldmVsLldBUk4sIG1lc3NhZ2UpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBlcnJvcihtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcclxuICBsb2coTG9nTGV2ZWwuRVJST1IsIG1lc3NhZ2UpO1xyXG59XHJcblxyXG5leHBvcnQge1xyXG4gIExvZ0xldmVsLFxyXG4gIHNldExvZ0xldmVsLFxyXG4gIGRlYnVnLFxyXG4gIGluZm8sXHJcbiAgd2FybixcclxuICBlcnJvclxyXG59O1xyXG5cclxuc2V0TG9nTGV2ZWwoTG9nTGV2ZWwuREVCVUcpO1xyXG4iLCJpbXBvcnQgeyBJdGVtVmlldywgV29ya3NwYWNlTGVhZiwgQXBwLCBUZXh0Q29tcG9uZW50LCBEcm9wZG93bkNvbXBvbmVudCwgQnV0dG9uQ29tcG9uZW50LCBOb3RpY2UsIE1hcmtkb3duVmlldywgTW9kYWwsIFNldHRpbmcsIEZ1enp5U3VnZ2VzdE1vZGFsLCBURm9sZGVyIH0gZnJvbSAnb2JzaWRpYW4nO1xyXG5pbXBvcnQgeyBEYXRhYmFzZVRhYmxlLCBEYXRhYmFzZVZpZXdJbnRlcmZhY2UsIFRhYmxlU3RhdGUsIFNvcnRTdGF0ZSwgRGF0YWJhc2VQbHVnaW5JbnRlcmZhY2UgfSBmcm9tICcuL3R5cGVzJztcclxuaW1wb3J0IHsgZGVidWcsIGluZm8sIHdhcm4sIGVycm9yIH0gZnJvbSAnLi91dGlscy9sb2dnZXInO1xyXG5cclxuZXhwb3J0IGNvbnN0IERBVEFCQVNFX1ZJRVdfVFlQRSA9ICdkYXRhYmFzZS12aWV3JztcclxuXHJcbmV4cG9ydCBjbGFzcyBEYXRhYmFzZVZpZXcgZXh0ZW5kcyBJdGVtVmlldyBpbXBsZW1lbnRzIERhdGFiYXNlVmlld0ludGVyZmFjZSB7XHJcbiAgcHJpdmF0ZSB0YWJsZXM6IERhdGFiYXNlVGFibGVbXSA9IFtdO1xyXG4gIHByaXZhdGUgdGFibGVTdGF0ZXM6IFRhYmxlU3RhdGVbXSA9IFtdO1xyXG4gIHByaXZhdGUgc29ydFN0YXRlczogTWFwPERhdGFiYXNlVGFibGUsIFNvcnRTdGF0ZT4gPSBuZXcgTWFwKCk7XHJcbiAgcHJpdmF0ZSB0YWJsZUVsZW1lbnRzOiBNYXA8RGF0YWJhc2VUYWJsZSwgSFRNTEVsZW1lbnQ+ID0gbmV3IE1hcCgpO1xyXG4gIHByaXZhdGUgZXhwb3J0RHJvcGRvd24/OiBEcm9wZG93bkNvbXBvbmVudDtcclxuICBwcml2YXRlIGV4cG9ydEJ1dHRvbj86IEJ1dHRvbkNvbXBvbmVudDtcclxuICBwcml2YXRlIGltcG9ydEJ1dHRvbj86IEJ1dHRvbkNvbXBvbmVudDtcclxuICBwcml2YXRlIHBsdWdpbjogRGF0YWJhc2VQbHVnaW5JbnRlcmZhY2U7XHJcbiAgcHJpdmF0ZSBzZWxlY3RlZFRhYmxlczogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCk7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGxlYWY6IFdvcmtzcGFjZUxlYWYsIHBsdWdpbjogRGF0YWJhc2VQbHVnaW5JbnRlcmZhY2UpIHtcclxuICAgIHN1cGVyKGxlYWYpO1xyXG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcbiAgICB0aGlzLnRhYmxlcyA9IFtdOyAvLyDliJ3lp4vljJbkuLrnqbrmlbDnu4RcclxuICB9XHJcblxyXG4gIGdldFZpZXdUeXBlKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gREFUQUJBU0VfVklFV19UWVBFO1xyXG4gIH1cclxuXHJcbiAgZ2V0RGlzcGxheVRleHQoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiAn5pWw5o2u5bqT6KeG5Zu+JztcclxuICB9XHJcblxyXG4gIGFzeW5jIG9uT3BlbigpIHtcclxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyRWwuY2hpbGRyZW5bMV07XHJcbiAgICBjb250YWluZXIuZW1wdHkoKTtcclxuICAgIGNvbnRhaW5lci5hZGRDbGFzcygnZGF0YWJhc2Utdmlldy1jb250YWluZXInKTtcclxuXHJcbiAgICBjb25zdCB0b3BCYXIgPSBjb250YWluZXIuY3JlYXRlRWwoJ2RpdicsIHsgY2xzOiAnZGF0YWJhc2Utdmlldy10b3AtYmFyJyB9KTtcclxuXHJcbiAgICBkZWJ1Zygn5Yib5bu66aG26YOo5qCP5YWD57SgJyk7XHJcblxyXG4gICAgdGhpcy5leHBvcnREcm9wZG93biA9IG5ldyBEcm9wZG93bkNvbXBvbmVudCh0b3BCYXIpXHJcbiAgICAgIC5hZGRPcHRpb24oJ2NzdicsICdDU1YnKVxyXG4gICAgICAuYWRkT3B0aW9uKCdqc29uJywgJ0pTT04nKVxyXG4gICAgICAuc2V0VmFsdWUoJ2NzdicpO1xyXG5cclxuICAgIGRlYnVnKCflr7zlh7rkuIvmi4noj5zljZXlt7LliJvlu7onKTtcclxuXHJcbiAgICB0aGlzLmV4cG9ydEJ1dHRvbiA9IG5ldyBCdXR0b25Db21wb25lbnQodG9wQmFyKVxyXG4gICAgICAuc2V0QnV0dG9uVGV4dCgn5a+85Ye6JylcclxuICAgICAgLm9uQ2xpY2soKCkgPT4gdGhpcy5vcGVuRXhwb3J0TW9kYWwoKSk7XHJcblxyXG4gICAgdGhpcy5pbXBvcnRCdXR0b24gPSBuZXcgQnV0dG9uQ29tcG9uZW50KHRvcEJhcilcclxuICAgICAgLnNldEJ1dHRvblRleHQoJ+WvvOWFpScpXHJcbiAgICAgIC5vbkNsaWNrKCgpID0+IHRoaXMuaW1wb3J0RGF0YSgpKTtcclxuXHJcbiAgICBkZWJ1Zygn5a+85Ye65ZKM5a+85YWl5oyJ6ZKu5bey5Yib5bu6Jyk7XHJcblxyXG4gICAgLy8g56Gu5L+d5omA5pyJ5oyJ6ZKu6YO96KKr5re75Yqg5Yiw6aG26YOo5qCPXHJcbiAgICB0b3BCYXIuYXBwZW5kQ2hpbGQodGhpcy5leHBvcnREcm9wZG93bi5zZWxlY3RFbCk7XHJcbiAgICB0b3BCYXIuYXBwZW5kQ2hpbGQodGhpcy5leHBvcnRCdXR0b24uYnV0dG9uRWwpO1xyXG4gICAgdG9wQmFyLmFwcGVuZENoaWxkKHRoaXMuaW1wb3J0QnV0dG9uLmJ1dHRvbkVsKTtcclxuXHJcbiAgICAvLyDnoa7kv53lnKjliJvlu7rmjInpkq7lkI7osIPnlKggcmVuZGVyVGFibGVzXHJcbiAgICB0aGlzLnJlbmRlclRhYmxlcygpO1xyXG5cclxuICAgIGRlYnVnKCfooajmoLzlt7LmuLLmn5MnKTtcclxuXHJcbiAgICAvLyDmt7vliqDosIPor5Xku6PnoIFcclxuICAgIGRlYnVnKGDpobbpg6jmoI/mmK/lkKblrZjlnKg6ICR7ISF0b3BCYXJ9YCk7XHJcbiAgICBkZWJ1Zyhg6aG26YOo5qCPSFRNTDogJHt0b3BCYXIub3V0ZXJIVE1MfWApO1xyXG4gICAgZGVidWcoYOWvvOWHuuS4i+aLieiPnOWNleaYr+WQpuWtmOWcqDogJHshIXRoaXMuZXhwb3J0RHJvcGRvd259YCk7XHJcbiAgICBkZWJ1Zyhg5a+85Ye65oyJ6ZKu5piv5ZCm5a2Y5ZyoOiAkeyEhdGhpcy5leHBvcnRCdXR0b259YCk7XHJcbiAgICBkZWJ1Zyhg5a+85YWl5oyJ6ZKu5piv5ZCm5a2Y5ZyoOiAkeyEhdGhpcy5pbXBvcnRCdXR0b259YCk7XHJcbiAgICBpZiAodGhpcy5leHBvcnRCdXR0b24gJiYgdGhpcy5pbXBvcnRCdXR0b24pIHtcclxuICAgICAgZGVidWcoYOWvvOWHuuaMiemSrkhUTUw6ICR7dGhpcy5leHBvcnRCdXR0b24uYnV0dG9uRWwub3V0ZXJIVE1MfWApO1xyXG4gICAgICBkZWJ1Zyhg5a+85YWl5oyJ6ZKuSFRNTDogJHt0aGlzLmltcG9ydEJ1dHRvbi5idXR0b25FbC5vdXRlckhUTUx9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5jaGVja0J1dHRvblZpc2liaWxpdHkoKTtcclxuXHJcbiAgICAvLyDlnKggb25PcGVuIOaWueazleeahOacq+Wwvua3u+WKoFxyXG4gICAgdGhpcy5hcHAud29ya3NwYWNlLnVwZGF0ZU9wdGlvbnMoKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIG9uQ2xvc2UoKSB7XHJcbiAgICAvLyDmuIXnkIblt6XkvZxcclxuICB9XHJcblxyXG4gIHB1YmxpYyBzZXRUYWJsZXModGFibGVzOiBEYXRhYmFzZVRhYmxlW10pIHtcclxuICAgIHRoaXMudGFibGVzID0gdGFibGVzO1xyXG4gICAgdGhpcy50YWJsZVN0YXRlcyA9IHRhYmxlcy5tYXAoKHRhYmxlLCBpbmRleCkgPT4gKHtcclxuICAgICAgdGFibGUsXHJcbiAgICAgIGlkOiBpbmRleCxcclxuICAgICAgc2VhcmNoVGVybTogJydcclxuICAgIH0pKTtcclxuICAgIFxyXG4gICAgdGhpcy5yZW5kZXJUYWJsZXMoKTtcclxuICAgIHRoaXMuY2hlY2tCdXR0b25WaXNpYmlsaXR5KCk7XHJcblxyXG4gICAgLy8g5ZyoIHNldFRhYmxlcyDmlrnms5XnmoTmnKvlsL7mt7vliqBcclxuICAgIHRoaXMuYXBwLndvcmtzcGFjZS51cGRhdGVPcHRpb25zKCk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZ2V0VGFibGVzKCk6IERhdGFiYXNlVGFibGVbXSB7XHJcbiAgICByZXR1cm4gdGhpcy50YWJsZXM7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlbmRlclRhYmxlcygpIHtcclxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyRWwuY2hpbGRyZW5bMV07XHJcbiAgICBjb250YWluZXIuZW1wdHkoKTtcclxuICAgIGNvbnRhaW5lci5hZGRDbGFzcygnZGF0YWJhc2Utdmlldy1jb250YWluZXInKTtcclxuXHJcbiAgICAvLyDnoa7kv53pobbpg6jmoI/lnKjooajmoLzkuYvliY1cclxuICAgIGNvbnN0IHRvcEJhciA9IGNvbnRhaW5lci5jcmVhdGVFbCgnZGl2JywgeyBjbHM6ICdkYXRhYmFzZS12aWV3LXRvcC1iYXInIH0pO1xyXG4gICAgaWYgKHRoaXMuZXhwb3J0RHJvcGRvd24pIHRvcEJhci5hcHBlbmRDaGlsZCh0aGlzLmV4cG9ydERyb3Bkb3duLnNlbGVjdEVsKTtcclxuICAgIGlmICh0aGlzLmV4cG9ydEJ1dHRvbikgdG9wQmFyLmFwcGVuZENoaWxkKHRoaXMuZXhwb3J0QnV0dG9uLmJ1dHRvbkVsKTtcclxuICAgIGlmICh0aGlzLmltcG9ydEJ1dHRvbikgdG9wQmFyLmFwcGVuZENoaWxkKHRoaXMuaW1wb3J0QnV0dG9uLmJ1dHRvbkVsKTtcclxuXHJcbiAgICB0aGlzLnRhYmxlU3RhdGVzLmZvckVhY2goc3RhdGUgPT4ge1xyXG4gICAgICBjb25zdCB0YWJsZUNvbnRhaW5lciA9IGNvbnRhaW5lci5jcmVhdGVFbCgnZGl2JywgeyBjbHM6ICdkYXRhYmFzZS10YWJsZS1jb250YWluZXInIH0pO1xyXG4gICAgICB0YWJsZUNvbnRhaW5lci5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6IHN0YXRlLnRhYmxlLm5hbWUgfSk7XHJcblxyXG4gICAgICBjb25zdCBzZWFyY2hJbnB1dCA9IG5ldyBUZXh0Q29tcG9uZW50KHRhYmxlQ29udGFpbmVyKVxyXG4gICAgICAgIC5zZXRQbGFjZWhvbGRlcign5pCc57SiLi4uJylcclxuICAgICAgICAub25DaGFuZ2UodmFsdWUgPT4ge1xyXG4gICAgICAgICAgc3RhdGUuc2VhcmNoVGVybSA9IHZhbHVlO1xyXG4gICAgICAgICAgdGhpcy51cGRhdGVUYWJsZShzdGF0ZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIHNlYXJjaElucHV0LmlucHV0RWwuYWRkQ2xhc3MoJ3NlYXJjaC1pbnB1dCcpO1xyXG5cclxuICAgICAgY29uc3QgdGFibGVFbGVtZW50ID0gdGFibGVDb250YWluZXIuY3JlYXRlRWwoJ3RhYmxlJywgeyBjbHM6ICdkYXRhYmFzZS10YWJsZScgfSk7XHJcbiAgICAgIHRoaXMucmVuZGVyVGFibGUoc3RhdGUsIHRhYmxlRWxlbWVudCk7XHJcbiAgICAgIHRoaXMudGFibGVFbGVtZW50cy5zZXQoc3RhdGUudGFibGUsIHRhYmxlRWxlbWVudCk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcmVuZGVyVGFibGUoc3RhdGU6IFRhYmxlU3RhdGUsIHRhYmxlRWxlbWVudDogSFRNTEVsZW1lbnQpIHtcclxuICAgIHRhYmxlRWxlbWVudC5lbXB0eSgpO1xyXG4gICAgY29uc3QgeyB0YWJsZSB9ID0gc3RhdGU7XHJcblxyXG4gICAgY29uc3QgaGVhZGVyUm93ID0gdGFibGVFbGVtZW50LmNyZWF0ZUVsKCd0cicpO1xyXG4gICAgdGFibGUuZmllbGRzLmZvckVhY2goZmllbGQgPT4ge1xyXG4gICAgICBjb25zdCB0aCA9IGhlYWRlclJvdy5jcmVhdGVFbCgndGgnKTtcclxuICAgICAgY29uc3QgaGVhZGVyQ29udGVudCA9IHRoLmNyZWF0ZUVsKCdkaXYnLCB7IGNsczogJ2hlYWRlci1jb250ZW50JyB9KTtcclxuICAgICAgaGVhZGVyQ29udGVudC5jcmVhdGVFbCgnc3BhbicsIHsgdGV4dDogZmllbGQsIGNsczogJ2NvbHVtbi1uYW1lJyB9KTtcclxuICAgICAgY29uc3Qgc29ydEluZGljYXRvciA9IGhlYWRlckNvbnRlbnQuY3JlYXRlRWwoJ3NwYW4nLCB7IGNsczogJ3NvcnQtaW5kaWNhdG9yJyB9KTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IGN1cnJlbnRTb3J0ID0gdGhpcy5zb3J0U3RhdGVzLmdldCh0YWJsZSk7XHJcbiAgICAgIGlmIChjdXJyZW50U29ydCAmJiBjdXJyZW50U29ydC5jb2x1bW4gPT09IGZpZWxkKSB7XHJcbiAgICAgICAgdGguYWRkQ2xhc3MoJ3NvcnRlZCcpO1xyXG4gICAgICAgIHRoLmFkZENsYXNzKGN1cnJlbnRTb3J0LmRpcmVjdGlvbik7XHJcbiAgICAgICAgc29ydEluZGljYXRvci5zZXRUZXh0KGN1cnJlbnRTb3J0LmRpcmVjdGlvbiA9PT0gJ2FzYycgPyAn4payJyA6ICfilrwnKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBzb3J0SW5kaWNhdG9yLnNldFRleHQoJ+KHhScpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuc29ydFRhYmxlKHRhYmxlLCBmaWVsZCkpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZmlsdGVyZWREYXRhID0gdGFibGUuZGF0YS5maWx0ZXIocm93ID0+XHJcbiAgICAgIHJvdy5zb21lKGNlbGwgPT4gY2VsbC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHN0YXRlLnNlYXJjaFRlcm0udG9Mb3dlckNhc2UoKSkpXHJcbiAgICApO1xyXG5cclxuICAgIGZpbHRlcmVkRGF0YS5mb3JFYWNoKHJvdyA9PiB7XHJcbiAgICAgIGNvbnN0IHRyID0gdGFibGVFbGVtZW50LmNyZWF0ZUVsKCd0cicpO1xyXG4gICAgICByb3cuZm9yRWFjaChjZWxsID0+IHtcclxuICAgICAgICB0ci5jcmVhdGVFbCgndGQnLCB7IHRleHQ6IGNlbGwgfSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHVwZGF0ZVRhYmxlKHN0YXRlOiBUYWJsZVN0YXRlKSB7XHJcbiAgICBjb25zdCB0YWJsZUVsZW1lbnQgPSB0aGlzLnRhYmxlRWxlbWVudHMuZ2V0KHN0YXRlLnRhYmxlKTtcclxuICAgIGlmICh0YWJsZUVsZW1lbnQpIHtcclxuICAgICAgdGhpcy5yZW5kZXJUYWJsZShzdGF0ZSwgdGFibGVFbGVtZW50KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgc29ydFRhYmxlKHRhYmxlOiBEYXRhYmFzZVRhYmxlLCBjb2x1bW46IHN0cmluZykge1xyXG4gICAgY29uc3QgY3VycmVudFNvcnQgPSB0aGlzLnNvcnRTdGF0ZXMuZ2V0KHRhYmxlKSB8fCB7IGNvbHVtbjogJycsIGRpcmVjdGlvbjogJ2FzYycgfTtcclxuICAgIGNvbnN0IG5ld0RpcmVjdGlvbiA9IGN1cnJlbnRTb3J0LmNvbHVtbiA9PT0gY29sdW1uICYmIGN1cnJlbnRTb3J0LmRpcmVjdGlvbiA9PT0gJ2FzYycgPyAnZGVzYycgOiAnYXNjJztcclxuICAgIFxyXG4gICAgY29uc3QgY29sdW1uSW5kZXggPSB0YWJsZS5maWVsZHMuaW5kZXhPZihjb2x1bW4pO1xyXG4gICAgdGFibGUuZGF0YS5zb3J0KChhLCBiKSA9PiB7XHJcbiAgICAgIGNvbnN0IHZhbHVlQSA9IGFbY29sdW1uSW5kZXhdLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgIGNvbnN0IHZhbHVlQiA9IGJbY29sdW1uSW5kZXhdLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgIGlmICh2YWx1ZUEgPCB2YWx1ZUIpIHJldHVybiBuZXdEaXJlY3Rpb24gPT09ICdhc2MnID8gLTEgOiAxO1xyXG4gICAgICBpZiAodmFsdWVBID4gdmFsdWVCKSByZXR1cm4gbmV3RGlyZWN0aW9uID09PSAnYXNjJyA/IDEgOiAtMTtcclxuICAgICAgcmV0dXJuIDA7XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLnNvcnRTdGF0ZXMuc2V0KHRhYmxlLCB7IGNvbHVtbiwgZGlyZWN0aW9uOiBuZXdEaXJlY3Rpb24gfSk7XHJcbiAgICB0aGlzLnJlbmRlclRhYmxlcygpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBleHBvcnREYXRhKHNlbGVjdGVkVGFibGVzOiBzdHJpbmdbXSwgZm9ybWF0OiBzdHJpbmcgfCB1bmRlZmluZWQpIHtcclxuICAgIGlmICghZm9ybWF0KSByZXR1cm47XHJcblxyXG4gICAgbGV0IGNvbnRlbnQgPSAnJztcclxuICAgIGNvbnN0IHRhYmxlc1RvRXhwb3J0ID0gdGhpcy50YWJsZXMuZmlsdGVyKHRhYmxlID0+IHNlbGVjdGVkVGFibGVzLmluY2x1ZGVzKHRhYmxlLm5hbWUpKTtcclxuXHJcbiAgICBpZiAoZm9ybWF0ID09PSAnY3N2Jykge1xyXG4gICAgICBjb250ZW50ID0gdGFibGVzVG9FeHBvcnQubWFwKHRhYmxlID0+IFxyXG4gICAgICAgIFt0YWJsZS5maWVsZHMuam9pbignLCcpXVxyXG4gICAgICAgICAgLmNvbmNhdCh0YWJsZS5kYXRhLm1hcChyb3cgPT4gcm93LmpvaW4oJywnKSkpXHJcbiAgICAgICAgICAuam9pbignXFxuJylcclxuICAgICAgKS5qb2luKCdcXG5cXG4nKTtcclxuICAgIH0gZWxzZSBpZiAoZm9ybWF0ID09PSAnanNvbicpIHtcclxuICAgICAgY29udGVudCA9IEpTT04uc3RyaW5naWZ5KHRhYmxlc1RvRXhwb3J0LCBudWxsLCAyKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyDkvb/nlKggRWxlY3Ryb24g55qEIGRpYWxvZyBBUEkg6K6p55So5oi36YCJ5oup5L+d5a2Y5L2N572uXHJcbiAgICBjb25zdCB7IHJlbW90ZSB9ID0gcmVxdWlyZSgnZWxlY3Ryb24nKTtcclxuICAgIGNvbnN0IHBhdGggPSBhd2FpdCByZW1vdGUuZGlhbG9nLnNob3dTYXZlRGlhbG9nKHtcclxuICAgICAgdGl0bGU6ICfpgInmi6nkv53lrZjkvY3nva4nLFxyXG4gICAgICBkZWZhdWx0UGF0aDogYGV4cG9ydGVkX3RhYmxlcy4ke2Zvcm1hdH1gLFxyXG4gICAgICBmaWx0ZXJzOiBbXHJcbiAgICAgICAgeyBuYW1lOiBmb3JtYXQudG9VcHBlckNhc2UoKSwgZXh0ZW5zaW9uczogW2Zvcm1hdF0gfSxcclxuICAgICAgICB7IG5hbWU6ICfmiYDmnInmlofku7YnLCBleHRlbnNpb25zOiBbJyonXSB9XHJcbiAgICAgIF1cclxuICAgIH0pO1xyXG5cclxuICAgIGlmIChwYXRoLmNhbmNlbGVkKSB7XHJcbiAgICAgIG5ldyBOb3RpY2UoJ+WvvOWHuuW3suWPlua2iCcpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8g5L2/55SoIE9ic2lkaWFuIOeahCB2YXVsdC5hZGFwdGVyLndyaXRlQmluYXJ5IOaWueazleS/neWtmOaWh+S7tlxyXG4gICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci53cml0ZUJpbmFyeShwYXRoLmZpbGVQYXRoLCBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoY29udGVudCkpO1xyXG5cclxuICAgIG5ldyBOb3RpY2UoYOW3suWvvOWHuiAke3NlbGVjdGVkVGFibGVzLmxlbmd0aH0g5Liq6KGo5qC85YiwICR7cGF0aC5maWxlUGF0aH1gKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgaW1wb3J0RGF0YSgpIHtcclxuICAgIG5ldyBJbXBvcnRNZXRob2RNb2RhbCh0aGlzLmFwcCwgYXN5bmMgKG1ldGhvZCkgPT4ge1xyXG4gICAgICBpZiAobWV0aG9kID09PSAnZmlsZScpIHtcclxuICAgICAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XHJcbiAgICAgICAgaW5wdXQudHlwZSA9ICdmaWxlJztcclxuICAgICAgICBpbnB1dC5hY2NlcHQgPSAnLmNzdiwuanNvbic7XHJcbiAgICAgICAgaW5wdXQub25jaGFuZ2UgPSBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICBjb25zdCBmaWxlID0gaW5wdXQuZmlsZXM/LlswXTtcclxuICAgICAgICAgIGlmIChmaWxlKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCBmaWxlLnRleHQoKTtcclxuICAgICAgICAgICAgdGhpcy5wcm9jZXNzSW1wb3J0ZWRDb250ZW50KGNvbnRlbnQsIGZpbGUubmFtZS5lbmRzV2l0aCgnLmpzb24nKSA/ICdqc29uJyA6ICdjc3YnKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIGlucHV0LmNsaWNrKCk7XHJcbiAgICAgIH0gZWxzZSBpZiAobWV0aG9kID09PSAnY2xpcGJvYXJkJykge1xyXG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLnJlYWRUZXh0KCk7XHJcbiAgICAgICAgdGhpcy5wcm9jZXNzSW1wb3J0ZWRDb250ZW50KGNvbnRlbnQpO1xyXG4gICAgICB9XHJcbiAgICB9KS5vcGVuKCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHByb2Nlc3NJbXBvcnRlZENvbnRlbnQoY29udGVudDogc3RyaW5nLCBmb3JtYXQ/OiAnY3N2JyB8ICdqc29uJykge1xyXG4gICAgbGV0IHRhYmxlczogRGF0YWJhc2VUYWJsZVtdID0gW107XHJcbiAgICBpZiAoIWZvcm1hdCkge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIEpTT04ucGFyc2UoY29udGVudCk7XHJcbiAgICAgICAgZm9ybWF0ID0gJ2pzb24nO1xyXG4gICAgICB9IGNhdGNoIHtcclxuICAgICAgICBmb3JtYXQgPSAnY3N2JztcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChmb3JtYXQgPT09ICdjc3YnKSB7XHJcbiAgICAgIGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdCgnXFxuJykubWFwKGxpbmUgPT4gbGluZS50cmltKCkpLmZpbHRlcihsaW5lID0+IGxpbmUpO1xyXG4gICAgICBjb25zdCB0YWJsZTogRGF0YWJhc2VUYWJsZSA9IHsgbmFtZTogJ0ltcG9ydGVkIFRhYmxlJywgZmllbGRzOiBbXSwgZGF0YTogW10gfTtcclxuICAgICAgdGFibGUuZmllbGRzID0gbGluZXNbMF0uc3BsaXQoJywnKS5tYXAoZmllbGQgPT4gZmllbGQudHJpbSgpKTtcclxuICAgICAgdGFibGUuZGF0YSA9IGxpbmVzLnNsaWNlKDEpLm1hcChsaW5lID0+IGxpbmUuc3BsaXQoJywnKS5tYXAoY2VsbCA9PiBjZWxsLnRyaW0oKSkpO1xyXG4gICAgICB0YWJsZXMgPSBbdGFibGVdO1xyXG4gICAgfSBlbHNlIGlmIChmb3JtYXQgPT09ICdqc29uJykge1xyXG4gICAgICB0YWJsZXMgPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuc2V0VGFibGVzKHRhYmxlcyk7XHJcbiAgICBuZXcgTm90aWNlKCfmlbDmja7lr7zlhaXmiJDlip8nKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBpbnNlcnRDb250ZW50KGNvbnRlbnQ6IHN0cmluZykge1xyXG4gICAgY29uc3QgYWN0aXZlVmlldyA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVWaWV3T2ZUeXBlKE1hcmtkb3duVmlldyk7XHJcbiAgICBpZiAoYWN0aXZlVmlldykge1xyXG4gICAgICBjb25zdCBlZGl0b3IgPSBhY3RpdmVWaWV3LmVkaXRvcjtcclxuICAgICAgY29uc3QgY3Vyc29yID0gZWRpdG9yLmdldEN1cnNvcigpO1xyXG4gICAgICBlZGl0b3IucmVwbGFjZVJhbmdlKGNvbnRlbnQsIGN1cnNvcik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBuZXcgTm90aWNlKCfor7flhYjmiZPlvIDkuIDkuKogTWFya2Rvd24g5paH5Lu2Jyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgY2hlY2tCdXR0b25WaXNpYmlsaXR5KCkge1xyXG4gICAgaWYgKHRoaXMuZXhwb3J0QnV0dG9uICYmIHRoaXMuaW1wb3J0QnV0dG9uKSB7XHJcbiAgICAgIGNvbnN0IGV4cG9ydEJ1dHRvblJlY3QgPSB0aGlzLmV4cG9ydEJ1dHRvbi5idXR0b25FbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgY29uc3QgaW1wb3J0QnV0dG9uUmVjdCA9IHRoaXMuaW1wb3J0QnV0dG9uLmJ1dHRvbkVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICBcclxuICAgICAgZGVidWcoYOWvvOWHuuaMiemSruS9jee9rjogdG9wPSR7ZXhwb3J0QnV0dG9uUmVjdC50b3B9LCBsZWZ0PSR7ZXhwb3J0QnV0dG9uUmVjdC5sZWZ0fSwgd2lkdGg9JHtleHBvcnRCdXR0b25SZWN0LndpZHRofSwgaGVpZ2h0PSR7ZXhwb3J0QnV0dG9uUmVjdC5oZWlnaHR9YCk7XHJcbiAgICAgIGRlYnVnKGDlr7zlhaXmjInpkq7kvY3nva46IHRvcD0ke2ltcG9ydEJ1dHRvblJlY3QudG9wfSwgbGVmdD0ke2ltcG9ydEJ1dHRvblJlY3QubGVmdH0sIHdpZHRoPSR7aW1wb3J0QnV0dG9uUmVjdC53aWR0aH0sIGhlaWdodD0ke2ltcG9ydEJ1dHRvblJlY3QuaGVpZ2h0fWApO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgd2Fybign5oyJ6ZKu5pyq5Yib5bu6Jyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNoZWNrQnV0dG9uVmlzaWJpbGl0eVdpdGhEZWxheSgpIHtcclxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICB0aGlzLmNoZWNrQnV0dG9uVmlzaWJpbGl0eSgpO1xyXG4gICAgfSwgMTAwKTsgLy8gMTAwbXMg5bu26L+fXHJcbiAgfVxyXG5cclxuICBwcml2YXRlIG9wZW5FeHBvcnRNb2RhbCgpIHtcclxuICAgIG5ldyBFeHBvcnRNb2RhbCh0aGlzLmFwcCwgdGhpcy50YWJsZXMsIChzZWxlY3RlZFRhYmxlcykgPT4ge1xyXG4gICAgICBjb25zdCBmb3JtYXQgPSB0aGlzLmV4cG9ydERyb3Bkb3duPy5nZXRWYWx1ZSgpO1xyXG4gICAgICB0aGlzLmV4cG9ydERhdGEoc2VsZWN0ZWRUYWJsZXMsIGZvcm1hdCk7XHJcbiAgICB9KS5vcGVuKCk7XHJcbiAgfVxyXG59XHJcblxyXG5jbGFzcyBGb2xkZXJTdWdnZXN0TW9kYWwgZXh0ZW5kcyBGdXp6eVN1Z2dlc3RNb2RhbDxURm9sZGVyPiB7XHJcbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHByaXZhdGUgY2FsbGJhY2s6IChmb2xkZXI6IFRGb2xkZXIpID0+IHZvaWQpIHtcclxuICAgIHN1cGVyKGFwcCk7XHJcbiAgfVxyXG5cclxuICBnZXRJdGVtcygpOiBURm9sZGVyW10ge1xyXG4gICAgcmV0dXJuIHRoaXMuYXBwLnZhdWx0LmdldEFsbExvYWRlZEZpbGVzKClcclxuICAgICAgLmZpbHRlcigoZmlsZSk6IGZpbGUgaXMgVEZvbGRlciA9PiBmaWxlIGluc3RhbmNlb2YgVEZvbGRlcik7XHJcbiAgfVxyXG5cclxuICBnZXRJdGVtVGV4dChmb2xkZXI6IFRGb2xkZXIpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIGZvbGRlci5wYXRoO1xyXG4gIH1cclxuXHJcbiAgb25DaG9vc2VJdGVtKGZvbGRlcjogVEZvbGRlciwgZXZ0OiBNb3VzZUV2ZW50IHwgS2V5Ym9hcmRFdmVudCk6IHZvaWQge1xyXG4gICAgdGhpcy5jYWxsYmFjayhmb2xkZXIpO1xyXG4gIH1cclxufVxyXG5cclxuY2xhc3MgSW1wb3J0TWV0aG9kTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHByaXZhdGUgY2FsbGJhY2s6IChtZXRob2Q6ICdmaWxlJyB8ICdjbGlwYm9hcmQnKSA9PiB2b2lkKSB7XHJcbiAgICBzdXBlcihhcHApO1xyXG4gIH1cclxuXHJcbiAgb25PcGVuKCkge1xyXG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICBjb250ZW50RWwuZW1wdHkoKTtcclxuICAgIGNvbnRlbnRFbC5jcmVhdGVFbCgnaDInLCB7IHRleHQ6ICfpgInmi6nlr7zlhaXmlrnlvI8nIH0pO1xyXG5cclxuICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuICAgICAgLnNldE5hbWUoJ+S7juaWh+S7tuWvvOWFpScpXHJcbiAgICAgIC5zZXREZXNjKCfpgInmi6nkuIDkuKogQ1NWIOaIliBKU09OIOaWh+S7ticpXHJcbiAgICAgIC5hZGRCdXR0b24oYnV0dG9uID0+IGJ1dHRvblxyXG4gICAgICAgIC5zZXRCdXR0b25UZXh0KCfpgInmi6nmlofku7YnKVxyXG4gICAgICAgIC5vbkNsaWNrKCgpID0+IHtcclxuICAgICAgICAgIHRoaXMuY2xvc2UoKTtcclxuICAgICAgICAgIHRoaXMuY2FsbGJhY2soJ2ZpbGUnKTtcclxuICAgICAgICB9KSk7XHJcblxyXG4gICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxyXG4gICAgICAuc2V0TmFtZSgn5LuO5Ymq6LS05p2/5a+85YWlJylcclxuICAgICAgLnNldERlc2MoJ+S7juWJqui0tOadv+eymOi0tCBDU1Yg5oiWIEpTT04g5pWw5o2uJylcclxuICAgICAgLmFkZEJ1dHRvbihidXR0b24gPT4gYnV0dG9uXHJcbiAgICAgICAgLnNldEJ1dHRvblRleHQoJ+S7juWJqui0tOadv+WvvOWFpScpXHJcbiAgICAgICAgLm9uQ2xpY2soKCkgPT4ge1xyXG4gICAgICAgICAgdGhpcy5jbG9zZSgpO1xyXG4gICAgICAgICAgdGhpcy5jYWxsYmFjaygnY2xpcGJvYXJkJyk7XHJcbiAgICAgICAgfSkpO1xyXG4gIH1cclxuXHJcbiAgb25DbG9zZSgpIHtcclxuICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xyXG4gICAgY29udGVudEVsLmVtcHR5KCk7XHJcbiAgfVxyXG59XHJcblxyXG5jbGFzcyBFeHBvcnRNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuICBwcml2YXRlIHNlbGVjdGVkVGFibGVzOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKTtcclxuXHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBhcHA6IEFwcCxcclxuICAgIHByaXZhdGUgdGFibGVzOiBEYXRhYmFzZVRhYmxlW10sXHJcbiAgICBwcml2YXRlIG9uU3VibWl0OiAoc2VsZWN0ZWRUYWJsZXM6IHN0cmluZ1tdKSA9PiB2b2lkXHJcbiAgKSB7XHJcbiAgICBzdXBlcihhcHApO1xyXG4gIH1cclxuXHJcbiAgb25PcGVuKCkge1xyXG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICBjb250ZW50RWwuZW1wdHkoKTtcclxuICAgIGNvbnRlbnRFbC5jcmVhdGVFbCgnaDInLCB7IHRleHQ6ICfpgInmi6nopoHlr7zlh7rnmoTooajmoLwnIH0pO1xyXG5cclxuICAgIHRoaXMudGFibGVzLmZvckVhY2godGFibGUgPT4ge1xyXG4gICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcbiAgICAgICAgLnNldE5hbWUodGFibGUubmFtZSlcclxuICAgICAgICAuYWRkVG9nZ2xlKHRvZ2dsZSA9PiB0b2dnbGVcclxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnNlbGVjdGVkVGFibGVzLmhhcyh0YWJsZS5uYW1lKSlcclxuICAgICAgICAgIC5vbkNoYW5nZSh2YWx1ZSA9PiB7XHJcbiAgICAgICAgICAgIGlmICh2YWx1ZSkge1xyXG4gICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRUYWJsZXMuYWRkKHRhYmxlLm5hbWUpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRUYWJsZXMuZGVsZXRlKHRhYmxlLm5hbWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcbiAgICAgIC5hZGRCdXR0b24oYnV0dG9uID0+IGJ1dHRvblxyXG4gICAgICAgIC5zZXRCdXR0b25UZXh0KCflr7zlh7onKVxyXG4gICAgICAgIC5zZXRDdGEoKVxyXG4gICAgICAgIC5vbkNsaWNrKCgpID0+IHtcclxuICAgICAgICAgIHRoaXMub25TdWJtaXQoQXJyYXkuZnJvbSh0aGlzLnNlbGVjdGVkVGFibGVzKSk7XHJcbiAgICAgICAgICB0aGlzLmNsb3NlKCk7XHJcbiAgICAgICAgfSkpO1xyXG4gIH1cclxuXHJcbiAgb25DbG9zZSgpIHtcclxuICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xyXG4gICAgY29udGVudEVsLmVtcHR5KCk7XHJcbiAgfVxyXG59XHJcbiIsImltcG9ydCB7IGRlYnVnLCBpbmZvIH0gZnJvbSAnLi91dGlscy9sb2dnZXInO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBEYXRhYmFzZVRhYmxlIHtcclxuICBuYW1lOiBzdHJpbmc7XHJcbiAgZmllbGRzOiBzdHJpbmdbXTtcclxuICBkYXRhOiBzdHJpbmdbXVtdO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VEYXRhYmFzZShtYXJrZG93bjogc3RyaW5nKTogRGF0YWJhc2VUYWJsZVtdIHtcclxuICBkZWJ1Zyhg5byA5aeL6Kej5p6Q5pWw5o2u5bqT77yM6L6T5YWl5YaF5a65OiAke21hcmtkb3duLnN1YnN0cmluZygwLCAxMDApfS4uLmApO1xyXG4gIGNvbnN0IHRhYmxlczogRGF0YWJhc2VUYWJsZVtdID0gW107XHJcbiAgY29uc3QgbGluZXMgPSBtYXJrZG93bi5zcGxpdCgnXFxuJyk7XHJcbiAgbGV0IGN1cnJlbnRUYWJsZTogRGF0YWJhc2VUYWJsZSB8IG51bGwgPSBudWxsO1xyXG5cclxuICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcclxuICAgIGNvbnN0IHRyaW1tZWRMaW5lID0gbGluZS50cmltKCk7XHJcbiAgICBkZWJ1Zyhg5aSE55CG6KGMOiAke3RyaW1tZWRMaW5lfWApO1xyXG4gICAgaWYgKHRyaW1tZWRMaW5lLnN0YXJ0c1dpdGgoJ2RiOicpKSB7XHJcbiAgICAgIGRlYnVnKGDlj5HnjrDmlrDooag6ICR7dHJpbW1lZExpbmV9YCk7XHJcbiAgICAgIGlmIChjdXJyZW50VGFibGUpIHtcclxuICAgICAgICB0YWJsZXMucHVzaChjdXJyZW50VGFibGUpO1xyXG4gICAgICB9XHJcbiAgICAgIGN1cnJlbnRUYWJsZSA9IHtcclxuICAgICAgICBuYW1lOiB0cmltbWVkTGluZS5zdWJzdHJpbmcoMykudHJpbSgpLFxyXG4gICAgICAgIGZpZWxkczogW10sXHJcbiAgICAgICAgZGF0YTogW11cclxuICAgICAgfTtcclxuICAgIH0gZWxzZSBpZiAoY3VycmVudFRhYmxlKSB7XHJcbiAgICAgIGNvbnN0IGNlbGxzID0gdHJpbW1lZExpbmUuc3BsaXQoJywnKS5tYXAoY2VsbCA9PiBjZWxsLnRyaW0oKSk7XHJcbiAgICAgIGlmIChjZWxscy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgaWYgKGN1cnJlbnRUYWJsZS5maWVsZHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICBkZWJ1Zyhg6K6+572u5a2X5q61OiAke2NlbGxzLmpvaW4oJywgJyl9YCk7XHJcbiAgICAgICAgICBjdXJyZW50VGFibGUuZmllbGRzID0gY2VsbHM7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGRlYnVnKGDmt7vliqDmlbDmja7ooYw6ICR7Y2VsbHMuam9pbignLCAnKX1gKTtcclxuICAgICAgICAgIGN1cnJlbnRUYWJsZS5kYXRhLnB1c2goY2VsbHMpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKGN1cnJlbnRUYWJsZSkge1xyXG4gICAgdGFibGVzLnB1c2goY3VycmVudFRhYmxlKTtcclxuICB9XHJcblxyXG4gIGluZm8oYOino+aekOWujOaIkO+8jOe7k+aenDogJHtKU09OLnN0cmluZ2lmeSh0YWJsZXMpLnN1YnN0cmluZygwLCAxMDApfS4uLmApO1xyXG4gIHJldHVybiB0YWJsZXM7XHJcbn1cclxuIiwiaW1wb3J0IHsgUGx1Z2luLCBOb3RpY2UsIFRGaWxlLCBNYXJrZG93blZpZXcsIEV2ZW50cywgQXBwLCBQbHVnaW5NYW5pZmVzdCwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZywgQnV0dG9uQ29tcG9uZW50IH0gZnJvbSAnb2JzaWRpYW4nO1xyXG5pbXBvcnQgeyBEYXRhYmFzZVZpZXcsIERBVEFCQVNFX1ZJRVdfVFlQRSB9IGZyb20gJy4vRGF0YWJhc2VWaWV3JztcclxuaW1wb3J0IHsgcGFyc2VEYXRhYmFzZSB9IGZyb20gJy4vZGF0YWJhc2VQYXJzZXInO1xyXG5pbXBvcnQgeyBkZWJ1ZywgaW5mbywgd2FybiwgZXJyb3IgfSBmcm9tICcuL3V0aWxzL2xvZ2dlcic7XHJcbmltcG9ydCAnLi4vc3R5bGVzLmNzcyc7XHJcbmltcG9ydCB7IERhdGFiYXNlUGx1Z2luU2V0dGluZ3MsIFNpbXBsZURhdGFiYXNlUGx1Z2luLCBEYXRhYmFzZVRhYmxlLCBEYXRhYmFzZVZpZXdJbnRlcmZhY2UgfSBmcm9tICcuL3R5cGVzJztcclxuXHJcbmNvbnN0IERFRkFVTFRfU0VUVElOR1M6IERhdGFiYXNlUGx1Z2luU2V0dGluZ3MgPSB7XHJcbiAgZGVmYXVsdFNvcnREaXJlY3Rpb246ICdhc2MnXHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEYXRhYmFzZVBsdWdpbiBleHRlbmRzIFBsdWdpbiBpbXBsZW1lbnRzIFNpbXBsZURhdGFiYXNlUGx1Z2luIHtcclxuICBwcml2YXRlIGRhdGFiYXNlVmlldzogRGF0YWJhc2VWaWV3SW50ZXJmYWNlIHwgbnVsbCA9IG51bGw7XHJcbiAgc2V0dGluZ3M6IERhdGFiYXNlUGx1Z2luU2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTO1xyXG5cclxuICBhc3luYyBvbmxvYWQoKSB7XHJcbiAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xyXG4gICAgaW5mbygn5Yqg6L295pWw5o2u5bqT5o+S5Lu2Jyk7XHJcblxyXG4gICAgdGhpcy5yZWdpc3RlclZpZXcoXHJcbiAgICAgIERBVEFCQVNFX1ZJRVdfVFlQRSxcclxuICAgICAgKGxlYWYpID0+IG5ldyBEYXRhYmFzZVZpZXcobGVhZiwgdGhpcylcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgaWQ6ICdwYXJzZS1jdXJyZW50LWZpbGUnLFxyXG4gICAgICBuYW1lOiAn6Kej5p6Q5b2T5YmN5paH5Lu25Lit55qE5pWw5o2u5bqTJyxcclxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMucGFyc2VBbmRVcGRhdGVWaWV3KClcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMucmVnaXN0ZXJFdmVudChcclxuICAgICAgdGhpcy5hcHAud29ya3NwYWNlLm9uKCdmaWxlLW9wZW4nLCAoZmlsZSkgPT4ge1xyXG4gICAgICAgIGlmIChmaWxlICYmIGZpbGUuZXh0ZW5zaW9uID09PSAnbWQnKSB7XHJcbiAgICAgICAgICB0aGlzLnBhcnNlQW5kVXBkYXRlVmlldygpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KFxyXG4gICAgICB0aGlzLmFwcC52YXVsdC5vbignbW9kaWZ5JywgKGZpbGUpID0+IHtcclxuICAgICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlICYmIGZpbGUuZXh0ZW5zaW9uID09PSAnbWQnKSB7XHJcbiAgICAgICAgICB0aGlzLnBhcnNlQW5kVXBkYXRlVmlldygpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5hZGRSaWJib25JY29uKCdkYXRhYmFzZScsICfmiZPlvIDmlbDmja7lupPop4blm74nLCAoKSA9PiB7XHJcbiAgICAgIHRoaXMuYWN0aXZhdGVWaWV3KCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xyXG4gICAgICBpZDogJ29wZW4tZGF0YWJhc2UtdmlldycsXHJcbiAgICAgIG5hbWU6ICfmiZPlvIDmlbDmja7lupPop4blm74nLFxyXG4gICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5hY3RpdmF0ZVZpZXcoKVxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBEYXRhYmFzZVBsdWdpblNldHRpbmdUYWIodGhpcy5hcHAsIHRoaXMpKTtcclxuXHJcbiAgICAvLyDmmrTpnLLmjqXlj6Pnu5nlhbbku5bmj5Lku7ZcclxuICAgICh0aGlzLmFwcCBhcyBhbnkpLnBsdWdpbnMuc2ltcGxlX2RhdGFiYXNlID0gdGhpcztcclxuICB9XHJcblxyXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpIHtcclxuICAgIGNvbnN0IGxvYWRlZERhdGEgPSBhd2FpdCB0aGlzLmxvYWREYXRhKCk7XHJcbiAgICBjb25zdCBwYXJzZWREYXRhID0gbG9hZGVkRGF0YSA/IEpTT04ucGFyc2UobG9hZGVkRGF0YSkgOiB7fTtcclxuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBwYXJzZWREYXRhKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHBhcnNlQW5kVXBkYXRlVmlldygpIHtcclxuICAgIGNvbnN0IGFjdGl2ZVZpZXcgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlVmlld09mVHlwZShNYXJrZG93blZpZXcpO1xyXG4gICAgaWYgKGFjdGl2ZVZpZXcpIHtcclxuICAgICAgY29uc3QgY29udGVudCA9IGFjdGl2ZVZpZXcuZ2V0Vmlld0RhdGEoKTtcclxuICAgICAgZGVidWcoYOiOt+WPluWIsOeahOaWh+S7tuWGheWuuTogJHtjb250ZW50fWApO1xyXG4gICAgICBjb25zdCB0YWJsZXMgPSBwYXJzZURhdGFiYXNlKGNvbnRlbnQpO1xyXG4gICAgICBkZWJ1Zyhg6Kej5p6Q5ZCO55qE6KGo5qC85pWw5o2uOiAke0pTT04uc3RyaW5naWZ5KHRhYmxlcyl9YCk7XHJcblxyXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh0YWJsZXMpICYmIHRhYmxlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5hY3RpdmF0ZVZpZXcoKTtcclxuICAgICAgICBpZiAodGhpcy5kYXRhYmFzZVZpZXcpIHtcclxuICAgICAgICAgIGluZm8oJ+abtOaWsOaVsOaNruW6k+inhuWbvicpO1xyXG4gICAgICAgICAgdGhpcy5kYXRhYmFzZVZpZXcuc2V0VGFibGVzKHRhYmxlcyk7XHJcbiAgICAgICAgICBuZXcgTm90aWNlKCfmlbDmja7lupPop4blm77lt7Lmm7TmlrAnKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgZXJyb3IoJ+aXoOazleWIm+W7uuaIluiOt+WPluaVsOaNruW6k+inhuWbvicpO1xyXG4gICAgICAgICAgbmV3IE5vdGljZSgn5pu05paw5pWw5o2u5bqT6KeG5Zu+5aSx6LSlJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGVycm9yKGDop6PmnpDnu5Pmnpzml6DmlYg6ICR7SlNPTi5zdHJpbmdpZnkodGFibGVzKX1gKTtcclxuICAgICAgICBuZXcgTm90aWNlKCfop6PmnpDmlbDmja7lupPlpLHotKXvvIzor7fmo4Dmn6Xmlofku7bmoLzlvI8nKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgbmV3IE5vdGljZSgn6K+35omT5byA5LiA5LiqIE1hcmtkb3duIOaWh+S7ticpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgYWN0aXZhdGVWaWV3KCkge1xyXG4gICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuYXBwO1xyXG4gICAgbGV0IGxlYWYgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKERBVEFCQVNFX1ZJRVdfVFlQRSlbMF07XHJcbiAgICBpZiAoIWxlYWYpIHtcclxuICAgICAgbGVhZiA9IHdvcmtzcGFjZS5nZXRSaWdodExlYWYoZmFsc2UpO1xyXG4gICAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IERBVEFCQVNFX1ZJRVdfVFlQRSwgYWN0aXZlOiB0cnVlIH0pO1xyXG4gICAgfVxyXG4gICAgd29ya3NwYWNlLnJldmVhbExlYWYobGVhZik7XHJcbiAgICBcclxuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKTtcclxuICAgIFxyXG4gICAgdGhpcy5kYXRhYmFzZVZpZXcgPSBsZWFmLnZpZXcgYXMgRGF0YWJhc2VWaWV3SW50ZXJmYWNlO1xyXG4gICAgaW5mbyhg5pWw5o2u5bqT6KeG5Zu+5bey5r+A5rS7OiAke3RoaXMuZGF0YWJhc2VWaWV3ID8gJ3N1Y2Nlc3MnIDogJ2ZhaWwnfWApO1xyXG4gICAgXHJcbiAgICBpZiAoIXRoaXMuZGF0YWJhc2VWaWV3KSB7XHJcbiAgICAgIGVycm9yKCfmv4DmtLvmlbDmja7lupPop4blm77lpLHotKUnKTtcclxuICAgICAgbmV3IE5vdGljZSgn5peg5rOV5Yib5bu65pWw5o2u5bqT6KeG5Zu+Jyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBvbnVubG9hZCgpIHtcclxuICAgIGluZm8oJ+WNuOi9veaVsOaNruW6k+aPkuS7ticpO1xyXG5cclxuICAgIC8vIOenu+mZpOaatOmcsueahOaOpeWPo1xyXG4gICAgZGVsZXRlICh0aGlzLmFwcCBhcyBhbnkpLnBsdWdpbnMuc2ltcGxlX2RhdGFiYXNlO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgc2F2ZURhdGEoKSB7XHJcbiAgICBhd2FpdCB0aGlzLnNhdmVTZXR0aW5ncygpO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCkge1xyXG4gICAgYXdhaXQgKHRoaXMuc2F2ZURhdGEgYXMgKGRhdGE6IGFueSkgPT4gUHJvbWlzZTx2b2lkPikoSlNPTi5zdHJpbmdpZnkodGhpcy5zZXR0aW5ncykpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGdldERhdGFiYXNlRGF0YSgpOiBEYXRhYmFzZVRhYmxlW10gfCBudWxsIHtcclxuICAgIGlmICh0aGlzLmRhdGFiYXNlVmlldykge1xyXG4gICAgICByZXR1cm4gdGhpcy5kYXRhYmFzZVZpZXcuZ2V0VGFibGVzKCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbDtcclxuICB9XHJcbn1cclxuXHJcbmNsYXNzIERhdGFiYXNlUGx1Z2luU2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xyXG4gIHBsdWdpbjogRGF0YWJhc2VQbHVnaW47XHJcblxyXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IERhdGFiYXNlUGx1Z2luKSB7XHJcbiAgICBzdXBlcihhcHAsIHBsdWdpbik7XHJcbiAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuICB9XHJcblxyXG4gIGRpc3BsYXkoKTogdm9pZCB7XHJcbiAgICBsZXQge2NvbnRhaW5lckVsfSA9IHRoaXM7XHJcbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xyXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gyJywge3RleHQ6ICfmlbDmja7lupPmj5Lku7borr7nva4nfSk7XHJcblxyXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgIC5zZXROYW1lKCfpu5jorqTmjpLluo/mlrnlkJEnKVxyXG4gICAgICAuc2V0RGVzYygn6K6+572u6KGo5qC855qE6buY6K6k5o6S5bqP5pa55ZCRJylcclxuICAgICAgLmFkZERyb3Bkb3duKGRyb3Bkb3duID0+IGRyb3Bkb3duXHJcbiAgICAgICAgLmFkZE9wdGlvbignYXNjJywgJ+WNh+W6jycpXHJcbiAgICAgICAgLmFkZE9wdGlvbignZGVzYycsICfpmY3luo8nKVxyXG4gICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0U29ydERpcmVjdGlvbilcclxuICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0U29ydERpcmVjdGlvbiA9IHZhbHVlIGFzICdhc2MnIHwgJ2Rlc2MnO1xyXG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgfSkpO1xyXG4gIH1cclxufVxyXG4iXSwibmFtZXMiOlsiSXRlbVZpZXciLCJEcm9wZG93bkNvbXBvbmVudCIsIkJ1dHRvbkNvbXBvbmVudCIsIlRleHRDb21wb25lbnQiLCJOb3RpY2UiLCJNYXJrZG93blZpZXciLCJNb2RhbCIsIlNldHRpbmciLCJQbHVnaW4iLCJURmlsZSIsIlBsdWdpblNldHRpbmdUYWIiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBb0dBO0FBQ08sU0FBUyxTQUFTLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFO0FBQzdELElBQUksU0FBUyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsT0FBTyxLQUFLLFlBQVksQ0FBQyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxVQUFVLE9BQU8sRUFBRSxFQUFFLE9BQU8sQ0FBQyxLQUFL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
