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
            debug(`导出下拉菜单是存在: ${!!this.exportDropdown}`);
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
            th.setText(field.name);
            th.addEventListener('click', () => this.sortTable(table, field.name));
        });
        const filteredData = table.data.filter(row => row.some(cell => String(cell).toLowerCase().includes(state.searchTerm.toLowerCase())));
        filteredData.forEach(row => {
            const tr = tableElement.createEl('tr');
            row.forEach((cell, index) => {
                const td = tr.createEl('td');
                const field = table.fields[index];
                this.renderCell(td, cell, field);
            });
        });
    }
    renderCell(td, cell, field) {
        var _a, _b;
        switch (field.type) {
            case 'string':
            case 'number':
            case 'boolean':
                td.setText(String(cell));
                break;
            case 'date':
                td.setText(new Date(cell).toLocaleDateString());
                break;
            case 'decimal':
                td.setText(parseFloat(cell).toFixed(field.precision || 2));
                break;
            case 'geo':
                td.setText(`(${cell.lat}, ${cell.lng})`);
                break;
            case 'vector':
                td.setText(`[${cell.join(', ')}]`);
                break;
            case 'matrix':
            case 'tensor':
                td.setText(JSON.stringify(cell));
                break;
            case 'complex':
                td.setText(`${cell.real} + ${cell.imag}i`);
                break;
            case 'uncertainty':
                td.setText(`${cell.value} ± ${cell.uncertainty}`);
                break;
            case 'unit':
                td.setText(`${cell.value} ${cell.unit}`);
                break;
            case 'color':
                this.renderColorCell(td, cell, field);
                break;
            case 'spectrum':
            case 'histogram':
            case 'waveform':
                td.setText('[数据]'); // 可以根据需要显示更详细的信息
                break;
            case 'graph':
                td.setText(`[图: ${cell.nodes.length}节点, ${cell.edges.length}边]`);
                break;
            case 'molecule':
                td.setText(`[分子: ${cell.atoms.length}原子]`);
                break;
            case 'sequence':
                td.setText(cell.substring(0, 20) + (cell.length > 20 ? '...' : ''));
                break;
            // 新增的数据类型
            case 'audio_signal':
                td.setText(`[音频信号: ${field.sampleRate || 'N/A'}Hz]`);
                break;
            case 'frequency_response':
                td.setText(`[频率响应: ${((_a = field.frequencyRange) === null || _a === void 0 ? void 0 : _a[0]) || 'N/A'}-${((_b = field.frequencyRange) === null || _b === void 0 ? void 0 : _b[1]) || 'N/A'}Hz]`);
                break;
            case 'impulse_response':
            case 'transfer_function':
            case 'spectrogram':
            case 'directivity_pattern':
                td.setText(`[${field.type}]`);
                break;
            case 'acoustic_impedance':
            case 'reverberation_time':
            case 'noise_level':
            case 'sound_pressure_level':
                td.setText(`${cell} ${field.unit || ''}`);
                break;
            default:
                td.setText(String(cell));
        }
    }
    renderColorCell(td, cell, field) {
        if (field.colorModel === 'RGB') {
            td.setText(`RGB(${cell.r}, ${cell.g}, ${cell.b})`);
            td.setAttr('style', `background-color: rgb(${cell.r}, ${cell.g}, ${cell.b}); color: ${this.getContrastColor(cell.r, cell.g, cell.b)}`);
        }
        else {
            td.setText(JSON.stringify(cell));
        }
    }
    getContrastColor(r, g, b) {
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? 'black' : 'white';
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
        const columnIndex = table.fields.findIndex(field => field.name === column);
        table.data.sort((a, b) => {
            const valueA = String(a[columnIndex]).toLowerCase();
            const valueB = String(b[columnIndex]).toLowerCase();
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
                content = tablesToExport.map(table => [table.fields.map(field => field.name).join(',')]
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
            new obsidian.Notice(`已导出 ${selectedTables.length} 个表格��� ${path.filePath}`);
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
                table.fields = lines[0].split(',').map(fieldName => ({
                    name: fieldName.trim(),
                    type: 'string', // 默认类型，可以根据需要进行更复杂的类型推断
                }));
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
            .setButtonText('从剪贴板导')
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
                inferFieldTypes(currentTable);
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
                    currentTable.fields = cells.map(cell => ({ name: cell, type: 'string' }));
                }
                else {
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
function inferFieldTypes(table) {
    if (table.data.length > 0) {
        table.fields = table.fields.map((field, index) => inferFieldType(field.name, table.data[0][index]));
    }
}
function inferFieldType(fieldName, sampleData) {
    const lowerFieldName = fieldName.toLowerCase();
    let type = 'string';
    let unit;
    let sampleRate;
    let frequencyRange;
    let precision;
    let options;
    let format;
    let dimensions;
    let colorModel;
    if (lowerFieldName.includes('date') || lowerFieldName.includes('time')) {
        type = 'date';
        format = 'YYYY-MM-DD'; // 默认日期格式
    }
    else if (lowerFieldName.includes('price') || lowerFieldName.includes('amount')) {
        type = 'decimal';
        precision = 2;
        unit = lowerFieldName.includes('price') ? '$' : undefined;
    }
    else if (lowerFieldName.includes('quantity') || lowerFieldName.includes('number')) {
        type = 'number';
    }
    else if (lowerFieldName.includes('is') || lowerFieldName.includes('has')) {
        type = 'boolean';
    }
    else if (lowerFieldName.includes('category') || lowerFieldName.includes('type')) {
        type = 'category';
        options = []; // 这里可以根据实际情况设置选项
    }
    else if (lowerFieldName.includes('coordinate') || lowerFieldName.includes('location')) {
        type = 'geo';
    }
    else if (lowerFieldName.includes('series')) {
        type = 'timeseries';
    }
    else if (sampleData.startsWith('[') && sampleData.endsWith(']')) {
        if (sampleData.includes('[')) {
            type = 'matrix';
            dimensions = 2; // 假设是2D矩阵
        }
        else {
            type = 'vector';
            dimensions = sampleData.split(',').length;
        }
    }
    else if (sampleData.startsWith('{') && sampleData.endsWith('}')) {
        if (sampleData.includes('real') && sampleData.includes('imag')) {
            type = 'complex';
        }
        else if (sampleData.includes('value') && sampleData.includes('uncertainty')) {
            type = 'uncertainty';
        }
        else if (sampleData.includes('r') && sampleData.includes('g') && sampleData.includes('b')) {
            type = 'color';
            colorModel = 'RGB';
        }
        else {
            type = 'object';
        }
    }
    else if (lowerFieldName.includes('formula') || lowerFieldName.includes('equation')) {
        type = 'formula';
    }
    else if (lowerFieldName.includes('distribution')) {
        type = 'distribution';
    }
    else if (lowerFieldName.includes('spectrum')) {
        type = 'spectrum';
    }
    else if (lowerFieldName.includes('histogram')) {
        type = 'histogram';
    }
    else if (lowerFieldName.includes('tensor')) {
        type = 'tensor';
    }
    else if (lowerFieldName.includes('waveform')) {
        type = 'waveform';
    }
    else if (lowerFieldName.includes('graph')) {
        type = 'graph';
    }
    else if (lowerFieldName.includes('molecule')) {
        type = 'molecule';
    }
    else if (lowerFieldName.includes('sequence')) {
        type = 'sequence';
    }
    else if (lowerFieldName.includes('image')) {
        type = 'image';
    }
    else if (lowerFieldName.includes('function')) {
        type = 'function';
    }
    else if (lowerFieldName.includes('interval')) {
        type = 'interval';
    }
    else if (lowerFieldName.includes('fuzzy')) {
        type = 'fuzzy';
    }
    else if (lowerFieldName.includes('quaternion')) {
        type = 'quaternion';
    }
    else if (lowerFieldName.includes('polygon')) {
        type = 'polygon';
    }
    else if (lowerFieldName.includes('timedelta')) {
        type = 'timedelta';
    }
    else if (lowerFieldName.includes('currency')) {
        type = 'currency';
    }
    else if (lowerFieldName.includes('regex')) {
        type = 'regex';
    }
    else if (lowerFieldName.includes('url')) {
        type = 'url';
    }
    else if (lowerFieldName.includes('ip')) {
        type = 'ipaddress';
    }
    else if (lowerFieldName.includes('uuid')) {
        type = 'uuid';
    }
    else if (lowerFieldName.includes('version')) {
        type = 'version';
    }
    else if (lowerFieldName.includes('bitfield')) {
        type = 'bitfield';
    }
    else if (lowerFieldName.includes('enum')) {
        type = 'enum';
        options = []; // 这里可以根据实际情况设置选项
    }
    else if (lowerFieldName.includes('audio') || lowerFieldName.includes('signal')) {
        type = 'audio_signal';
        sampleRate = 44100; // 默认采样率
    }
    else if (lowerFieldName.includes('frequency_response')) {
        type = 'frequency_response';
        frequencyRange = [20, 20000]; // 默认人耳可听范围
    }
    else if (lowerFieldName.includes('impulse_response')) {
        type = 'impulse_response';
    }
    else if (lowerFieldName.includes('transfer_function')) {
        type = 'transfer_function';
    }
    else if (lowerFieldName.includes('spectrogram')) {
        type = 'spectrogram';
    }
    else if (lowerFieldName.includes('impedance')) {
        type = 'acoustic_impedance';
        unit = 'Pa·s/m';
    }
    else if (lowerFieldName.includes('reverberation')) {
        type = 'reverberation_time';
        unit = 's';
    }
    else if (lowerFieldName.includes('noise')) {
        type = 'noise_level';
        unit = 'dB';
    }
    else if (lowerFieldName.includes('spl') || lowerFieldName.includes('sound_pressure')) {
        type = 'sound_pressure_level';
        unit = 'dB';
    }
    else if (lowerFieldName.includes('directivity')) {
        type = 'directivity_pattern';
    }
    const field = { name: fieldName, type };
    if (unit)
        field.unit = unit;
    if (sampleRate)
        field.sampleRate = sampleRate;
    if (frequencyRange)
        field.frequencyRange = frequencyRange;
    if (precision)
        field.precision = precision;
    if (options)
        field.options = options;
    if (format)
        field.format = format;
    if (dimensions)
        field.dimensions = dimensions;
    if (colorModel)
        field.colorModel = colorModel;
    return field;
}

const DEFAULT_SETTINGS = {
    defaultSortDirection: 'asc'
};
class DatabasePlugin extends obsidian.Plugin {
    constructor() {
        super(...arguments);
        this.databaseView = null;
        this.settings = DEFAULT_SETTINGS;
        this.dataUpdateCallbacks = [];
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
    queryData(tableName, conditions) {
        const tables = this.getDatabaseData();
        if (!tables)
            return null;
        const table = tables.find(t => t.name === tableName);
        if (!table)
            return null;
        return table.data.filter(row => {
            return Object.entries(conditions).every(([key, value]) => {
                const index = table.fields.findIndex(f => f.name === key);
                return row[index] === value;
            });
        });
    }
    getTableSchema(tableName) {
        const tables = this.getDatabaseData();
        if (!tables)
            return null;
        const table = tables.find(t => t.name === tableName);
        return table ? table.fields : null;
    }
    onDataUpdate(callback) {
        this.dataUpdateCallbacks.push(callback);
    }
    getColumnStats(tableName, columnName) {
        const tables = this.getDatabaseData();
        if (!tables)
            return null;
        const table = tables.find(t => t.name === tableName);
        if (!table)
            return null;
        const columnIndex = table.fields.findIndex(f => f.name === columnName);
        if (columnIndex === -1)
            return null;
        const columnData = table.data.map(row => parseFloat(row[columnIndex])).filter(value => !isNaN(value));
        if (columnData.length === 0)
            return null;
        columnData.sort((a, b) => a - b);
        const min = columnData[0];
        const max = columnData[columnData.length - 1];
        const sum = columnData.reduce((a, b) => a + b, 0);
        const average = sum / columnData.length;
        const median = columnData.length % 2 === 0
            ? (columnData[columnData.length / 2 - 1] + columnData[columnData.length / 2]) / 2
            : columnData[Math.floor(columnData.length / 2)];
        return { min, max, average, median };
    }
    getDataRange(tableName, columnName, start, end) {
        const tables = this.getDatabaseData();
        if (!tables)
            return null;
        const table = tables.find(t => t.name === tableName);
        if (!table)
            return null;
        const columnIndex = table.fields.findIndex(f => f.name === columnName);
        if (columnIndex === -1)
            return null;
        return table.data.slice(start, end + 1).map(row => row[columnIndex]);
    }
    // 添加一个方法来触发数据更新回调
    triggerDataUpdate(updatedTables) {
        this.dataUpdateCallbacks.forEach(callback => callback(updatedTables));
    }
    // 在数据更新时调用此方法
    updateData(updatedTables) {
        // 更新数据的逻辑
        // ...
        // 触发数据更新回调
        this.triggerDataUpdate(updatedTables);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInNyYy91dGlscy9sb2dnZXIudHMiLCJzcmMvRGF0YWJhc2VWaWV3LnRzIiwic3JjL2RhdGFiYXNlUGFyc2VyLnRzIiwic3JjL21haW4udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG5Db3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi5cclxuXHJcblBlcm1pc3Npb24gdG8gdXNlLCBjb3B5LCBtb2RpZnksIGFuZC9vciBkaXN0cmlidXRlIHRoaXMgc29mdHdhcmUgZm9yIGFueVxyXG5wdXJwb3NlIHdpdGggb3Igd2l0aG91dCBmZWUgaXMgaGVyZWJ5IGdyYW50ZWQuXHJcblxyXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiIEFORCBUSEUgQVVUSE9SIERJU0NMQUlNUyBBTEwgV0FSUkFOVElFUyBXSVRIXHJcblJFR0FSRCBUTyBUSElTIFNPRlRXQVJFIElOQ0xVRElORyBBTEwgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWVxyXG5BTkQgRklUTkVTUy4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUiBCRSBMSUFCTEUgRk9SIEFOWSBTUEVDSUFMLCBESVJFQ1QsXHJcbklORElSRUNULCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVMgT1IgQU5ZIERBTUFHRVMgV0hBVFNPRVZFUiBSRVNVTFRJTkcgRlJPTVxyXG5MT1NTIE9GIFVTRSwgREFUQSBPUiBQUk9GSVRTLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgTkVHTElHRU5DRSBPUlxyXG5PVEhFUiBUT1JUSU9VUyBBQ1RJT04sIEFSSVNJTkcgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgVVNFIE9SXHJcblBFUkZPUk1BTkNFIE9GIFRISVMgU09GVFdBUkUuXHJcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqICovXHJcbi8qIGdsb2JhbCBSZWZsZWN0LCBQcm9taXNlLCBTdXBwcmVzc2VkRXJyb3IsIFN5bWJvbCwgSXRlcmF0b3IgKi9cclxuXHJcbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwgcCkpIGRbcF0gPSBiW3BdOyB9O1xyXG4gICAgcmV0dXJuIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHRlbmRzKGQsIGIpIHtcclxuICAgIGlmICh0eXBlb2YgYiAhPT0gXCJmdW5jdGlvblwiICYmIGIgIT09IG51bGwpXHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNsYXNzIGV4dGVuZHMgdmFsdWUgXCIgKyBTdHJpbmcoYikgKyBcIiBpcyBub3QgYSBjb25zdHJ1Y3RvciBvciBudWxsXCIpO1xyXG4gICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XHJcbiAgICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gX19hc3NpZ24odCkge1xyXG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpIHRbcF0gPSBzW3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH1cclxuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXN0KHMsIGUpIHtcclxuICAgIHZhciB0ID0ge307XHJcbiAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcclxuICAgICAgICB0W3BdID0gc1twXTtcclxuICAgIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChlLmluZGV4T2YocFtpXSkgPCAwICYmIE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChzLCBwW2ldKSlcclxuICAgICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xyXG4gICAgICAgIH1cclxuICAgIHJldHVybiB0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXNEZWNvcmF0ZShjdG9yLCBkZXNjcmlwdG9ySW4sIGRlY29yYXRvcnMsIGNvbnRleHRJbiwgaW5pdGlhbGl6ZXJzLCBleHRyYUluaXRpYWxpemVycykge1xyXG4gICAgZnVuY3Rpb24gYWNjZXB0KGYpIHsgaWYgKGYgIT09IHZvaWQgMCAmJiB0eXBlb2YgZiAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRnVuY3Rpb24gZXhwZWN0ZWRcIik7IHJldHVybiBmOyB9XHJcbiAgICB2YXIga2luZCA9IGNvbnRleHRJbi5raW5kLCBrZXkgPSBraW5kID09PSBcImdldHRlclwiID8gXCJnZXRcIiA6IGtpbmQgPT09IFwic2V0dGVyXCIgPyBcInNldFwiIDogXCJ2YWx1ZVwiO1xyXG4gICAgdmFyIHRhcmdldCA9ICFkZXNjcmlwdG9ySW4gJiYgY3RvciA/IGNvbnRleHRJbltcInN0YXRpY1wiXSA/IGN0b3IgOiBjdG9yLnByb3RvdHlwZSA6IG51bGw7XHJcbiAgICB2YXIgZGVzY3JpcHRvciA9IGRlc2NyaXB0b3JJbiB8fCAodGFyZ2V0ID8gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGNvbnRleHRJbi5uYW1lKSA6IHt9KTtcclxuICAgIHZhciBfLCBkb25lID0gZmFsc2U7XHJcbiAgICBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgIHZhciBjb250ZXh0ID0ge307XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4pIGNvbnRleHRbcF0gPSBwID09PSBcImFjY2Vzc1wiID8ge30gOiBjb250ZXh0SW5bcF07XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4uYWNjZXNzKSBjb250ZXh0LmFjY2Vzc1twXSA9IGNvbnRleHRJbi5hY2Nlc3NbcF07XHJcbiAgICAgICAgY29udGV4dC5hZGRJbml0aWFsaXplciA9IGZ1bmN0aW9uIChmKSB7IGlmIChkb25lKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGFkZCBpbml0aWFsaXplcnMgYWZ0ZXIgZGVjb3JhdGlvbiBoYXMgY29tcGxldGVkXCIpOyBleHRyYUluaXRpYWxpemVycy5wdXNoKGFjY2VwdChmIHx8IG51bGwpKTsgfTtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gKDAsIGRlY29yYXRvcnNbaV0pKGtpbmQgPT09IFwiYWNjZXNzb3JcIiA/IHsgZ2V0OiBkZXNjcmlwdG9yLmdldCwgc2V0OiBkZXNjcmlwdG9yLnNldCB9IDogZGVzY3JpcHRvcltrZXldLCBjb250ZXh0KTtcclxuICAgICAgICBpZiAoa2luZCA9PT0gXCJhY2Nlc3NvclwiKSB7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IHZvaWQgMCkgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IG51bGwgfHwgdHlwZW9mIHJlc3VsdCAhPT0gXCJvYmplY3RcIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBleHBlY3RlZFwiKTtcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmdldCkpIGRlc2NyaXB0b3IuZ2V0ID0gXztcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LnNldCkpIGRlc2NyaXB0b3Iuc2V0ID0gXztcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmluaXQpKSBpbml0aWFsaXplcnMudW5zaGlmdChfKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoXyA9IGFjY2VwdChyZXN1bHQpKSB7XHJcbiAgICAgICAgICAgIGlmIChraW5kID09PSBcImZpZWxkXCIpIGluaXRpYWxpemVycy51bnNoaWZ0KF8pO1xyXG4gICAgICAgICAgICBlbHNlIGRlc2NyaXB0b3Jba2V5XSA9IF87XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRhcmdldCkgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgY29udGV4dEluLm5hbWUsIGRlc2NyaXB0b3IpO1xyXG4gICAgZG9uZSA9IHRydWU7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19ydW5Jbml0aWFsaXplcnModGhpc0FyZywgaW5pdGlhbGl6ZXJzLCB2YWx1ZSkge1xyXG4gICAgdmFyIHVzZVZhbHVlID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGluaXRpYWxpemVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhbHVlID0gdXNlVmFsdWUgPyBpbml0aWFsaXplcnNbaV0uY2FsbCh0aGlzQXJnLCB2YWx1ZSkgOiBpbml0aWFsaXplcnNbaV0uY2FsbCh0aGlzQXJnKTtcclxuICAgIH1cclxuICAgIHJldHVybiB1c2VWYWx1ZSA/IHZhbHVlIDogdm9pZCAwO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcHJvcEtleSh4KSB7XHJcbiAgICByZXR1cm4gdHlwZW9mIHggPT09IFwic3ltYm9sXCIgPyB4IDogXCJcIi5jb25jYXQoeCk7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zZXRGdW5jdGlvbk5hbWUoZiwgbmFtZSwgcHJlZml4KSB7XHJcbiAgICBpZiAodHlwZW9mIG5hbWUgPT09IFwic3ltYm9sXCIpIG5hbWUgPSBuYW1lLmRlc2NyaXB0aW9uID8gXCJbXCIuY29uY2F0KG5hbWUuZGVzY3JpcHRpb24sIFwiXVwiKSA6IFwiXCI7XHJcbiAgICByZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnR5KGYsIFwibmFtZVwiLCB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSwgdmFsdWU6IHByZWZpeCA/IFwiXCIuY29uY2F0KHByZWZpeCwgXCIgXCIsIG5hbWUpIDogbmFtZSB9KTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX21ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKSB7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QubWV0YWRhdGEgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIFJlZmxlY3QubWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdGVyKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XHJcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cclxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZ2VuZXJhdG9yKHRoaXNBcmcsIGJvZHkpIHtcclxuICAgIHZhciBfID0geyBsYWJlbDogMCwgc2VudDogZnVuY3Rpb24oKSB7IGlmICh0WzBdICYgMSkgdGhyb3cgdFsxXTsgcmV0dXJuIHRbMV07IH0sIHRyeXM6IFtdLCBvcHM6IFtdIH0sIGYsIHksIHQsIGcgPSBPYmplY3QuY3JlYXRlKCh0eXBlb2YgSXRlcmF0b3IgPT09IFwiZnVuY3Rpb25cIiA/IEl0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpO1xyXG4gICAgcmV0dXJuIGcubmV4dCA9IHZlcmIoMCksIGdbXCJ0aHJvd1wiXSA9IHZlcmIoMSksIGdbXCJyZXR1cm5cIl0gPSB2ZXJiKDIpLCB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgKGdbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSksIGc7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgcmV0dXJuIGZ1bmN0aW9uICh2KSB7IHJldHVybiBzdGVwKFtuLCB2XSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHN0ZXAob3ApIHtcclxuICAgICAgICBpZiAoZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7XHJcbiAgICAgICAgd2hpbGUgKGcgJiYgKGcgPSAwLCBvcFswXSAmJiAoXyA9IDApKSwgXykgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKGYgPSAxLCB5ICYmICh0ID0gb3BbMF0gJiAyID8geVtcInJldHVyblwiXSA6IG9wWzBdID8geVtcInRocm93XCJdIHx8ICgodCA9IHlbXCJyZXR1cm5cIl0pICYmIHQuY2FsbCh5KSwgMCkgOiB5Lm5leHQpICYmICEodCA9IHQuY2FsbCh5LCBvcFsxXSkpLmRvbmUpIHJldHVybiB0O1xyXG4gICAgICAgICAgICBpZiAoeSA9IDAsIHQpIG9wID0gW29wWzBdICYgMiwgdC52YWx1ZV07XHJcbiAgICAgICAgICAgIHN3aXRjaCAob3BbMF0pIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgMDogY2FzZSAxOiB0ID0gb3A7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA0OiBfLmxhYmVsKys7IHJldHVybiB7IHZhbHVlOiBvcFsxXSwgZG9uZTogZmFsc2UgfTtcclxuICAgICAgICAgICAgICAgIGNhc2UgNTogXy5sYWJlbCsrOyB5ID0gb3BbMV07IG9wID0gWzBdOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGNhc2UgNzogb3AgPSBfLm9wcy5wb3AoKTsgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEodCA9IF8udHJ5cywgdCA9IHQubGVuZ3RoID4gMCAmJiB0W3QubGVuZ3RoIC0gMV0pICYmIChvcFswXSA9PT0gNiB8fCBvcFswXSA9PT0gMikpIHsgXyA9IDA7IGNvbnRpbnVlOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSAzICYmICghdCB8fCAob3BbMV0gPiB0WzBdICYmIG9wWzFdIDwgdFszXSkpKSB7IF8ubGFiZWwgPSBvcFsxXTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDYgJiYgXy5sYWJlbCA8IHRbMV0pIHsgXy5sYWJlbCA9IHRbMV07IHQgPSBvcDsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodCAmJiBfLmxhYmVsIDwgdFsyXSkgeyBfLmxhYmVsID0gdFsyXTsgXy5vcHMucHVzaChvcCk7IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRbMl0pIF8ub3BzLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIF8udHJ5cy5wb3AoKTsgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgb3AgPSBib2R5LmNhbGwodGhpc0FyZywgXyk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkgeyBvcCA9IFs2LCBlXTsgeSA9IDA7IH0gZmluYWxseSB7IGYgPSB0ID0gMDsgfVxyXG4gICAgICAgIGlmIChvcFswXSAmIDUpIHRocm93IG9wWzFdOyByZXR1cm4geyB2YWx1ZTogb3BbMF0gPyBvcFsxXSA6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fY3JlYXRlQmluZGluZyA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobSwgayk7XHJcbiAgICBpZiAoIWRlc2MgfHwgKFwiZ2V0XCIgaW4gZGVzYyA/ICFtLl9fZXNNb2R1bGUgOiBkZXNjLndyaXRhYmxlIHx8IGRlc2MuY29uZmlndXJhYmxlKSkge1xyXG4gICAgICAgIGRlc2MgPSB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH07XHJcbiAgICB9XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIGRlc2MpO1xyXG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIG9bazJdID0gbVtrXTtcclxufSk7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHBvcnRTdGFyKG0sIG8pIHtcclxuICAgIGZvciAodmFyIHAgaW4gbSkgaWYgKHAgIT09IFwiZGVmYXVsdFwiICYmICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobywgcCkpIF9fY3JlYXRlQmluZGluZyhvLCBtLCBwKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fdmFsdWVzKG8pIHtcclxuICAgIHZhciBzID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIFN5bWJvbC5pdGVyYXRvciwgbSA9IHMgJiYgb1tzXSwgaSA9IDA7XHJcbiAgICBpZiAobSkgcmV0dXJuIG0uY2FsbChvKTtcclxuICAgIGlmIChvICYmIHR5cGVvZiBvLmxlbmd0aCA9PT0gXCJudW1iZXJcIikgcmV0dXJuIHtcclxuICAgICAgICBuZXh0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmIChvICYmIGkgPj0gby5sZW5ndGgpIG8gPSB2b2lkIDA7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiBvICYmIG9baSsrXSwgZG9uZTogIW8gfTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihzID8gXCJPYmplY3QgaXMgbm90IGl0ZXJhYmxlLlwiIDogXCJTeW1ib2wuaXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZWFkKG8sIG4pIHtcclxuICAgIHZhciBtID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9bU3ltYm9sLml0ZXJhdG9yXTtcclxuICAgIGlmICghbSkgcmV0dXJuIG87XHJcbiAgICB2YXIgaSA9IG0uY2FsbChvKSwgciwgYXIgPSBbXSwgZTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgd2hpbGUgKChuID09PSB2b2lkIDAgfHwgbi0tID4gMCkgJiYgIShyID0gaS5uZXh0KCkpLmRvbmUpIGFyLnB1c2goci52YWx1ZSk7XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZXJyb3IpIHsgZSA9IHsgZXJyb3I6IGVycm9yIH07IH1cclxuICAgIGZpbmFsbHkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChyICYmICFyLmRvbmUgJiYgKG0gPSBpW1wicmV0dXJuXCJdKSkgbS5jYWxsKGkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmaW5hbGx5IHsgaWYgKGUpIHRocm93IGUuZXJyb3I7IH1cclxuICAgIH1cclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuLyoqIEBkZXByZWNhdGVkICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZCgpIHtcclxuICAgIGZvciAodmFyIGFyID0gW10sIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgIGFyID0gYXIuY29uY2F0KF9fcmVhZChhcmd1bWVudHNbaV0pKTtcclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuLyoqIEBkZXByZWNhdGVkICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZEFycmF5cygpIHtcclxuICAgIGZvciAodmFyIHMgPSAwLCBpID0gMCwgaWwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgaWw7IGkrKykgcyArPSBhcmd1bWVudHNbaV0ubGVuZ3RoO1xyXG4gICAgZm9yICh2YXIgciA9IEFycmF5KHMpLCBrID0gMCwgaSA9IDA7IGkgPCBpbDsgaSsrKVxyXG4gICAgICAgIGZvciAodmFyIGEgPSBhcmd1bWVudHNbaV0sIGogPSAwLCBqbCA9IGEubGVuZ3RoOyBqIDwgamw7IGorKywgaysrKVxyXG4gICAgICAgICAgICByW2tdID0gYVtqXTtcclxuICAgIHJldHVybiByO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheSh0bywgZnJvbSwgcGFjaykge1xyXG4gICAgaWYgKHBhY2sgfHwgYXJndW1lbnRzLmxlbmd0aCA9PT0gMikgZm9yICh2YXIgaSA9IDAsIGwgPSBmcm9tLmxlbmd0aCwgYXI7IGkgPCBsOyBpKyspIHtcclxuICAgICAgICBpZiAoYXIgfHwgIShpIGluIGZyb20pKSB7XHJcbiAgICAgICAgICAgIGlmICghYXIpIGFyID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZnJvbSwgMCwgaSk7XHJcbiAgICAgICAgICAgIGFyW2ldID0gZnJvbVtpXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdG8uY29uY2F0KGFyIHx8IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZyb20pKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXQodikge1xyXG4gICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfX2F3YWl0ID8gKHRoaXMudiA9IHYsIHRoaXMpIDogbmV3IF9fYXdhaXQodik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jR2VuZXJhdG9yKHRoaXNBcmcsIF9hcmd1bWVudHMsIGdlbmVyYXRvcikge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBnID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pLCBpLCBxID0gW107XHJcbiAgICByZXR1cm4gaSA9IE9iamVjdC5jcmVhdGUoKHR5cGVvZiBBc3luY0l0ZXJhdG9yID09PSBcImZ1bmN0aW9uXCIgPyBBc3luY0l0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpLCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIsIGF3YWl0UmV0dXJuKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gYXdhaXRSZXR1cm4oZikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh2KS50aGVuKGYsIHJlamVjdCk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpZiAoZ1tuXSkgeyBpW25dID0gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChhLCBiKSB7IHEucHVzaChbbiwgdiwgYSwgYl0pID4gMSB8fCByZXN1bWUobiwgdik7IH0pOyB9OyBpZiAoZikgaVtuXSA9IGYoaVtuXSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gcmVzdW1lKG4sIHYpIHsgdHJ5IHsgc3RlcChnW25dKHYpKTsgfSBjYXRjaCAoZSkgeyBzZXR0bGUocVswXVszXSwgZSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gc3RlcChyKSB7IHIudmFsdWUgaW5zdGFuY2VvZiBfX2F3YWl0ID8gUHJvbWlzZS5yZXNvbHZlKHIudmFsdWUudikudGhlbihmdWxmaWxsLCByZWplY3QpIDogc2V0dGxlKHFbMF1bMl0sIHIpOyB9XHJcbiAgICBmdW5jdGlvbiBmdWxmaWxsKHZhbHVlKSB7IHJlc3VtZShcIm5leHRcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiByZWplY3QodmFsdWUpIHsgcmVzdW1lKFwidGhyb3dcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUoZiwgdikgeyBpZiAoZih2KSwgcS5zaGlmdCgpLCBxLmxlbmd0aCkgcmVzdW1lKHFbMF1bMF0sIHFbMF1bMV0pOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jRGVsZWdhdG9yKG8pIHtcclxuICAgIHZhciBpLCBwO1xyXG4gICAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiLCBmdW5jdGlvbiAoZSkgeyB0aHJvdyBlOyB9KSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpW25dID0gb1tuXSA/IGZ1bmN0aW9uICh2KSB7IHJldHVybiAocCA9ICFwKSA/IHsgdmFsdWU6IF9fYXdhaXQob1tuXSh2KSksIGRvbmU6IGZhbHNlIH0gOiBmID8gZih2KSA6IHY7IH0gOiBmOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jVmFsdWVzKG8pIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xyXG4gICAgcmV0dXJuIG0gPyBtLmNhbGwobykgOiAobyA9IHR5cGVvZiBfX3ZhbHVlcyA9PT0gXCJmdW5jdGlvblwiID8gX192YWx1ZXMobykgOiBvW1N5bWJvbC5pdGVyYXRvcl0oKSwgaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGkpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IGlbbl0gPSBvW25dICYmIGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IHYgPSBvW25dKHYpLCBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCB2LmRvbmUsIHYudmFsdWUpOyB9KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tYWtlVGVtcGxhdGVPYmplY3QoY29va2VkLCByYXcpIHtcclxuICAgIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvb2tlZCwgXCJyYXdcIiwgeyB2YWx1ZTogcmF3IH0pOyB9IGVsc2UgeyBjb29rZWQucmF3ID0gcmF3OyB9XHJcbiAgICByZXR1cm4gY29va2VkO1xyXG59O1xyXG5cclxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xyXG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydFN0YXIobW9kKSB7XHJcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKGsgIT09IFwiZGVmYXVsdFwiICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xyXG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydERlZmF1bHQobW9kKSB7XHJcbiAgICByZXR1cm4gKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgPyBtb2QgOiB7IGRlZmF1bHQ6IG1vZCB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZEdldChyZWNlaXZlciwgc3RhdGUsIGtpbmQsIGYpIHtcclxuICAgIGlmIChraW5kID09PSBcImFcIiAmJiAhZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByaXZhdGUgYWNjZXNzb3Igd2FzIGRlZmluZWQgd2l0aG91dCBhIGdldHRlclwiKTtcclxuICAgIGlmICh0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyICE9PSBzdGF0ZSB8fCAhZiA6ICFzdGF0ZS5oYXMocmVjZWl2ZXIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHJlYWQgcHJpdmF0ZSBtZW1iZXIgZnJvbSBhbiBvYmplY3Qgd2hvc2UgY2xhc3MgZGlkIG5vdCBkZWNsYXJlIGl0XCIpO1xyXG4gICAgcmV0dXJuIGtpbmQgPT09IFwibVwiID8gZiA6IGtpbmQgPT09IFwiYVwiID8gZi5jYWxsKHJlY2VpdmVyKSA6IGYgPyBmLnZhbHVlIDogc3RhdGUuZ2V0KHJlY2VpdmVyKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRTZXQocmVjZWl2ZXIsIHN0YXRlLCB2YWx1ZSwga2luZCwgZikge1xyXG4gICAgaWYgKGtpbmQgPT09IFwibVwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBtZXRob2QgaXMgbm90IHdyaXRhYmxlXCIpO1xyXG4gICAgaWYgKGtpbmQgPT09IFwiYVwiICYmICFmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBhY2Nlc3NvciB3YXMgZGVmaW5lZCB3aXRob3V0IGEgc2V0dGVyXCIpO1xyXG4gICAgaWYgKHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgIT09IHN0YXRlIHx8ICFmIDogIXN0YXRlLmhhcyhyZWNlaXZlcikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3Qgd3JpdGUgcHJpdmF0ZSBtZW1iZXIgdG8gYW4gb2JqZWN0IHdob3NlIGNsYXNzIGRpZCBub3QgZGVjbGFyZSBpdFwiKTtcclxuICAgIHJldHVybiAoa2luZCA9PT0gXCJhXCIgPyBmLmNhbGwocmVjZWl2ZXIsIHZhbHVlKSA6IGYgPyBmLnZhbHVlID0gdmFsdWUgOiBzdGF0ZS5zZXQocmVjZWl2ZXIsIHZhbHVlKSksIHZhbHVlO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZEluKHN0YXRlLCByZWNlaXZlcikge1xyXG4gICAgaWYgKHJlY2VpdmVyID09PSBudWxsIHx8ICh0eXBlb2YgcmVjZWl2ZXIgIT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHJlY2VpdmVyICE9PSBcImZ1bmN0aW9uXCIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHVzZSAnaW4nIG9wZXJhdG9yIG9uIG5vbi1vYmplY3RcIik7XHJcbiAgICByZXR1cm4gdHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciA9PT0gc3RhdGUgOiBzdGF0ZS5oYXMocmVjZWl2ZXIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hZGREaXNwb3NhYmxlUmVzb3VyY2UoZW52LCB2YWx1ZSwgYXN5bmMpIHtcclxuICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdm9pZCAwKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgdmFsdWUgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBleHBlY3RlZC5cIik7XHJcbiAgICAgICAgdmFyIGRpc3Bvc2UsIGlubmVyO1xyXG4gICAgICAgIGlmIChhc3luYykge1xyXG4gICAgICAgICAgICBpZiAoIVN5bWJvbC5hc3luY0Rpc3Bvc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNEaXNwb3NlIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgICAgICAgICAgZGlzcG9zZSA9IHZhbHVlW1N5bWJvbC5hc3luY0Rpc3Bvc2VdO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoZGlzcG9zZSA9PT0gdm9pZCAwKSB7XHJcbiAgICAgICAgICAgIGlmICghU3ltYm9sLmRpc3Bvc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuZGlzcG9zZSBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICAgICAgICAgIGRpc3Bvc2UgPSB2YWx1ZVtTeW1ib2wuZGlzcG9zZV07XHJcbiAgICAgICAgICAgIGlmIChhc3luYykgaW5uZXIgPSBkaXNwb3NlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodHlwZW9mIGRpc3Bvc2UgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBub3QgZGlzcG9zYWJsZS5cIik7XHJcbiAgICAgICAgaWYgKGlubmVyKSBkaXNwb3NlID0gZnVuY3Rpb24oKSB7IHRyeSB7IGlubmVyLmNhbGwodGhpcyk7IH0gY2F0Y2ggKGUpIHsgcmV0dXJuIFByb21pc2UucmVqZWN0KGUpOyB9IH07XHJcbiAgICAgICAgZW52LnN0YWNrLnB1c2goeyB2YWx1ZTogdmFsdWUsIGRpc3Bvc2U6IGRpc3Bvc2UsIGFzeW5jOiBhc3luYyB9KTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGFzeW5jKSB7XHJcbiAgICAgICAgZW52LnN0YWNrLnB1c2goeyBhc3luYzogdHJ1ZSB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiB2YWx1ZTtcclxuXHJcbn1cclxuXHJcbnZhciBfU3VwcHJlc3NlZEVycm9yID0gdHlwZW9mIFN1cHByZXNzZWRFcnJvciA9PT0gXCJmdW5jdGlvblwiID8gU3VwcHJlc3NlZEVycm9yIDogZnVuY3Rpb24gKGVycm9yLCBzdXBwcmVzc2VkLCBtZXNzYWdlKSB7XHJcbiAgICB2YXIgZSA9IG5ldyBFcnJvcihtZXNzYWdlKTtcclxuICAgIHJldHVybiBlLm5hbWUgPSBcIlN1cHByZXNzZWRFcnJvclwiLCBlLmVycm9yID0gZXJyb3IsIGUuc3VwcHJlc3NlZCA9IHN1cHByZXNzZWQsIGU7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kaXNwb3NlUmVzb3VyY2VzKGVudikge1xyXG4gICAgZnVuY3Rpb24gZmFpbChlKSB7XHJcbiAgICAgICAgZW52LmVycm9yID0gZW52Lmhhc0Vycm9yID8gbmV3IF9TdXBwcmVzc2VkRXJyb3IoZSwgZW52LmVycm9yLCBcIkFuIGVycm9yIHdhcyBzdXBwcmVzc2VkIGR1cmluZyBkaXNwb3NhbC5cIikgOiBlO1xyXG4gICAgICAgIGVudi5oYXNFcnJvciA9IHRydWU7XHJcbiAgICB9XHJcbiAgICB2YXIgciwgcyA9IDA7XHJcbiAgICBmdW5jdGlvbiBuZXh0KCkge1xyXG4gICAgICAgIHdoaWxlIChyID0gZW52LnN0YWNrLnBvcCgpKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXIuYXN5bmMgJiYgcyA9PT0gMSkgcmV0dXJuIHMgPSAwLCBlbnYuc3RhY2sucHVzaChyKSwgUHJvbWlzZS5yZXNvbHZlKCkudGhlbihuZXh0KTtcclxuICAgICAgICAgICAgICAgIGlmIChyLmRpc3Bvc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gci5kaXNwb3NlLmNhbGwoci52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHIuYXN5bmMpIHJldHVybiBzIHw9IDIsIFByb21pc2UucmVzb2x2ZShyZXN1bHQpLnRoZW4obmV4dCwgZnVuY3Rpb24oZSkgeyBmYWlsKGUpOyByZXR1cm4gbmV4dCgpOyB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgcyB8PSAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICBmYWlsKGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChzID09PSAxKSByZXR1cm4gZW52Lmhhc0Vycm9yID8gUHJvbWlzZS5yZWplY3QoZW52LmVycm9yKSA6IFByb21pc2UucmVzb2x2ZSgpO1xyXG4gICAgICAgIGlmIChlbnYuaGFzRXJyb3IpIHRocm93IGVudi5lcnJvcjtcclxuICAgIH1cclxuICAgIHJldHVybiBuZXh0KCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3Jld3JpdGVSZWxhdGl2ZUltcG9ydEV4dGVuc2lvbihwYXRoLCBwcmVzZXJ2ZUpzeCkge1xyXG4gICAgaWYgKHR5cGVvZiBwYXRoID09PSBcInN0cmluZ1wiICYmIC9eXFwuXFwuP1xcLy8udGVzdChwYXRoKSkge1xyXG4gICAgICAgIHJldHVybiBwYXRoLnJlcGxhY2UoL1xcLih0c3gpJHwoKD86XFwuZCk/KSgoPzpcXC5bXi4vXSs/KT8pXFwuKFtjbV0/KXRzJC9pLCBmdW5jdGlvbiAobSwgdHN4LCBkLCBleHQsIGNtKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0c3ggPyBwcmVzZXJ2ZUpzeCA/IFwiLmpzeFwiIDogXCIuanNcIiA6IGQgJiYgKCFleHQgfHwgIWNtKSA/IG0gOiAoZCArIGV4dCArIFwiLlwiICsgY20udG9Mb3dlckNhc2UoKSArIFwianNcIik7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcGF0aDtcclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQge1xyXG4gICAgX19leHRlbmRzOiBfX2V4dGVuZHMsXHJcbiAgICBfX2Fzc2lnbjogX19hc3NpZ24sXHJcbiAgICBfX3Jlc3Q6IF9fcmVzdCxcclxuICAgIF9fZGVjb3JhdGU6IF9fZGVjb3JhdGUsXHJcbiAgICBfX3BhcmFtOiBfX3BhcmFtLFxyXG4gICAgX19lc0RlY29yYXRlOiBfX2VzRGVjb3JhdGUsXHJcbiAgICBfX3J1bkluaXRpYWxpemVyczogX19ydW5Jbml0aWFsaXplcnMsXHJcbiAgICBfX3Byb3BLZXk6IF9fcHJvcEtleSxcclxuICAgIF9fc2V0RnVuY3Rpb25OYW1lOiBfX3NldEZ1bmN0aW9uTmFtZSxcclxuICAgIF9fbWV0YWRhdGE6IF9fbWV0YWRhdGEsXHJcbiAgICBfX2F3YWl0ZXI6IF9fYXdhaXRlcixcclxuICAgIF9fZ2VuZXJhdG9yOiBfX2dlbmVyYXRvcixcclxuICAgIF9fY3JlYXRlQmluZGluZzogX19jcmVhdGVCaW5kaW5nLFxyXG4gICAgX19leHBvcnRTdGFyOiBfX2V4cG9ydFN0YXIsXHJcbiAgICBfX3ZhbHVlczogX192YWx1ZXMsXHJcbiAgICBfX3JlYWQ6IF9fcmVhZCxcclxuICAgIF9fc3ByZWFkOiBfX3NwcmVhZCxcclxuICAgIF9fc3ByZWFkQXJyYXlzOiBfX3NwcmVhZEFycmF5cyxcclxuICAgIF9fc3ByZWFkQXJyYXk6IF9fc3ByZWFkQXJyYXksXHJcbiAgICBfX2F3YWl0OiBfX2F3YWl0LFxyXG4gICAgX19hc3luY0dlbmVyYXRvcjogX19hc3luY0dlbmVyYXRvcixcclxuICAgIF9fYXN5bmNEZWxlZ2F0b3I6IF9fYXN5bmNEZWxlZ2F0b3IsXHJcbiAgICBfX2FzeW5jVmFsdWVzOiBfX2FzeW5jVmFsdWVzLFxyXG4gICAgX19tYWtlVGVtcGxhdGVPYmplY3Q6IF9fbWFrZVRlbXBsYXRlT2JqZWN0LFxyXG4gICAgX19pbXBvcnRTdGFyOiBfX2ltcG9ydFN0YXIsXHJcbiAgICBfX2ltcG9ydERlZmF1bHQ6IF9faW1wb3J0RGVmYXVsdCxcclxuICAgIF9fY2xhc3NQcml2YXRlRmllbGRHZXQ6IF9fY2xhc3NQcml2YXRlRmllbGRHZXQsXHJcbiAgICBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0OiBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0LFxyXG4gICAgX19jbGFzc1ByaXZhdGVGaWVsZEluOiBfX2NsYXNzUHJpdmF0ZUZpZWxkSW4sXHJcbiAgICBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZTogX19hZGREaXNwb3NhYmxlUmVzb3VyY2UsXHJcbiAgICBfX2Rpc3Bvc2VSZXNvdXJjZXM6IF9fZGlzcG9zZVJlc291cmNlcyxcclxuICAgIF9fcmV3cml0ZVJlbGF0aXZlSW1wb3J0RXh0ZW5zaW9uOiBfX3Jld3JpdGVSZWxhdGl2ZUltcG9ydEV4dGVuc2lvbixcclxufTtcclxuIiwiZW51bSBMb2dMZXZlbCB7XHJcbiAgREVCVUcgPSAwLFxyXG4gIElORk8gPSAxLFxyXG4gIFdBUk4gPSAyLFxyXG4gIEVSUk9SID0gM1xyXG59XHJcblxyXG5sZXQgY3VycmVudExvZ0xldmVsOiBMb2dMZXZlbCA9IExvZ0xldmVsLklORk87XHJcblxyXG5mdW5jdGlvbiBzZXRMb2dMZXZlbChsZXZlbDogTG9nTGV2ZWwpOiB2b2lkIHtcclxuICBpZiAoT2JqZWN0LnZhbHVlcyhMb2dMZXZlbCkuaW5jbHVkZXMobGV2ZWwpKSB7XHJcbiAgICBjdXJyZW50TG9nTGV2ZWwgPSBsZXZlbDtcclxuICB9IGVsc2Uge1xyXG4gICAgY29uc29sZS5lcnJvcign5peg5pWI55qE5pel5b+X57qn5YirJyk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBsb2cobGV2ZWw6IExvZ0xldmVsLCBtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcclxuICBpZiAobGV2ZWwgPj0gY3VycmVudExvZ0xldmVsKSB7XHJcbiAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICBjb25zdCBsZXZlbE5hbWUgPSBMb2dMZXZlbFtsZXZlbF07XHJcbiAgICBjb25zb2xlLmxvZyhgWyR7dGltZXN0YW1wfV0gWyR7bGV2ZWxOYW1lfV0gJHttZXNzYWdlfWApO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZGVidWcobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XHJcbiAgbG9nKExvZ0xldmVsLkRFQlVHLCBtZXNzYWdlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gaW5mbyhtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcclxuICBsb2coTG9nTGV2ZWwuSU5GTywgbWVzc2FnZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHdhcm4obWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XHJcbiAgbG9nKExvZ0xldmVsLldBUk4sIG1lc3NhZ2UpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBlcnJvcihtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcclxuICBsb2coTG9nTGV2ZWwuRVJST1IsIG1lc3NhZ2UpO1xyXG59XHJcblxyXG5leHBvcnQge1xyXG4gIExvZ0xldmVsLFxyXG4gIHNldExvZ0xldmVsLFxyXG4gIGRlYnVnLFxyXG4gIGluZm8sXHJcbiAgd2FybixcclxuICBlcnJvclxyXG59O1xyXG5cclxuc2V0TG9nTGV2ZWwoTG9nTGV2ZWwuREVCVUcpO1xyXG4iLCJpbXBvcnQgeyBJdGVtVmlldywgV29ya3NwYWNlTGVhZiwgQXBwLCBUZXh0Q29tcG9uZW50LCBEcm9wZG93bkNvbXBvbmVudCwgQnV0dG9uQ29tcG9uZW50LCBOb3RpY2UsIE1hcmtkb3duVmlldywgTW9kYWwsIFNldHRpbmcsIEZ1enp5U3VnZ2VzdE1vZGFsLCBURm9sZGVyIH0gZnJvbSAnb2JzaWRpYW4nO1xyXG5pbXBvcnQgeyBEYXRhYmFzZVRhYmxlLCBEYXRhYmFzZVZpZXdJbnRlcmZhY2UsIFRhYmxlU3RhdGUsIFNvcnRTdGF0ZSwgRGF0YWJhc2VQbHVnaW5JbnRlcmZhY2UsIERhdGFiYXNlRmllbGQsIERhdGFiYXNlRmllbGRUeXBlIH0gZnJvbSAnLi90eXBlcyc7XHJcbmltcG9ydCB7IGRlYnVnLCBpbmZvLCB3YXJuLCBlcnJvciB9IGZyb20gJy4vdXRpbHMvbG9nZ2VyJztcclxuXHJcbmV4cG9ydCBjb25zdCBEQVRBQkFTRV9WSUVXX1RZUEUgPSAnZGF0YWJhc2Utdmlldyc7XHJcblxyXG5leHBvcnQgY2xhc3MgRGF0YWJhc2VWaWV3IGV4dGVuZHMgSXRlbVZpZXcgaW1wbGVtZW50cyBEYXRhYmFzZVZpZXdJbnRlcmZhY2Uge1xyXG4gIHByaXZhdGUgdGFibGVzOiBEYXRhYmFzZVRhYmxlW10gPSBbXTtcclxuICBwcml2YXRlIHRhYmxlU3RhdGVzOiBUYWJsZVN0YXRlW10gPSBbXTtcclxuICBwcml2YXRlIHNvcnRTdGF0ZXM6IE1hcDxEYXRhYmFzZVRhYmxlLCBTb3J0U3RhdGU+ID0gbmV3IE1hcCgpO1xyXG4gIHByaXZhdGUgdGFibGVFbGVtZW50czogTWFwPERhdGFiYXNlVGFibGUsIEhUTUxFbGVtZW50PiA9IG5ldyBNYXAoKTtcclxuICBwcml2YXRlIGV4cG9ydERyb3Bkb3duPzogRHJvcGRvd25Db21wb25lbnQ7XHJcbiAgcHJpdmF0ZSBleHBvcnRCdXR0b24/OiBCdXR0b25Db21wb25lbnQ7XHJcbiAgcHJpdmF0ZSBpbXBvcnRCdXR0b24/OiBCdXR0b25Db21wb25lbnQ7XHJcbiAgcHJpdmF0ZSBwbHVnaW46IERhdGFiYXNlUGx1Z2luSW50ZXJmYWNlO1xyXG4gIHByaXZhdGUgc2VsZWN0ZWRUYWJsZXM6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpO1xyXG5cclxuICBjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmLCBwbHVnaW46IERhdGFiYXNlUGx1Z2luSW50ZXJmYWNlKSB7XHJcbiAgICBzdXBlcihsZWFmKTtcclxuICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG4gICAgdGhpcy50YWJsZXMgPSBbXTsgLy8g5Yid5aeL5YyW5Li656m65pWw57uEXHJcbiAgfVxyXG5cclxuICBnZXRWaWV3VHlwZSgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIERBVEFCQVNFX1ZJRVdfVFlQRTtcclxuICB9XHJcblxyXG4gIGdldERpc3BsYXlUZXh0KCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gJ+aVsOaNruW6k+inhuWbvic7XHJcbiAgfVxyXG5cclxuICBhc3luYyBvbk9wZW4oKSB7XHJcbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLmNvbnRhaW5lckVsLmNoaWxkcmVuWzFdO1xyXG4gICAgY29udGFpbmVyLmVtcHR5KCk7XHJcbiAgICBjb250YWluZXIuYWRkQ2xhc3MoJ2RhdGFiYXNlLXZpZXctY29udGFpbmVyJyk7XHJcblxyXG4gICAgY29uc3QgdG9wQmFyID0gY29udGFpbmVyLmNyZWF0ZUVsKCdkaXYnLCB7IGNsczogJ2RhdGFiYXNlLXZpZXctdG9wLWJhcicgfSk7XHJcblxyXG4gICAgZGVidWcoJ+WIm+W7uumhtumDqOagj+WFg+e0oCcpO1xyXG5cclxuICAgIHRoaXMuZXhwb3J0RHJvcGRvd24gPSBuZXcgRHJvcGRvd25Db21wb25lbnQodG9wQmFyKVxyXG4gICAgICAuYWRkT3B0aW9uKCdjc3YnLCAnQ1NWJylcclxuICAgICAgLmFkZE9wdGlvbignanNvbicsICdKU09OJylcclxuICAgICAgLnNldFZhbHVlKCdjc3YnKTtcclxuXHJcbiAgICBkZWJ1Zygn5a+85Ye65LiL5ouJ6I+c5Y2V5bey5Yib5bu6Jyk7XHJcblxyXG4gICAgdGhpcy5leHBvcnRCdXR0b24gPSBuZXcgQnV0dG9uQ29tcG9uZW50KHRvcEJhcilcclxuICAgICAgLnNldEJ1dHRvblRleHQoJ+WvvOWHuicpXHJcbiAgICAgIC5vbkNsaWNrKCgpID0+IHRoaXMub3BlbkV4cG9ydE1vZGFsKCkpO1xyXG5cclxuICAgIHRoaXMuaW1wb3J0QnV0dG9uID0gbmV3IEJ1dHRvbkNvbXBvbmVudCh0b3BCYXIpXHJcbiAgICAgIC5zZXRCdXR0b25UZXh0KCflr7zlhaUnKVxyXG4gICAgICAub25DbGljaygoKSA9PiB0aGlzLmltcG9ydERhdGEoKSk7XHJcblxyXG4gICAgZGVidWcoJ+WvvOWHuuWSjOWvvOWFpeaMiemSruW3suWIm+W7uicpO1xyXG5cclxuICAgIC8vIOehruS/neaJgOacieaMiemSrumDveiiq+a3u+WKoOWIsOmhtumDqOagj1xyXG4gICAgdG9wQmFyLmFwcGVuZENoaWxkKHRoaXMuZXhwb3J0RHJvcGRvd24uc2VsZWN0RWwpO1xyXG4gICAgdG9wQmFyLmFwcGVuZENoaWxkKHRoaXMuZXhwb3J0QnV0dG9uLmJ1dHRvbkVsKTtcclxuICAgIHRvcEJhci5hcHBlbmRDaGlsZCh0aGlzLmltcG9ydEJ1dHRvbi5idXR0b25FbCk7XHJcblxyXG4gICAgLy8g56Gu5L+d5Zyo5Yib5bu65oyJ6ZKu5ZCO6LCD55SoIHJlbmRlclRhYmxlc1xyXG4gICAgdGhpcy5yZW5kZXJUYWJsZXMoKTtcclxuXHJcbiAgICBkZWJ1Zygn6KGo5qC85bey5riy5p+TJyk7XHJcblxyXG4gICAgLy8g5re75Yqg6LCD6K+V5Luj56CBXHJcbiAgICBkZWJ1Zyhg6aG26YOo5qCP5piv5ZCm5a2Y5ZyoOiAkeyEhdG9wQmFyfWApO1xyXG4gICAgZGVidWcoYOmhtumDqOagj0hUTUw6ICR7dG9wQmFyLm91dGVySFRNTH1gKTtcclxuICAgIGRlYnVnKGDlr7zlh7rkuIvmi4noj5zljZXmmK/lrZjlnKg6ICR7ISF0aGlzLmV4cG9ydERyb3Bkb3dufWApO1xyXG4gICAgZGVidWcoYOWvvOWHuuaMiemSruaYr+WQpuWtmOWcqDogJHshIXRoaXMuZXhwb3J0QnV0dG9ufWApO1xyXG4gICAgZGVidWcoYOWvvOWFpeaMiemSruaYr+WQpuWtmOWcqDogJHshIXRoaXMuaW1wb3J0QnV0dG9ufWApO1xyXG4gICAgaWYgKHRoaXMuZXhwb3J0QnV0dG9uICYmIHRoaXMuaW1wb3J0QnV0dG9uKSB7XHJcbiAgICAgIGRlYnVnKGDlr7zlh7rmjInpkq5IVE1MOiAke3RoaXMuZXhwb3J0QnV0dG9uLmJ1dHRvbkVsLm91dGVySFRNTH1gKTtcclxuICAgICAgZGVidWcoYOWvvOWFpeaMiemSrkhUTUw6ICR7dGhpcy5pbXBvcnRCdXR0b24uYnV0dG9uRWwub3V0ZXJIVE1MfWApO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuY2hlY2tCdXR0b25WaXNpYmlsaXR5KCk7XHJcblxyXG4gICAgLy8g5ZyoIG9uT3BlbiDmlrnms5XnmoTmnKvlsL7mt7vliqBcclxuICAgIHRoaXMuYXBwLndvcmtzcGFjZS51cGRhdGVPcHRpb25zKCk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBvbkNsb3NlKCkge1xyXG4gICAgLy8g5riF55CG5bel5L2cXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgc2V0VGFibGVzKHRhYmxlczogRGF0YWJhc2VUYWJsZVtdKTogdm9pZCB7XHJcbiAgICB0aGlzLnRhYmxlcyA9IHRhYmxlcztcclxuICAgIHRoaXMudGFibGVTdGF0ZXMgPSB0YWJsZXMubWFwKCh0YWJsZSwgaW5kZXgpID0+ICh7XHJcbiAgICAgIHRhYmxlLFxyXG4gICAgICBpZDogaW5kZXgsXHJcbiAgICAgIHNlYXJjaFRlcm06ICcnXHJcbiAgICB9KSk7XHJcbiAgICBcclxuICAgIHRoaXMucmVuZGVyVGFibGVzKCk7XHJcbiAgICB0aGlzLmNoZWNrQnV0dG9uVmlzaWJpbGl0eSgpO1xyXG5cclxuICAgIC8vIOWcqCBzZXRUYWJsZXMg5pa55rOV55qE5pyr5bC+5re75YqgXHJcbiAgICB0aGlzLmFwcC53b3Jrc3BhY2UudXBkYXRlT3B0aW9ucygpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGdldFRhYmxlcygpOiBEYXRhYmFzZVRhYmxlW10ge1xyXG4gICAgcmV0dXJuIHRoaXMudGFibGVzO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSByZW5kZXJUYWJsZXMoKSB7XHJcbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLmNvbnRhaW5lckVsLmNoaWxkcmVuWzFdO1xyXG4gICAgY29udGFpbmVyLmVtcHR5KCk7XHJcbiAgICBjb250YWluZXIuYWRkQ2xhc3MoJ2RhdGFiYXNlLXZpZXctY29udGFpbmVyJyk7XHJcblxyXG4gICAgLy8g56Gu5L+d6aG26YOo5qCP5Zyo6KGo5qC85LmL5YmNXHJcbiAgICBjb25zdCB0b3BCYXIgPSBjb250YWluZXIuY3JlYXRlRWwoJ2RpdicsIHsgY2xzOiAnZGF0YWJhc2Utdmlldy10b3AtYmFyJyB9KTtcclxuICAgIGlmICh0aGlzLmV4cG9ydERyb3Bkb3duKSB0b3BCYXIuYXBwZW5kQ2hpbGQodGhpcy5leHBvcnREcm9wZG93bi5zZWxlY3RFbCk7XHJcbiAgICBpZiAodGhpcy5leHBvcnRCdXR0b24pIHRvcEJhci5hcHBlbmRDaGlsZCh0aGlzLmV4cG9ydEJ1dHRvbi5idXR0b25FbCk7XHJcbiAgICBpZiAodGhpcy5pbXBvcnRCdXR0b24pIHRvcEJhci5hcHBlbmRDaGlsZCh0aGlzLmltcG9ydEJ1dHRvbi5idXR0b25FbCk7XHJcblxyXG4gICAgdGhpcy50YWJsZVN0YXRlcy5mb3JFYWNoKHN0YXRlID0+IHtcclxuICAgICAgY29uc3QgdGFibGVDb250YWluZXIgPSBjb250YWluZXIuY3JlYXRlRWwoJ2RpdicsIHsgY2xzOiAnZGF0YWJhc2UtdGFibGUtY29udGFpbmVyJyB9KTtcclxuICAgICAgdGFibGVDb250YWluZXIuY3JlYXRlRWwoJ2gzJywgeyB0ZXh0OiBzdGF0ZS50YWJsZS5uYW1lIH0pO1xyXG5cclxuICAgICAgY29uc3Qgc2VhcmNoSW5wdXQgPSBuZXcgVGV4dENvbXBvbmVudCh0YWJsZUNvbnRhaW5lcilcclxuICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJ+aQnOe0oi4uLicpXHJcbiAgICAgICAgLm9uQ2hhbmdlKHZhbHVlID0+IHtcclxuICAgICAgICAgIHN0YXRlLnNlYXJjaFRlcm0gPSB2YWx1ZTtcclxuICAgICAgICAgIHRoaXMudXBkYXRlVGFibGUoc3RhdGUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICBzZWFyY2hJbnB1dC5pbnB1dEVsLmFkZENsYXNzKCdzZWFyY2gtaW5wdXQnKTtcclxuXHJcbiAgICAgIGNvbnN0IHRhYmxlRWxlbWVudCA9IHRhYmxlQ29udGFpbmVyLmNyZWF0ZUVsKCd0YWJsZScsIHsgY2xzOiAnZGF0YWJhc2UtdGFibGUnIH0pO1xyXG4gICAgICB0aGlzLnJlbmRlclRhYmxlKHN0YXRlLCB0YWJsZUVsZW1lbnQpO1xyXG4gICAgICB0aGlzLnRhYmxlRWxlbWVudHMuc2V0KHN0YXRlLnRhYmxlLCB0YWJsZUVsZW1lbnQpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlbmRlclRhYmxlKHN0YXRlOiBUYWJsZVN0YXRlLCB0YWJsZUVsZW1lbnQ6IEhUTUxFbGVtZW50KSB7XHJcbiAgICB0YWJsZUVsZW1lbnQuZW1wdHkoKTtcclxuICAgIGNvbnN0IHsgdGFibGUgfSA9IHN0YXRlO1xyXG5cclxuICAgIGNvbnN0IGhlYWRlclJvdyA9IHRhYmxlRWxlbWVudC5jcmVhdGVFbCgndHInKTtcclxuICAgIHRhYmxlLmZpZWxkcy5mb3JFYWNoKGZpZWxkID0+IHtcclxuICAgICAgY29uc3QgdGggPSBoZWFkZXJSb3cuY3JlYXRlRWwoJ3RoJyk7XHJcbiAgICAgIHRoLnNldFRleHQoZmllbGQubmFtZSk7XHJcbiAgICAgIHRoLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5zb3J0VGFibGUodGFibGUsIGZpZWxkLm5hbWUpKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGZpbHRlcmVkRGF0YSA9IHRhYmxlLmRhdGEuZmlsdGVyKHJvdyA9PlxyXG4gICAgICByb3cuc29tZShjZWxsID0+IFN0cmluZyhjZWxsKS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHN0YXRlLnNlYXJjaFRlcm0udG9Mb3dlckNhc2UoKSkpXHJcbiAgICApO1xyXG5cclxuICAgIGZpbHRlcmVkRGF0YS5mb3JFYWNoKHJvdyA9PiB7XHJcbiAgICAgIGNvbnN0IHRyID0gdGFibGVFbGVtZW50LmNyZWF0ZUVsKCd0cicpO1xyXG4gICAgICByb3cuZm9yRWFjaCgoY2VsbCwgaW5kZXgpID0+IHtcclxuICAgICAgICBjb25zdCB0ZCA9IHRyLmNyZWF0ZUVsKCd0ZCcpO1xyXG4gICAgICAgIGNvbnN0IGZpZWxkID0gdGFibGUuZmllbGRzW2luZGV4XTtcclxuICAgICAgICB0aGlzLnJlbmRlckNlbGwodGQsIGNlbGwsIGZpZWxkKTtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcmVuZGVyQ2VsbCh0ZDogSFRNTEVsZW1lbnQsIGNlbGw6IGFueSwgZmllbGQ6IERhdGFiYXNlRmllbGQpIHtcclxuICAgIHN3aXRjaCAoZmllbGQudHlwZSkge1xyXG4gICAgICBjYXNlICdzdHJpbmcnOlxyXG4gICAgICBjYXNlICdudW1iZXInOlxyXG4gICAgICBjYXNlICdib29sZWFuJzpcclxuICAgICAgICB0ZC5zZXRUZXh0KFN0cmluZyhjZWxsKSk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgJ2RhdGUnOlxyXG4gICAgICAgIHRkLnNldFRleHQobmV3IERhdGUoY2VsbCkudG9Mb2NhbGVEYXRlU3RyaW5nKCkpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlICdkZWNpbWFsJzpcclxuICAgICAgICB0ZC5zZXRUZXh0KHBhcnNlRmxvYXQoY2VsbCkudG9GaXhlZChmaWVsZC5wcmVjaXNpb24gfHwgMikpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlICdnZW8nOlxyXG4gICAgICAgIHRkLnNldFRleHQoYCgke2NlbGwubGF0fSwgJHtjZWxsLmxuZ30pYCk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgJ3ZlY3Rvcic6XHJcbiAgICAgICAgdGQuc2V0VGV4dChgWyR7Y2VsbC5qb2luKCcsICcpfV1gKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAnbWF0cml4JzpcclxuICAgICAgY2FzZSAndGVuc29yJzpcclxuICAgICAgICB0ZC5zZXRUZXh0KEpTT04uc3RyaW5naWZ5KGNlbGwpKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAnY29tcGxleCc6XHJcbiAgICAgICAgdGQuc2V0VGV4dChgJHtjZWxsLnJlYWx9ICsgJHtjZWxsLmltYWd9aWApO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlICd1bmNlcnRhaW50eSc6XHJcbiAgICAgICAgdGQuc2V0VGV4dChgJHtjZWxsLnZhbHVlfSDCsSAke2NlbGwudW5jZXJ0YWludHl9YCk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgJ3VuaXQnOlxyXG4gICAgICAgIHRkLnNldFRleHQoYCR7Y2VsbC52YWx1ZX0gJHtjZWxsLnVuaXR9YCk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgJ2NvbG9yJzpcclxuICAgICAgICB0aGlzLnJlbmRlckNvbG9yQ2VsbCh0ZCwgY2VsbCwgZmllbGQpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlICdzcGVjdHJ1bSc6XHJcbiAgICAgIGNhc2UgJ2hpc3RvZ3JhbSc6XHJcbiAgICAgIGNhc2UgJ3dhdmVmb3JtJzpcclxuICAgICAgICB0ZC5zZXRUZXh0KCdb5pWw5o2uXScpOyAvLyDlj6/ku6XmoLnmja7pnIDopoHmmL7npLrmm7Tor6bnu4bnmoTkv6Hmga9cclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAnZ3JhcGgnOlxyXG4gICAgICAgIHRkLnNldFRleHQoYFvlm746ICR7Y2VsbC5ub2Rlcy5sZW5ndGh96IqC54K5LCAke2NlbGwuZWRnZXMubGVuZ3Rofei+uV1gKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAnbW9sZWN1bGUnOlxyXG4gICAgICAgIHRkLnNldFRleHQoYFvliIblrZA6ICR7Y2VsbC5hdG9tcy5sZW5ndGh95Y6f5a2QXWApO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlICdzZXF1ZW5jZSc6XHJcbiAgICAgICAgdGQuc2V0VGV4dChjZWxsLnN1YnN0cmluZygwLCAyMCkgKyAoY2VsbC5sZW5ndGggPiAyMCA/ICcuLi4nIDogJycpKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgLy8g5paw5aKe55qE5pWw5o2u57G75Z6LXHJcbiAgICAgIGNhc2UgJ2F1ZGlvX3NpZ25hbCc6XHJcbiAgICAgICAgdGQuc2V0VGV4dChgW+mfs+mikeS/oeWPtzogJHtmaWVsZC5zYW1wbGVSYXRlIHx8ICdOL0EnfUh6XWApO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlICdmcmVxdWVuY3lfcmVzcG9uc2UnOlxyXG4gICAgICAgIHRkLnNldFRleHQoYFvpopHnjoflk43lupQ6ICR7ZmllbGQuZnJlcXVlbmN5UmFuZ2U/LlswXSB8fCAnTi9BJ30tJHtmaWVsZC5mcmVxdWVuY3lSYW5nZT8uWzFdIHx8ICdOL0EnfUh6XWApO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlICdpbXB1bHNlX3Jlc3BvbnNlJzpcclxuICAgICAgY2FzZSAndHJhbnNmZXJfZnVuY3Rpb24nOlxyXG4gICAgICBjYXNlICdzcGVjdHJvZ3JhbSc6XHJcbiAgICAgIGNhc2UgJ2RpcmVjdGl2aXR5X3BhdHRlcm4nOlxyXG4gICAgICAgIHRkLnNldFRleHQoYFske2ZpZWxkLnR5cGV9XWApO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlICdhY291c3RpY19pbXBlZGFuY2UnOlxyXG4gICAgICBjYXNlICdyZXZlcmJlcmF0aW9uX3RpbWUnOlxyXG4gICAgICBjYXNlICdub2lzZV9sZXZlbCc6XHJcbiAgICAgIGNhc2UgJ3NvdW5kX3ByZXNzdXJlX2xldmVsJzpcclxuICAgICAgICB0ZC5zZXRUZXh0KGAke2NlbGx9ICR7ZmllbGQudW5pdCB8fCAnJ31gKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICB0ZC5zZXRUZXh0KFN0cmluZyhjZWxsKSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlbmRlckNvbG9yQ2VsbCh0ZDogSFRNTEVsZW1lbnQsIGNlbGw6IGFueSwgZmllbGQ6IERhdGFiYXNlRmllbGQpIHtcclxuICAgIGlmIChmaWVsZC5jb2xvck1vZGVsID09PSAnUkdCJykge1xyXG4gICAgICB0ZC5zZXRUZXh0KGBSR0IoJHtjZWxsLnJ9LCAke2NlbGwuZ30sICR7Y2VsbC5ifSlgKTtcclxuICAgICAgdGQuc2V0QXR0cignc3R5bGUnLCBgYmFja2dyb3VuZC1jb2xvcjogcmdiKCR7Y2VsbC5yfSwgJHtjZWxsLmd9LCAke2NlbGwuYn0pOyBjb2xvcjogJHt0aGlzLmdldENvbnRyYXN0Q29sb3IoY2VsbC5yLCBjZWxsLmcsIGNlbGwuYil9YCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0ZC5zZXRUZXh0KEpTT04uc3RyaW5naWZ5KGNlbGwpKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2V0Q29udHJhc3RDb2xvcihyOiBudW1iZXIsIGc6IG51bWJlciwgYjogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGx1bWluYW5jZSA9ICgwLjI5OSAqIHIgKyAwLjU4NyAqIGcgKyAwLjExNCAqIGIpIC8gMjU1O1xyXG4gICAgcmV0dXJuIGx1bWluYW5jZSA+IDAuNSA/ICdibGFjaycgOiAnd2hpdGUnO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSB1cGRhdGVUYWJsZShzdGF0ZTogVGFibGVTdGF0ZSkge1xyXG4gICAgY29uc3QgdGFibGVFbGVtZW50ID0gdGhpcy50YWJsZUVsZW1lbnRzLmdldChzdGF0ZS50YWJsZSk7XHJcbiAgICBpZiAodGFibGVFbGVtZW50KSB7XHJcbiAgICAgIHRoaXMucmVuZGVyVGFibGUoc3RhdGUsIHRhYmxlRWxlbWVudCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHNvcnRUYWJsZSh0YWJsZTogRGF0YWJhc2VUYWJsZSwgY29sdW1uOiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IGN1cnJlbnRTb3J0ID0gdGhpcy5zb3J0U3RhdGVzLmdldCh0YWJsZSkgfHwgeyBjb2x1bW46ICcnLCBkaXJlY3Rpb246ICdhc2MnIH07XHJcbiAgICBjb25zdCBuZXdEaXJlY3Rpb24gPSBjdXJyZW50U29ydC5jb2x1bW4gPT09IGNvbHVtbiAmJiBjdXJyZW50U29ydC5kaXJlY3Rpb24gPT09ICdhc2MnID8gJ2Rlc2MnIDogJ2FzYyc7XHJcbiAgICBcclxuICAgIGNvbnN0IGNvbHVtbkluZGV4ID0gdGFibGUuZmllbGRzLmZpbmRJbmRleChmaWVsZCA9PiBmaWVsZC5uYW1lID09PSBjb2x1bW4pO1xyXG4gICAgdGFibGUuZGF0YS5zb3J0KChhLCBiKSA9PiB7XHJcbiAgICAgIGNvbnN0IHZhbHVlQSA9IFN0cmluZyhhW2NvbHVtbkluZGV4XSkudG9Mb3dlckNhc2UoKTtcclxuICAgICAgY29uc3QgdmFsdWVCID0gU3RyaW5nKGJbY29sdW1uSW5kZXhdKS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICBpZiAodmFsdWVBIDwgdmFsdWVCKSByZXR1cm4gbmV3RGlyZWN0aW9uID09PSAnYXNjJyA/IC0xIDogMTtcclxuICAgICAgaWYgKHZhbHVlQSA+IHZhbHVlQikgcmV0dXJuIG5ld0RpcmVjdGlvbiA9PT0gJ2FzYycgPyAxIDogLTE7XHJcbiAgICAgIHJldHVybiAwO1xyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5zb3J0U3RhdGVzLnNldCh0YWJsZSwgeyBjb2x1bW4sIGRpcmVjdGlvbjogbmV3RGlyZWN0aW9uIH0pO1xyXG4gICAgdGhpcy5yZW5kZXJUYWJsZXMoKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgZXhwb3J0RGF0YShzZWxlY3RlZFRhYmxlczogc3RyaW5nW10sIGZvcm1hdDogc3RyaW5nIHwgdW5kZWZpbmVkKSB7XHJcbiAgICBpZiAoIWZvcm1hdCkgcmV0dXJuO1xyXG5cclxuICAgIGxldCBjb250ZW50ID0gJyc7XHJcbiAgICBjb25zdCB0YWJsZXNUb0V4cG9ydCA9IHRoaXMudGFibGVzLmZpbHRlcih0YWJsZSA9PiBzZWxlY3RlZFRhYmxlcy5pbmNsdWRlcyh0YWJsZS5uYW1lKSk7XHJcblxyXG4gICAgaWYgKGZvcm1hdCA9PT0gJ2NzdicpIHtcclxuICAgICAgY29udGVudCA9IHRhYmxlc1RvRXhwb3J0Lm1hcCh0YWJsZSA9PiBcclxuICAgICAgICBbdGFibGUuZmllbGRzLm1hcChmaWVsZCA9PiBmaWVsZC5uYW1lKS5qb2luKCcsJyldXHJcbiAgICAgICAgICAuY29uY2F0KHRhYmxlLmRhdGEubWFwKHJvdyA9PiByb3cuam9pbignLCcpKSlcclxuICAgICAgICAgIC5qb2luKCdcXG4nKVxyXG4gICAgICApLmpvaW4oJ1xcblxcbicpO1xyXG4gICAgfSBlbHNlIGlmIChmb3JtYXQgPT09ICdqc29uJykge1xyXG4gICAgICBjb250ZW50ID0gSlNPTi5zdHJpbmdpZnkodGFibGVzVG9FeHBvcnQsIG51bGwsIDIpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIOS9v+eUqCBFbGVjdHJvbiDnmoQgZGlhbG9nIEFQSSDorqnnlKjmiLfpgInmi6nkv53lrZjkvY3nva5cclxuICAgIGNvbnN0IHsgcmVtb3RlIH0gPSByZXF1aXJlKCdlbGVjdHJvbicpO1xyXG4gICAgY29uc3QgcGF0aCA9IGF3YWl0IHJlbW90ZS5kaWFsb2cuc2hvd1NhdmVEaWFsb2coe1xyXG4gICAgICB0aXRsZTogJ+mAieaLqeS/neWtmOS9jee9ricsXHJcbiAgICAgIGRlZmF1bHRQYXRoOiBgZXhwb3J0ZWRfdGFibGVzLiR7Zm9ybWF0fWAsXHJcbiAgICAgIGZpbHRlcnM6IFtcclxuICAgICAgICB7IG5hbWU6IGZvcm1hdC50b1VwcGVyQ2FzZSgpLCBleHRlbnNpb25zOiBbZm9ybWF0XSB9LFxyXG4gICAgICAgIHsgbmFtZTogJ+aJgOacieaWh+S7ticsIGV4dGVuc2lvbnM6IFsnKiddIH1cclxuICAgICAgXVxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKHBhdGguY2FuY2VsZWQpIHtcclxuICAgICAgbmV3IE5vdGljZSgn5a+85Ye65bey5Y+W5raIJyk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyDkvb/nlKggT2JzaWRpYW4g55qEIHZhdWx0LmFkYXB0ZXIud3JpdGVCaW5hcnkg5pa55rOV5L+d5a2Y5paH5Lu2XHJcbiAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLndyaXRlQmluYXJ5KHBhdGguZmlsZVBhdGgsIG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShjb250ZW50KSk7XHJcblxyXG4gICAgbmV3IE5vdGljZShg5bey5a+85Ye6ICR7c2VsZWN0ZWRUYWJsZXMubGVuZ3RofSDkuKrooajmoLzvv73vv73vv70gJHtwYXRoLmZpbGVQYXRofWApO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBpbXBvcnREYXRhKCkge1xyXG4gICAgbmV3IEltcG9ydE1ldGhvZE1vZGFsKHRoaXMuYXBwLCBhc3luYyAobWV0aG9kKSA9PiB7XHJcbiAgICAgIGlmIChtZXRob2QgPT09ICdmaWxlJykge1xyXG4gICAgICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcclxuICAgICAgICBpbnB1dC50eXBlID0gJ2ZpbGUnO1xyXG4gICAgICAgIGlucHV0LmFjY2VwdCA9ICcuY3N2LC5qc29uJztcclxuICAgICAgICBpbnB1dC5vbmNoYW5nZSA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICAgIGNvbnN0IGZpbGUgPSBpbnB1dC5maWxlcz8uWzBdO1xyXG4gICAgICAgICAgaWYgKGZpbGUpIHtcclxuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IGZpbGUudGV4dCgpO1xyXG4gICAgICAgICAgICB0aGlzLnByb2Nlc3NJbXBvcnRlZENvbnRlbnQoY29udGVudCwgZmlsZS5uYW1lLmVuZHNXaXRoKCcuanNvbicpID8gJ2pzb24nIDogJ2NzdicpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgaW5wdXQuY2xpY2soKTtcclxuICAgICAgfSBlbHNlIGlmIChtZXRob2QgPT09ICdjbGlwYm9hcmQnKSB7XHJcbiAgICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQucmVhZFRleHQoKTtcclxuICAgICAgICB0aGlzLnByb2Nlc3NJbXBvcnRlZENvbnRlbnQoY29udGVudCk7XHJcbiAgICAgIH1cclxuICAgIH0pLm9wZW4oKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgcHJvY2Vzc0ltcG9ydGVkQ29udGVudChjb250ZW50OiBzdHJpbmcsIGZvcm1hdD86ICdjc3YnIHwgJ2pzb24nKSB7XHJcbiAgICBsZXQgdGFibGVzOiBEYXRhYmFzZVRhYmxlW10gPSBbXTtcclxuICAgIGlmICghZm9ybWF0KSB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgSlNPTi5wYXJzZShjb250ZW50KTtcclxuICAgICAgICBmb3JtYXQgPSAnanNvbic7XHJcbiAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgIGZvcm1hdCA9ICdjc3YnO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGZvcm1hdCA9PT0gJ2NzdicpIHtcclxuICAgICAgY29uc3QgbGluZXMgPSBjb250ZW50LnNwbGl0KCdcXG4nKS5tYXAobGluZSA9PiBsaW5lLnRyaW0oKSkuZmlsdGVyKGxpbmUgPT4gbGluZSk7XHJcbiAgICAgIGNvbnN0IHRhYmxlOiBEYXRhYmFzZVRhYmxlID0geyBuYW1lOiAnSW1wb3J0ZWQgVGFibGUnLCBmaWVsZHM6IFtdLCBkYXRhOiBbXSB9O1xyXG4gICAgICB0YWJsZS5maWVsZHMgPSBsaW5lc1swXS5zcGxpdCgnLCcpLm1hcChmaWVsZE5hbWUgPT4gKHtcclxuICAgICAgICBuYW1lOiBmaWVsZE5hbWUudHJpbSgpLFxyXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLCAvLyDpu5jorqTnsbvlnovvvIzlj6/ku6XmoLnmja7pnIDopoHov5vooYzmm7TlpI3mnYLnmoTnsbvlnovmjqjmlq1cclxuICAgICAgfSkpO1xyXG4gICAgICB0YWJsZS5kYXRhID0gbGluZXMuc2xpY2UoMSkubWFwKGxpbmUgPT4gbGluZS5zcGxpdCgnLCcpLm1hcChjZWxsID0+IGNlbGwudHJpbSgpKSk7XHJcbiAgICAgIHRhYmxlcyA9IFt0YWJsZV07XHJcbiAgICB9IGVsc2UgaWYgKGZvcm1hdCA9PT0gJ2pzb24nKSB7XHJcbiAgICAgIHRhYmxlcyA9IEpTT04ucGFyc2UoY29udGVudCk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5zZXRUYWJsZXModGFibGVzKTtcclxuICAgIG5ldyBOb3RpY2UoJ+aVsOaNruWvvOWFpeaIkOWKnycpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGluc2VydENvbnRlbnQoY29udGVudDogc3RyaW5nKSB7XHJcbiAgICBjb25zdCBhY3RpdmVWaWV3ID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZVZpZXdPZlR5cGUoTWFya2Rvd25WaWV3KTtcclxuICAgIGlmIChhY3RpdmVWaWV3KSB7XHJcbiAgICAgIGNvbnN0IGVkaXRvciA9IGFjdGl2ZVZpZXcuZWRpdG9yO1xyXG4gICAgICBjb25zdCBjdXJzb3IgPSBlZGl0b3IuZ2V0Q3Vyc29yKCk7XHJcbiAgICAgIGVkaXRvci5yZXBsYWNlUmFuZ2UoY29udGVudCwgY3Vyc29yKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIG5ldyBOb3RpY2UoJ+ivt+WFiOaJk+W8gOS4gOS4qiBNYXJrZG93biDmlofku7YnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHB1YmxpYyBjaGVja0J1dHRvblZpc2liaWxpdHkoKSB7XHJcbiAgICBpZiAodGhpcy5leHBvcnRCdXR0b24gJiYgdGhpcy5pbXBvcnRCdXR0b24pIHtcclxuICAgICAgY29uc3QgZXhwb3J0QnV0dG9uUmVjdCA9IHRoaXMuZXhwb3J0QnV0dG9uLmJ1dHRvbkVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICBjb25zdCBpbXBvcnRCdXR0b25SZWN0ID0gdGhpcy5pbXBvcnRCdXR0b24uYnV0dG9uRWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgIFxyXG4gICAgICBkZWJ1Zyhg5a+85Ye65oyJ6ZKu5L2N572uOiB0b3A9JHtleHBvcnRCdXR0b25SZWN0LnRvcH0sIGxlZnQ9JHtleHBvcnRCdXR0b25SZWN0LmxlZnR9LCB3aWR0aD0ke2V4cG9ydEJ1dHRvblJlY3Qud2lkdGh9LCBoZWlnaHQ9JHtleHBvcnRCdXR0b25SZWN0LmhlaWdodH1gKTtcclxuICAgICAgZGVidWcoYOWvvOWFpeaMiemSruS9jee9rjogdG9wPSR7aW1wb3J0QnV0dG9uUmVjdC50b3B9LCBsZWZ0PSR7aW1wb3J0QnV0dG9uUmVjdC5sZWZ0fSwgd2lkdGg9JHtpbXBvcnRCdXR0b25SZWN0LndpZHRofSwgaGVpZ2h0PSR7aW1wb3J0QnV0dG9uUmVjdC5oZWlnaHR9YCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB3YXJuKCfmjInpkq7mnKrliJvlu7onKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgY2hlY2tCdXR0b25WaXNpYmlsaXR5V2l0aERlbGF5KCkge1xyXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgIHRoaXMuY2hlY2tCdXR0b25WaXNpYmlsaXR5KCk7XHJcbiAgICB9LCAxMDApOyAvLyAxMDBtcyDlu7bov59cclxuICB9XHJcblxyXG4gIHByaXZhdGUgb3BlbkV4cG9ydE1vZGFsKCkge1xyXG4gICAgbmV3IEV4cG9ydE1vZGFsKHRoaXMuYXBwLCB0aGlzLnRhYmxlcywgKHNlbGVjdGVkVGFibGVzKSA9PiB7XHJcbiAgICAgIGNvbnN0IGZvcm1hdCA9IHRoaXMuZXhwb3J0RHJvcGRvd24/LmdldFZhbHVlKCk7XHJcbiAgICAgIHRoaXMuZXhwb3J0RGF0YShzZWxlY3RlZFRhYmxlcywgZm9ybWF0KTtcclxuICAgIH0pLm9wZW4oKTtcclxuICB9XHJcbn1cclxuXHJcbmNsYXNzIEZvbGRlclN1Z2dlc3RNb2RhbCBleHRlbmRzIEZ1enp5U3VnZ2VzdE1vZGFsPFRGb2xkZXI+IHtcclxuICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcHJpdmF0ZSBjYWxsYmFjazogKGZvbGRlcjogVEZvbGRlcikgPT4gdm9pZCkge1xyXG4gICAgc3VwZXIoYXBwKTtcclxuICB9XHJcblxyXG4gIGdldEl0ZW1zKCk6IFRGb2xkZXJbXSB7XHJcbiAgICByZXR1cm4gdGhpcy5hcHAudmF1bHQuZ2V0QWxsTG9hZGVkRmlsZXMoKVxyXG4gICAgICAuZmlsdGVyKChmaWxlKTogZmlsZSBpcyBURm9sZGVyID0+IGZpbGUgaW5zdGFuY2VvZiBURm9sZGVyKTtcclxuICB9XHJcblxyXG4gIGdldEl0ZW1UZXh0KGZvbGRlcjogVEZvbGRlcik6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gZm9sZGVyLnBhdGg7XHJcbiAgfVxyXG5cclxuICBvbkNob29zZUl0ZW0oZm9sZGVyOiBURm9sZGVyLCBldnQ6IE1vdXNlRXZlbnQgfCBLZXlib2FyZEV2ZW50KTogdm9pZCB7XHJcbiAgICB0aGlzLmNhbGxiYWNrKGZvbGRlcik7XHJcbiAgfVxyXG59XHJcblxyXG5jbGFzcyBJbXBvcnRNZXRob2RNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcHJpdmF0ZSBjYWxsYmFjazogKG1ldGhvZDogJ2ZpbGUnIHwgJ2NsaXBib2FyZCcpID0+IHZvaWQpIHtcclxuICAgIHN1cGVyKGFwcCk7XHJcbiAgfVxyXG5cclxuICBvbk9wZW4oKSB7XHJcbiAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xyXG4gICAgY29udGVudEVsLmNyZWF0ZUVsKCdoMicsIHsgdGV4dDogJ+mAieaLqeWvvOWFpeaWueW8jycgfSk7XHJcblxyXG4gICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxyXG4gICAgICAuc2V0TmFtZSgn5LuO5paH5Lu25a+85YWlJylcclxuICAgICAgLnNldERlc2MoJ+mAieaLqeS4gOS4qiBDU1Yg5oiWIEpTT04g5paH5Lu2JylcclxuICAgICAgLmFkZEJ1dHRvbihidXR0b24gPT4gYnV0dG9uXHJcbiAgICAgICAgLnNldEJ1dHRvblRleHQoJ+mAieaLqeaWh+S7ticpXHJcbiAgICAgICAgLm9uQ2xpY2soKCkgPT4ge1xyXG4gICAgICAgICAgdGhpcy5jbG9zZSgpO1xyXG4gICAgICAgICAgdGhpcy5jYWxsYmFjaygnZmlsZScpO1xyXG4gICAgICAgIH0pKTtcclxuXHJcbiAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcbiAgICAgIC5zZXROYW1lKCfku47liarotLTmnb/lr7zlhaUnKVxyXG4gICAgICAuc2V0RGVzYygn5LuO5Ymq6LS05p2/57KY6LS0IENTViDmiJYgSlNPTiDmlbDmja4nKVxyXG4gICAgICAuYWRkQnV0dG9uKGJ1dHRvbiA9PiBidXR0b25cclxuICAgICAgICAuc2V0QnV0dG9uVGV4dCgn5LuO5Ymq6LS05p2/5a+8JylcclxuICAgICAgICAub25DbGljaygoKSA9PiB7XHJcbiAgICAgICAgICB0aGlzLmNsb3NlKCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGxiYWNrKCdjbGlwYm9hcmQnKTtcclxuICAgICAgICB9KSk7XHJcbiAgfVxyXG5cclxuICBvbkNsb3NlKCkge1xyXG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICBjb250ZW50RWwuZW1wdHkoKTtcclxuICB9XHJcbn1cclxuXHJcbmNsYXNzIEV4cG9ydE1vZGFsIGV4dGVuZHMgTW9kYWwge1xyXG4gIHByaXZhdGUgc2VsZWN0ZWRUYWJsZXM6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIGFwcDogQXBwLFxyXG4gICAgcHJpdmF0ZSB0YWJsZXM6IERhdGFiYXNlVGFibGVbXSxcclxuICAgIHByaXZhdGUgb25TdWJtaXQ6IChzZWxlY3RlZFRhYmxlczogc3RyaW5nW10pID0+IHZvaWRcclxuICApIHtcclxuICAgIHN1cGVyKGFwcCk7XHJcbiAgfVxyXG5cclxuICBvbk9wZW4oKSB7XHJcbiAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xyXG4gICAgY29udGVudEVsLmNyZWF0ZUVsKCdoMicsIHsgdGV4dDogJ+mAieaLqeimgeWvvOWHuueahOihqOagvCcgfSk7XHJcblxyXG4gICAgdGhpcy50YWJsZXMuZm9yRWFjaCh0YWJsZSA9PiB7XHJcbiAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuICAgICAgICAuc2V0TmFtZSh0YWJsZS5uYW1lKVxyXG4gICAgICAgIC5hZGRUb2dnbGUodG9nZ2xlID0+IHRvZ2dsZVxyXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMuc2VsZWN0ZWRUYWJsZXMuaGFzKHRhYmxlLm5hbWUpKVxyXG4gICAgICAgICAgLm9uQ2hhbmdlKHZhbHVlID0+IHtcclxuICAgICAgICAgICAgaWYgKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFRhYmxlcy5hZGQodGFibGUubmFtZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFRhYmxlcy5kZWxldGUodGFibGUubmFtZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pKTtcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuICAgICAgLmFkZEJ1dHRvbihidXR0b24gPT4gYnV0dG9uXHJcbiAgICAgICAgLnNldEJ1dHRvblRleHQoJ+WvvOWHuicpXHJcbiAgICAgICAgLnNldEN0YSgpXHJcbiAgICAgICAgLm9uQ2xpY2soKCkgPT4ge1xyXG4gICAgICAgICAgdGhpcy5vblN1Ym1pdChBcnJheS5mcm9tKHRoaXMuc2VsZWN0ZWRUYWJsZXMpKTtcclxuICAgICAgICAgIHRoaXMuY2xvc2UoKTtcclxuICAgICAgICB9KSk7XHJcbiAgfVxyXG5cclxuICBvbkNsb3NlKCkge1xyXG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICBjb250ZW50RWwuZW1wdHkoKTtcclxuICB9XHJcbn1cclxuIiwiaW1wb3J0IHsgZGVidWcsIGluZm8gfSBmcm9tICcuL3V0aWxzL2xvZ2dlcic7XHJcbmltcG9ydCB7IERhdGFiYXNlVGFibGUsIERhdGFiYXNlRmllbGQsIERhdGFiYXNlRmllbGRUeXBlIH0gZnJvbSAnLi90eXBlcyc7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VEYXRhYmFzZShtYXJrZG93bjogc3RyaW5nKTogRGF0YWJhc2VUYWJsZVtdIHtcclxuICBkZWJ1Zyhg5byA5aeL6Kej5p6Q5pWw5o2u5bqT77yM6L6T5YWl5YaF5a65OiAke21hcmtkb3duLnN1YnN0cmluZygwLCAxMDApfS4uLmApO1xyXG4gIGNvbnN0IHRhYmxlczogRGF0YWJhc2VUYWJsZVtdID0gW107XHJcbiAgY29uc3QgbGluZXMgPSBtYXJrZG93bi5zcGxpdCgnXFxuJyk7XHJcbiAgbGV0IGN1cnJlbnRUYWJsZTogRGF0YWJhc2VUYWJsZSB8IG51bGwgPSBudWxsO1xyXG5cclxuICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcclxuICAgIGNvbnN0IHRyaW1tZWRMaW5lID0gbGluZS50cmltKCk7XHJcbiAgICBkZWJ1Zyhg5aSE55CG6KGMOiAke3RyaW1tZWRMaW5lfWApO1xyXG4gICAgaWYgKHRyaW1tZWRMaW5lLnN0YXJ0c1dpdGgoJ2RiOicpKSB7XHJcbiAgICAgIGRlYnVnKGDlj5HnjrDmlrDooag6ICR7dHJpbW1lZExpbmV9YCk7XHJcbiAgICAgIGlmIChjdXJyZW50VGFibGUpIHtcclxuICAgICAgICBpbmZlckZpZWxkVHlwZXMoY3VycmVudFRhYmxlKTtcclxuICAgICAgICB0YWJsZXMucHVzaChjdXJyZW50VGFibGUpO1xyXG4gICAgICB9XHJcbiAgICAgIGN1cnJlbnRUYWJsZSA9IHtcclxuICAgICAgICBuYW1lOiB0cmltbWVkTGluZS5zdWJzdHJpbmcoMykudHJpbSgpLFxyXG4gICAgICAgIGZpZWxkczogW10sXHJcbiAgICAgICAgZGF0YTogW11cclxuICAgICAgfTtcclxuICAgIH0gZWxzZSBpZiAoY3VycmVudFRhYmxlKSB7XHJcbiAgICAgIGNvbnN0IGNlbGxzID0gdHJpbW1lZExpbmUuc3BsaXQoJywnKS5tYXAoY2VsbCA9PiBjZWxsLnRyaW0oKSk7XHJcbiAgICAgIGlmIChjZWxscy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgaWYgKGN1cnJlbnRUYWJsZS5maWVsZHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICBkZWJ1Zyhg6K6+572u5a2X5q61OiAke2NlbGxzLmpvaW4oJywgJyl9YCk7XHJcbiAgICAgICAgICBjdXJyZW50VGFibGUuZmllbGRzID0gY2VsbHMubWFwKGNlbGwgPT4gKHsgbmFtZTogY2VsbCwgdHlwZTogJ3N0cmluZycgfSkpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBkZWJ1Zyhg5re75Yqg5pWw5o2u6KGMOiAke2NlbGxzLmpvaW4oJywgJyl9YCk7XHJcbiAgICAgICAgICBjdXJyZW50VGFibGUuZGF0YS5wdXNoKGNlbGxzKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmIChjdXJyZW50VGFibGUpIHtcclxuICAgIGluZmVyRmllbGRUeXBlcyhjdXJyZW50VGFibGUpO1xyXG4gICAgdGFibGVzLnB1c2goY3VycmVudFRhYmxlKTtcclxuICB9XHJcblxyXG4gIGluZm8oYOino+aekOWujOaIkO+8jOe7k+aenDogJHtKU09OLnN0cmluZ2lmeSh0YWJsZXMpLnN1YnN0cmluZygwLCAxMDApfS4uLmApO1xyXG4gIHJldHVybiB0YWJsZXM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluZmVyRmllbGRUeXBlcyh0YWJsZTogRGF0YWJhc2VUYWJsZSk6IHZvaWQge1xyXG4gIGlmICh0YWJsZS5kYXRhLmxlbmd0aCA+IDApIHtcclxuICAgIHRhYmxlLmZpZWxkcyA9IHRhYmxlLmZpZWxkcy5tYXAoKGZpZWxkLCBpbmRleCkgPT4gXHJcbiAgICAgIGluZmVyRmllbGRUeXBlKGZpZWxkLm5hbWUsIHRhYmxlLmRhdGFbMF1baW5kZXhdKVxyXG4gICAgKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluZmVyRmllbGRUeXBlKGZpZWxkTmFtZTogc3RyaW5nLCBzYW1wbGVEYXRhOiBzdHJpbmcpOiBEYXRhYmFzZUZpZWxkIHtcclxuICBjb25zdCBsb3dlckZpZWxkTmFtZSA9IGZpZWxkTmFtZS50b0xvd2VyQ2FzZSgpO1xyXG4gIGxldCB0eXBlOiBEYXRhYmFzZUZpZWxkVHlwZSA9ICdzdHJpbmcnO1xyXG4gIGxldCB1bml0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbiAgbGV0IHNhbXBsZVJhdGU6IG51bWJlciB8IHVuZGVmaW5lZDtcclxuICBsZXQgZnJlcXVlbmN5UmFuZ2U6IFtudW1iZXIsIG51bWJlcl0gfCB1bmRlZmluZWQ7XHJcbiAgbGV0IHByZWNpc2lvbjogbnVtYmVyIHwgdW5kZWZpbmVkO1xyXG4gIGxldCBvcHRpb25zOiBzdHJpbmdbXSB8IHVuZGVmaW5lZDtcclxuICBsZXQgZm9ybWF0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbiAgbGV0IGRpbWVuc2lvbnM6IG51bWJlciB8IHVuZGVmaW5lZDtcclxuICBsZXQgY29sb3JNb2RlbDogJ1JHQicgfCAnSFNMJyB8ICdDTVlLJyB8IHVuZGVmaW5lZDtcclxuXHJcbiAgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdkYXRlJykgfHwgbG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ3RpbWUnKSkge1xyXG4gICAgdHlwZSA9ICdkYXRlJztcclxuICAgIGZvcm1hdCA9ICdZWVlZLU1NLUREJzsgLy8g6buY6K6k5pel5pyf5qC85byPXHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygncHJpY2UnKSB8fCBsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnYW1vdW50JykpIHtcclxuICAgIHR5cGUgPSAnZGVjaW1hbCc7XHJcbiAgICBwcmVjaXNpb24gPSAyO1xyXG4gICAgdW5pdCA9IGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdwcmljZScpID8gJyQnIDogdW5kZWZpbmVkO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ3F1YW50aXR5JykgfHwgbG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ251bWJlcicpKSB7XHJcbiAgICB0eXBlID0gJ251bWJlcic7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnaXMnKSB8fCBsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnaGFzJykpIHtcclxuICAgIHR5cGUgPSAnYm9vbGVhbic7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnY2F0ZWdvcnknKSB8fCBsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygndHlwZScpKSB7XHJcbiAgICB0eXBlID0gJ2NhdGVnb3J5JztcclxuICAgIG9wdGlvbnMgPSBbXTsgLy8g6L+Z6YeM5Y+v5Lul5qC55o2u5a6e6ZmF5oOF5Ya16K6+572u6YCJ6aG5XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnY29vcmRpbmF0ZScpIHx8IGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdsb2NhdGlvbicpKSB7XHJcbiAgICB0eXBlID0gJ2dlbyc7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnc2VyaWVzJykpIHtcclxuICAgIHR5cGUgPSAndGltZXNlcmllcyc7XHJcbiAgfSBlbHNlIGlmIChzYW1wbGVEYXRhLnN0YXJ0c1dpdGgoJ1snKSAmJiBzYW1wbGVEYXRhLmVuZHNXaXRoKCddJykpIHtcclxuICAgIGlmIChzYW1wbGVEYXRhLmluY2x1ZGVzKCdbJykpIHtcclxuICAgICAgdHlwZSA9ICdtYXRyaXgnO1xyXG4gICAgICBkaW1lbnNpb25zID0gMjsgLy8g5YGH6K6+5pivMkTnn6npmLVcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHR5cGUgPSAndmVjdG9yJztcclxuICAgICAgZGltZW5zaW9ucyA9IHNhbXBsZURhdGEuc3BsaXQoJywnKS5sZW5ndGg7XHJcbiAgICB9XHJcbiAgfSBlbHNlIGlmIChzYW1wbGVEYXRhLnN0YXJ0c1dpdGgoJ3snKSAmJiBzYW1wbGVEYXRhLmVuZHNXaXRoKCd9JykpIHtcclxuICAgIGlmIChzYW1wbGVEYXRhLmluY2x1ZGVzKCdyZWFsJykgJiYgc2FtcGxlRGF0YS5pbmNsdWRlcygnaW1hZycpKSB7XHJcbiAgICAgIHR5cGUgPSAnY29tcGxleCc7XHJcbiAgICB9IGVsc2UgaWYgKHNhbXBsZURhdGEuaW5jbHVkZXMoJ3ZhbHVlJykgJiYgc2FtcGxlRGF0YS5pbmNsdWRlcygndW5jZXJ0YWludHknKSkge1xyXG4gICAgICB0eXBlID0gJ3VuY2VydGFpbnR5JztcclxuICAgIH0gZWxzZSBpZiAoc2FtcGxlRGF0YS5pbmNsdWRlcygncicpICYmIHNhbXBsZURhdGEuaW5jbHVkZXMoJ2cnKSAmJiBzYW1wbGVEYXRhLmluY2x1ZGVzKCdiJykpIHtcclxuICAgICAgdHlwZSA9ICdjb2xvcic7XHJcbiAgICAgIGNvbG9yTW9kZWwgPSAnUkdCJztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHR5cGUgPSAnb2JqZWN0JztcclxuICAgIH1cclxuICB9IGVsc2UgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdmb3JtdWxhJykgfHwgbG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ2VxdWF0aW9uJykpIHtcclxuICAgIHR5cGUgPSAnZm9ybXVsYSc7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnZGlzdHJpYnV0aW9uJykpIHtcclxuICAgIHR5cGUgPSAnZGlzdHJpYnV0aW9uJztcclxuICB9IGVsc2UgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdzcGVjdHJ1bScpKSB7XHJcbiAgICB0eXBlID0gJ3NwZWN0cnVtJztcclxuICB9IGVsc2UgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdoaXN0b2dyYW0nKSkge1xyXG4gICAgdHlwZSA9ICdoaXN0b2dyYW0nO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ3RlbnNvcicpKSB7XHJcbiAgICB0eXBlID0gJ3RlbnNvcic7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnd2F2ZWZvcm0nKSkge1xyXG4gICAgdHlwZSA9ICd3YXZlZm9ybSc7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnZ3JhcGgnKSkge1xyXG4gICAgdHlwZSA9ICdncmFwaCc7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnbW9sZWN1bGUnKSkge1xyXG4gICAgdHlwZSA9ICdtb2xlY3VsZSc7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnc2VxdWVuY2UnKSkge1xyXG4gICAgdHlwZSA9ICdzZXF1ZW5jZSc7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnaW1hZ2UnKSkge1xyXG4gICAgdHlwZSA9ICdpbWFnZSc7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnZnVuY3Rpb24nKSkge1xyXG4gICAgdHlwZSA9ICdmdW5jdGlvbic7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnaW50ZXJ2YWwnKSkge1xyXG4gICAgdHlwZSA9ICdpbnRlcnZhbCc7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnZnV6enknKSkge1xyXG4gICAgdHlwZSA9ICdmdXp6eSc7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygncXVhdGVybmlvbicpKSB7XHJcbiAgICB0eXBlID0gJ3F1YXRlcm5pb24nO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ3BvbHlnb24nKSkge1xyXG4gICAgdHlwZSA9ICdwb2x5Z29uJztcclxuICB9IGVsc2UgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCd0aW1lZGVsdGEnKSkge1xyXG4gICAgdHlwZSA9ICd0aW1lZGVsdGEnO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ2N1cnJlbmN5JykpIHtcclxuICAgIHR5cGUgPSAnY3VycmVuY3knO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ3JlZ2V4JykpIHtcclxuICAgIHR5cGUgPSAncmVnZXgnO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ3VybCcpKSB7XHJcbiAgICB0eXBlID0gJ3VybCc7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnaXAnKSkge1xyXG4gICAgdHlwZSA9ICdpcGFkZHJlc3MnO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ3V1aWQnKSkge1xyXG4gICAgdHlwZSA9ICd1dWlkJztcclxuICB9IGVsc2UgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCd2ZXJzaW9uJykpIHtcclxuICAgIHR5cGUgPSAndmVyc2lvbic7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnYml0ZmllbGQnKSkge1xyXG4gICAgdHlwZSA9ICdiaXRmaWVsZCc7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnZW51bScpKSB7XHJcbiAgICB0eXBlID0gJ2VudW0nO1xyXG4gICAgb3B0aW9ucyA9IFtdOyAvLyDov5nph4zlj6/ku6XmoLnmja7lrp7pmYXmg4XlhrXorr7nva7pgInpoblcclxuICB9IGVsc2UgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdhdWRpbycpIHx8IGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdzaWduYWwnKSkge1xyXG4gICAgdHlwZSA9ICdhdWRpb19zaWduYWwnO1xyXG4gICAgc2FtcGxlUmF0ZSA9IDQ0MTAwOyAvLyDpu5jorqTph4fmoLfnjodcclxuICB9IGVsc2UgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdmcmVxdWVuY3lfcmVzcG9uc2UnKSkge1xyXG4gICAgdHlwZSA9ICdmcmVxdWVuY3lfcmVzcG9uc2UnO1xyXG4gICAgZnJlcXVlbmN5UmFuZ2UgPSBbMjAsIDIwMDAwXTsgLy8g6buY6K6k5Lq66ICz5Y+v5ZCs6IyD5Zu0XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnaW1wdWxzZV9yZXNwb25zZScpKSB7XHJcbiAgICB0eXBlID0gJ2ltcHVsc2VfcmVzcG9uc2UnO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ3RyYW5zZmVyX2Z1bmN0aW9uJykpIHtcclxuICAgIHR5cGUgPSAndHJhbnNmZXJfZnVuY3Rpb24nO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ3NwZWN0cm9ncmFtJykpIHtcclxuICAgIHR5cGUgPSAnc3BlY3Ryb2dyYW0nO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ2ltcGVkYW5jZScpKSB7XHJcbiAgICB0eXBlID0gJ2Fjb3VzdGljX2ltcGVkYW5jZSc7XHJcbiAgICB1bml0ID0gJ1BhwrdzL20nO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ3JldmVyYmVyYXRpb24nKSkge1xyXG4gICAgdHlwZSA9ICdyZXZlcmJlcmF0aW9uX3RpbWUnO1xyXG4gICAgdW5pdCA9ICdzJztcclxuICB9IGVsc2UgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdub2lzZScpKSB7XHJcbiAgICB0eXBlID0gJ25vaXNlX2xldmVsJztcclxuICAgIHVuaXQgPSAnZEInO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ3NwbCcpIHx8IGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdzb3VuZF9wcmVzc3VyZScpKSB7XHJcbiAgICB0eXBlID0gJ3NvdW5kX3ByZXNzdXJlX2xldmVsJztcclxuICAgIHVuaXQgPSAnZEInO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ2RpcmVjdGl2aXR5JykpIHtcclxuICAgIHR5cGUgPSAnZGlyZWN0aXZpdHlfcGF0dGVybic7XHJcbiAgfVxyXG5cclxuICBjb25zdCBmaWVsZDogRGF0YWJhc2VGaWVsZCA9IHsgbmFtZTogZmllbGROYW1lLCB0eXBlIH07XHJcbiAgaWYgKHVuaXQpIGZpZWxkLnVuaXQgPSB1bml0O1xyXG4gIGlmIChzYW1wbGVSYXRlKSBmaWVsZC5zYW1wbGVSYXRlID0gc2FtcGxlUmF0ZTtcclxuICBpZiAoZnJlcXVlbmN5UmFuZ2UpIGZpZWxkLmZyZXF1ZW5jeVJhbmdlID0gZnJlcXVlbmN5UmFuZ2U7XHJcbiAgaWYgKHByZWNpc2lvbikgZmllbGQucHJlY2lzaW9uID0gcHJlY2lzaW9uO1xyXG4gIGlmIChvcHRpb25zKSBmaWVsZC5vcHRpb25zID0gb3B0aW9ucztcclxuICBpZiAoZm9ybWF0KSBmaWVsZC5mb3JtYXQgPSBmb3JtYXQ7XHJcbiAgaWYgKGRpbWVuc2lvbnMpIGZpZWxkLmRpbWVuc2lvbnMgPSBkaW1lbnNpb25zO1xyXG4gIGlmIChjb2xvck1vZGVsKSBmaWVsZC5jb2xvck1vZGVsID0gY29sb3JNb2RlbDtcclxuXHJcbiAgcmV0dXJuIGZpZWxkO1xyXG59XHJcbiIsImltcG9ydCB7IFBsdWdpbiwgTm90aWNlLCBURmlsZSwgTWFya2Rvd25WaWV3LCBFdmVudHMsIEFwcCwgUGx1Z2luTWFuaWZlc3QsIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcsIEJ1dHRvbkNvbXBvbmVudCB9IGZyb20gJ29ic2lkaWFuJztcclxuaW1wb3J0IHsgRGF0YWJhc2VWaWV3LCBEQVRBQkFTRV9WSUVXX1RZUEUgfSBmcm9tICcuL0RhdGFiYXNlVmlldyc7XHJcbmltcG9ydCB7IHBhcnNlRGF0YWJhc2UgfSBmcm9tICcuL2RhdGFiYXNlUGFyc2VyJztcclxuaW1wb3J0IHsgZGVidWcsIGluZm8sIHdhcm4sIGVycm9yIH0gZnJvbSAnLi91dGlscy9sb2dnZXInO1xyXG5pbXBvcnQgJy4uL3N0eWxlcy5jc3MnO1xyXG5pbXBvcnQgeyBEYXRhYmFzZVBsdWdpblNldHRpbmdzLCBTaW1wbGVEYXRhYmFzZVBsdWdpbiwgRGF0YWJhc2VUYWJsZSwgRGF0YWJhc2VGaWVsZCwgRGF0YWJhc2VWaWV3SW50ZXJmYWNlIH0gZnJvbSAnLi90eXBlcyc7XHJcblxyXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBEYXRhYmFzZVBsdWdpblNldHRpbmdzID0ge1xyXG4gIGRlZmF1bHRTb3J0RGlyZWN0aW9uOiAnYXNjJ1xyXG59O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRGF0YWJhc2VQbHVnaW4gZXh0ZW5kcyBQbHVnaW4gaW1wbGVtZW50cyBTaW1wbGVEYXRhYmFzZVBsdWdpbiB7XHJcbiAgcHJpdmF0ZSBkYXRhYmFzZVZpZXc6IERhdGFiYXNlVmlld0ludGVyZmFjZSB8IG51bGwgPSBudWxsO1xyXG4gIHNldHRpbmdzOiBEYXRhYmFzZVBsdWdpblNldHRpbmdzID0gREVGQVVMVF9TRVRUSU5HUztcclxuICBwcml2YXRlIGRhdGFVcGRhdGVDYWxsYmFja3M6ICgodXBkYXRlZFRhYmxlczogc3RyaW5nW10pID0+IHZvaWQpW10gPSBbXTtcclxuXHJcbiAgYXN5bmMgb25sb2FkKCkge1xyXG4gICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcclxuICAgIGluZm8oJ+WKoOi9veaVsOaNruW6k+aPkuS7ticpO1xyXG5cclxuICAgIHRoaXMucmVnaXN0ZXJWaWV3KFxyXG4gICAgICBEQVRBQkFTRV9WSUVXX1RZUEUsXHJcbiAgICAgIChsZWFmKSA9PiBuZXcgRGF0YWJhc2VWaWV3KGxlYWYsIHRoaXMpXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XHJcbiAgICAgIGlkOiAncGFyc2UtY3VycmVudC1maWxlJyxcclxuICAgICAgbmFtZTogJ+ino+aekOW9k+WJjeaWh+S7tuS4reeahOaVsOaNruW6kycsXHJcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLnBhcnNlQW5kVXBkYXRlVmlldygpXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQoXHJcbiAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbignZmlsZS1vcGVuJywgKGZpbGUpID0+IHtcclxuICAgICAgICBpZiAoZmlsZSAmJiBmaWxlLmV4dGVuc2lvbiA9PT0gJ21kJykge1xyXG4gICAgICAgICAgdGhpcy5wYXJzZUFuZFVwZGF0ZVZpZXcoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMucmVnaXN0ZXJFdmVudChcclxuICAgICAgdGhpcy5hcHAudmF1bHQub24oJ21vZGlmeScsIChmaWxlKSA9PiB7XHJcbiAgICAgICAgaWYgKGZpbGUgaW5zdGFuY2VvZiBURmlsZSAmJiBmaWxlLmV4dGVuc2lvbiA9PT0gJ21kJykge1xyXG4gICAgICAgICAgdGhpcy5wYXJzZUFuZFVwZGF0ZVZpZXcoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuYWRkUmliYm9uSWNvbignZGF0YWJhc2UnLCAn5omT5byA5pWw5o2u5bqT6KeG5Zu+JywgKCkgPT4ge1xyXG4gICAgICB0aGlzLmFjdGl2YXRlVmlldygpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgaWQ6ICdvcGVuLWRhdGFiYXNlLXZpZXcnLFxyXG4gICAgICBuYW1lOiAn5omT5byA5pWw5o2u5bqT6KeG5Zu+JyxcclxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuYWN0aXZhdGVWaWV3KClcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgRGF0YWJhc2VQbHVnaW5TZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XHJcblxyXG4gICAgLy8g5pq06Zyy5o6l5Y+j57uZ5YW25LuW5o+S5Lu2XHJcbiAgICAodGhpcy5hcHAgYXMgYW55KS5wbHVnaW5zLnNpbXBsZV9kYXRhYmFzZSA9IHRoaXM7XHJcbiAgfVxyXG5cclxuICBhc3luYyBsb2FkU2V0dGluZ3MoKSB7XHJcbiAgICBjb25zdCBsb2FkZWREYXRhID0gYXdhaXQgdGhpcy5sb2FkRGF0YSgpO1xyXG4gICAgY29uc3QgcGFyc2VkRGF0YSA9IGxvYWRlZERhdGEgPyBKU09OLnBhcnNlKGxvYWRlZERhdGEpIDoge307XHJcbiAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9TRVRUSU5HUywgcGFyc2VkRGF0YSk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBwYXJzZUFuZFVwZGF0ZVZpZXcoKSB7XHJcbiAgICBjb25zdCBhY3RpdmVWaWV3ID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZVZpZXdPZlR5cGUoTWFya2Rvd25WaWV3KTtcclxuICAgIGlmIChhY3RpdmVWaWV3KSB7XHJcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBhY3RpdmVWaWV3LmdldFZpZXdEYXRhKCk7XHJcbiAgICAgIGRlYnVnKGDojrflj5bliLDnmoTmlofku7blhoXlrrk6ICR7Y29udGVudH1gKTtcclxuICAgICAgY29uc3QgdGFibGVzID0gcGFyc2VEYXRhYmFzZShjb250ZW50KTtcclxuICAgICAgZGVidWcoYOino+aekOWQjueahOihqOagvOaVsOaNrjogJHtKU09OLnN0cmluZ2lmeSh0YWJsZXMpfWApO1xyXG5cclxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodGFibGVzKSAmJiB0YWJsZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGF3YWl0IHRoaXMuYWN0aXZhdGVWaWV3KCk7XHJcbiAgICAgICAgaWYgKHRoaXMuZGF0YWJhc2VWaWV3KSB7XHJcbiAgICAgICAgICBpbmZvKCfmm7TmlrDmlbDmja7lupPop4blm74nKTtcclxuICAgICAgICAgIHRoaXMuZGF0YWJhc2VWaWV3LnNldFRhYmxlcyh0YWJsZXMpO1xyXG4gICAgICAgICAgbmV3IE5vdGljZSgn5pWw5o2u5bqT6KeG5Zu+5bey5pu05pawJyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGVycm9yKCfml6Dms5XliJvlu7rmiJbojrflj5bmlbDmja7lupPop4blm74nKTtcclxuICAgICAgICAgIG5ldyBOb3RpY2UoJ+abtOaWsOaVsOaNruW6k+inhuWbvuWksei0pScpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBlcnJvcihg6Kej5p6Q57uT5p6c5peg5pWIOiAke0pTT04uc3RyaW5naWZ5KHRhYmxlcyl9YCk7XHJcbiAgICAgICAgbmV3IE5vdGljZSgn6Kej5p6Q5pWw5o2u5bqT5aSx6LSl77yM6K+35qOA5p+l5paH5Lu25qC85byPJyk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIG5ldyBOb3RpY2UoJ+ivt+aJk+W8gOS4gOS4qiBNYXJrZG93biDmlofku7YnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIGFjdGl2YXRlVmlldygpIHtcclxuICAgIGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmFwcDtcclxuICAgIGxldCBsZWFmID0gd29ya3NwYWNlLmdldExlYXZlc09mVHlwZShEQVRBQkFTRV9WSUVXX1RZUEUpWzBdO1xyXG4gICAgaWYgKCFsZWFmKSB7XHJcbiAgICAgIGxlYWYgPSB3b3Jrc3BhY2UuZ2V0UmlnaHRMZWFmKGZhbHNlKTtcclxuICAgICAgYXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBEQVRBQkFTRV9WSUVXX1RZUEUsIGFjdGl2ZTogdHJ1ZSB9KTtcclxuICAgIH1cclxuICAgIHdvcmtzcGFjZS5yZXZlYWxMZWFmKGxlYWYpO1xyXG4gICAgXHJcbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwKSk7XHJcbiAgICBcclxuICAgIHRoaXMuZGF0YWJhc2VWaWV3ID0gbGVhZi52aWV3IGFzIERhdGFiYXNlVmlld0ludGVyZmFjZTtcclxuICAgIGluZm8oYOaVsOaNruW6k+inhuWbvuW3sua/gOa0uzogJHt0aGlzLmRhdGFiYXNlVmlldyA/ICdzdWNjZXNzJyA6ICdmYWlsJ31gKTtcclxuICAgIFxyXG4gICAgaWYgKCF0aGlzLmRhdGFiYXNlVmlldykge1xyXG4gICAgICBlcnJvcign5r+A5rS75pWw5o2u5bqT6KeG5Zu+5aSx6LSlJyk7XHJcbiAgICAgIG5ldyBOb3RpY2UoJ+aXoOazleWIm+W7uuaVsOaNruW6k+inhuWbvicpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgb251bmxvYWQoKSB7XHJcbiAgICBpbmZvKCfljbjovb3mlbDmja7lupPmj5Lku7YnKTtcclxuXHJcbiAgICAvLyDnp7vpmaTmmrTpnLLnmoTmjqXlj6NcclxuICAgIGRlbGV0ZSAodGhpcy5hcHAgYXMgYW55KS5wbHVnaW5zLnNpbXBsZV9kYXRhYmFzZTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHNhdmVEYXRhKCkge1xyXG4gICAgYXdhaXQgdGhpcy5zYXZlU2V0dGluZ3MoKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHNhdmVTZXR0aW5ncygpIHtcclxuICAgIGF3YWl0ICh0aGlzLnNhdmVEYXRhIGFzIChkYXRhOiBhbnkpID0+IFByb21pc2U8dm9pZD4pKEpTT04uc3RyaW5naWZ5KHRoaXMuc2V0dGluZ3MpKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBnZXREYXRhYmFzZURhdGEoKTogRGF0YWJhc2VUYWJsZVtdIHwgbnVsbCB7XHJcbiAgICBpZiAodGhpcy5kYXRhYmFzZVZpZXcpIHtcclxuICAgICAgcmV0dXJuIHRoaXMuZGF0YWJhc2VWaWV3LmdldFRhYmxlcygpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgcXVlcnlEYXRhKHRhYmxlTmFtZTogc3RyaW5nLCBjb25kaXRpb25zOiBvYmplY3QpOiBhbnlbXVtdIHwgbnVsbCB7XHJcbiAgICBjb25zdCB0YWJsZXMgPSB0aGlzLmdldERhdGFiYXNlRGF0YSgpO1xyXG4gICAgaWYgKCF0YWJsZXMpIHJldHVybiBudWxsO1xyXG5cclxuICAgIGNvbnN0IHRhYmxlID0gdGFibGVzLmZpbmQodCA9PiB0Lm5hbWUgPT09IHRhYmxlTmFtZSk7XHJcbiAgICBpZiAoIXRhYmxlKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICByZXR1cm4gdGFibGUuZGF0YS5maWx0ZXIocm93ID0+IHtcclxuICAgICAgcmV0dXJuIE9iamVjdC5lbnRyaWVzKGNvbmRpdGlvbnMpLmV2ZXJ5KChba2V5LCB2YWx1ZV0pID0+IHtcclxuICAgICAgICBjb25zdCBpbmRleCA9IHRhYmxlLmZpZWxkcy5maW5kSW5kZXgoZiA9PiBmLm5hbWUgPT09IGtleSk7XHJcbiAgICAgICAgcmV0dXJuIHJvd1tpbmRleF0gPT09IHZhbHVlO1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGdldFRhYmxlU2NoZW1hKHRhYmxlTmFtZTogc3RyaW5nKTogRGF0YWJhc2VGaWVsZFtdIHwgbnVsbCB7XHJcbiAgICBjb25zdCB0YWJsZXMgPSB0aGlzLmdldERhdGFiYXNlRGF0YSgpO1xyXG4gICAgaWYgKCF0YWJsZXMpIHJldHVybiBudWxsO1xyXG5cclxuICAgIGNvbnN0IHRhYmxlID0gdGFibGVzLmZpbmQodCA9PiB0Lm5hbWUgPT09IHRhYmxlTmFtZSk7XHJcbiAgICByZXR1cm4gdGFibGUgPyB0YWJsZS5maWVsZHMgOiBudWxsO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIG9uRGF0YVVwZGF0ZShjYWxsYmFjazogKHVwZGF0ZWRUYWJsZXM6IHN0cmluZ1tdKSA9PiB2b2lkKTogdm9pZCB7XHJcbiAgICB0aGlzLmRhdGFVcGRhdGVDYWxsYmFja3MucHVzaChjYWxsYmFjayk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZ2V0Q29sdW1uU3RhdHModGFibGVOYW1lOiBzdHJpbmcsIGNvbHVtbk5hbWU6IHN0cmluZyk6IHsgbWluOiBudW1iZXI7IG1heDogbnVtYmVyOyBhdmVyYWdlOiBudW1iZXI7IG1lZGlhbjogbnVtYmVyOyB9IHwgbnVsbCB7XHJcbiAgICBjb25zdCB0YWJsZXMgPSB0aGlzLmdldERhdGFiYXNlRGF0YSgpO1xyXG4gICAgaWYgKCF0YWJsZXMpIHJldHVybiBudWxsO1xyXG5cclxuICAgIGNvbnN0IHRhYmxlID0gdGFibGVzLmZpbmQodCA9PiB0Lm5hbWUgPT09IHRhYmxlTmFtZSk7XHJcbiAgICBpZiAoIXRhYmxlKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICBjb25zdCBjb2x1bW5JbmRleCA9IHRhYmxlLmZpZWxkcy5maW5kSW5kZXgoZiA9PiBmLm5hbWUgPT09IGNvbHVtbk5hbWUpO1xyXG4gICAgaWYgKGNvbHVtbkluZGV4ID09PSAtMSkgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgY29uc3QgY29sdW1uRGF0YSA9IHRhYmxlLmRhdGEubWFwKHJvdyA9PiBwYXJzZUZsb2F0KHJvd1tjb2x1bW5JbmRleF0pKS5maWx0ZXIodmFsdWUgPT4gIWlzTmFOKHZhbHVlKSk7XHJcbiAgICBpZiAoY29sdW1uRGF0YS5sZW5ndGggPT09IDApIHJldHVybiBudWxsO1xyXG5cclxuICAgIGNvbHVtbkRhdGEuc29ydCgoYSwgYikgPT4gYSAtIGIpO1xyXG4gICAgY29uc3QgbWluID0gY29sdW1uRGF0YVswXTtcclxuICAgIGNvbnN0IG1heCA9IGNvbHVtbkRhdGFbY29sdW1uRGF0YS5sZW5ndGggLSAxXTtcclxuICAgIGNvbnN0IHN1bSA9IGNvbHVtbkRhdGEucmVkdWNlKChhLCBiKSA9PiBhICsgYiwgMCk7XHJcbiAgICBjb25zdCBhdmVyYWdlID0gc3VtIC8gY29sdW1uRGF0YS5sZW5ndGg7XHJcbiAgICBjb25zdCBtZWRpYW4gPSBjb2x1bW5EYXRhLmxlbmd0aCAlIDIgPT09IDBcclxuICAgICAgPyAoY29sdW1uRGF0YVtjb2x1bW5EYXRhLmxlbmd0aCAvIDIgLSAxXSArIGNvbHVtbkRhdGFbY29sdW1uRGF0YS5sZW5ndGggLyAyXSkgLyAyXHJcbiAgICAgIDogY29sdW1uRGF0YVtNYXRoLmZsb29yKGNvbHVtbkRhdGEubGVuZ3RoIC8gMildO1xyXG5cclxuICAgIHJldHVybiB7IG1pbiwgbWF4LCBhdmVyYWdlLCBtZWRpYW4gfTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBnZXREYXRhUmFuZ2UodGFibGVOYW1lOiBzdHJpbmcsIGNvbHVtbk5hbWU6IHN0cmluZywgc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIpOiBhbnlbXSB8IG51bGwge1xyXG4gICAgY29uc3QgdGFibGVzID0gdGhpcy5nZXREYXRhYmFzZURhdGEoKTtcclxuICAgIGlmICghdGFibGVzKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICBjb25zdCB0YWJsZSA9IHRhYmxlcy5maW5kKHQgPT4gdC5uYW1lID09PSB0YWJsZU5hbWUpO1xyXG4gICAgaWYgKCF0YWJsZSkgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgY29uc3QgY29sdW1uSW5kZXggPSB0YWJsZS5maWVsZHMuZmluZEluZGV4KGYgPT4gZi5uYW1lID09PSBjb2x1bW5OYW1lKTtcclxuICAgIGlmIChjb2x1bW5JbmRleCA9PT0gLTEpIHJldHVybiBudWxsO1xyXG5cclxuICAgIHJldHVybiB0YWJsZS5kYXRhLnNsaWNlKHN0YXJ0LCBlbmQgKyAxKS5tYXAocm93ID0+IHJvd1tjb2x1bW5JbmRleF0pO1xyXG4gIH1cclxuXHJcbiAgLy8g5re75Yqg5LiA5Liq5pa55rOV5p2l6Kem5Y+R5pWw5o2u5pu05paw5Zue6LCDXHJcbiAgcHJpdmF0ZSB0cmlnZ2VyRGF0YVVwZGF0ZSh1cGRhdGVkVGFibGVzOiBzdHJpbmdbXSk6IHZvaWQge1xyXG4gICAgdGhpcy5kYXRhVXBkYXRlQ2FsbGJhY2tzLmZvckVhY2goY2FsbGJhY2sgPT4gY2FsbGJhY2sodXBkYXRlZFRhYmxlcykpO1xyXG4gIH1cclxuXHJcbiAgLy8g5Zyo5pWw5o2u5pu05paw5pe26LCD55So5q2k5pa55rOVXHJcbiAgcHJpdmF0ZSB1cGRhdGVEYXRhKHVwZGF0ZWRUYWJsZXM6IHN0cmluZ1tdKTogdm9pZCB7XHJcbiAgICAvLyDmm7TmlrDmlbDmja7nmoTpgLvovpFcclxuICAgIC8vIC4uLlxyXG5cclxuICAgIC8vIOinpuWPkeaVsOaNruabtOaWsOWbnuiwg1xyXG4gICAgdGhpcy50cmlnZ2VyRGF0YVVwZGF0ZSh1cGRhdGVkVGFibGVzKTtcclxuICB9XHJcbn1cclxuXHJcbmNsYXNzIERhdGFiYXNlUGx1Z2luU2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xyXG4gIHBsdWdpbjogRGF0YWJhc2VQbHVnaW47XHJcblxyXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IERhdGFiYXNlUGx1Z2luKSB7XHJcbiAgICBzdXBlcihhcHAsIHBsdWdpbik7XHJcbiAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuICB9XHJcblxyXG4gIGRpc3BsYXkoKTogdm9pZCB7XHJcbiAgICBsZXQge2NvbnRhaW5lckVsfSA9IHRoaXM7XHJcbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xyXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gyJywge3RleHQ6ICfmlbDmja7lupPmj5Lku7borr7nva4nfSk7XHJcblxyXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgIC5zZXROYW1lKCfpu5jorqTmjpLluo/mlrnlkJEnKVxyXG4gICAgICAuc2V0RGVzYygn6K6+572u6KGo5qC855qE6buY6K6k5o6S5bqP5pa55ZCRJylcclxuICAgICAgLmFkZERyb3Bkb3duKGRyb3Bkb3duID0+IGRyb3Bkb3duXHJcbiAgICAgICAgLmFkZE9wdGlvbignYXNjJywgJ+WNh+W6jycpXHJcbiAgICAgICAgLmFkZE9wdGlvbignZGVzYycsICfpmY3luo8nKVxyXG4gICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0U29ydERpcmVjdGlvbilcclxuICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0U29ydERpcmVjdGlvbiA9IHZhbHVlIGFzICdhc2MnIHwgJ2Rlc2MnO1xyXG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgfSkpO1xyXG4gIH1cclxufVxyXG4iXSwibmFtZXMiOlsiSXRlbVZpZXciLCJEcm9wZG93bkNvbXBvbmVudCIsIkJ1dHRvbkNvbXBvbmVudCIsIlRleHRDb21wb25lbnQiLCJOb3RpY2UiLCJNYXJrZG93blZpZXciLCJNb2RhbCIsIlNldHRpbmciLCJQbHVnaW4iLCJURmlsZSIsIlBsdWdpblNldHRpbmdUYWIiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBb0dBO0FBQ08sU0FBUyxTQUFTLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFO0FBQzdELElBQUksU0FBUyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsT0FBTyxLQUFLLFlBQVksQ0FBQyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxVQUFVLE9BQU8sRUFBRSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO0FBQ2hILElBQUksT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsT0FBTyxDQUFDLEVBQUUsVUFBVSxPQUFPLEVBQUUsTUFBTSxFQUFFO0FBQy9ELFFBQVEsU0FBUyxTQUFTLENBQUMsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtBQUNuRyxRQUFRLFNBQVMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtBQUN0RyxRQUFRLFNBQVMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUMsRUFBRTtBQUN0SCxRQUFRLElBQUksQ0FBQyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxVQUFVLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUM5RSxLQUFLLENBQUMsQ0FBQztBQUNQLENBQUM7QUFvTUQ7QUFDdUIsT0FBTyxlQUFlLEtBQUssVUFBVSxHQUFHLGVBQWUsR0FBRyxVQUFVLEtBQUssRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFO0FBQ3ZILElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsSUFBSSxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLEtBQUssR0FBRyxLQUFLLEVBQUUsQ0FBQyxDQUFDLFVBQVUsR0FBRyxVQUFVLEVBQUUsQ0FBQyxDQUFDO0FBQ3JGOztBQ2xVQSxJQUFLLFFBS0osQ0FBQTtBQUxELENBQUEsVUFBSyxRQUFRLEVBQUE7QUFDWCxJQUFBLFFBQUEsQ0FBQSxRQUFBLENBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsT0FBUyxDQUFBO0FBQ1QsSUFBQSxRQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLE1BQVEsQ0FBQTtBQUNSLElBQUEsUUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxNQUFRLENBQUE7QUFDUixJQUFBLFFBQUEsQ0FBQSxRQUFBLENBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsT0FBUyxDQUFBO0FBQ1gsQ0FBQyxFQUxJLFFBQVEsS0FBUixRQUFRLEdBS1osRUFBQSxDQUFBLENBQUEsQ0FBQTtBQUVELElBQUksZUFBZSxHQUFhLFFBQVEsQ0FBQyxJQUFJLENBQUM7QUFFOUMsU0FBUyxXQUFXLENBQUMsS0FBZSxFQUFBO0lBQ2xDLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDM0MsZUFBZSxHQUFHLEtBQUssQ0FBQztBQUN6QixLQUFBO0FBQU0sU0FBQTtBQUNMLFFBQUEsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUMxQixLQUFBO0FBQ0gsQ0FBQztBQUVELFNBQVMsR0FBRyxDQUFDLEtBQWUsRUFBRSxPQUFlLEVBQUE7SUFDM0MsSUFBSSxLQUFLLElBQUksZUFBZSxFQUFFO1FBQzVCLE1BQU0sU0FBUyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDM0MsUUFBQSxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFJLENBQUEsRUFBQSxTQUFTLENBQU0sR0FBQSxFQUFBLFNBQVMsQ0FBSyxFQUFBLEVBQUEsT0FBTyxDQUFFLENBQUEsQ0FBQyxDQUFDO0FBQ3pELEtBQUE7QUFDSCxDQUFDO0FBRUQsU0FBUyxLQUFLLENBQUMsT0FBZSxFQUFBO0FBQzVCLElBQUEsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDL0IsQ0FBQztBQUVELFNBQVMsSUFBSSxDQUFDLE9BQWUsRUFBQTtBQUMzQixJQUFBLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQzlCLENBQUM7QUFFRCxTQUFTLElBQUksQ0FBQyxPQUFlLEVBQUE7QUFDM0IsSUFBQSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztBQUM5QixDQUFDO0FBRUQsU0FBUyxLQUFLLENBQUMsT0FBZSxFQUFBO0FBQzVCLElBQUEsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDL0IsQ0FBQztBQVdELFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDOztBQzlDcEIsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQUM7QUFFNUMsTUFBTyxZQUFhLFNBQVFBLGlCQUFRLENBQUE7SUFXeEMsV0FBWSxDQUFBLElBQW1CLEVBQUUsTUFBK0IsRUFBQTtRQUM5RCxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFYTixJQUFNLENBQUEsTUFBQSxHQUFvQixFQUFFLENBQUM7UUFDN0IsSUFBVyxDQUFBLFdBQUEsR0FBaUIsRUFBRSxDQUFDO0FBQy9CLFFBQUEsSUFBQSxDQUFBLFVBQVUsR0FBa0MsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUN0RCxRQUFBLElBQUEsQ0FBQSxhQUFhLEdBQW9DLElBQUksR0FBRyxFQUFFLENBQUM7QUFLM0QsUUFBQSxJQUFBLENBQUEsY0FBYyxHQUFnQixJQUFJLEdBQUcsRUFBRSxDQUFDO0FBSTlDLFFBQUEsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7QUFDckIsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztLQUNsQjtJQUVELFdBQVcsR0FBQTtBQUNULFFBQUEsT0FBTyxrQkFBa0IsQ0FBQztLQUMzQjtJQUVELGNBQWMsR0FBQTtBQUNaLFFBQUEsT0FBTyxPQUFPLENBQUM7S0FDaEI7SUFFSyxNQUFNLEdBQUE7O1lBQ1YsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0MsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ2xCLFlBQUEsU0FBUyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBRTlDLFlBQUEsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxHQUFHLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO1lBRTNFLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUVqQixZQUFBLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSUMsMEJBQWlCLENBQUMsTUFBTSxDQUFDO0FBQ2hELGlCQUFBLFNBQVMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDO0FBQ3ZCLGlCQUFBLFNBQVMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDO2lCQUN6QixRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFbkIsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBRW5CLFlBQUEsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJQyx3QkFBZSxDQUFDLE1BQU0sQ0FBQztpQkFDNUMsYUFBYSxDQUFDLElBQUksQ0FBQztpQkFDbkIsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUM7QUFFekMsWUFBQSxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUlBLHdCQUFlLENBQUMsTUFBTSxDQUFDO2lCQUM1QyxhQUFhLENBQUMsSUFBSSxDQUFDO2lCQUNuQixPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztZQUVwQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7O1lBR3BCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDOztZQUcvQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFFcEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUdmLFlBQUEsS0FBSyxDQUFDLENBQVksU0FBQSxFQUFBLENBQUMsQ0FBQyxNQUFNLENBQUEsQ0FBRSxDQUFDLENBQUM7QUFDOUIsWUFBQSxLQUFLLENBQUMsQ0FBWSxTQUFBLEVBQUEsTUFBTSxDQUFDLFNBQVMsQ0FBQSxDQUFFLENBQUMsQ0FBQztZQUN0QyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBRSxDQUFBLENBQUMsQ0FBQztZQUM3QyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBRSxDQUFBLENBQUMsQ0FBQztZQUMxQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBRSxDQUFBLENBQUMsQ0FBQztBQUMxQyxZQUFBLElBQUksSUFBSSxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFO2dCQUMxQyxLQUFLLENBQUMsQ0FBYSxVQUFBLEVBQUEsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFFLENBQUEsQ0FBQyxDQUFDO2dCQUMzRCxLQUFLLENBQUMsQ0FBYSxVQUFBLEVBQUEsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFFLENBQUEsQ0FBQyxDQUFDO0FBQzVELGFBQUE7WUFFRCxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQzs7QUFHN0IsWUFBQSxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztTQUNwQyxDQUFBLENBQUE7QUFBQSxLQUFBO0lBRUssT0FBTyxHQUFBOzs7U0FFWixDQUFBLENBQUE7QUFBQSxLQUFBO0FBRU0sSUFBQSxTQUFTLENBQUMsTUFBdUIsRUFBQTtBQUN0QyxRQUFBLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0FBQ3JCLFFBQUEsSUFBSSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssTUFBTTtZQUMvQyxLQUFLO0FBQ0wsWUFBQSxFQUFFLEVBQUUsS0FBSztBQUNULFlBQUEsVUFBVSxFQUFFLEVBQUU7QUFDZixTQUFBLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3BCLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDOztBQUc3QixRQUFBLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxDQUFDO0tBQ3BDO0lBRU0sU0FBUyxHQUFBO1FBQ2QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0tBQ3BCO0lBRU8sWUFBWSxHQUFBO1FBQ2xCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9DLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNsQixRQUFBLFNBQVMsQ0FBQyxRQUFRLENBQUMseUJBQXlCLENBQUMsQ0FBQzs7QUFHOUMsUUFBQSxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLEdBQUcsRUFBRSx1QkFBdUIsRUFBRSxDQUFDLENBQUM7UUFDM0UsSUFBSSxJQUFJLENBQUMsY0FBYztZQUFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxRSxJQUFJLElBQUksQ0FBQyxZQUFZO1lBQUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3RFLElBQUksSUFBSSxDQUFDLFlBQVk7WUFBRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFdEUsUUFBQSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUc7QUFDL0IsWUFBQSxNQUFNLGNBQWMsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLEdBQUcsRUFBRSwwQkFBMEIsRUFBRSxDQUFDLENBQUM7QUFDdEYsWUFBQSxjQUFjLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7QUFFMUQsWUFBQSxNQUFNLFdBQVcsR0FBRyxJQUFJQyxzQkFBYSxDQUFDLGNBQWMsQ0FBQztpQkFDbEQsY0FBYyxDQUFDLE9BQU8sQ0FBQztpQkFDdkIsUUFBUSxDQUFDLEtBQUssSUFBRztBQUNoQixnQkFBQSxLQUFLLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztBQUN6QixnQkFBQSxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzFCLGFBQUMsQ0FBQyxDQUFDO0FBQ0wsWUFBQSxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUU3QyxZQUFBLE1BQU0sWUFBWSxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQUUsR0FBRyxFQUFFLGdCQUFnQixFQUFFLENBQUMsQ0FBQztBQUNqRixZQUFBLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ3RDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFDcEQsU0FBQyxDQUFDLENBQUM7S0FDSjtJQUVPLFdBQVcsQ0FBQyxLQUFpQixFQUFFLFlBQXlCLEVBQUE7UUFDOUQsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ3JCLFFBQUEsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLEtBQUssQ0FBQztRQUV4QixNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzlDLFFBQUEsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFHO1lBQzNCLE1BQU0sRUFBRSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDcEMsWUFBQSxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN2QixZQUFBLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN4RSxTQUFDLENBQUMsQ0FBQztBQUVILFFBQUEsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUN4QyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUN0RixDQUFDO0FBRUYsUUFBQSxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBRztZQUN6QixNQUFNLEVBQUUsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxLQUFJO2dCQUMxQixNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUM3QixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNsQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDbkMsYUFBQyxDQUFDLENBQUM7QUFDTCxTQUFDLENBQUMsQ0FBQztLQUNKO0FBRU8sSUFBQSxVQUFVLENBQUMsRUFBZSxFQUFFLElBQVMsRUFBRSxLQUFvQixFQUFBOztRQUNqRSxRQUFRLEtBQUssQ0FBQyxJQUFJO0FBQ2hCLFlBQUEsS0FBSyxRQUFRLENBQUM7QUFDZCxZQUFBLEtBQUssUUFBUSxDQUFDO0FBQ2QsWUFBQSxLQUFLLFNBQVM7Z0JBQ1osRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDekIsTUFBTTtBQUNSLFlBQUEsS0FBSyxNQUFNO0FBQ1QsZ0JBQUEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUM7Z0JBQ2hELE1BQU07QUFDUixZQUFBLEtBQUssU0FBUztBQUNaLGdCQUFBLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzNELE1BQU07QUFDUixZQUFBLEtBQUssS0FBSztBQUNSLGdCQUFBLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQSxDQUFBLEVBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQSxFQUFBLEVBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQSxDQUFBLENBQUcsQ0FBQyxDQUFDO2dCQUN6QyxNQUFNO0FBQ1IsWUFBQSxLQUFLLFFBQVE7QUFDWCxnQkFBQSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUEsQ0FBQSxFQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUcsQ0FBQSxDQUFBLENBQUMsQ0FBQztnQkFDbkMsTUFBTTtBQUNSLFlBQUEsS0FBSyxRQUFRLENBQUM7QUFDZCxZQUFBLEtBQUssUUFBUTtnQkFDWCxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDakMsTUFBTTtBQUNSLFlBQUEsS0FBSyxTQUFTO0FBQ1osZ0JBQUEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFBLEVBQUcsSUFBSSxDQUFDLElBQUksQ0FBQSxHQUFBLEVBQU0sSUFBSSxDQUFDLElBQUksQ0FBQSxDQUFBLENBQUcsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNO0FBQ1IsWUFBQSxLQUFLLGFBQWE7QUFDaEIsZ0JBQUEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFBLEVBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQSxHQUFBLEVBQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQSxDQUFFLENBQUMsQ0FBQztnQkFDbEQsTUFBTTtBQUNSLFlBQUEsS0FBSyxNQUFNO0FBQ1QsZ0JBQUEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFBLEVBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQSxDQUFBLEVBQUksSUFBSSxDQUFDLElBQUksQ0FBQSxDQUFFLENBQUMsQ0FBQztnQkFDekMsTUFBTTtBQUNSLFlBQUEsS0FBSyxPQUFPO2dCQUNWLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDdEMsTUFBTTtBQUNSLFlBQUEsS0FBSyxVQUFVLENBQUM7QUFDaEIsWUFBQSxLQUFLLFdBQVcsQ0FBQztBQUNqQixZQUFBLEtBQUssVUFBVTtBQUNiLGdCQUFBLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ25CLE1BQU07QUFDUixZQUFBLEtBQUssT0FBTztBQUNWLGdCQUFBLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBTyxJQUFBLEVBQUEsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUEsSUFBQSxFQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFBLEVBQUEsQ0FBSSxDQUFDLENBQUM7Z0JBQ2pFLE1BQU07QUFDUixZQUFBLEtBQUssVUFBVTtnQkFDYixFQUFFLENBQUMsT0FBTyxDQUFDLENBQVEsS0FBQSxFQUFBLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFLLEdBQUEsQ0FBQSxDQUFDLENBQUM7Z0JBQzNDLE1BQU07QUFDUixZQUFBLEtBQUssVUFBVTtBQUNiLGdCQUFBLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLEdBQUcsS0FBSyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BFLE1BQU07O0FBRVIsWUFBQSxLQUFLLGNBQWM7Z0JBQ2pCLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBVSxPQUFBLEVBQUEsS0FBSyxDQUFDLFVBQVUsSUFBSSxLQUFLLENBQUssR0FBQSxDQUFBLENBQUMsQ0FBQztnQkFDckQsTUFBTTtBQUNSLFlBQUEsS0FBSyxvQkFBb0I7Z0JBQ3ZCLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBVSxPQUFBLEVBQUEsQ0FBQSxDQUFBLEVBQUEsR0FBQSxLQUFLLENBQUMsY0FBYyxNQUFHLElBQUEsSUFBQSxFQUFBLEtBQUEsS0FBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUMsQ0FBQyxLQUFJLEtBQUssQ0FBQSxDQUFBLEVBQUksQ0FBQSxDQUFBLEVBQUEsR0FBQSxLQUFLLENBQUMsY0FBYyxNQUFBLElBQUEsSUFBQSxFQUFBLEtBQUEsS0FBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFHLENBQUMsQ0FBQyxLQUFJLEtBQUssQ0FBSyxHQUFBLENBQUEsQ0FBQyxDQUFDO2dCQUNwRyxNQUFNO0FBQ1IsWUFBQSxLQUFLLGtCQUFrQixDQUFDO0FBQ3hCLFlBQUEsS0FBSyxtQkFBbUIsQ0FBQztBQUN6QixZQUFBLEtBQUssYUFBYSxDQUFDO0FBQ25CLFlBQUEsS0FBSyxxQkFBcUI7Z0JBQ3hCLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQSxDQUFBLEVBQUksS0FBSyxDQUFDLElBQUksQ0FBRyxDQUFBLENBQUEsQ0FBQyxDQUFDO2dCQUM5QixNQUFNO0FBQ1IsWUFBQSxLQUFLLG9CQUFvQixDQUFDO0FBQzFCLFlBQUEsS0FBSyxvQkFBb0IsQ0FBQztBQUMxQixZQUFBLEtBQUssYUFBYSxDQUFDO0FBQ25CLFlBQUEsS0FBSyxzQkFBc0I7QUFDekIsZ0JBQUEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFBLEVBQUcsSUFBSSxDQUFBLENBQUEsRUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQSxDQUFFLENBQUMsQ0FBQztnQkFDMUMsTUFBTTtBQUNSLFlBQUE7Z0JBQ0UsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUM1QixTQUFBO0tBQ0Y7QUFFTyxJQUFBLGVBQWUsQ0FBQyxFQUFlLEVBQUUsSUFBUyxFQUFFLEtBQW9CLEVBQUE7QUFDdEUsUUFBQSxJQUFJLEtBQUssQ0FBQyxVQUFVLEtBQUssS0FBSyxFQUFFO0FBQzlCLFlBQUEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFPLElBQUEsRUFBQSxJQUFJLENBQUMsQ0FBQyxDQUFBLEVBQUEsRUFBSyxJQUFJLENBQUMsQ0FBQyxDQUFLLEVBQUEsRUFBQSxJQUFJLENBQUMsQ0FBQyxDQUFBLENBQUEsQ0FBRyxDQUFDLENBQUM7QUFDbkQsWUFBQSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSx5QkFBeUIsSUFBSSxDQUFDLENBQUMsQ0FBQSxFQUFBLEVBQUssSUFBSSxDQUFDLENBQUMsQ0FBSyxFQUFBLEVBQUEsSUFBSSxDQUFDLENBQUMsQ0FBQSxVQUFBLEVBQWEsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBRSxDQUFDLENBQUM7QUFDeEksU0FBQTtBQUFNLGFBQUE7WUFDTCxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNsQyxTQUFBO0tBQ0Y7QUFFTyxJQUFBLGdCQUFnQixDQUFDLENBQVMsRUFBRSxDQUFTLEVBQUUsQ0FBUyxFQUFBO0FBQ3RELFFBQUEsTUFBTSxTQUFTLEdBQUcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUM7UUFDNUQsT0FBTyxTQUFTLEdBQUcsR0FBRyxHQUFHLE9BQU8sR0FBRyxPQUFPLENBQUM7S0FDNUM7QUFFTyxJQUFBLFdBQVcsQ0FBQyxLQUFpQixFQUFBO0FBQ25DLFFBQUEsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3pELFFBQUEsSUFBSSxZQUFZLEVBQUU7QUFDaEIsWUFBQSxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQztBQUN2QyxTQUFBO0tBQ0Y7SUFFTyxTQUFTLENBQUMsS0FBb0IsRUFBRSxNQUFjLEVBQUE7UUFDcEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUNuRixNQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsTUFBTSxLQUFLLE1BQU0sSUFBSSxXQUFXLENBQUMsU0FBUyxLQUFLLEtBQUssR0FBRyxNQUFNLEdBQUcsS0FBSyxDQUFDO0FBRXZHLFFBQUEsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDLENBQUM7UUFDM0UsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFJO0FBQ3ZCLFlBQUEsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQ3BELFlBQUEsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3BELElBQUksTUFBTSxHQUFHLE1BQU07QUFBRSxnQkFBQSxPQUFPLFlBQVksS0FBSyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzVELElBQUksTUFBTSxHQUFHLE1BQU07QUFBRSxnQkFBQSxPQUFPLFlBQVksS0FBSyxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzVELFlBQUEsT0FBTyxDQUFDLENBQUM7QUFDWCxTQUFDLENBQUMsQ0FBQztBQUVILFFBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBQ2hFLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztLQUNyQjtJQUVhLFVBQVUsQ0FBQyxjQUF3QixFQUFFLE1BQTBCLEVBQUE7O0FBQzNFLFlBQUEsSUFBSSxDQUFDLE1BQU07Z0JBQUUsT0FBTztZQUVwQixJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDakIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFFeEYsSUFBSSxNQUFNLEtBQUssS0FBSyxFQUFFO0FBQ3BCLGdCQUFBLE9BQU8sR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssSUFDaEMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUM5QyxxQkFBQSxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztxQkFDNUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUNkLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2hCLGFBQUE7aUJBQU0sSUFBSSxNQUFNLEtBQUssTUFBTSxFQUFFO2dCQUM1QixPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ25ELGFBQUE7O1lBR0QsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN2QyxNQUFNLElBQUksR0FBRyxNQUFNLE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDO0FBQzlDLGdCQUFBLEtBQUssRUFBRSxRQUFRO2dCQUNmLFdBQVcsRUFBRSxDQUFtQixnQkFBQSxFQUFBLE1BQU0sQ0FBRSxDQUFBO0FBQ3hDLGdCQUFBLE9BQU8sRUFBRTtBQUNQLG9CQUFBLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRTtvQkFDcEQsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQ3BDLGlCQUFBO0FBQ0YsYUFBQSxDQUFDLENBQUM7WUFFSCxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7QUFDakIsZ0JBQUEsSUFBSUMsZUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNwQixPQUFPO0FBQ1IsYUFBQTs7WUFHRCxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLFdBQVcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBRTNGLFlBQUEsSUFBSUEsZUFBTSxDQUFDLENBQU8sSUFBQSxFQUFBLGNBQWMsQ0FBQyxNQUFNLENBQVcsUUFBQSxFQUFBLElBQUksQ0FBQyxRQUFRLENBQUUsQ0FBQSxDQUFDLENBQUM7U0FDcEUsQ0FBQSxDQUFBO0FBQUEsS0FBQTtJQUVhLFVBQVUsR0FBQTs7WUFDdEIsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQU8sTUFBTSxLQUFJLFNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsYUFBQTtnQkFDL0MsSUFBSSxNQUFNLEtBQUssTUFBTSxFQUFFO29CQUNyQixNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzlDLG9CQUFBLEtBQUssQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDO0FBQ3BCLG9CQUFBLEtBQUssQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFDO0FBQzVCLG9CQUFBLEtBQUssQ0FBQyxRQUFRLEdBQUcsTUFBVyxTQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLGFBQUE7O3dCQUMxQixNQUFNLElBQUksR0FBRyxDQUFBLEVBQUEsR0FBQSxLQUFLLENBQUMsS0FBSyxNQUFBLElBQUEsSUFBQSxFQUFBLEtBQUEsS0FBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzlCLHdCQUFBLElBQUksSUFBSSxFQUFFO0FBQ1IsNEJBQUEsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7NEJBQ2xDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsTUFBTSxHQUFHLEtBQUssQ0FBQyxDQUFDO0FBQ3BGLHlCQUFBO0FBQ0gscUJBQUMsQ0FBQSxDQUFDO29CQUNGLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNmLGlCQUFBO3FCQUFNLElBQUksTUFBTSxLQUFLLFdBQVcsRUFBRTtvQkFDakMsTUFBTSxPQUFPLEdBQUcsTUFBTSxTQUFTLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQ3JELG9CQUFBLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN0QyxpQkFBQTtBQUNILGFBQUMsQ0FBQSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7U0FDWCxDQUFBLENBQUE7QUFBQSxLQUFBO0lBRWEsc0JBQXNCLENBQUMsT0FBZSxFQUFFLE1BQXVCLEVBQUE7O1lBQzNFLElBQUksTUFBTSxHQUFvQixFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDWCxJQUFJO0FBQ0Ysb0JBQUEsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDcEIsTUFBTSxHQUFHLE1BQU0sQ0FBQztBQUNqQixpQkFBQTtnQkFBQyxPQUFNLEVBQUEsRUFBQTtvQkFDTixNQUFNLEdBQUcsS0FBSyxDQUFDO0FBQ2hCLGlCQUFBO0FBQ0YsYUFBQTtZQUVELElBQUksTUFBTSxLQUFLLEtBQUssRUFBRTtBQUNwQixnQkFBQSxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQztBQUNoRixnQkFBQSxNQUFNLEtBQUssR0FBa0IsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUM7QUFDOUUsZ0JBQUEsS0FBSyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEtBQUs7QUFDbkQsb0JBQUEsSUFBSSxFQUFFLFNBQVMsQ0FBQyxJQUFJLEVBQUU7b0JBQ3RCLElBQUksRUFBRSxRQUFRO0FBQ2YsaUJBQUEsQ0FBQyxDQUFDLENBQUM7QUFDSixnQkFBQSxLQUFLLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNsRixnQkFBQSxNQUFNLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNsQixhQUFBO2lCQUFNLElBQUksTUFBTSxLQUFLLE1BQU0sRUFBRTtBQUM1QixnQkFBQSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM5QixhQUFBO0FBRUQsWUFBQSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3ZCLFlBQUEsSUFBSUEsZUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ3RCLENBQUEsQ0FBQTtBQUFBLEtBQUE7QUFFTSxJQUFBLGFBQWEsQ0FBQyxPQUFlLEVBQUE7QUFDbEMsUUFBQSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQ0MscUJBQVksQ0FBQyxDQUFDO0FBQ3hFLFFBQUEsSUFBSSxVQUFVLEVBQUU7QUFDZCxZQUFBLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUM7QUFDakMsWUFBQSxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDbEMsWUFBQSxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN0QyxTQUFBO0FBQU0sYUFBQTtBQUNMLFlBQUEsSUFBSUQsZUFBTSxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDbEMsU0FBQTtLQUNGO0lBRU0scUJBQXFCLEdBQUE7QUFDMUIsUUFBQSxJQUFJLElBQUksQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRTtZQUMxQyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDNUUsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO0FBRTVFLFlBQUEsS0FBSyxDQUFDLENBQWUsWUFBQSxFQUFBLGdCQUFnQixDQUFDLEdBQUcsQ0FBQSxPQUFBLEVBQVUsZ0JBQWdCLENBQUMsSUFBSSxXQUFXLGdCQUFnQixDQUFDLEtBQUssQ0FBWSxTQUFBLEVBQUEsZ0JBQWdCLENBQUMsTUFBTSxDQUFBLENBQUUsQ0FBQyxDQUFDO0FBQ2hKLFlBQUEsS0FBSyxDQUFDLENBQWUsWUFBQSxFQUFBLGdCQUFnQixDQUFDLEdBQUcsQ0FBQSxPQUFBLEVBQVUsZ0JBQWdCLENBQUMsSUFBSSxXQUFXLGdCQUFnQixDQUFDLEtBQUssQ0FBWSxTQUFBLEVBQUEsZ0JBQWdCLENBQUMsTUFBTSxDQUFBLENBQUUsQ0FBQyxDQUFDO0FBQ2pKLFNBQUE7QUFBTSxhQUFBO1lBQ0wsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2YsU0FBQTtLQUNGO0lBRU8sOEJBQThCLEdBQUE7UUFDcEMsVUFBVSxDQUFDLE1BQUs7WUFDZCxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztBQUMvQixTQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7S0FDVDtJQUVPLGVBQWUsR0FBQTtBQUNyQixRQUFBLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLGNBQWMsS0FBSTs7WUFDeEQsTUFBTSxNQUFNLEdBQUcsQ0FBQSxFQUFBLEdBQUEsSUFBSSxDQUFDLGNBQWMsTUFBQSxJQUFBLElBQUEsRUFBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBRSxRQUFRLEVBQUUsQ0FBQztBQUMvQyxZQUFBLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQzFDLFNBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0tBQ1g7QUFDRixDQUFBO0FBcUJELE1BQU0saUJBQWtCLFNBQVFFLGNBQUssQ0FBQTtJQUNuQyxXQUFZLENBQUEsR0FBUSxFQUFVLFFBQWdELEVBQUE7UUFDNUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRGlCLElBQVEsQ0FBQSxRQUFBLEdBQVIsUUFBUSxDQUF3QztLQUU3RTtJQUVELE1BQU0sR0FBQTtBQUNKLFFBQUEsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQztRQUMzQixTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDbEIsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUU3QyxJQUFJQyxnQkFBTyxDQUFDLFNBQVMsQ0FBQzthQUNuQixPQUFPLENBQUMsT0FBTyxDQUFDO2FBQ2hCLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQztBQUM3QixhQUFBLFNBQVMsQ0FBQyxNQUFNLElBQUksTUFBTTthQUN4QixhQUFhLENBQUMsTUFBTSxDQUFDO2FBQ3JCLE9BQU8sQ0FBQyxNQUFLO1lBQ1osSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ2IsWUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3ZCLENBQUMsQ0FBQyxDQUFDO1FBRVIsSUFBSUEsZ0JBQU8sQ0FBQyxTQUFTLENBQUM7YUFDbkIsT0FBTyxDQUFDLFFBQVEsQ0FBQzthQUNqQixPQUFPLENBQUMsc0JBQXNCLENBQUM7QUFDL0IsYUFBQSxTQUFTLENBQUMsTUFBTSxJQUFJLE1BQU07YUFDeEIsYUFBYSxDQUFDLE9BQU8sQ0FBQzthQUN0QixPQUFPLENBQUMsTUFBSztZQUNaLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNiLFlBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUM1QixDQUFDLENBQUMsQ0FBQztLQUNUO0lBRUQsT0FBTyxHQUFBO0FBQ0wsUUFBQSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQzNCLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztLQUNuQjtBQUNGLENBQUE7QUFFRCxNQUFNLFdBQVksU0FBUUQsY0FBSyxDQUFBO0FBRzdCLElBQUEsV0FBQSxDQUNFLEdBQVEsRUFDQSxNQUF1QixFQUN2QixRQUE0QyxFQUFBO1FBRXBELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUhILElBQU0sQ0FBQSxNQUFBLEdBQU4sTUFBTSxDQUFpQjtRQUN2QixJQUFRLENBQUEsUUFBQSxHQUFSLFFBQVEsQ0FBb0M7QUFMOUMsUUFBQSxJQUFBLENBQUEsY0FBYyxHQUFnQixJQUFJLEdBQUcsRUFBRSxDQUFDO0tBUS9DO0lBRUQsTUFBTSxHQUFBO0FBQ0osUUFBQSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQzNCLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNsQixTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO0FBRS9DLFFBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFHO1lBQzFCLElBQUlDLGdCQUFPLENBQUMsU0FBUyxDQUFDO0FBQ25CLGlCQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO0FBQ25CLGlCQUFBLFNBQVMsQ0FBQyxNQUFNLElBQUksTUFBTTtpQkFDeEIsUUFBUSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDN0MsUUFBUSxDQUFDLEtBQUssSUFBRztBQUNoQixnQkFBQSxJQUFJLEtBQUssRUFBRTtvQkFDVCxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDckMsaUJBQUE7QUFBTSxxQkFBQTtvQkFDTCxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDeEMsaUJBQUE7YUFDRixDQUFDLENBQUMsQ0FBQztBQUNWLFNBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSUEsZ0JBQU8sQ0FBQyxTQUFTLENBQUM7QUFDbkIsYUFBQSxTQUFTLENBQUMsTUFBTSxJQUFJLE1BQU07YUFDeEIsYUFBYSxDQUFDLElBQUksQ0FBQztBQUNuQixhQUFBLE1BQU0sRUFBRTthQUNSLE9BQU8sQ0FBQyxNQUFLO0FBQ1osWUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7WUFDL0MsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1NBQ2QsQ0FBQyxDQUFDLENBQUM7S0FDVDtJQUVELE9BQU8sR0FBQTtBQUNMLFFBQUEsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQztRQUMzQixTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7S0FDbkI7QUFDRjs7QUM3ZUssU0FBVSxhQUFhLENBQUMsUUFBZ0IsRUFBQTtBQUM1QyxJQUFBLEtBQUssQ0FBQyxDQUFBLGNBQUEsRUFBaUIsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUssR0FBQSxDQUFBLENBQUMsQ0FBQztJQUN4RCxNQUFNLE1BQU0sR0FBb0IsRUFBRSxDQUFDO0lBQ25DLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkMsSUFBSSxZQUFZLEdBQXlCLElBQUksQ0FBQztBQUU5QyxJQUFBLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO0FBQ3hCLFFBQUEsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ2hDLFFBQUEsS0FBSyxDQUFDLENBQUEsS0FBQSxFQUFRLFdBQVcsQ0FBQSxDQUFFLENBQUMsQ0FBQztBQUM3QixRQUFBLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRTtBQUNqQyxZQUFBLEtBQUssQ0FBQyxDQUFBLE1BQUEsRUFBUyxXQUFXLENBQUEsQ0FBRSxDQUFDLENBQUM7QUFDOUIsWUFBQSxJQUFJLFlBQVksRUFBRTtnQkFDaEIsZUFBZSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQzlCLGdCQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDM0IsYUFBQTtBQUNELFlBQUEsWUFBWSxHQUFHO2dCQUNiLElBQUksRUFBRSxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRTtBQUNyQyxnQkFBQSxNQUFNLEVBQUUsRUFBRTtBQUNWLGdCQUFBLElBQUksRUFBRSxFQUFFO2FBQ1QsQ0FBQztBQUNILFNBQUE7QUFBTSxhQUFBLElBQUksWUFBWSxFQUFFO1lBQ3ZCLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUM5RCxZQUFBLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7QUFDcEIsZ0JBQUEsSUFBSSxZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7b0JBQ3BDLEtBQUssQ0FBQyxDQUFTLE1BQUEsRUFBQSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFFLENBQUEsQ0FBQyxDQUFDO29CQUNuQyxZQUFZLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzNFLGlCQUFBO0FBQU0scUJBQUE7b0JBQ0wsS0FBSyxDQUFDLENBQVUsT0FBQSxFQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUUsQ0FBQSxDQUFDLENBQUM7QUFDcEMsb0JBQUEsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDL0IsaUJBQUE7QUFDRixhQUFBO0FBQ0YsU0FBQTtBQUNGLEtBQUE7QUFFRCxJQUFBLElBQUksWUFBWSxFQUFFO1FBQ2hCLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUM5QixRQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDM0IsS0FBQTtBQUVELElBQUEsSUFBSSxDQUFDLENBQVksU0FBQSxFQUFBLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQSxHQUFBLENBQUssQ0FBQyxDQUFDO0FBQ2hFLElBQUEsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLEtBQW9CLEVBQUE7QUFDM0MsSUFBQSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtBQUN6QixRQUFBLEtBQUssQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxLQUMzQyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQ2pELENBQUM7QUFDSCxLQUFBO0FBQ0gsQ0FBQztBQUVELFNBQVMsY0FBYyxDQUFDLFNBQWlCLEVBQUUsVUFBa0IsRUFBQTtBQUMzRCxJQUFBLE1BQU0sY0FBYyxHQUFHLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUMvQyxJQUFJLElBQUksR0FBc0IsUUFBUSxDQUFDO0FBQ3ZDLElBQUEsSUFBSSxJQUF3QixDQUFDO0FBQzdCLElBQUEsSUFBSSxVQUE4QixDQUFDO0FBQ25DLElBQUEsSUFBSSxjQUE0QyxDQUFDO0FBQ2pELElBQUEsSUFBSSxTQUE2QixDQUFDO0FBQ2xDLElBQUEsSUFBSSxPQUE2QixDQUFDO0FBQ2xDLElBQUEsSUFBSSxNQUEwQixDQUFDO0FBQy9CLElBQUEsSUFBSSxVQUE4QixDQUFDO0FBQ25DLElBQUEsSUFBSSxVQUE4QyxDQUFDO0FBRW5ELElBQUEsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDdEUsSUFBSSxHQUFHLE1BQU0sQ0FBQztBQUNkLFFBQUEsTUFBTSxHQUFHLFlBQVksQ0FBQztBQUN2QixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUNoRixJQUFJLEdBQUcsU0FBUyxDQUFDO1FBQ2pCLFNBQVMsR0FBRyxDQUFDLENBQUM7QUFDZCxRQUFBLElBQUksR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsR0FBRyxTQUFTLENBQUM7QUFDM0QsS0FBQTtBQUFNLFNBQUEsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUU7UUFDbkYsSUFBSSxHQUFHLFFBQVEsQ0FBQztBQUNqQixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUMxRSxJQUFJLEdBQUcsU0FBUyxDQUFDO0FBQ2xCLEtBQUE7QUFBTSxTQUFBLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQ2pGLElBQUksR0FBRyxVQUFVLENBQUM7QUFDbEIsUUFBQSxPQUFPLEdBQUcsRUFBRSxDQUFDO0FBQ2QsS0FBQTtBQUFNLFNBQUEsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDdkYsSUFBSSxHQUFHLEtBQUssQ0FBQztBQUNkLEtBQUE7QUFBTSxTQUFBLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUM1QyxJQUFJLEdBQUcsWUFBWSxDQUFDO0FBQ3JCLEtBQUE7QUFBTSxTQUFBLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQ2pFLFFBQUEsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzVCLElBQUksR0FBRyxRQUFRLENBQUM7QUFDaEIsWUFBQSxVQUFVLEdBQUcsQ0FBQyxDQUFDO0FBQ2hCLFNBQUE7QUFBTSxhQUFBO1lBQ0wsSUFBSSxHQUFHLFFBQVEsQ0FBQztZQUNoQixVQUFVLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDM0MsU0FBQTtBQUNGLEtBQUE7QUFBTSxTQUFBLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQ2pFLFFBQUEsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDOUQsSUFBSSxHQUFHLFNBQVMsQ0FBQztBQUNsQixTQUFBO0FBQU0sYUFBQSxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsRUFBRTtZQUM3RSxJQUFJLEdBQUcsYUFBYSxDQUFDO0FBQ3RCLFNBQUE7YUFBTSxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzNGLElBQUksR0FBRyxPQUFPLENBQUM7WUFDZixVQUFVLEdBQUcsS0FBSyxDQUFDO0FBQ3BCLFNBQUE7QUFBTSxhQUFBO1lBQ0wsSUFBSSxHQUFHLFFBQVEsQ0FBQztBQUNqQixTQUFBO0FBQ0YsS0FBQTtBQUFNLFNBQUEsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDcEYsSUFBSSxHQUFHLFNBQVMsQ0FBQztBQUNsQixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLEVBQUU7UUFDbEQsSUFBSSxHQUFHLGNBQWMsQ0FBQztBQUN2QixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDOUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztBQUNuQixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUU7UUFDL0MsSUFBSSxHQUFHLFdBQVcsQ0FBQztBQUNwQixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUU7UUFDNUMsSUFBSSxHQUFHLFFBQVEsQ0FBQztBQUNqQixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDOUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztBQUNuQixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDM0MsSUFBSSxHQUFHLE9BQU8sQ0FBQztBQUNoQixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDOUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztBQUNuQixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDOUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztBQUNuQixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDM0MsSUFBSSxHQUFHLE9BQU8sQ0FBQztBQUNoQixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDOUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztBQUNuQixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDOUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztBQUNuQixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDM0MsSUFBSSxHQUFHLE9BQU8sQ0FBQztBQUNoQixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQUU7UUFDaEQsSUFBSSxHQUFHLFlBQVksQ0FBQztBQUNyQixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUU7UUFDN0MsSUFBSSxHQUFHLFNBQVMsQ0FBQztBQUNsQixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUU7UUFDL0MsSUFBSSxHQUFHLFdBQVcsQ0FBQztBQUNwQixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDOUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztBQUNuQixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDM0MsSUFBSSxHQUFHLE9BQU8sQ0FBQztBQUNoQixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDekMsSUFBSSxHQUFHLEtBQUssQ0FBQztBQUNkLEtBQUE7QUFBTSxTQUFBLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUN4QyxJQUFJLEdBQUcsV0FBVyxDQUFDO0FBQ3BCLEtBQUE7QUFBTSxTQUFBLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUMxQyxJQUFJLEdBQUcsTUFBTSxDQUFDO0FBQ2YsS0FBQTtBQUFNLFNBQUEsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1FBQzdDLElBQUksR0FBRyxTQUFTLENBQUM7QUFDbEIsS0FBQTtBQUFNLFNBQUEsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFO1FBQzlDLElBQUksR0FBRyxVQUFVLENBQUM7QUFDbkIsS0FBQTtBQUFNLFNBQUEsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQzFDLElBQUksR0FBRyxNQUFNLENBQUM7QUFDZCxRQUFBLE9BQU8sR0FBRyxFQUFFLENBQUM7QUFDZCxLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUNoRixJQUFJLEdBQUcsY0FBYyxDQUFDO0FBQ3RCLFFBQUEsVUFBVSxHQUFHLEtBQUssQ0FBQztBQUNwQixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsRUFBRTtRQUN4RCxJQUFJLEdBQUcsb0JBQW9CLENBQUM7UUFDNUIsY0FBYyxHQUFHLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzlCLEtBQUE7QUFBTSxTQUFBLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFO1FBQ3RELElBQUksR0FBRyxrQkFBa0IsQ0FBQztBQUMzQixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsRUFBRTtRQUN2RCxJQUFJLEdBQUcsbUJBQW1CLENBQUM7QUFDNUIsS0FBQTtBQUFNLFNBQUEsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFO1FBQ2pELElBQUksR0FBRyxhQUFhLENBQUM7QUFDdEIsS0FBQTtBQUFNLFNBQUEsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFO1FBQy9DLElBQUksR0FBRyxvQkFBb0IsQ0FBQztRQUM1QixJQUFJLEdBQUcsUUFBUSxDQUFDO0FBQ2pCLEtBQUE7QUFBTSxTQUFBLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsRUFBRTtRQUNuRCxJQUFJLEdBQUcsb0JBQW9CLENBQUM7UUFDNUIsSUFBSSxHQUFHLEdBQUcsQ0FBQztBQUNaLEtBQUE7QUFBTSxTQUFBLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUMzQyxJQUFJLEdBQUcsYUFBYSxDQUFDO1FBQ3JCLElBQUksR0FBRyxJQUFJLENBQUM7QUFDYixLQUFBO0FBQU0sU0FBQSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1FBQ3RGLElBQUksR0FBRyxzQkFBc0IsQ0FBQztRQUM5QixJQUFJLEdBQUcsSUFBSSxDQUFDO0FBQ2IsS0FBQTtBQUFNLFNBQUEsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFO1FBQ2pELElBQUksR0FBRyxxQkFBcUIsQ0FBQztBQUM5QixLQUFBO0lBRUQsTUFBTSxLQUFLLEdBQWtCLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQztBQUN2RCxJQUFBLElBQUksSUFBSTtBQUFFLFFBQUEsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7QUFDNUIsSUFBQSxJQUFJLFVBQVU7QUFBRSxRQUFBLEtBQUssQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO0FBQzlDLElBQUEsSUFBSSxjQUFjO0FBQUUsUUFBQSxLQUFLLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQztBQUMxRCxJQUFBLElBQUksU0FBUztBQUFFLFFBQUEsS0FBSyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7QUFDM0MsSUFBQSxJQUFJLE9BQU87QUFBRSxRQUFBLEtBQUssQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0FBQ3JDLElBQUEsSUFBSSxNQUFNO0FBQUUsUUFBQSxLQUFLLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztBQUNsQyxJQUFBLElBQUksVUFBVTtBQUFFLFFBQUEsS0FBSyxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7QUFDOUMsSUFBQSxJQUFJLFVBQVU7QUFBRSxRQUFBLEtBQUssQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO0FBRTlDLElBQUEsT0FBTyxLQUFLLENBQUM7QUFDZjs7QUN4TEEsTUFBTSxnQkFBZ0IsR0FBMkI7QUFDL0MsSUFBQSxvQkFBb0IsRUFBRSxLQUFLO0NBQzVCLENBQUM7QUFFbUIsTUFBQSxjQUFlLFNBQVFDLGVBQU0sQ0FBQTtBQUFsRCxJQUFBLFdBQUEsR0FBQTs7UUFDVSxJQUFZLENBQUEsWUFBQSxHQUFpQyxJQUFJLENBQUM7UUFDMUQsSUFBUSxDQUFBLFFBQUEsR0FBMkIsZ0JBQWdCLENBQUM7UUFDNUMsSUFBbUIsQ0FBQSxtQkFBQSxHQUEwQyxFQUFFLENBQUM7S0EwTXpFO0lBeE1PLE1BQU0sR0FBQTs7QUFDVixZQUFBLE1BQU0sSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUVoQixZQUFBLElBQUksQ0FBQyxZQUFZLENBQ2Ysa0JBQWtCLEVBQ2xCLENBQUMsSUFBSSxLQUFLLElBQUksWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FDdkMsQ0FBQztZQUVGLElBQUksQ0FBQyxVQUFVLENBQUM7QUFDZCxnQkFBQSxFQUFFLEVBQUUsb0JBQW9CO0FBQ3hCLGdCQUFBLElBQUksRUFBRSxhQUFhO0FBQ25CLGdCQUFBLFFBQVEsRUFBRSxNQUFNLElBQUksQ0FBQyxrQkFBa0IsRUFBRTtBQUMxQyxhQUFBLENBQUMsQ0FBQztBQUVILFlBQUEsSUFBSSxDQUFDLGFBQWEsQ0FDaEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksS0FBSTtBQUMxQyxnQkFBQSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLElBQUksRUFBRTtvQkFDbkMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7QUFDM0IsaUJBQUE7YUFDRixDQUFDLENBQ0gsQ0FBQztBQUVGLFlBQUEsSUFBSSxDQUFDLGFBQWEsQ0FDaEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksS0FBSTtnQkFDbkMsSUFBSSxJQUFJLFlBQVlDLGNBQUssSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLElBQUksRUFBRTtvQkFDcEQsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7QUFDM0IsaUJBQUE7YUFDRixDQUFDLENBQ0gsQ0FBQztZQUVGLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxNQUFLO2dCQUM3QyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7QUFDdEIsYUFBQyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsVUFBVSxDQUFDO0FBQ2QsZ0JBQUEsRUFBRSxFQUFFLG9CQUFvQjtBQUN4QixnQkFBQSxJQUFJLEVBQUUsU0FBUztBQUNmLGdCQUFBLFFBQVEsRUFBRSxNQUFNLElBQUksQ0FBQyxZQUFZLEVBQUU7QUFDcEMsYUFBQSxDQUFDLENBQUM7QUFFSCxZQUFBLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7O1lBR2hFLElBQUksQ0FBQyxHQUFXLENBQUMsT0FBTyxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7U0FDbEQsQ0FBQSxDQUFBO0FBQUEsS0FBQTtJQUVLLFlBQVksR0FBQTs7QUFDaEIsWUFBQSxNQUFNLFVBQVUsR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUN6QyxZQUFBLE1BQU0sVUFBVSxHQUFHLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUM1RCxZQUFBLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLENBQUM7U0FDakUsQ0FBQSxDQUFBO0FBQUEsS0FBQTtJQUVLLGtCQUFrQixHQUFBOztBQUN0QixZQUFBLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDSixxQkFBWSxDQUFDLENBQUM7QUFDeEUsWUFBQSxJQUFJLFVBQVUsRUFBRTtBQUNkLGdCQUFBLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUN6QyxnQkFBQSxLQUFLLENBQUMsQ0FBQSxVQUFBLEVBQWEsT0FBTyxDQUFBLENBQUUsQ0FBQyxDQUFDO0FBQzlCLGdCQUFBLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDdEMsS0FBSyxDQUFDLENBQWEsVUFBQSxFQUFBLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUUsQ0FBQSxDQUFDLENBQUM7QUFFN0MsZ0JBQUEsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO0FBQzlDLG9CQUFBLE1BQU0sSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO29CQUMxQixJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUU7d0JBQ3JCLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNoQix3QkFBQSxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNwQyx3QkFBQSxJQUFJRCxlQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDeEIscUJBQUE7QUFBTSx5QkFBQTt3QkFDTCxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDdEIsd0JBQUEsSUFBSUEsZUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3pCLHFCQUFBO0FBQ0YsaUJBQUE7QUFBTSxxQkFBQTtvQkFDTCxLQUFLLENBQUMsQ0FBVyxRQUFBLEVBQUEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBRSxDQUFBLENBQUMsQ0FBQztBQUMzQyxvQkFBQSxJQUFJQSxlQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUMvQixpQkFBQTtBQUNGLGFBQUE7QUFBTSxpQkFBQTtBQUNMLGdCQUFBLElBQUlBLGVBQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQ2pDLGFBQUE7U0FDRixDQUFBLENBQUE7QUFBQSxLQUFBO0lBRUssWUFBWSxHQUFBOztBQUNoQixZQUFBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1lBQy9CLElBQUksSUFBSSxHQUFHLFNBQVMsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1RCxJQUFJLENBQUMsSUFBSSxFQUFFO0FBQ1QsZ0JBQUEsSUFBSSxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDckMsZ0JBQUEsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQ3JFLGFBQUE7QUFDRCxZQUFBLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFM0IsWUFBQSxNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sSUFBSSxVQUFVLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFFdkQsWUFBQSxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxJQUE2QixDQUFDO0FBQ3ZELFlBQUEsSUFBSSxDQUFDLENBQUEsVUFBQSxFQUFhLElBQUksQ0FBQyxZQUFZLEdBQUcsU0FBUyxHQUFHLE1BQU0sQ0FBQSxDQUFFLENBQUMsQ0FBQztBQUU1RCxZQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFO2dCQUN0QixLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDbkIsZ0JBQUEsSUFBSUEsZUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3pCLGFBQUE7U0FDRixDQUFBLENBQUE7QUFBQSxLQUFBO0lBRUQsUUFBUSxHQUFBO1FBQ04sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDOztBQUdoQixRQUFBLE9BQVEsSUFBSSxDQUFDLEdBQVcsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDO0tBQ2xEO0lBRUssUUFBUSxHQUFBOztBQUNaLFlBQUEsTUFBTSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7U0FDM0IsQ0FBQSxDQUFBO0FBQUEsS0FBQTtJQUVLLFlBQVksR0FBQTs7QUFDaEIsWUFBQSxNQUFPLElBQUksQ0FBQyxRQUF5QyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7U0FDdEYsQ0FBQSxDQUFBO0FBQUEsS0FBQTtJQUVNLGVBQWUsR0FBQTtRQUNwQixJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUU7QUFDckIsWUFBQSxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDdEMsU0FBQTtBQUNELFFBQUEsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUVNLFNBQVMsQ0FBQyxTQUFpQixFQUFFLFVBQWtCLEVBQUE7QUFDcEQsUUFBQSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7QUFDdEMsUUFBQSxJQUFJLENBQUMsTUFBTTtBQUFFLFlBQUEsT0FBTyxJQUFJLENBQUM7QUFFekIsUUFBQSxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQyxDQUFDO0FBQ3JELFFBQUEsSUFBSSxDQUFDLEtBQUs7QUFBRSxZQUFBLE9BQU8sSUFBSSxDQUFDO1FBRXhCLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFHO0FBQzdCLFlBQUEsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxLQUFJO0FBQ3ZELGdCQUFBLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO0FBQzFELGdCQUFBLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssQ0FBQztBQUM5QixhQUFDLENBQUMsQ0FBQztBQUNMLFNBQUMsQ0FBQyxDQUFDO0tBQ0o7QUFFTSxJQUFBLGNBQWMsQ0FBQyxTQUFpQixFQUFBO0FBQ3JDLFFBQUEsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO0FBQ3RDLFFBQUEsSUFBSSxDQUFDLE1BQU07QUFBRSxZQUFBLE9BQU8sSUFBSSxDQUFDO0FBRXpCLFFBQUEsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxTQUFTLENBQUMsQ0FBQztRQUNyRCxPQUFPLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztLQUNwQztBQUVNLElBQUEsWUFBWSxDQUFDLFFBQTJDLEVBQUE7QUFDN0QsUUFBQSxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQ3pDO0lBRU0sY0FBYyxDQUFDLFNBQWlCLEVBQUUsVUFBa0IsRUFBQTtBQUN6RCxRQUFBLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztBQUN0QyxRQUFBLElBQUksQ0FBQyxNQUFNO0FBQUUsWUFBQSxPQUFPLElBQUksQ0FBQztBQUV6QixRQUFBLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssU0FBUyxDQUFDLENBQUM7QUFDckQsUUFBQSxJQUFJLENBQUMsS0FBSztBQUFFLFlBQUEsT0FBTyxJQUFJLENBQUM7QUFFeEIsUUFBQSxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsQ0FBQztRQUN2RSxJQUFJLFdBQVcsS0FBSyxDQUFDLENBQUM7QUFBRSxZQUFBLE9BQU8sSUFBSSxDQUFDO0FBRXBDLFFBQUEsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUN0RyxRQUFBLElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDO0FBQUUsWUFBQSxPQUFPLElBQUksQ0FBQztBQUV6QyxRQUFBLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNqQyxRQUFBLE1BQU0sR0FBRyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQixNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztBQUM5QyxRQUFBLE1BQU0sR0FBRyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDbEQsUUFBQSxNQUFNLE9BQU8sR0FBRyxHQUFHLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQztRQUN4QyxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsS0FBSyxDQUFDO2NBQ3RDLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDakYsY0FBRSxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDO0tBQ3RDO0FBRU0sSUFBQSxZQUFZLENBQUMsU0FBaUIsRUFBRSxVQUFrQixFQUFFLEtBQWEsRUFBRSxHQUFXLEVBQUE7QUFDbkYsUUFBQSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7QUFDdEMsUUFBQSxJQUFJLENBQUMsTUFBTTtBQUFFLFlBQUEsT0FBTyxJQUFJLENBQUM7QUFFekIsUUFBQSxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQyxDQUFDO0FBQ3JELFFBQUEsSUFBSSxDQUFDLEtBQUs7QUFBRSxZQUFBLE9BQU8sSUFBSSxDQUFDO0FBRXhCLFFBQUEsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDLENBQUM7UUFDdkUsSUFBSSxXQUFXLEtBQUssQ0FBQyxDQUFDO0FBQUUsWUFBQSxPQUFPLElBQUksQ0FBQztRQUVwQyxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztLQUN0RTs7QUFHTyxJQUFBLGlCQUFpQixDQUFDLGFBQXVCLEVBQUE7QUFDL0MsUUFBQSxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLFFBQVEsSUFBSSxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztLQUN2RTs7QUFHTyxJQUFBLFVBQVUsQ0FBQyxhQUF1QixFQUFBOzs7O0FBS3hDLFFBQUEsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxDQUFDO0tBQ3ZDO0FBQ0YsQ0FBQTtBQUVELE1BQU0sd0JBQXlCLFNBQVFNLHlCQUFnQixDQUFBO0lBR3JELFdBQVksQ0FBQSxHQUFRLEVBQUUsTUFBc0IsRUFBQTtBQUMxQyxRQUFBLEtBQUssQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDbkIsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztLQUN0QjtJQUVELE9BQU8sR0FBQTtBQUNMLFFBQUEsSUFBSSxFQUFDLFdBQVcsRUFBQyxHQUFHLElBQUksQ0FBQztRQUN6QixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDcEIsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBQyxJQUFJLEVBQUUsU0FBUyxFQUFDLENBQUMsQ0FBQztRQUU5QyxJQUFJSCxnQkFBTyxDQUFDLFdBQVcsQ0FBQzthQUNyQixPQUFPLENBQUMsUUFBUSxDQUFDO2FBQ2pCLE9BQU8sQ0FBQyxhQUFhLENBQUM7QUFDdEIsYUFBQSxXQUFXLENBQUMsUUFBUSxJQUFJLFFBQVE7QUFDOUIsYUFBQSxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQztBQUN0QixhQUFBLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDO2FBQ3ZCLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQztBQUNuRCxhQUFBLFFBQVEsQ0FBQyxDQUFPLEtBQUssS0FBSSxTQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLGFBQUE7WUFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEdBQUcsS0FBdUIsQ0FBQztBQUNwRSxZQUFBLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztTQUNsQyxDQUFBLENBQUMsQ0FBQyxDQUFDO0tBQ1Q7QUFDRjs7OzsifQ==
