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
            console.error('setTables 收到无效数据:', tables);
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
            console.error('No tables to export');
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
                catch (error) {
                    console.error('创建数据库笔记时出错:', error);
                    if (isError(error)) {
                        new obsidian.Notice(`创建数据库笔记失败: ${error.message}`);
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
        console.log("Inserting content into DatabaseView:", content);
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
function isError(error) {
    return error instanceof Error;
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
    console.log('开始解析数据库，输入内容:', markdown);
    const tables = [];
    const lines = markdown.split('\n');
    let currentTable = null;
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
        }
        else if (currentTable) {
            const cells = trimmedLine.split(',').map(cell => cell.trim());
            if (cells.length > 1) {
                if (currentTable.fields.length === 0) {
                    console.log('设置字段:', cells);
                    currentTable.fields = cells;
                }
                else {
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
            console.log('加载数据库插件');
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
                console.log('获取到的文件内容:', content);
                const tables = parseDatabase(content);
                console.log('解析后的表格数据:', tables);
                if (Array.isArray(tables) && tables.length > 0) {
                    yield this.activateView();
                    if (this.databaseView) {
                        console.log('更新数据库视图');
                        this.databaseView.setTables(tables);
                        new obsidian.Notice('数据库视图已更新');
                    }
                    else {
                        console.error('无法创建或获取数据库视图');
                        new obsidian.Notice('更新数据库视图失败');
                    }
                }
                else {
                    console.error('解析结果无效:', tables);
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
            console.log('数据库视图已激活:', this.databaseView);
            if (!this.databaseView) {
                console.error('激活数据库视图失败');
                new obsidian.Notice('无法创建数据库视图');
            }
        });
    }
    onunload() {
        console.log('卸载数据库插件');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInNyYy9EYXRhYmFzZVZpZXcudHMiLCJzcmMvZGF0YWJhc2VQYXJzZXIudHMiLCJzcmMvbWFpbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbkNvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLlxyXG5cclxuUGVybWlzc2lvbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgYW5kL29yIGRpc3RyaWJ1dGUgdGhpcyBzb2Z0d2FyZSBmb3IgYW55XHJcbnB1cnBvc2Ugd2l0aCBvciB3aXRob3V0IGZlZSBpcyBoZXJlYnkgZ3JhbnRlZC5cclxuXHJcblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIgQU5EIFRIRSBBVVRIT1IgRElTQ0xBSU1TIEFMTCBXQVJSQU5USUVTIFdJVEhcclxuUkVHQVJEIFRPIFRISVMgU09GVFdBUkUgSU5DTFVESU5HIEFMTCBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZXHJcbkFORCBGSVRORVNTLiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SIEJFIExJQUJMRSBGT1IgQU5ZIFNQRUNJQUwsIERJUkVDVCxcclxuSU5ESVJFQ1QsIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyBPUiBBTlkgREFNQUdFUyBXSEFUU09FVkVSIFJFU1VMVElORyBGUk9NXHJcbkxPU1MgT0YgVVNFLCBEQVRBIE9SIFBST0ZJVFMsIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBORUdMSUdFTkNFIE9SXHJcbk9USEVSIFRPUlRJT1VTIEFDVElPTiwgQVJJU0lORyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBVU0UgT1JcclxuUEVSRk9STUFOQ0UgT0YgVEhJUyBTT0ZUV0FSRS5cclxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi9cclxuLyogZ2xvYmFsIFJlZmxlY3QsIFByb21pc2UsIFN1cHByZXNzZWRFcnJvciwgU3ltYm9sLCBJdGVyYXRvciAqL1xyXG5cclxudmFyIGV4dGVuZFN0YXRpY3MgPSBmdW5jdGlvbihkLCBiKSB7XHJcbiAgICBleHRlbmRTdGF0aWNzID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8XHJcbiAgICAgICAgKHsgX19wcm90b19fOiBbXSB9IGluc3RhbmNlb2YgQXJyYXkgJiYgZnVuY3Rpb24gKGQsIGIpIHsgZC5fX3Byb3RvX18gPSBiOyB9KSB8fFxyXG4gICAgICAgIGZ1bmN0aW9uIChkLCBiKSB7IGZvciAodmFyIHAgaW4gYikgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChiLCBwKSkgZFtwXSA9IGJbcF07IH07XHJcbiAgICByZXR1cm4gZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2V4dGVuZHMoZCwgYikge1xyXG4gICAgaWYgKHR5cGVvZiBiICE9PSBcImZ1bmN0aW9uXCIgJiYgYiAhPT0gbnVsbClcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2xhc3MgZXh0ZW5kcyB2YWx1ZSBcIiArIFN0cmluZyhiKSArIFwiIGlzIG5vdCBhIGNvbnN0cnVjdG9yIG9yIG51bGxcIik7XHJcbiAgICBleHRlbmRTdGF0aWNzKGQsIGIpO1xyXG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XHJcbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19hc3NpZ24gPSBmdW5jdGlvbigpIHtcclxuICAgIF9fYXNzaWduID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiBfX2Fzc2lnbih0KSB7XHJcbiAgICAgICAgZm9yICh2YXIgcywgaSA9IDEsIG4gPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XHJcbiAgICAgICAgICAgIHMgPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSkgdFtwXSA9IHNbcF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIF9fYXNzaWduLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3Jlc3QocywgZSkge1xyXG4gICAgdmFyIHQgPSB7fTtcclxuICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSAmJiBlLmluZGV4T2YocCkgPCAwKVxyXG4gICAgICAgIHRbcF0gPSBzW3BdO1xyXG4gICAgaWYgKHMgIT0gbnVsbCAmJiB0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyA9PT0gXCJmdW5jdGlvblwiKVxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBwID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhzKTsgaSA8IHAubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKGUuaW5kZXhPZihwW2ldKSA8IDAgJiYgT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZS5jYWxsKHMsIHBbaV0pKVxyXG4gICAgICAgICAgICAgICAgdFtwW2ldXSA9IHNbcFtpXV07XHJcbiAgICAgICAgfVxyXG4gICAgcmV0dXJuIHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2RlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19wYXJhbShwYXJhbUluZGV4LCBkZWNvcmF0b3IpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHsgZGVjb3JhdG9yKHRhcmdldCwga2V5LCBwYXJhbUluZGV4KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19lc0RlY29yYXRlKGN0b3IsIGRlc2NyaXB0b3JJbiwgZGVjb3JhdG9ycywgY29udGV4dEluLCBpbml0aWFsaXplcnMsIGV4dHJhSW5pdGlhbGl6ZXJzKSB7XHJcbiAgICBmdW5jdGlvbiBhY2NlcHQoZikgeyBpZiAoZiAhPT0gdm9pZCAwICYmIHR5cGVvZiBmICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJGdW5jdGlvbiBleHBlY3RlZFwiKTsgcmV0dXJuIGY7IH1cclxuICAgIHZhciBraW5kID0gY29udGV4dEluLmtpbmQsIGtleSA9IGtpbmQgPT09IFwiZ2V0dGVyXCIgPyBcImdldFwiIDoga2luZCA9PT0gXCJzZXR0ZXJcIiA/IFwic2V0XCIgOiBcInZhbHVlXCI7XHJcbiAgICB2YXIgdGFyZ2V0ID0gIWRlc2NyaXB0b3JJbiAmJiBjdG9yID8gY29udGV4dEluW1wic3RhdGljXCJdID8gY3RvciA6IGN0b3IucHJvdG90eXBlIDogbnVsbDtcclxuICAgIHZhciBkZXNjcmlwdG9yID0gZGVzY3JpcHRvckluIHx8ICh0YXJnZXQgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgY29udGV4dEluLm5hbWUpIDoge30pO1xyXG4gICAgdmFyIF8sIGRvbmUgPSBmYWxzZTtcclxuICAgIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICAgICAgdmFyIGNvbnRleHQgPSB7fTtcclxuICAgICAgICBmb3IgKHZhciBwIGluIGNvbnRleHRJbikgY29udGV4dFtwXSA9IHAgPT09IFwiYWNjZXNzXCIgPyB7fSA6IGNvbnRleHRJbltwXTtcclxuICAgICAgICBmb3IgKHZhciBwIGluIGNvbnRleHRJbi5hY2Nlc3MpIGNvbnRleHQuYWNjZXNzW3BdID0gY29udGV4dEluLmFjY2Vzc1twXTtcclxuICAgICAgICBjb250ZXh0LmFkZEluaXRpYWxpemVyID0gZnVuY3Rpb24gKGYpIHsgaWYgKGRvbmUpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgYWRkIGluaXRpYWxpemVycyBhZnRlciBkZWNvcmF0aW9uIGhhcyBjb21wbGV0ZWRcIik7IGV4dHJhSW5pdGlhbGl6ZXJzLnB1c2goYWNjZXB0KGYgfHwgbnVsbCkpOyB9O1xyXG4gICAgICAgIHZhciByZXN1bHQgPSAoMCwgZGVjb3JhdG9yc1tpXSkoa2luZCA9PT0gXCJhY2Nlc3NvclwiID8geyBnZXQ6IGRlc2NyaXB0b3IuZ2V0LCBzZXQ6IGRlc2NyaXB0b3Iuc2V0IH0gOiBkZXNjcmlwdG9yW2tleV0sIGNvbnRleHQpO1xyXG4gICAgICAgIGlmIChraW5kID09PSBcImFjY2Vzc29yXCIpIHtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gdm9pZCAwKSBjb250aW51ZTtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gbnVsbCB8fCB0eXBlb2YgcmVzdWx0ICE9PSBcIm9iamVjdFwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IGV4cGVjdGVkXCIpO1xyXG4gICAgICAgICAgICBpZiAoXyA9IGFjY2VwdChyZXN1bHQuZ2V0KSkgZGVzY3JpcHRvci5nZXQgPSBfO1xyXG4gICAgICAgICAgICBpZiAoXyA9IGFjY2VwdChyZXN1bHQuc2V0KSkgZGVzY3JpcHRvci5zZXQgPSBfO1xyXG4gICAgICAgICAgICBpZiAoXyA9IGFjY2VwdChyZXN1bHQuaW5pdCkpIGluaXRpYWxpemVycy51bnNoaWZ0KF8pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChfID0gYWNjZXB0KHJlc3VsdCkpIHtcclxuICAgICAgICAgICAgaWYgKGtpbmQgPT09IFwiZmllbGRcIikgaW5pdGlhbGl6ZXJzLnVuc2hpZnQoXyk7XHJcbiAgICAgICAgICAgIGVsc2UgZGVzY3JpcHRvcltrZXldID0gXztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAodGFyZ2V0KSBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBjb250ZXh0SW4ubmFtZSwgZGVzY3JpcHRvcik7XHJcbiAgICBkb25lID0gdHJ1ZTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3J1bkluaXRpYWxpemVycyh0aGlzQXJnLCBpbml0aWFsaXplcnMsIHZhbHVlKSB7XHJcbiAgICB2YXIgdXNlVmFsdWUgPSBhcmd1bWVudHMubGVuZ3RoID4gMjtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW5pdGlhbGl6ZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFsdWUgPSB1c2VWYWx1ZSA/IGluaXRpYWxpemVyc1tpXS5jYWxsKHRoaXNBcmcsIHZhbHVlKSA6IGluaXRpYWxpemVyc1tpXS5jYWxsKHRoaXNBcmcpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHVzZVZhbHVlID8gdmFsdWUgOiB2b2lkIDA7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19wcm9wS2V5KHgpIHtcclxuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gXCJzeW1ib2xcIiA/IHggOiBcIlwiLmNvbmNhdCh4KTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NldEZ1bmN0aW9uTmFtZShmLCBuYW1lLCBwcmVmaXgpIHtcclxuICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gXCJzeW1ib2xcIikgbmFtZSA9IG5hbWUuZGVzY3JpcHRpb24gPyBcIltcIi5jb25jYXQobmFtZS5kZXNjcmlwdGlvbiwgXCJdXCIpIDogXCJcIjtcclxuICAgIHJldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkoZiwgXCJuYW1lXCIsIHsgY29uZmlndXJhYmxlOiB0cnVlLCB2YWx1ZTogcHJlZml4ID8gXCJcIi5jb25jYXQocHJlZml4LCBcIiBcIiwgbmFtZSkgOiBuYW1lIH0pO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fbWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpIHtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5tZXRhZGF0YSA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4gUmVmbGVjdC5tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0ZXIodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19nZW5lcmF0b3IodGhpc0FyZywgYm9keSkge1xyXG4gICAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZyA9IE9iamVjdC5jcmVhdGUoKHR5cGVvZiBJdGVyYXRvciA9PT0gXCJmdW5jdGlvblwiID8gSXRlcmF0b3IgOiBPYmplY3QpLnByb3RvdHlwZSk7XHJcbiAgICByZXR1cm4gZy5uZXh0ID0gdmVyYigwKSwgZ1tcInRocm93XCJdID0gdmVyYigxKSwgZ1tcInJldHVyblwiXSA9IHZlcmIoMiksIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiAoZ1tTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9KSwgZztcclxuICAgIGZ1bmN0aW9uIHZlcmIobikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHN0ZXAoW24sIHZdKTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc3RlcChvcCkge1xyXG4gICAgICAgIGlmIChmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiR2VuZXJhdG9yIGlzIGFscmVhZHkgZXhlY3V0aW5nLlwiKTtcclxuICAgICAgICB3aGlsZSAoZyAmJiAoZyA9IDAsIG9wWzBdICYmIChfID0gMCkpLCBfKSB0cnkge1xyXG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XHJcbiAgICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcclxuICAgICAgICAgICAgc3dpdGNoIChvcFswXSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xyXG4gICAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XHJcbiAgICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19jcmVhdGVCaW5kaW5nID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIHZhciBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihtLCBrKTtcclxuICAgIGlmICghZGVzYyB8fCAoXCJnZXRcIiBpbiBkZXNjID8gIW0uX19lc01vZHVsZSA6IGRlc2Mud3JpdGFibGUgfHwgZGVzYy5jb25maWd1cmFibGUpKSB7XHJcbiAgICAgICAgZGVzYyA9IHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG1ba107IH0gfTtcclxuICAgIH1cclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgZGVzYyk7XHJcbn0pIDogKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XHJcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xyXG4gICAgb1trMl0gPSBtW2tdO1xyXG59KTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2V4cG9ydFN0YXIobSwgbykge1xyXG4gICAgZm9yICh2YXIgcCBpbiBtKSBpZiAocCAhPT0gXCJkZWZhdWx0XCIgJiYgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvLCBwKSkgX19jcmVhdGVCaW5kaW5nKG8sIG0sIHApO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX192YWx1ZXMobykge1xyXG4gICAgdmFyIHMgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgU3ltYm9sLml0ZXJhdG9yLCBtID0gcyAmJiBvW3NdLCBpID0gMDtcclxuICAgIGlmIChtKSByZXR1cm4gbS5jYWxsKG8pO1xyXG4gICAgaWYgKG8gJiYgdHlwZW9mIG8ubGVuZ3RoID09PSBcIm51bWJlclwiKSByZXR1cm4ge1xyXG4gICAgICAgIG5leHQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKG8gJiYgaSA+PSBvLmxlbmd0aCkgbyA9IHZvaWQgMDtcclxuICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IG8gJiYgb1tpKytdLCBkb25lOiAhbyB9O1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKHMgPyBcIk9iamVjdCBpcyBub3QgaXRlcmFibGUuXCIgOiBcIlN5bWJvbC5pdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3JlYWQobywgbikge1xyXG4gICAgdmFyIG0gPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb1tTeW1ib2wuaXRlcmF0b3JdO1xyXG4gICAgaWYgKCFtKSByZXR1cm4gbztcclxuICAgIHZhciBpID0gbS5jYWxsKG8pLCByLCBhciA9IFtdLCBlO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICB3aGlsZSAoKG4gPT09IHZvaWQgMCB8fCBuLS0gPiAwKSAmJiAhKHIgPSBpLm5leHQoKSkuZG9uZSkgYXIucHVzaChyLnZhbHVlKTtcclxuICAgIH1cclxuICAgIGNhdGNoIChlcnJvcikgeyBlID0geyBlcnJvcjogZXJyb3IgfTsgfVxyXG4gICAgZmluYWxseSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKHIgJiYgIXIuZG9uZSAmJiAobSA9IGlbXCJyZXR1cm5cIl0pKSBtLmNhbGwoaSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZpbmFsbHkgeyBpZiAoZSkgdGhyb3cgZS5lcnJvcjsgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGFyO1xyXG59XHJcblxyXG4vKiogQGRlcHJlY2F0ZWQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkKCkge1xyXG4gICAgZm9yICh2YXIgYXIgPSBbXSwgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspXHJcbiAgICAgICAgYXIgPSBhci5jb25jYXQoX19yZWFkKGFyZ3VtZW50c1tpXSkpO1xyXG4gICAgcmV0dXJuIGFyO1xyXG59XHJcblxyXG4vKiogQGRlcHJlY2F0ZWQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkQXJyYXlzKCkge1xyXG4gICAgZm9yICh2YXIgcyA9IDAsIGkgPSAwLCBpbCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBpbDsgaSsrKSBzICs9IGFyZ3VtZW50c1tpXS5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciByID0gQXJyYXkocyksIGsgPSAwLCBpID0gMDsgaSA8IGlsOyBpKyspXHJcbiAgICAgICAgZm9yICh2YXIgYSA9IGFyZ3VtZW50c1tpXSwgaiA9IDAsIGpsID0gYS5sZW5ndGg7IGogPCBqbDsgaisrLCBrKyspXHJcbiAgICAgICAgICAgIHJba10gPSBhW2pdO1xyXG4gICAgcmV0dXJuIHI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZEFycmF5KHRvLCBmcm9tLCBwYWNrKSB7XHJcbiAgICBpZiAocGFjayB8fCBhcmd1bWVudHMubGVuZ3RoID09PSAyKSBmb3IgKHZhciBpID0gMCwgbCA9IGZyb20ubGVuZ3RoLCBhcjsgaSA8IGw7IGkrKykge1xyXG4gICAgICAgIGlmIChhciB8fCAhKGkgaW4gZnJvbSkpIHtcclxuICAgICAgICAgICAgaWYgKCFhcikgYXIgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChmcm9tLCAwLCBpKTtcclxuICAgICAgICAgICAgYXJbaV0gPSBmcm9tW2ldO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiB0by5jb25jYXQoYXIgfHwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZnJvbSkpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdCh2KSB7XHJcbiAgICByZXR1cm4gdGhpcyBpbnN0YW5jZW9mIF9fYXdhaXQgPyAodGhpcy52ID0gdiwgdGhpcykgOiBuZXcgX19hd2FpdCh2KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNHZW5lcmF0b3IodGhpc0FyZywgX2FyZ3VtZW50cywgZ2VuZXJhdG9yKSB7XHJcbiAgICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgdmFyIGcgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSksIGksIHEgPSBbXTtcclxuICAgIHJldHVybiBpID0gT2JqZWN0LmNyZWF0ZSgodHlwZW9mIEFzeW5jSXRlcmF0b3IgPT09IFwiZnVuY3Rpb25cIiA/IEFzeW5jSXRlcmF0b3IgOiBPYmplY3QpLnByb3RvdHlwZSksIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiwgYXdhaXRSZXR1cm4pLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICBmdW5jdGlvbiBhd2FpdFJldHVybihmKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHYpLnRoZW4oZiwgcmVqZWN0KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gdmVyYihuLCBmKSB7IGlmIChnW25dKSB7IGlbbl0gPSBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKGEsIGIpIHsgcS5wdXNoKFtuLCB2LCBhLCBiXSkgPiAxIHx8IHJlc3VtZShuLCB2KTsgfSk7IH07IGlmIChmKSBpW25dID0gZihpW25dKTsgfSB9XHJcbiAgICBmdW5jdGlvbiByZXN1bWUobiwgdikgeyB0cnkgeyBzdGVwKGdbbl0odikpOyB9IGNhdGNoIChlKSB7IHNldHRsZShxWzBdWzNdLCBlKTsgfSB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKHIpIHsgci52YWx1ZSBpbnN0YW5jZW9mIF9fYXdhaXQgPyBQcm9taXNlLnJlc29sdmUoci52YWx1ZS52KS50aGVuKGZ1bGZpbGwsIHJlamVjdCkgOiBzZXR0bGUocVswXVsyXSwgcik7IH1cclxuICAgIGZ1bmN0aW9uIGZ1bGZpbGwodmFsdWUpIHsgcmVzdW1lKFwibmV4dFwiLCB2YWx1ZSk7IH1cclxuICAgIGZ1bmN0aW9uIHJlamVjdCh2YWx1ZSkgeyByZXN1bWUoXCJ0aHJvd1wiLCB2YWx1ZSk7IH1cclxuICAgIGZ1bmN0aW9uIHNldHRsZShmLCB2KSB7IGlmIChmKHYpLCBxLnNoaWZ0KCksIHEubGVuZ3RoKSByZXN1bWUocVswXVswXSwgcVswXVsxXSk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNEZWxlZ2F0b3Iobykge1xyXG4gICAgdmFyIGksIHA7XHJcbiAgICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIsIGZ1bmN0aW9uIChlKSB7IHRocm93IGU7IH0pLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuLCBmKSB7IGlbbl0gPSBvW25dID8gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIChwID0gIXApID8geyB2YWx1ZTogX19hd2FpdChvW25dKHYpKSwgZG9uZTogZmFsc2UgfSA6IGYgPyBmKHYpIDogdjsgfSA6IGY7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNWYWx1ZXMobykge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBtID0gb1tTeW1ib2wuYXN5bmNJdGVyYXRvcl0sIGk7XHJcbiAgICByZXR1cm4gbSA/IG0uY2FsbChvKSA6IChvID0gdHlwZW9mIF9fdmFsdWVzID09PSBcImZ1bmN0aW9uXCIgPyBfX3ZhbHVlcyhvKSA6IG9bU3ltYm9sLml0ZXJhdG9yXSgpLCBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaSk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgaVtuXSA9IG9bbl0gJiYgZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHsgdiA9IG9bbl0odiksIHNldHRsZShyZXNvbHZlLCByZWplY3QsIHYuZG9uZSwgdi52YWx1ZSk7IH0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCBkLCB2KSB7IFByb21pc2UucmVzb2x2ZSh2KS50aGVuKGZ1bmN0aW9uKHYpIHsgcmVzb2x2ZSh7IHZhbHVlOiB2LCBkb25lOiBkIH0pOyB9LCByZWplY3QpOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX21ha2VUZW1wbGF0ZU9iamVjdChjb29rZWQsIHJhdykge1xyXG4gICAgaWYgKE9iamVjdC5kZWZpbmVQcm9wZXJ0eSkgeyBPYmplY3QuZGVmaW5lUHJvcGVydHkoY29va2VkLCBcInJhd1wiLCB7IHZhbHVlOiByYXcgfSk7IH0gZWxzZSB7IGNvb2tlZC5yYXcgPSByYXc7IH1cclxuICAgIHJldHVybiBjb29rZWQ7XHJcbn07XHJcblxyXG52YXIgX19zZXRNb2R1bGVEZWZhdWx0ID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgXCJkZWZhdWx0XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHYgfSk7XHJcbn0pIDogZnVuY3Rpb24obywgdikge1xyXG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9faW1wb3J0U3Rhcihtb2QpIHtcclxuICAgIGlmIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpIHJldHVybiBtb2Q7XHJcbiAgICB2YXIgcmVzdWx0ID0ge307XHJcbiAgICBpZiAobW9kICE9IG51bGwpIGZvciAodmFyIGsgaW4gbW9kKSBpZiAoayAhPT0gXCJkZWZhdWx0XCIgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1vZCwgaykpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwgayk7XHJcbiAgICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9faW1wb3J0RGVmYXVsdChtb2QpIHtcclxuICAgIHJldHVybiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSA/IG1vZCA6IHsgZGVmYXVsdDogbW9kIH07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkR2V0KHJlY2VpdmVyLCBzdGF0ZSwga2luZCwgZikge1xyXG4gICAgaWYgKGtpbmQgPT09IFwiYVwiICYmICFmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBhY2Nlc3NvciB3YXMgZGVmaW5lZCB3aXRob3V0IGEgZ2V0dGVyXCIpO1xyXG4gICAgaWYgKHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgIT09IHN0YXRlIHx8ICFmIDogIXN0YXRlLmhhcyhyZWNlaXZlcikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgcmVhZCBwcml2YXRlIG1lbWJlciBmcm9tIGFuIG9iamVjdCB3aG9zZSBjbGFzcyBkaWQgbm90IGRlY2xhcmUgaXRcIik7XHJcbiAgICByZXR1cm4ga2luZCA9PT0gXCJtXCIgPyBmIDoga2luZCA9PT0gXCJhXCIgPyBmLmNhbGwocmVjZWl2ZXIpIDogZiA/IGYudmFsdWUgOiBzdGF0ZS5nZXQocmVjZWl2ZXIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZFNldChyZWNlaXZlciwgc3RhdGUsIHZhbHVlLCBraW5kLCBmKSB7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJtXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIG1ldGhvZCBpcyBub3Qgd3JpdGFibGVcIik7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJhXCIgJiYgIWYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIGFjY2Vzc29yIHdhcyBkZWZpbmVkIHdpdGhvdXQgYSBzZXR0ZXJcIik7XHJcbiAgICBpZiAodHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciAhPT0gc3RhdGUgfHwgIWYgOiAhc3RhdGUuaGFzKHJlY2VpdmVyKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCB3cml0ZSBwcml2YXRlIG1lbWJlciB0byBhbiBvYmplY3Qgd2hvc2UgY2xhc3MgZGlkIG5vdCBkZWNsYXJlIGl0XCIpO1xyXG4gICAgcmV0dXJuIChraW5kID09PSBcImFcIiA/IGYuY2FsbChyZWNlaXZlciwgdmFsdWUpIDogZiA/IGYudmFsdWUgPSB2YWx1ZSA6IHN0YXRlLnNldChyZWNlaXZlciwgdmFsdWUpKSwgdmFsdWU7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkSW4oc3RhdGUsIHJlY2VpdmVyKSB7XHJcbiAgICBpZiAocmVjZWl2ZXIgPT09IG51bGwgfHwgKHR5cGVvZiByZWNlaXZlciAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgcmVjZWl2ZXIgIT09IFwiZnVuY3Rpb25cIikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgdXNlICdpbicgb3BlcmF0b3Igb24gbm9uLW9iamVjdFwiKTtcclxuICAgIHJldHVybiB0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyID09PSBzdGF0ZSA6IHN0YXRlLmhhcyhyZWNlaXZlcik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZShlbnYsIHZhbHVlLCBhc3luYykge1xyXG4gICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB2b2lkIDApIHtcclxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiB2YWx1ZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IGV4cGVjdGVkLlwiKTtcclxuICAgICAgICB2YXIgZGlzcG9zZSwgaW5uZXI7XHJcbiAgICAgICAgaWYgKGFzeW5jKSB7XHJcbiAgICAgICAgICAgIGlmICghU3ltYm9sLmFzeW5jRGlzcG9zZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0Rpc3Bvc2UgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgICAgICAgICBkaXNwb3NlID0gdmFsdWVbU3ltYm9sLmFzeW5jRGlzcG9zZV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChkaXNwb3NlID09PSB2b2lkIDApIHtcclxuICAgICAgICAgICAgaWYgKCFTeW1ib2wuZGlzcG9zZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5kaXNwb3NlIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgICAgICAgICAgZGlzcG9zZSA9IHZhbHVlW1N5bWJvbC5kaXNwb3NlXTtcclxuICAgICAgICAgICAgaWYgKGFzeW5jKSBpbm5lciA9IGRpc3Bvc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0eXBlb2YgZGlzcG9zZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IG5vdCBkaXNwb3NhYmxlLlwiKTtcclxuICAgICAgICBpZiAoaW5uZXIpIGRpc3Bvc2UgPSBmdW5jdGlvbigpIHsgdHJ5IHsgaW5uZXIuY2FsbCh0aGlzKTsgfSBjYXRjaCAoZSkgeyByZXR1cm4gUHJvbWlzZS5yZWplY3QoZSk7IH0gfTtcclxuICAgICAgICBlbnYuc3RhY2sucHVzaCh7IHZhbHVlOiB2YWx1ZSwgZGlzcG9zZTogZGlzcG9zZSwgYXN5bmM6IGFzeW5jIH0pO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoYXN5bmMpIHtcclxuICAgICAgICBlbnYuc3RhY2sucHVzaCh7IGFzeW5jOiB0cnVlIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG5cclxufVxyXG5cclxudmFyIF9TdXBwcmVzc2VkRXJyb3IgPSB0eXBlb2YgU3VwcHJlc3NlZEVycm9yID09PSBcImZ1bmN0aW9uXCIgPyBTdXBwcmVzc2VkRXJyb3IgOiBmdW5jdGlvbiAoZXJyb3IsIHN1cHByZXNzZWQsIG1lc3NhZ2UpIHtcclxuICAgIHZhciBlID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xyXG4gICAgcmV0dXJuIGUubmFtZSA9IFwiU3VwcHJlc3NlZEVycm9yXCIsIGUuZXJyb3IgPSBlcnJvciwgZS5zdXBwcmVzc2VkID0gc3VwcHJlc3NlZCwgZTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2Rpc3Bvc2VSZXNvdXJjZXMoZW52KSB7XHJcbiAgICBmdW5jdGlvbiBmYWlsKGUpIHtcclxuICAgICAgICBlbnYuZXJyb3IgPSBlbnYuaGFzRXJyb3IgPyBuZXcgX1N1cHByZXNzZWRFcnJvcihlLCBlbnYuZXJyb3IsIFwiQW4gZXJyb3Igd2FzIHN1cHByZXNzZWQgZHVyaW5nIGRpc3Bvc2FsLlwiKSA6IGU7XHJcbiAgICAgICAgZW52Lmhhc0Vycm9yID0gdHJ1ZTtcclxuICAgIH1cclxuICAgIHZhciByLCBzID0gMDtcclxuICAgIGZ1bmN0aW9uIG5leHQoKSB7XHJcbiAgICAgICAgd2hpbGUgKHIgPSBlbnYuc3RhY2sucG9wKCkpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGlmICghci5hc3luYyAmJiBzID09PSAxKSByZXR1cm4gcyA9IDAsIGVudi5zdGFjay5wdXNoKHIpLCBQcm9taXNlLnJlc29sdmUoKS50aGVuKG5leHQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHIuZGlzcG9zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSByLmRpc3Bvc2UuY2FsbChyLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoci5hc3luYykgcmV0dXJuIHMgfD0gMiwgUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCkudGhlbihuZXh0LCBmdW5jdGlvbihlKSB7IGZhaWwoZSk7IHJldHVybiBuZXh0KCk7IH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBzIHw9IDE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIGZhaWwoZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHMgPT09IDEpIHJldHVybiBlbnYuaGFzRXJyb3IgPyBQcm9taXNlLnJlamVjdChlbnYuZXJyb3IpIDogUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgaWYgKGVudi5oYXNFcnJvcikgdGhyb3cgZW52LmVycm9yO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5leHQoKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmV3cml0ZVJlbGF0aXZlSW1wb3J0RXh0ZW5zaW9uKHBhdGgsIHByZXNlcnZlSnN4KSB7XHJcbiAgICBpZiAodHlwZW9mIHBhdGggPT09IFwic3RyaW5nXCIgJiYgL15cXC5cXC4/XFwvLy50ZXN0KHBhdGgpKSB7XHJcbiAgICAgICAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFwuKHRzeCkkfCgoPzpcXC5kKT8pKCg/OlxcLlteLi9dKz8pPylcXC4oW2NtXT8pdHMkL2ksIGZ1bmN0aW9uIChtLCB0c3gsIGQsIGV4dCwgY20pIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRzeCA/IHByZXNlcnZlSnN4ID8gXCIuanN4XCIgOiBcIi5qc1wiIDogZCAmJiAoIWV4dCB8fCAhY20pID8gbSA6IChkICsgZXh0ICsgXCIuXCIgKyBjbS50b0xvd2VyQ2FzZSgpICsgXCJqc1wiKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiBwYXRoO1xyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCB7XHJcbiAgICBfX2V4dGVuZHM6IF9fZXh0ZW5kcyxcclxuICAgIF9fYXNzaWduOiBfX2Fzc2lnbixcclxuICAgIF9fcmVzdDogX19yZXN0LFxyXG4gICAgX19kZWNvcmF0ZTogX19kZWNvcmF0ZSxcclxuICAgIF9fcGFyYW06IF9fcGFyYW0sXHJcbiAgICBfX2VzRGVjb3JhdGU6IF9fZXNEZWNvcmF0ZSxcclxuICAgIF9fcnVuSW5pdGlhbGl6ZXJzOiBfX3J1bkluaXRpYWxpemVycyxcclxuICAgIF9fcHJvcEtleTogX19wcm9wS2V5LFxyXG4gICAgX19zZXRGdW5jdGlvbk5hbWU6IF9fc2V0RnVuY3Rpb25OYW1lLFxyXG4gICAgX19tZXRhZGF0YTogX19tZXRhZGF0YSxcclxuICAgIF9fYXdhaXRlcjogX19hd2FpdGVyLFxyXG4gICAgX19nZW5lcmF0b3I6IF9fZ2VuZXJhdG9yLFxyXG4gICAgX19jcmVhdGVCaW5kaW5nOiBfX2NyZWF0ZUJpbmRpbmcsXHJcbiAgICBfX2V4cG9ydFN0YXI6IF9fZXhwb3J0U3RhcixcclxuICAgIF9fdmFsdWVzOiBfX3ZhbHVlcyxcclxuICAgIF9fcmVhZDogX19yZWFkLFxyXG4gICAgX19zcHJlYWQ6IF9fc3ByZWFkLFxyXG4gICAgX19zcHJlYWRBcnJheXM6IF9fc3ByZWFkQXJyYXlzLFxyXG4gICAgX19zcHJlYWRBcnJheTogX19zcHJlYWRBcnJheSxcclxuICAgIF9fYXdhaXQ6IF9fYXdhaXQsXHJcbiAgICBfX2FzeW5jR2VuZXJhdG9yOiBfX2FzeW5jR2VuZXJhdG9yLFxyXG4gICAgX19hc3luY0RlbGVnYXRvcjogX19hc3luY0RlbGVnYXRvcixcclxuICAgIF9fYXN5bmNWYWx1ZXM6IF9fYXN5bmNWYWx1ZXMsXHJcbiAgICBfX21ha2VUZW1wbGF0ZU9iamVjdDogX19tYWtlVGVtcGxhdGVPYmplY3QsXHJcbiAgICBfX2ltcG9ydFN0YXI6IF9faW1wb3J0U3RhcixcclxuICAgIF9faW1wb3J0RGVmYXVsdDogX19pbXBvcnREZWZhdWx0LFxyXG4gICAgX19jbGFzc1ByaXZhdGVGaWVsZEdldDogX19jbGFzc1ByaXZhdGVGaWVsZEdldCxcclxuICAgIF9fY2xhc3NQcml2YXRlRmllbGRTZXQ6IF9fY2xhc3NQcml2YXRlRmllbGRTZXQsXHJcbiAgICBfX2NsYXNzUHJpdmF0ZUZpZWxkSW46IF9fY2xhc3NQcml2YXRlRmllbGRJbixcclxuICAgIF9fYWRkRGlzcG9zYWJsZVJlc291cmNlOiBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZSxcclxuICAgIF9fZGlzcG9zZVJlc291cmNlczogX19kaXNwb3NlUmVzb3VyY2VzLFxyXG4gICAgX19yZXdyaXRlUmVsYXRpdmVJbXBvcnRFeHRlbnNpb246IF9fcmV3cml0ZVJlbGF0aXZlSW1wb3J0RXh0ZW5zaW9uLFxyXG59O1xyXG4iLCJpbXBvcnQgeyBJdGVtVmlldywgV29ya3NwYWNlTGVhZiwgQXBwLCBUZXh0Q29tcG9uZW50LCBEcm9wZG93bkNvbXBvbmVudCwgQnV0dG9uQ29tcG9uZW50LCBOb3RpY2UsIE1hcmtkb3duVmlldywgTW9kYWwsIFNldHRpbmcgfSBmcm9tICdvYnNpZGlhbic7XHJcbmltcG9ydCB7IERhdGFiYXNlVGFibGUgfSBmcm9tICcuL2RhdGFiYXNlUGFyc2VyJztcclxuaW1wb3J0IERhdGFiYXNlUGx1Z2luIGZyb20gJy4vbWFpbic7XHJcbmltcG9ydCB7IEZ1enp5U3VnZ2VzdE1vZGFsLCBURm9sZGVyIH0gZnJvbSAnb2JzaWRpYW4nO1xyXG5cclxuZXhwb3J0IGNvbnN0IERBVEFCQVNFX1ZJRVdfVFlQRSA9ICdkYXRhYmFzZS12aWV3JztcclxuXHJcbmludGVyZmFjZSBTb3J0U3RhdGUge1xyXG4gIGNvbHVtbjogc3RyaW5nO1xyXG4gIGRpcmVjdGlvbjogJ2FzYycgfCAnZGVzYyc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBUYWJsZVN0YXRlIHtcclxuICB0YWJsZTogRGF0YWJhc2VUYWJsZTtcclxuICBpZDogbnVtYmVyO1xyXG4gIHNlYXJjaFRlcm06IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIERhdGFiYXNlVmlldyBleHRlbmRzIEl0ZW1WaWV3IHtcclxuICBwcml2YXRlIHRhYmxlU3RhdGVzOiBUYWJsZVN0YXRlW10gPSBbXTtcclxuICBwcml2YXRlIHNvcnRTdGF0ZXM6IE1hcDxEYXRhYmFzZVRhYmxlLCBTb3J0U3RhdGU+ID0gbmV3IE1hcCgpO1xyXG4gIHByaXZhdGUgdGFibGVFbGVtZW50czogTWFwPERhdGFiYXNlVGFibGUsIEhUTUxFbGVtZW50PiA9IG5ldyBNYXAoKTtcclxuICBwcml2YXRlIGV4cG9ydERyb3Bkb3duPzogRHJvcGRvd25Db21wb25lbnQ7XHJcbiAgcHJpdmF0ZSBleHBvcnRCdXR0b24/OiBCdXR0b25Db21wb25lbnQ7XHJcbiAgcHJpdmF0ZSBpbXBvcnRCdXR0b24/OiBCdXR0b25Db21wb25lbnQ7XHJcbiAgcHJpdmF0ZSBwbHVnaW46IERhdGFiYXNlUGx1Z2luO1xyXG5cclxuICBjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmLCBwbHVnaW46IERhdGFiYXNlUGx1Z2luKSB7XHJcbiAgICBzdXBlcihsZWFmKTtcclxuICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG4gIH1cclxuXHJcbiAgZ2V0Vmlld1R5cGUoKSB7XHJcbiAgICByZXR1cm4gREFUQUJBU0VfVklFV19UWVBFO1xyXG4gIH1cclxuXHJcbiAgZ2V0RGlzcGxheVRleHQoKSB7XHJcbiAgICByZXR1cm4gJ+aVsOaNruW6k+inhuWbvic7XHJcbiAgfVxyXG5cclxuICBhc3luYyBvbk9wZW4oKSB7XHJcbiAgICB0aGlzLnJlbmRlclZpZXcoKTtcclxuICB9XHJcblxyXG4gIHNldFRhYmxlcyh0YWJsZXM6IERhdGFiYXNlVGFibGVbXSkge1xyXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodGFibGVzKSkge1xyXG4gICAgICB0aGlzLnRhYmxlU3RhdGVzID0gdGFibGVzLm1hcCgodGFibGUsIGluZGV4KSA9PiAoeyB0YWJsZSwgaWQ6IGluZGV4ICsgMSwgc2VhcmNoVGVybTogJycgfSkpO1xyXG4gICAgICB0aGlzLnJlbmRlclZpZXcoKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ3NldFRhYmxlcyDmlLbliLDml6DmlYjmlbDmja46JywgdGFibGVzKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJlbmRlclZpZXcoKSB7XHJcbiAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xyXG4gICAgY29udGVudEVsLmFkZENsYXNzKCdkYXRhYmFzZS12aWV3LWNvbnRhaW5lcicpO1xyXG5cclxuICAgIHRoaXMucmVuZGVySGVhZGVyKGNvbnRlbnRFbCk7XHJcbiAgICB0aGlzLnJlbmRlclRhYmxlcyhjb250ZW50RWwpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSByZW5kZXJIZWFkZXIoY29udGFpbmVyOiBIVE1MRWxlbWVudCkge1xyXG4gICAgY29uc3QgaGVhZGVyRGl2ID0gY29udGFpbmVyLmNyZWF0ZUVsKCdkaXYnLCB7IGNsczogJ2RhdGFiYXNlLWhlYWRlcicgfSk7XHJcbiAgICBoZWFkZXJEaXYuY3JlYXRlRWwoJ2g0JywgeyB0ZXh0OiAn5pWw5o2u5bqT6KeG5Zu+JyB9KTtcclxuXHJcbiAgICBjb25zdCBjb250cm9sc0RpdiA9IGhlYWRlckRpdi5jcmVhdGVFbCgnZGl2JywgeyBjbHM6ICdkYXRhYmFzZS1jb250cm9scycgfSk7XHJcbiAgICB0aGlzLnJlbmRlckV4cG9ydENvbnRyb2xzKGNvbnRyb2xzRGl2KTtcclxuICAgIHRoaXMucmVuZGVySW1wb3J0Q29udHJvbChjb250cm9sc0Rpdik7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlbmRlckV4cG9ydENvbnRyb2xzKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpIHtcclxuICAgIHRoaXMuZXhwb3J0RHJvcGRvd24gPSBuZXcgRHJvcGRvd25Db21wb25lbnQoY29udGFpbmVyKVxyXG4gICAgICAuYWRkT3B0aW9uKCdhbGwnLCAn5omA5pyJ6KGo5qC8JylcclxuICAgICAgLm9uQ2hhbmdlKCgpID0+IHtcclxuICAgICAgICBpZiAodGhpcy5leHBvcnRCdXR0b24pIHtcclxuICAgICAgICAgIHRoaXMuZXhwb3J0QnV0dG9uLnNldERpc2FibGVkKGZhbHNlKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgIHRoaXMudGFibGVTdGF0ZXMuZm9yRWFjaCgoc3RhdGUsIGluZGV4KSA9PiB7XHJcbiAgICAgIHRoaXMuZXhwb3J0RHJvcGRvd24/LmFkZE9wdGlvbihgJHtpbmRleH1gLCBgJHtzdGF0ZS50YWJsZS5uYW1lfSAoJHtzdGF0ZS5pZH0pYCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmV4cG9ydEJ1dHRvbiA9IG5ldyBCdXR0b25Db21wb25lbnQoY29udGFpbmVyKVxyXG4gICAgICAuc2V0QnV0dG9uVGV4dCgn5a+85Ye6IENTVicpXHJcbiAgICAgIC5vbkNsaWNrKCgpID0+IHRoaXMuZXhwb3J0VGFibGVzVG9DU1YoKSlcclxuICAgICAgLnNldERpc2FibGVkKHRydWUpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSByZW5kZXJUYWJsZXMoY29udGFpbmVyOiBIVE1MRWxlbWVudCkge1xyXG4gICAgaWYgKHRoaXMudGFibGVTdGF0ZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIGNvbnRhaW5lci5jcmVhdGVFbCgncCcsIHsgdGV4dDogJ+i/mOayoeacieino+aekOWIsOS7u+S9leaVsOaNruW6k+ihqCcgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnRhYmxlU3RhdGVzLmZvckVhY2godGhpcy5yZW5kZXJUYWJsZUNvbnRhaW5lci5iaW5kKHRoaXMpKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcmVuZGVyVGFibGVDb250YWluZXIodGFibGVTdGF0ZTogVGFibGVTdGF0ZSwgaW5kZXg6IG51bWJlcikge1xyXG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICBjb25zdCB7IHRhYmxlLCBpZCwgc2VhcmNoVGVybSB9ID0gdGFibGVTdGF0ZTtcclxuXHJcbiAgICBjb25zdCB0YWJsZUNvbnRhaW5lciA9IGNvbnRlbnRFbC5jcmVhdGVFbCgnZGl2JywgeyBjbHM6ICd0YWJsZS1jb250YWluZXInIH0pO1xyXG4gICAgY29uc3QgdGFibGVIZWFkZXIgPSB0YWJsZUNvbnRhaW5lci5jcmVhdGVFbCgnZGl2JywgeyBjbHM6ICd0YWJsZS1oZWFkZXInIH0pO1xyXG4gICAgdGFibGVIZWFkZXIuY3JlYXRlRWwoJ2g1JywgeyB0ZXh0OiB0YWJsZS5uYW1lIH0pO1xyXG5cclxuICAgIHRoaXMucmVuZGVyVGFibGVDb250cm9scyh0YWJsZUhlYWRlciwgdGFibGVTdGF0ZSwgaW5kZXgpO1xyXG5cclxuICAgIGNvbnN0IHRhYmxlRWwgPSB0aGlzLnJlbmRlclRhYmxlKHRhYmxlKTtcclxuICAgIHRhYmxlQ29udGFpbmVyLmFwcGVuZENoaWxkKHRhYmxlRWwpO1xyXG4gICAgdGhpcy50YWJsZUVsZW1lbnRzLnNldCh0YWJsZSwgdGFibGVFbCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlbmRlclRhYmxlQ29udHJvbHMoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgdGFibGVTdGF0ZTogVGFibGVTdGF0ZSwgaW5kZXg6IG51bWJlcikge1xyXG4gICAgbmV3IFRleHRDb21wb25lbnQoY29udGFpbmVyKVxyXG4gICAgICAuc2V0UGxhY2Vob2xkZXIoJ+e8luWPtycpXHJcbiAgICAgIC5zZXRWYWx1ZSh0YWJsZVN0YXRlLmlkLnRvU3RyaW5nKCkpXHJcbiAgICAgIC5vbkNoYW5nZSh2YWx1ZSA9PiB7XHJcbiAgICAgICAgdGhpcy50YWJsZVN0YXRlc1tpbmRleF0uaWQgPSBwYXJzZUludCh2YWx1ZSkgfHwgMDtcclxuICAgICAgfSlcclxuICAgICAgLmlucHV0RWwuYWRkQ2xhc3MoJ2lkLWlucHV0Jyk7XHJcblxyXG4gICAgbmV3IFRleHRDb21wb25lbnQoY29udGFpbmVyKVxyXG4gICAgICAuc2V0UGxhY2Vob2xkZXIoJ+aQnC4uLicpXHJcbiAgICAgIC5zZXRWYWx1ZSh0YWJsZVN0YXRlLnNlYXJjaFRlcm0pXHJcbiAgICAgIC5vbkNoYW5nZSh2YWx1ZSA9PiB7XHJcbiAgICAgICAgdGhpcy50YWJsZVN0YXRlc1tpbmRleF0uc2VhcmNoVGVybSA9IHZhbHVlO1xyXG4gICAgICAgIHRoaXMudXBkYXRlVGFibGUodGFibGVTdGF0ZS50YWJsZSk7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5pbnB1dEVsLmFkZENsYXNzKCdzZWFyY2gtaW5wdXQnKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcmVuZGVyVGFibGUodGFibGU6IERhdGFiYXNlVGFibGUpOiBIVE1MRWxlbWVudCB7XHJcbiAgICBjb25zdCB0YWJsZUVsID0gY3JlYXRlRWwoJ3RhYmxlJywgeyBjbHM6ICdkYXRhYmFzZS10YWJsZScgfSk7XHJcbiAgICB0aGlzLnJlbmRlclRhYmxlSGVhZGVyKHRhYmxlRWwsIHRhYmxlKTtcclxuICAgIHRoaXMucmVuZGVyVGFibGVCb2R5KHRhYmxlRWwsIHRhYmxlKTtcclxuICAgIHJldHVybiB0YWJsZUVsO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSByZW5kZXJUYWJsZUhlYWRlcih0YWJsZUVsOiBIVE1MRWxlbWVudCwgdGFibGU6IERhdGFiYXNlVGFibGUpIHtcclxuICAgIGNvbnN0IGhlYWRlclJvdyA9IHRhYmxlRWwuY3JlYXRlRWwoJ3RyJyk7XHJcbiAgICB0YWJsZS5maWVsZHMuZm9yRWFjaChmaWVsZCA9PiB7XHJcbiAgICAgIGNvbnN0IHRoID0gaGVhZGVyUm93LmNyZWF0ZUVsKCd0aCcpO1xyXG4gICAgICB0aC5jcmVhdGVFbCgnc3BhbicsIHsgdGV4dDogZmllbGQsIGNsczogJ2NvbHVtbi1uYW1lJyB9KTtcclxuICAgICAgY29uc3Qgc29ydEluZGljYXRvciA9IHRoLmNyZWF0ZUVsKCdzcGFuJywgeyBjbHM6ICdzb3J0LWluZGljYXRvcicgfSk7XHJcbiAgICAgIFxyXG4gICAgICB0aC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuaGFuZGxlU29ydCh0YWJsZSwgZmllbGQpKTtcclxuICAgICAgXHJcbiAgICAgIHRoaXMudXBkYXRlU29ydEluZGljYXRvcih0aCwgc29ydEluZGljYXRvciwgdGFibGUsIGZpZWxkKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSB1cGRhdGVTb3J0SW5kaWNhdG9yKHRoOiBIVE1MRWxlbWVudCwgc29ydEluZGljYXRvcjogSFRNTEVsZW1lbnQsIHRhYmxlOiBEYXRhYmFzZVRhYmxlLCBmaWVsZDogc3RyaW5nKSB7XHJcbiAgICBjb25zdCBzb3J0U3RhdGUgPSB0aGlzLnNvcnRTdGF0ZXMuZ2V0KHRhYmxlKTtcclxuICAgIGlmIChzb3J0U3RhdGUgJiYgc29ydFN0YXRlLmNvbHVtbiA9PT0gZmllbGQpIHtcclxuICAgICAgdGguYWRkQ2xhc3MoJ3NvcnRlZCcpO1xyXG4gICAgICB0aC5hZGRDbGFzcyhzb3J0U3RhdGUuZGlyZWN0aW9uKTtcclxuICAgICAgc29ydEluZGljYXRvci5zZXRUZXh0KHNvcnRTdGF0ZS5kaXJlY3Rpb24gPT09ICdhc2MnID8gJ+KWsicgOiAn4pa8Jyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBzb3J0SW5kaWNhdG9yLnNldFRleHQoJ+KHhScpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBoYW5kbGVTb3J0KHRhYmxlOiBEYXRhYmFzZVRhYmxlLCBjb2x1bW46IHN0cmluZykge1xyXG4gICAgY29uc3QgY3VycmVudFNvcnRTdGF0ZSA9IHRoaXMuc29ydFN0YXRlcy5nZXQodGFibGUpO1xyXG4gICAgaWYgKGN1cnJlbnRTb3J0U3RhdGUgJiYgY3VycmVudFNvcnRTdGF0ZS5jb2x1bW4gPT09IGNvbHVtbikge1xyXG4gICAgICBjdXJyZW50U29ydFN0YXRlLmRpcmVjdGlvbiA9IGN1cnJlbnRTb3J0U3RhdGUuZGlyZWN0aW9uID09PSAnYXNjJyA/ICdkZXNjJyA6ICdhc2MnO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5zb3J0U3RhdGVzLnNldCh0YWJsZSwgeyBjb2x1bW4sIGRpcmVjdGlvbjogJ2FzYycgfSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLnVwZGF0ZVRhYmxlKHRhYmxlKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcmVuZGVyVGFibGVCb2R5KHRhYmxlRWw6IEhUTUxFbGVtZW50LCB0YWJsZTogRGF0YWJhc2VUYWJsZSkge1xyXG4gICAgY29uc3QgdGJvZHkgPSB0YWJsZUVsLmNyZWF0ZUVsKCd0Ym9keScpO1xyXG4gICAgY29uc3QgdGFibGVTdGF0ZSA9IHRoaXMudGFibGVTdGF0ZXMuZmluZChzdGF0ZSA9PiBzdGF0ZS50YWJsZSA9PT0gdGFibGUpO1xyXG4gICAgaWYgKCF0YWJsZVN0YXRlKSByZXR1cm47XHJcblxyXG4gICAgY29uc3QgZmlsdGVyZWRBbmRTb3J0ZWREYXRhID0gdGhpcy5nZXRGaWx0ZXJlZEFuZFNvcnRlZERhdGEodGFibGUsIHRhYmxlU3RhdGUuc2VhcmNoVGVybSk7XHJcbiAgICBmaWx0ZXJlZEFuZFNvcnRlZERhdGEuZm9yRWFjaChyb3cgPT4ge1xyXG4gICAgICBjb25zdCByb3dFbCA9IHRib2R5LmNyZWF0ZUVsKCd0cicpO1xyXG4gICAgICByb3cuZm9yRWFjaChjZWxsID0+IHJvd0VsLmNyZWF0ZUVsKCd0ZCcsIHsgdGV4dDogY2VsbCB9KSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgdXBkYXRlVGFibGUodGFibGU6IERhdGFiYXNlVGFibGUpIHtcclxuICAgIGNvbnN0IHRhYmxlRWwgPSB0aGlzLnRhYmxlRWxlbWVudHMuZ2V0KHRhYmxlKTtcclxuICAgIGlmICghdGFibGVFbCkgcmV0dXJuO1xyXG5cclxuICAgIHRhYmxlRWwucXVlcnlTZWxlY3RvcigndGJvZHknKT8ucmVtb3ZlKCk7XHJcbiAgICB0aGlzLnJlbmRlclRhYmxlQm9keSh0YWJsZUVsLCB0YWJsZSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdldEZpbHRlcmVkQW5kU29ydGVkRGF0YSh0YWJsZTogRGF0YWJhc2VUYWJsZSwgc2VhcmNoVGVybTogc3RyaW5nKTogc3RyaW5nW11bXSB7XHJcbiAgICBsZXQgZmlsdGVyZWREYXRhID0gdGhpcy5maWx0ZXJEYXRhKHRhYmxlLmRhdGEsIHNlYXJjaFRlcm0pO1xyXG4gICAgcmV0dXJuIHRoaXMuc29ydERhdGEoZmlsdGVyZWREYXRhLCB0YWJsZSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGZpbHRlckRhdGEoZGF0YTogc3RyaW5nW11bXSwgc2VhcmNoVGVybTogc3RyaW5nKTogc3RyaW5nW11bXSB7XHJcbiAgICBpZiAoIXNlYXJjaFRlcm0pIHJldHVybiBkYXRhO1xyXG4gICAgY29uc3QgbG93ZXJTZWFyY2hUZXJtID0gc2VhcmNoVGVybS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgcmV0dXJuIGRhdGEuZmlsdGVyKHJvdyA9PiByb3cuc29tZShjZWxsID0+IGNlbGwudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlclNlYXJjaFRlcm0pKSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHNvcnREYXRhKGRhdGE6IHN0cmluZ1tdW10sIHRhYmxlOiBEYXRhYmFzZVRhYmxlKTogc3RyaW5nW11bXSB7XHJcbiAgICBjb25zdCBzb3J0U3RhdGUgPSB0aGlzLnNvcnRTdGF0ZXMuZ2V0KHRhYmxlKTtcclxuICAgIGlmICghc29ydFN0YXRlKSByZXR1cm4gZGF0YTtcclxuXHJcbiAgICBjb25zdCBjb2x1bW5JbmRleCA9IHRhYmxlLmZpZWxkcy5pbmRleE9mKHNvcnRTdGF0ZS5jb2x1bW4pO1xyXG4gICAgaWYgKGNvbHVtbkluZGV4ID09PSAtMSkgcmV0dXJuIGRhdGE7XHJcblxyXG4gICAgcmV0dXJuIGRhdGEuc29ydCgoYSwgYikgPT4gdGhpcy5jb21wYXJlVmFsdWVzKGFbY29sdW1uSW5kZXhdLCBiW2NvbHVtbkluZGV4XSwgc29ydFN0YXRlLmRpcmVjdGlvbikpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjb21wYXJlVmFsdWVzKHZhbHVlQTogc3RyaW5nLCB2YWx1ZUI6IHN0cmluZywgZGlyZWN0aW9uOiAnYXNjJyB8ICdkZXNjJyk6IG51bWJlciB7XHJcbiAgICBjb25zdCBudW1BID0gTnVtYmVyKHZhbHVlQSk7XHJcbiAgICBjb25zdCBudW1CID0gTnVtYmVyKHZhbHVlQik7XHJcbiAgICBpZiAoIWlzTmFOKG51bUEpICYmICFpc05hTihudW1CKSkge1xyXG4gICAgICByZXR1cm4gZGlyZWN0aW9uID09PSAnYXNjJyA/IG51bUEgLSBudW1CIDogbnVtQiAtIG51bUE7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBkaXJlY3Rpb24gPT09ICdhc2MnIFxyXG4gICAgICA/IHZhbHVlQS5sb2NhbGVDb21wYXJlKHZhbHVlQikgXHJcbiAgICAgIDogdmFsdWVCLmxvY2FsZUNvbXBhcmUodmFsdWVBKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZXhwb3J0VGFibGVzVG9DU1YoKSB7XHJcbiAgICBpZiAoIXRoaXMuZXhwb3J0RHJvcGRvd24pIHJldHVybjtcclxuXHJcbiAgICBjb25zdCBzZWxlY3RlZFZhbHVlID0gdGhpcy5leHBvcnREcm9wZG93bi5nZXRWYWx1ZSgpO1xyXG4gICAgY29uc3QgdGFibGVzVG9FeHBvcnQgPSBzZWxlY3RlZFZhbHVlID09PSAnYWxsJyBcclxuICAgICAgPyB0aGlzLnRhYmxlU3RhdGVzLm1hcChzdGF0ZSA9PiBzdGF0ZS50YWJsZSlcclxuICAgICAgOiBbdGhpcy50YWJsZVN0YXRlc1twYXJzZUludChzZWxlY3RlZFZhbHVlKV0/LnRhYmxlXS5maWx0ZXIoQm9vbGVhbik7XHJcblxyXG4gICAgaWYgKHRhYmxlc1RvRXhwb3J0Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdObyB0YWJsZXMgdG8gZXhwb3J0Jyk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBjc3ZDb250ZW50ID0gdGFibGVzVG9FeHBvcnQubWFwKHRoaXMudGFibGVUb0NTVikuam9pbignXFxuXFxuJyk7XHJcbiAgICB0aGlzLmRvd25sb2FkQ1NWKGNzdkNvbnRlbnQsIHRhYmxlc1RvRXhwb3J0Lmxlbmd0aCA+IDEgPyAnZGF0YWJhc2VfdGFibGVzLmNzdicgOiBgJHt0YWJsZXNUb0V4cG9ydFswXS5uYW1lfS5jc3ZgKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgdGFibGVUb0NTVih0YWJsZTogRGF0YWJhc2VUYWJsZSk6IHN0cmluZyB7XHJcbiAgICBjb25zdCBoZWFkZXJzID0gdGFibGUuZmllbGRzLmpvaW4oJywnKTtcclxuICAgIGNvbnN0IGRhdGFSb3dzID0gdGFibGUuZGF0YS5tYXAocm93ID0+IFxyXG4gICAgICByb3cubWFwKGNlbGwgPT4gXHJcbiAgICAgICAgY2VsbC5pbmNsdWRlcygnLCcpIHx8IGNlbGwuaW5jbHVkZXMoJ1wiJykgfHwgY2VsbC5pbmNsdWRlcygnXFxuJykgXHJcbiAgICAgICAgICA/IGBcIiR7Y2VsbC5yZXBsYWNlKC9cIi9nLCAnXCJcIicpfVwiYFxyXG4gICAgICAgICAgOiBjZWxsXHJcbiAgICAgICkuam9pbignLCcpXHJcbiAgICApO1xyXG4gICAgcmV0dXJuIFt0YWJsZS5uYW1lLCBoZWFkZXJzLCAuLi5kYXRhUm93c10uam9pbignXFxuJyk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGRvd25sb2FkQ1NWKGNvbnRlbnQ6IHN0cmluZywgZmlsZW5hbWU6IHN0cmluZykge1xyXG4gICAgY29uc3QgYmxvYiA9IG5ldyBCbG9iKFtjb250ZW50XSwgeyB0eXBlOiAndGV4dC9jc3Y7Y2hhcnNldD11dGYtODsnIH0pO1xyXG4gICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcclxuICAgIGNvbnN0IGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XHJcbiAgICBsaW5rLmhyZWYgPSB1cmw7XHJcbiAgICBsaW5rLmRvd25sb2FkID0gZmlsZW5hbWU7XHJcbiAgICBsaW5rLmNsaWNrKCk7XHJcbiAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIGltcG9ydENTVigpIHtcclxuICAgIGNvbnN0IGZpbGVJbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XHJcbiAgICBmaWxlSW5wdXQudHlwZSA9ICdmaWxlJztcclxuICAgIGZpbGVJbnB1dC5hY2NlcHQgPSAnLmNzdic7XHJcblxyXG4gICAgZmlsZUlucHV0Lm9uY2hhbmdlID0gYXN5bmMgKGU6IEV2ZW50KSA9PiB7XHJcbiAgICAgIGNvbnN0IGZpbGUgPSAoZS50YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudCkuZmlsZXM/LlswXTtcclxuICAgICAgaWYgKGZpbGUpIHtcclxuICAgICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy5yZWFkRmlsZUNvbnRlbnQoZmlsZSk7XHJcbiAgICAgICAgY29uc3QgcGFyc2VkRGF0YSA9IHRoaXMucGFyc2VDU1YoY29udGVudCk7XHJcbiAgICAgICAgY29uc3QgZGJDb250ZW50ID0gdGhpcy5jb252ZXJ0VG9NYXJrZG93bihwYXJzZWREYXRhKTtcclxuICAgICAgICBcclxuXHJcbiAgICAgICAgY29uc3QgY2hvaWNlID0gYXdhaXQgdGhpcy5jaG9vc2VJbXBvcnRNZXRob2QoKTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAoY2hvaWNlID09PSAnbmV3Jykge1xyXG4gICAgICAgICAgYXdhaXQgdGhpcy5jcmVhdGVOZXdGaWxlV2l0aENvbnRlbnQoZmlsZS5uYW1lLCBkYkNvbnRlbnQpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoY2hvaWNlID09PSAnaW5zZXJ0Jykge1xyXG4gICAgICAgICAgYXdhaXQgdGhpcy5pbnNlcnRDb250ZW50SW50b0N1cnJlbnRGaWxlKGRiQ29udGVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIGZpbGVJbnB1dC5jbGljaygpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBjaG9vc2VJbXBvcnRNZXRob2QoKTogUHJvbWlzZTwnbmV3JyB8ICdpbnNlcnQnIHwgbnVsbD4ge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgIGNvbnN0IG1vZGFsID0gbmV3IEltcG9ydE1ldGhvZE1vZGFsKHRoaXMuYXBwLCAocmVzdWx0KSA9PiB7XHJcbiAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICB9KTtcclxuICAgICAgbW9kYWwub3BlbigpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIGNyZWF0ZU5ld0ZpbGVXaXRoQ29udGVudChvcmlnaW5hbEZpbGVOYW1lOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykge1xyXG4gICAgY29uc3QgZm9sZGVyUGF0aCA9IGF3YWl0IHRoaXMuc2VsZWN0Rm9sZGVyKCk7XHJcbiAgICBpZiAoZm9sZGVyUGF0aCkge1xyXG4gICAgICBjb25zdCB0YWJsZU5hbWUgPSBvcmlnaW5hbEZpbGVOYW1lLnJlcGxhY2UoJy5jc3YnLCAnJyk7XHJcbiAgICAgIGNvbnN0IGZpbGVOYW1lID0gYCR7dGFibGVOYW1lfS5tZGA7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKGAke2ZvbGRlclBhdGh9LyR7ZmlsZU5hbWV9YCwgY29udGVudCk7XHJcbiAgICAgICAgbmV3IE5vdGljZShg5bey5Yib5bu65pWw5o2u5bqT56yU6K6wOiAke2ZpbGVOYW1lfWApO1xyXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ+WIm+W7uuaVsOaNruW6k+eslOiusOaXtuWHuumUmTonLCBlcnJvcik7XHJcbiAgICAgICAgaWYgKGlzRXJyb3IoZXJyb3IpKSB7XHJcbiAgICAgICAgICBuZXcgTm90aWNlKGDliJvlu7rmlbDmja7lupPnrJTorrDlpLHotKU6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgbmV3IE5vdGljZSgn5Yib5bu65pWw5o2u5bqT56yU6K6w5aSx6LSlOiDmnKrnn6XplJnor68nKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgaW5zZXJ0Q29udGVudEludG9DdXJyZW50RmlsZShjb250ZW50OiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IGFjdGl2ZVZpZXcgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlVmlld09mVHlwZShEYXRhYmFzZVZpZXcpO1xyXG4gICAgaWYgKGFjdGl2ZVZpZXcpIHtcclxuICAgICAgYWN0aXZlVmlldy5pbnNlcnRDb250ZW50KGNvbnRlbnQpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY29uc3QgbWFya2Rvd25WaWV3ID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZVZpZXdPZlR5cGUoTWFya2Rvd25WaWV3KTtcclxuICAgICAgaWYgKG1hcmtkb3duVmlldykge1xyXG4gICAgICAgIGNvbnN0IGVkaXRvciA9IG1hcmtkb3duVmlldy5lZGl0b3I7XHJcbiAgICAgICAgY29uc3QgY3Vyc29yID0gZWRpdG9yLmdldEN1cnNvcigpO1xyXG4gICAgICAgIGVkaXRvci5yZXBsYWNlUmFuZ2UoY29udGVudCArICdcXG5cXG4nLCBjdXJzb3IpO1xyXG4gICAgICAgIG5ldyBOb3RpY2UoJ+W3suWcqOW9k+WJjSBNYXJrZG93biDmlofmoaPkuK3mj5LlhaXmlbDmja7lupPlhoXlrrknKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBuZXcgTm90aWNlKCfml6Dms5Xmj5LlhaXlhoXlrrnvvJrmsqHmnInmiZPlvIDnmoTmlbDmja7lupPop4blm77miJYgTWFya2Rvd24g5paH5qGjJyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgcmVhZEZpbGVDb250ZW50KGZpbGU6IEZpbGUpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgY29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuICAgICAgcmVhZGVyLm9ubG9hZCA9IChlKSA9PiByZXNvbHZlKGUudGFyZ2V0Py5yZXN1bHQgYXMgc3RyaW5nKTtcclxuICAgICAgcmVhZGVyLm9uZXJyb3IgPSAoZSkgPT4gcmVqZWN0KGUpO1xyXG4gICAgICByZWFkZXIucmVhZEFzVGV4dChmaWxlKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBwYXJzZUNTVihjb250ZW50OiBzdHJpbmcpOiBzdHJpbmdbXVtdIHtcclxuXHJcbiAgICByZXR1cm4gY29udGVudC5zcGxpdCgnXFxuJykubWFwKGxpbmUgPT4gXHJcbiAgICAgIGxpbmUuc3BsaXQoJywnKS5tYXAoY2VsbCA9PiBjZWxsLnRyaW0oKS5yZXBsYWNlKC9eXCIoLiopXCIkLywgJyQxJykpXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjb252ZXJ0VG9NYXJrZG93bihkYXRhOiBzdHJpbmdbXVtdKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IFtoZWFkZXIsIC4uLnJvd3NdID0gZGF0YTtcclxuICAgIGNvbnN0IHRhYmxlTmFtZSA9IHRoaXMuZ2V0VGFibGVOYW1lRnJvbUZpbGVOYW1lKCkgfHwgJ0ltcG9ydGVkVGFibGUnO1xyXG4gICAgXHJcblxyXG4gICAgbGV0IGNvbnRlbnQgPSBgZGI6JHt0YWJsZU5hbWV9XFxuYDtcclxuICAgIFxyXG5cclxuICAgIGNvbnRlbnQgKz0gaGVhZGVyLmpvaW4oJywnKSArICdcXG4nO1xyXG5cclxuICAgIHJvd3MuZm9yRWFjaChyb3cgPT4ge1xyXG4gICAgICBjb250ZW50ICs9IHJvdy5qb2luKCcsJykgKyAnXFxuJztcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICByZXR1cm4gY29udGVudC50cmltKCk7IFxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBnZXRUYWJsZU5hbWVGcm9tRmlsZU5hbWUoKTogc3RyaW5nIHwgbnVsbCB7XHJcbiAgICBjb25zdCBmaWxlID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcclxuICAgIHJldHVybiBmaWxlID8gZmlsZS5iYXNlbmFtZS5yZXBsYWNlKCcuY3N2JywgJycpIDogbnVsbDtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgc2VsZWN0Rm9sZGVyKCk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgIGNvbnN0IG1vZGFsID0gbmV3IEZvbGRlclN1Z2dlc3RNb2RhbCh0aGlzLmFwcCwgKGZvbGRlcikgPT4ge1xyXG4gICAgICAgIHJlc29sdmUoZm9sZGVyID8gZm9sZGVyLnBhdGggOiBudWxsKTtcclxuICAgICAgfSk7XHJcbiAgICAgIG1vZGFsLm9wZW4oKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSByZW5kZXJJbXBvcnRDb250cm9sKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpIHtcclxuICAgIHRoaXMuaW1wb3J0QnV0dG9uID0gbmV3IEJ1dHRvbkNvbXBvbmVudChjb250YWluZXIpXHJcbiAgICAgIC5zZXRCdXR0b25UZXh0KCflr7zlhaUgQ1NWJylcclxuICAgICAgLm9uQ2xpY2soKCkgPT4gdGhpcy5pbXBvcnRDU1YoKSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgaW5zZXJ0Q29udGVudChjb250ZW50OiBzdHJpbmcpIHtcclxuICAgIGNvbnNvbGUubG9nKFwiSW5zZXJ0aW5nIGNvbnRlbnQgaW50byBEYXRhYmFzZVZpZXc6XCIsIGNvbnRlbnQpO1xyXG4gICAgY29uc3QgbmV3VGFibGVzID0gdGhpcy5wYXJzZUNTVkNvbnRlbnQoY29udGVudCk7XHJcbiAgICBpZiAobmV3VGFibGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgbmV3VGFibGVzLmZvckVhY2gobmV3VGFibGUgPT4ge1xyXG4gICAgICAgIHRoaXMudGFibGVTdGF0ZXMucHVzaCh7XHJcbiAgICAgICAgICB0YWJsZTogbmV3VGFibGUsXHJcbiAgICAgICAgICBpZDogRGF0ZS5ub3coKSxcclxuICAgICAgICAgIHNlYXJjaFRlcm06ICcnXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pO1xyXG4gICAgICB0aGlzLnJlbmRlclZpZXcoKTtcclxuICAgICAgbmV3IE5vdGljZShg5bey5Zyo5pWw5o2u5bqT6KeG5Zu+5Lit5o+S5YWlICR7bmV3VGFibGVzLmxlbmd0aH0g5Liq5paw6KGo5qC8YCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBuZXcgTm90aWNlKCfml6Dms5Xop6PmnpDlr7zlhaXnmoTlhoXlrrknKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgcGFyc2VDU1ZDb250ZW50KGNvbnRlbnQ6IHN0cmluZyk6IERhdGFiYXNlVGFibGVbXSB7XHJcbiAgICBjb25zdCBsaW5lcyA9IGNvbnRlbnQudHJpbSgpLnNwbGl0KCdcXG4nKTtcclxuICAgIGNvbnN0IHRhYmxlczogRGF0YWJhc2VUYWJsZVtdID0gW107XHJcbiAgICBsZXQgY3VycmVudFRhYmxlOiBEYXRhYmFzZVRhYmxlIHwgbnVsbCA9IG51bGw7XHJcblxyXG4gICAgbGluZXMuZm9yRWFjaChsaW5lID0+IHtcclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnZGI6JykpIHtcclxuXHJcbiAgICAgICAgaWYgKGN1cnJlbnRUYWJsZSkge1xyXG4gICAgICAgICAgdGFibGVzLnB1c2goY3VycmVudFRhYmxlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3VycmVudFRhYmxlID0ge1xyXG4gICAgICAgICAgbmFtZTogbGluZS5zbGljZSgzKS50cmltKCksXHJcbiAgICAgICAgICBmaWVsZHM6IFtdLFxyXG4gICAgICAgICAgZGF0YTogW11cclxuICAgICAgICB9O1xyXG4gICAgICB9IGVsc2UgaWYgKGN1cnJlbnRUYWJsZSkge1xyXG4gICAgICAgIGlmIChjdXJyZW50VGFibGUuZmllbGRzLmxlbmd0aCA9PT0gMCkge1xyXG5cclxuICAgICAgICAgIGN1cnJlbnRUYWJsZS5maWVsZHMgPSBsaW5lLnNwbGl0KCcsJykubWFwKGZpZWxkID0+IGZpZWxkLnRyaW0oKSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICBjdXJyZW50VGFibGUuZGF0YS5wdXNoKGxpbmUuc3BsaXQoJywnKS5tYXAoY2VsbCA9PiBjZWxsLnRyaW0oKSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG5cclxuICAgIGlmIChjdXJyZW50VGFibGUpIHtcclxuICAgICAgdGFibGVzLnB1c2goY3VycmVudFRhYmxlKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGFibGVzO1xyXG4gIH1cclxufVxyXG5cclxuY2xhc3MgRm9sZGVyU3VnZ2VzdE1vZGFsIGV4dGVuZHMgRnV6enlTdWdnZXN0TW9kYWw8VEZvbGRlcj4ge1xyXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwcml2YXRlIG9uQ2hvb3NlRm9sZGVyOiAoZm9sZGVyOiBURm9sZGVyIHwgbnVsbCkgPT4gdm9pZCkge1xyXG4gICAgc3VwZXIoYXBwKTtcclxuICB9XHJcblxyXG4gIGdldEl0ZW1zKCk6IFRGb2xkZXJbXSB7XHJcbiAgICByZXR1cm4gdGhpcy5hcHAudmF1bHQuZ2V0QWxsTG9hZGVkRmlsZXMoKVxyXG4gICAgICAuZmlsdGVyKChmaWxlKTogZmlsZSBpcyBURm9sZGVyID0+IGZpbGUgaW5zdGFuY2VvZiBURm9sZGVyKTtcclxuICB9XHJcblxyXG4gIGdldEl0ZW1UZXh0KGl0ZW06IFRGb2xkZXIpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIGl0ZW0ucGF0aDtcclxuICB9XHJcblxyXG4gIG9uQ2hvb3NlSXRlbShpdGVtOiBURm9sZGVyLCBldnQ6IE1vdXNlRXZlbnQgfCBLZXlib2FyZEV2ZW50KTogdm9pZCB7XHJcbiAgICB0aGlzLm9uQ2hvb3NlRm9sZGVyKGl0ZW0pO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gaXNFcnJvcihlcnJvcjogdW5rbm93bik6IGVycm9yIGlzIEVycm9yIHtcclxuICByZXR1cm4gZXJyb3IgaW5zdGFuY2VvZiBFcnJvcjtcclxufVxyXG5cclxuY2xhc3MgSW1wb3J0TWV0aG9kTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcbiAgcmVzdWx0OiAnbmV3JyB8ICdpbnNlcnQnIHwgbnVsbCA9IG51bGw7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwcml2YXRlIG9uQ2hvb3NlOiAocmVzdWx0OiAnbmV3JyB8ICdpbnNlcnQnIHwgbnVsbCkgPT4gdm9pZCkge1xyXG4gICAgc3VwZXIoYXBwKTtcclxuICB9XHJcblxyXG4gIG9uT3BlbigpIHtcclxuICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xyXG5cclxuICAgIGNvbnRlbnRFbC5jcmVhdGVFbCgnaDInLCB7IHRleHQ6ICfpgInmi6nlr7zlhaXmlrnlvI8nIH0pO1xyXG5cclxuICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuICAgICAgLnNldE5hbWUoJ+WIm+W7uuaWsOaWh+S7ticpXHJcbiAgICAgIC5zZXREZXNjKCflsIblr7zlhaXnmoTmlbDmja7liJvlu7rkuLrmlrDnmoQgTWFya2Rvd24g5paH5Lu2JylcclxuICAgICAgLmFkZEJ1dHRvbigoYnRuKSA9PlxyXG4gICAgICAgIGJ0bi5zZXRCdXR0b25UZXh0KCfpgInmi6knKS5vbkNsaWNrKCgpID0+IHtcclxuICAgICAgICAgIHRoaXMucmVzdWx0ID0gJ25ldyc7XHJcbiAgICAgICAgICB0aGlzLmNsb3NlKCk7XHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuXHJcbiAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcbiAgICAgIC5zZXROYW1lKCfmj5LlhaXliLDlvZPliY3mlofmoaMnKVxyXG4gICAgICAuc2V0RGVzYygn5bCG5a+85YWl55qE5pWw5o2u5o+S5YWl5Yiw5b2T5YmN5paH5qGj55qE5YWJ5qCH5L2N572uJylcclxuICAgICAgLmFkZEJ1dHRvbigoYnRuKSA9PlxyXG4gICAgICAgIGJ0bi5zZXRCdXR0b25UZXh0KCfpgInmi6knKS5vbkNsaWNrKCgpID0+IHtcclxuICAgICAgICAgIHRoaXMucmVzdWx0ID0gJ2luc2VydCc7XHJcbiAgICAgICAgICB0aGlzLmNsb3NlKCk7XHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuICB9XHJcblxyXG4gIG9uQ2xvc2UoKSB7XHJcbiAgICB0aGlzLm9uQ2hvb3NlKHRoaXMucmVzdWx0KTtcclxuICB9XHJcbn1cclxuIiwiZXhwb3J0IGludGVyZmFjZSBEYXRhYmFzZVRhYmxlIHtcclxuICBuYW1lOiBzdHJpbmc7XHJcbiAgZmllbGRzOiBzdHJpbmdbXTtcclxuICBkYXRhOiBzdHJpbmdbXVtdO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VEYXRhYmFzZShtYXJrZG93bjogc3RyaW5nKTogRGF0YWJhc2VUYWJsZVtdIHtcclxuICBjb25zb2xlLmxvZygn5byA5aeL6Kej5p6Q5pWw5o2u5bqT77yM6L6T5YWl5YaF5a65OicsIG1hcmtkb3duKTtcclxuICBjb25zdCB0YWJsZXM6IERhdGFiYXNlVGFibGVbXSA9IFtdO1xyXG4gIGNvbnN0IGxpbmVzID0gbWFya2Rvd24uc3BsaXQoJ1xcbicpO1xyXG4gIGxldCBjdXJyZW50VGFibGU6IERhdGFiYXNlVGFibGUgfCBudWxsID0gbnVsbDtcclxuXHJcbiAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XHJcbiAgICBjb25zdCB0cmltbWVkTGluZSA9IGxpbmUudHJpbSgpO1xyXG4gICAgY29uc29sZS5sb2coJ+WkhOeQhuihjDonLCB0cmltbWVkTGluZSk7XHJcbiAgICBpZiAodHJpbW1lZExpbmUuc3RhcnRzV2l0aCgnZGI6JykpIHtcclxuICAgICAgY29uc29sZS5sb2coJ+WPkeeOsOaWsOihqDonLCB0cmltbWVkTGluZSk7XHJcbiAgICAgIGlmIChjdXJyZW50VGFibGUpIHtcclxuICAgICAgICB0YWJsZXMucHVzaChjdXJyZW50VGFibGUpO1xyXG4gICAgICB9XHJcbiAgICAgIGN1cnJlbnRUYWJsZSA9IHtcclxuICAgICAgICBuYW1lOiB0cmltbWVkTGluZS5zdWJzdHJpbmcoMykudHJpbSgpLFxyXG4gICAgICAgIGZpZWxkczogW10sXHJcbiAgICAgICAgZGF0YTogW11cclxuICAgICAgfTtcclxuICAgIH0gZWxzZSBpZiAoY3VycmVudFRhYmxlKSB7XHJcbiAgICAgIGNvbnN0IGNlbGxzID0gdHJpbW1lZExpbmUuc3BsaXQoJywnKS5tYXAoY2VsbCA9PiBjZWxsLnRyaW0oKSk7XHJcbiAgICAgIGlmIChjZWxscy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgaWYgKGN1cnJlbnRUYWJsZS5maWVsZHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZygn6K6+572u5a2X5q61OicsIGNlbGxzKTtcclxuICAgICAgICAgIGN1cnJlbnRUYWJsZS5maWVsZHMgPSBjZWxscztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ+a3u+WKoOaVsOaNruihjDonLCBjZWxscyk7XHJcbiAgICAgICAgICBjdXJyZW50VGFibGUuZGF0YS5wdXNoKGNlbGxzKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmIChjdXJyZW50VGFibGUpIHtcclxuICAgIHRhYmxlcy5wdXNoKGN1cnJlbnRUYWJsZSk7XHJcbiAgfVxyXG5cclxuICBjb25zb2xlLmxvZygn6Kej5p6Q5a6M5oiQ77yM57uT5p6cOicsIHRhYmxlcyk7XHJcbiAgcmV0dXJuIHRhYmxlcztcclxufVxyXG4iLCJpbXBvcnQgeyBQbHVnaW4sIE5vdGljZSwgVEZpbGUsIE1hcmtkb3duVmlldywgRXZlbnRzLCBBcHAsIFBsdWdpbk1hbmlmZXN0LCBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nLCBCdXR0b25Db21wb25lbnQgfSBmcm9tICdvYnNpZGlhbic7XHJcbmltcG9ydCB7IERhdGFiYXNlVmlldywgREFUQUJBU0VfVklFV19UWVBFIH0gZnJvbSAnLi9EYXRhYmFzZVZpZXcnO1xyXG5pbXBvcnQgeyBwYXJzZURhdGFiYXNlLCBEYXRhYmFzZVRhYmxlIH0gZnJvbSAnLi9kYXRhYmFzZVBhcnNlcic7XHJcbmltcG9ydCAnLi4vc3R5bGVzLmNzcyc7XHJcblxyXG5pbnRlcmZhY2UgRGF0YWJhc2VQbHVnaW5TZXR0aW5ncyB7XHJcbiAgZGVmYXVsdFNvcnREaXJlY3Rpb246ICdhc2MnIHwgJ2Rlc2MnO1xyXG59XHJcblxyXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBEYXRhYmFzZVBsdWdpblNldHRpbmdzID0ge1xyXG4gIGRlZmF1bHRTb3J0RGlyZWN0aW9uOiAnYXNjJ1xyXG59O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRGF0YWJhc2VQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xyXG4gIHByaXZhdGUgZGF0YWJhc2VWaWV3OiBEYXRhYmFzZVZpZXcgfCBudWxsID0gbnVsbDtcclxuICBzZXR0aW5nczogRGF0YWJhc2VQbHVnaW5TZXR0aW5ncyA9IERFRkFVTFRfU0VUVElOR1M7XHJcblxyXG4gIGFzeW5jIG9ubG9hZCgpIHtcclxuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XHJcbiAgICBjb25zb2xlLmxvZygn5Yqg6L295pWw5o2u5bqT5o+S5Lu2Jyk7XHJcblxyXG4gICAgdGhpcy5yZWdpc3RlclZpZXcoXHJcbiAgICAgIERBVEFCQVNFX1ZJRVdfVFlQRSxcclxuICAgICAgKGxlYWYpID0+IG5ldyBEYXRhYmFzZVZpZXcobGVhZiwgdGhpcylcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgaWQ6ICdwYXJzZS1jdXJyZW50LWZpbGUnLFxyXG4gICAgICBuYW1lOiAn6Kej5p6Q5b2T5YmN5paH5Lu25Lit55qE5pWw5o2u5bqTJyxcclxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMucGFyc2VBbmRVcGRhdGVWaWV3KClcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMucmVnaXN0ZXJFdmVudChcclxuICAgICAgdGhpcy5hcHAud29ya3NwYWNlLm9uKCdmaWxlLW9wZW4nLCAoZmlsZSkgPT4ge1xyXG4gICAgICAgIGlmIChmaWxlICYmIGZpbGUuZXh0ZW5zaW9uID09PSAnbWQnKSB7XHJcbiAgICAgICAgICB0aGlzLnBhcnNlQW5kVXBkYXRlVmlldygpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KFxyXG4gICAgICB0aGlzLmFwcC52YXVsdC5vbignbW9kaWZ5JywgKGZpbGUpID0+IHtcclxuICAgICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlICYmIGZpbGUuZXh0ZW5zaW9uID09PSAnbWQnKSB7XHJcbiAgICAgICAgICB0aGlzLnBhcnNlQW5kVXBkYXRlVmlldygpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5hZGRSaWJib25JY29uKCdkYXRhYmFzZScsICfmiZPlvIDmlbDmja7lupPop4blm74nLCAoKSA9PiB7XHJcbiAgICAgIHRoaXMuYWN0aXZhdGVWaWV3KCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xyXG4gICAgICBpZDogJ29wZW4tZGF0YWJhc2UtdmlldycsXHJcbiAgICAgIG5hbWU6ICfmiZPlvIDmlbDmja7lupPop4blm74nLFxyXG4gICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5hY3RpdmF0ZVZpZXcoKVxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBEYXRhYmFzZVBsdWdpblNldHRpbmdUYWIodGhpcy5hcHAsIHRoaXMpKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpIHtcclxuICAgIGNvbnN0IGxvYWRlZERhdGEgPSBhd2FpdCB0aGlzLmxvYWREYXRhKCk7XHJcbiAgICBjb25zdCBwYXJzZWREYXRhID0gbG9hZGVkRGF0YSA/IEpTT04ucGFyc2UobG9hZGVkRGF0YSkgOiB7fTtcclxuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBwYXJzZWREYXRhKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHBhcnNlQW5kVXBkYXRlVmlldygpIHtcclxuICAgIGNvbnN0IGFjdGl2ZVZpZXcgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlVmlld09mVHlwZShNYXJrZG93blZpZXcpO1xyXG4gICAgaWYgKGFjdGl2ZVZpZXcpIHtcclxuICAgICAgY29uc3QgY29udGVudCA9IGFjdGl2ZVZpZXcuZ2V0Vmlld0RhdGEoKTtcclxuICAgICAgY29uc29sZS5sb2coJ+iOt+WPluWIsOeahOaWh+S7tuWGheWuuTonLCBjb250ZW50KTtcclxuICAgICAgY29uc3QgdGFibGVzID0gcGFyc2VEYXRhYmFzZShjb250ZW50KTtcclxuICAgICAgY29uc29sZS5sb2coJ+ino+aekOWQjueahOihqOagvOaVsOaNrjonLCB0YWJsZXMpO1xyXG5cclxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodGFibGVzKSAmJiB0YWJsZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGF3YWl0IHRoaXMuYWN0aXZhdGVWaWV3KCk7XHJcbiAgICAgICAgaWYgKHRoaXMuZGF0YWJhc2VWaWV3KSB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZygn5pu05paw5pWw5o2u5bqT6KeG5Zu+Jyk7XHJcbiAgICAgICAgICB0aGlzLmRhdGFiYXNlVmlldy5zZXRUYWJsZXModGFibGVzKTtcclxuICAgICAgICAgIG5ldyBOb3RpY2UoJ+aVsOaNruW6k+inhuWbvuW3suabtOaWsCcpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCfml6Dms5XliJvlu7rmiJbojrflj5bmlbDmja7lupPop4blm74nKTtcclxuICAgICAgICAgIG5ldyBOb3RpY2UoJ+abtOaWsOaVsOaNruW6k+inhuWbvuWksei0pScpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCfop6PmnpDnu5Pmnpzml6DmlYg6JywgdGFibGVzKTtcclxuICAgICAgICBuZXcgTm90aWNlKCfop6PmnpDmlbDmja7lupPlpLHotKXvvIzor7fmo4Dmn6Xmlofku7bmoLzlvI8nKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgbmV3IE5vdGljZSgn6K+35omT5byA5LiA5LiqIE1hcmtkb3duIOaWh+S7ticpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgYWN0aXZhdGVWaWV3KCkge1xyXG4gICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuYXBwO1xyXG4gICAgbGV0IGxlYWYgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKERBVEFCQVNFX1ZJRVdfVFlQRSlbMF07XHJcbiAgICBpZiAoIWxlYWYpIHtcclxuICAgICAgbGVhZiA9IHdvcmtzcGFjZS5nZXRSaWdodExlYWYoZmFsc2UpO1xyXG4gICAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IERBVEFCQVNFX1ZJRVdfVFlQRSwgYWN0aXZlOiB0cnVlIH0pO1xyXG4gICAgfVxyXG4gICAgd29ya3NwYWNlLnJldmVhbExlYWYobGVhZik7XHJcbiAgICBcclxuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKTtcclxuICAgIFxyXG4gICAgdGhpcy5kYXRhYmFzZVZpZXcgPSBsZWFmLnZpZXcgYXMgRGF0YWJhc2VWaWV3O1xyXG4gICAgY29uc29sZS5sb2coJ+aVsOaNruW6k+inhuWbvuW3sua/gOa0uzonLCB0aGlzLmRhdGFiYXNlVmlldyk7XHJcbiAgICBcclxuICAgIGlmICghdGhpcy5kYXRhYmFzZVZpZXcpIHtcclxuICAgICAgY29uc29sZS5lcnJvcign5r+A5rS75pWw5o2u5bqT6KeG5Zu+5aSx6LSlJyk7XHJcbiAgICAgIG5ldyBOb3RpY2UoJ+aXoOazleWIm+W7uuaVsOaNruW6k+inhuWbvicpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgb251bmxvYWQoKSB7XHJcbiAgICBjb25zb2xlLmxvZygn5Y246L295pWw5o2u5bqT5o+S5Lu2Jyk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBzYXZlRGF0YSgpIHtcclxuXHJcbiAgICBhd2FpdCB0aGlzLnNhdmVTZXR0aW5ncygpO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCkge1xyXG4gICAgYXdhaXQgKHRoaXMuc2F2ZURhdGEgYXMgKGRhdGE6IGFueSkgPT4gUHJvbWlzZTx2b2lkPikoSlNPTi5zdHJpbmdpZnkodGhpcy5zZXR0aW5ncykpO1xyXG4gIH1cclxufVxyXG5cclxuY2xhc3MgRGF0YWJhc2VQbHVnaW5TZXR0aW5nVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XHJcbiAgcGx1Z2luOiBEYXRhYmFzZVBsdWdpbjtcclxuXHJcbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogRGF0YWJhc2VQbHVnaW4pIHtcclxuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcclxuICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG4gIH1cclxuXHJcbiAgZGlzcGxheSgpOiB2b2lkIHtcclxuICAgIGxldCB7Y29udGFpbmVyRWx9ID0gdGhpcztcclxuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XHJcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDInLCB7dGV4dDogJ+aVsOaNruW6k+aPkuS7tuiuvue9rid9KTtcclxuXHJcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgLnNldE5hbWUoJ+m7mOiupOaOkuW6j+aWueWQkScpXHJcbiAgICAgIC5zZXREZXNjKCforr7nva7ooajmoLznmoTpu5jorqTmjpLluo/mlrnlkJEnKVxyXG4gICAgICAuYWRkRHJvcGRvd24oZHJvcGRvd24gPT4gZHJvcGRvd25cclxuICAgICAgICAuYWRkT3B0aW9uKCdhc2MnLCAn5Y2H5bqPJylcclxuICAgICAgICAuYWRkT3B0aW9uKCdkZXNjJywgJ+mZjeW6jycpXHJcbiAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRTb3J0RGlyZWN0aW9uKVxyXG4gICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRTb3J0RGlyZWN0aW9uID0gdmFsdWUgYXMgJ2FzYycgfCAnZGVzYyc7XHJcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICB9KSk7XHJcbiAgfVxyXG59XHJcbiJdLCJuYW1lcyI6WyJJdGVtVmlldyIsIkRyb3Bkb3duQ29tcG9uZW50IiwiQnV0dG9uQ29tcG9uZW50IiwiVGV4dENvbXBvbmVudCIsIk5vdGljZSIsIk1hcmtkb3duVmlldyIsIkZ1enp5U3VnZ2VzdE1vZGFsIiwiVEZvbGRlciIsIk1vZGFsIiwiU2V0dGluZyIsIlBsdWdpbiIsIlRGaWxlIiwiUGx1Z2luU2V0dGluZ1RhYiJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFvR0E7QUFDTyxTQUFTLFNBQVMsQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUU7QUFDN0QsSUFBSSxTQUFTLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPLEtBQUssWUFBWSxDQUFDLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLFVBQVUsT0FBTyxFQUFFLEVBQUUsT0FBTyxDQUFDLEtB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
