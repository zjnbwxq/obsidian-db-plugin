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

function renderBasicCell(td, cell, field) {
    switch (field.type) {
        case 'string':
            td.setText(String(cell));
            break;
        case 'number':
            td.setText(Number(cell).toString());
            break;
        case 'boolean':
            td.setText(Boolean(cell).toString());
            break;
        case 'array':
            renderArray(td, cell);
            break;
        case 'object':
            renderObject(td, cell);
            break;
        default:
            td.setText(String(cell));
    }
}
function renderArray(td, array, field) {
    const elements = array.split(';');
    td.setText(`Array (${elements.length})`);
    const tooltip = elements.map((item, index) => `${index}: ${item}`).join('\n');
    td.setAttribute('title', tooltip);
}
function renderObject(td, obj, field) {
    const pairs = obj.split('|');
    td.setText('Object');
    const tooltip = pairs.map(pair => {
        const [key, value] = pair.split(':');
        return `${key}: ${value}`;
    }).join('\n');
    td.setAttribute('title', tooltip);
}

function renderDateTimeCell(td, cell, field) {
    switch (field.type) {
        case 'date':
            td.setText(new Date(cell).toLocaleDateString());
            break;
        case 'timedelta':
            td.setText(formatTimeDelta(parseInt(cell)));
            break;
        default:
            td.setText(String(cell));
    }
}
function formatTimeDelta(timeDelta) {
    const days = Math.floor(timeDelta / (24 * 60 * 60 * 1000));
    const hours = Math.floor((timeDelta % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((timeDelta % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((timeDelta % (60 * 1000)) / 1000);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function renderGeospatialCell(td, cell, field) {
    switch (field.type) {
        case 'geo':
            renderGeo(td, cell);
            break;
        case 'polygon':
            renderPolygon(td, cell);
            break;
        default:
            td.setText(String(cell));
    }
    td.addClass('geospatial-cell');
}
function renderGeo(td, geo, field) {
    const [lat, lng] = geo.split('|').map(Number);
    td.setText(`(${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    td.setAttribute('title', `Latitude: ${lat}\nLongitude: ${lng}`);
}
function renderPolygon(td, polygon, field) {
    const points = polygon.split(';').map(point => point.split('|').map(Number));
    td.setText(`Polygon: ${points.length} points`);
    const pointsString = points.map((point, index) => `Point ${index + 1}: (${point[0].toFixed(4)}, ${point[1].toFixed(4)})`).join('\n');
    td.setAttribute('title', pointsString);
}

function renderScientificCell(td, cell, field) {
    switch (field.type) {
        case 'vector':
            renderVector(td, cell);
            break;
        case 'matrix':
            renderMatrix(td, cell);
            break;
        case 'complex':
            renderComplex(td, cell);
            break;
        case 'decimal':
            renderDecimal(td, cell, field);
            break;
        case 'uncertainty':
            renderUncertainty(td, cell);
            break;
        case 'unit':
            renderUnit(td, cell);
            break;
        case 'timeseries':
            renderTimeseries(td, cell);
            break;
        case 'binary':
            renderBinary(td, cell);
            break;
        case 'formula':
            renderFormula(td, cell);
            break;
        case 'distribution':
            renderDistribution(td, cell);
            break;
        default:
            td.setText(String(cell));
    }
}
function renderVector(td, vector, field) {
    const elements = vector.split(';').map(Number);
    td.setText(`[${elements.join(', ')}]`);
    td.setAttribute('title', `Vector: ${elements.join(', ')}`);
}
function renderMatrix(td, matrix, field) {
    const rows = matrix.split(';').map(row => row.split('|').map(Number));
    td.setText(`Matrix: ${rows.length}x${rows[0].length}`);
    const matrixString = rows.map(row => row.join('\t')).join('\n');
    td.setAttribute('title', matrixString);
}
function renderComplex(td, complex, field) {
    const [real, imag] = complex.split('|').map(Number);
    td.setText(`${real} + ${imag}i`);
    td.setAttribute('title', `Complex: ${real} + ${imag}i`);
}
function renderDecimal(td, decimal, field) {
    const value = parseFloat(decimal);
    const precision = field.precision !== undefined ? field.precision : 2;
    td.setText(value.toFixed(precision));
}
function renderUncertainty(td, uncertainty, field) {
    const [value, error] = uncertainty.split('|').map(Number);
    td.setText(`${value} ± ${error}`);
    td.setAttribute('title', `Value: ${value}\nUncertainty: ${error}`);
}
function renderUnit(td, unit, field) {
    const [value, unitSymbol] = unit.split('|');
    td.setText(`${value} ${unitSymbol}`);
    td.setAttribute('title', `Value: ${value}\nUnit: ${unitSymbol}`);
}
function renderTimeseries(td, timeseries, field) {
    const points = timeseries.split(';').map(point => point.split('|').map(Number));
    td.setText(`Timeseries: ${points.length} points`);
    const tooltip = points.map(([time, value]) => `${new Date(time).toISOString()}: ${value}`).join('\n');
    td.setAttribute('title', tooltip);
}
function renderBinary(td, binary, field) {
    td.setText(`Binary: ${binary.length} bytes`);
    td.setAttribute('title', `Binary data: ${binary.substring(0, 20)}...`);
}
function renderFormula(td, formula, field) {
    td.setText(formula);
    td.setAttribute('title', `Formula: ${formula}`);
}
function renderDistribution(td, distribution, field) {
    const [type, params] = distribution.split('|');
    td.setText(`Distribution: ${type}`);
    td.setAttribute('title', `Type: ${type}\nParameters: ${params}`);
}

function renderAcousticCell(td, cell, field) {
    td.addClass('acoustic-cell');
    td.setAttribute('data-type', field.type);
    switch (field.type) {
        case 'audio_signal':
            renderAudioSignal(td, cell, field);
            break;
        case 'frequency_response':
            renderFrequencyResponse(td, cell);
            break;
        case 'sound_pressure_level':
            renderSoundPressureLevel(td, cell);
            break;
        default:
            td.setText(String(cell));
    }
}
function renderAudioSignal(td, signal, field) {
    const samples = signal.split(';').map(Number);
    const sampleRate = field.sampleRate || 44100;
    const duration = samples.length / sampleRate;
    td.setText(`Audio: ${duration.toFixed(2)}s`);
    td.setAttribute('title', `
Duration: ${duration.toFixed(2)} seconds
Sample Rate: ${sampleRate} Hz
Samples: ${samples.length}
Min Amplitude: ${Math.min(...samples).toFixed(2)}
Max Amplitude: ${Math.max(...samples).toFixed(2)}
  `.trim());
}
function renderFrequencyResponse(td, response, field) {
    const points = response.split(';').map(point => point.split('|').map(Number));
    const minFreq = points[0][0];
    const maxFreq = points[points.length - 1][0];
    td.setText(`Freq Response: ${minFreq}-${maxFreq}Hz`);
    td.setAttribute('title', `
Frequency Range: ${minFreq} Hz - ${maxFreq} Hz
Points: ${points.length}
Min Magnitude: ${Math.min(...points.map(p => p[1])).toFixed(2)} dB
Max Magnitude: ${Math.max(...points.map(p => p[1])).toFixed(2)} dB
  `.trim());
}
function renderSoundPressureLevel(td, spl, field) {
    td.setText(`${spl.toFixed(1)} dB`);
    let description = '';
    if (spl < 20)
        description = 'Barely audible';
    else if (spl < 40)
        description = 'Quiet';
    else if (spl < 60)
        description = 'Moderate';
    else if (spl < 80)
        description = 'Loud';
    else if (spl < 100)
        description = 'Very loud';
    else
        description = 'Extremely loud';
    td.setAttribute('title', `
Sound Pressure Level: ${spl.toFixed(1)} dB
Description: ${description}

Reference levels:
0 dB: Threshold of hearing
20 dB: Whisper
60 dB: Normal conversation
90 dB: Lawn mower
120 dB: Rock concert
140 dB: Threshold of pain
  `.trim());
}

function renderChemicalCell(td, cell, field) {
    td.addClass('chemical-cell');
    td.setAttribute('data-type', field.type);
    switch (field.type) {
        case 'molecule':
            renderMolecule(td, cell);
            break;
        case 'chemical_formula':
            renderChemicalFormula(td, cell);
            break;
        case 'reaction':
            renderReaction(td, cell);
            break;
        default:
            td.setText(String(cell));
    }
}
function renderMolecule(td, molecule, field) {
    const [atoms, bonds] = molecule.split(';');
    const atomCount = atoms.split('|').length;
    td.setText(`Molecule: ${atomCount} atoms`);
    td.setAttribute('title', `
Atoms: ${atoms.replace('|', ', ')}
Bonds: ${bonds}
  `.trim());
}
function renderChemicalFormula(td, formula, field) {
    td.setText(formula);
    td.setAttribute('title', `Chemical Formula: ${formula}`);
}
function renderReaction(td, reaction, field) {
    const [reactants, products, conditions] = reaction.split(';');
    const reactionString = `${reactants.replace('|', ' + ')} → ${products.replace('|', ' + ')}`;
    td.setText(reactionString);
    td.setAttribute('title', `
Reaction:
${reactionString}
${conditions ? `Conditions: ${conditions}` : ''}
  `.trim());
}

function renderVisualCell(td, cell, field) {
    td.addClass('visual-cell');
    td.setAttribute('data-type', field.type);
    switch (field.type) {
        case 'color':
            renderColor(td, cell);
            break;
        default:
            td.setText(String(cell));
    }
}
function renderColor(td, color, field) {
    td.setText(color);
    td.style.backgroundColor = color;
    td.style.color = getContrastColor(color);
    td.setAttribute('title', `Color: ${color}`);
}
function getContrastColor(hexColor) {
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'black' : 'white';
}

function renderMiscCell(td, cell, field) {
    td.addClass('misc-cell');
    td.setAttribute('data-type', field.type);
    switch (field.type) {
        case 'url':
            renderUrl(td, cell);
            break;
        case 'email':
            renderEmail(td, cell);
            break;
        case 'phone':
            renderPhone(td, cell);
            break;
        case 'tag':
            renderTag(td, cell);
            break;
        case 'progress':
            renderProgress(td, cell);
            break;
        case 'category':
            renderCategory(td, cell, field);
            break;
        default:
            td.setText(String(cell));
    }
}
function renderUrl(td, url, field) {
    td.setText(url);
    td.setAttribute('title', `URL: ${url}`);
}
function renderEmail(td, email, field) {
    td.setText(email);
    td.setAttribute('title', `Email: ${email}`);
}
function renderPhone(td, phone, field) {
    td.setText(phone);
    td.setAttribute('title', `Phone: ${phone}`);
}
function renderTag(td, tags, field) {
    td.setText(tags);
    td.setAttribute('title', `Tags: ${tags}`);
}
function renderProgress(td, progress, field) {
    const progressValue = parseInt(progress);
    td.setText(`${progressValue}%`);
    td.setAttribute('title', `Progress: ${progressValue}%`);
}
function renderCategory(td, category, field) {
    td.setText(category);
    let title = `Category: ${category}`;
    if (field.categories) {
        let categories;
        if (typeof field.categories === 'string') {
            categories = field.categories.split(';');
        }
        else if (Array.isArray(field.categories)) {
            categories = field.categories;
        }
        else {
            categories = [];
        }
        const index = categories.indexOf(category);
        if (index !== -1) {
            title = `Category ${index + 1} of ${categories.length}`;
        }
    }
    td.setAttribute('title', title);
}

class VirtualScroller {
    constructor(options) {
        this.visibleRows = new Map();
        this.rafId = null;
        this.rowHeights = new Map();
        this.rowCache = new Map();
        this.container = options.container;
        this.rowHeight = options.rowHeight;
        this.totalRows = options.totalRows;
        this.renderRow = options.renderRow;
        this.overscan = options.overscan || 5;
        this.onVisibleRangeChange = options.onVisibleRangeChange;
        this.initializeDOM();
        this.attachEventListeners();
        this.render();
        this.resizeObserver = new ResizeObserver(this.onResize.bind(this));
        this.resizeObserver.observe(this.scrollContainer);
        this.containerResizeObserver = new ResizeObserver(this.onContainerResize.bind(this));
        this.containerResizeObserver.observe(this.container);
    }
    initializeDOM() {
        this.scrollContainer = this.container.createEl('div', { cls: 'virtual-scroll-container' });
        this.scrollContainer.style.height = '100%';
        this.scrollContainer.style.overflowY = 'auto';
        this.contentContainer = this.scrollContainer.createEl('div', { cls: 'virtual-scroll-content' });
        this.contentContainer.style.height = `${this.totalRows * this.rowHeight}px`;
        this.contentContainer.style.position = 'relative';
    }
    attachEventListeners() {
        this.scrollContainer.addEventListener('scroll', () => {
            if (this.rafId === null) {
                this.rafId = requestAnimationFrame(this.onScroll.bind(this));
            }
        });
    }
    onScroll() {
        this.rafId = null;
        this.render();
    }
    onResize(entries) {
        for (let entry of entries) {
            if (entry.target === this.scrollContainer) {
                this.render();
                break;
            }
        }
    }
    onContainerResize(entries) {
        for (let entry of entries) {
            if (entry.target === this.container) {
                this.updateScrollContainerSize();
                this.render();
                break;
            }
        }
    }
    updateScrollContainerSize() {
        this.scrollContainer.style.width = `${this.container.clientWidth}px`;
        this.scrollContainer.style.height = `${this.container.clientHeight}px`;
    }
    getRowTop(index) {
        let top = 0;
        for (let i = 0; i < index; i++) {
            top += this.rowHeights.get(i) || this.rowHeight;
        }
        return top;
    }
    setRowHeight(index, height) {
        this.rowHeights.set(index, height);
        this.updateContentHeight();
    }
    updateContentHeight() {
        let totalHeight = 0;
        for (let i = 0; i < this.totalRows; i++) {
            totalHeight += this.rowHeights.get(i) || this.rowHeight;
        }
        this.contentContainer.style.height = `${totalHeight}px`;
    }
    render() {
        const scrollTop = this.scrollContainer.scrollTop;
        const viewportHeight = this.scrollContainer.clientHeight;
        let startIndex = 0;
        let currentTop = 0;
        while (currentTop < scrollTop && startIndex < this.totalRows) {
            currentTop += this.rowHeights.get(startIndex) || this.rowHeight;
            startIndex++;
        }
        startIndex = Math.max(0, startIndex - this.overscan);
        let endIndex = startIndex;
        while (currentTop < scrollTop + viewportHeight && endIndex < this.totalRows) {
            currentTop += this.rowHeights.get(endIndex) || this.rowHeight;
            endIndex++;
        }
        endIndex = Math.min(this.totalRows, endIndex + this.overscan);
        const visibleIndexes = new Set();
        for (let i = startIndex; i < endIndex; i++) {
            visibleIndexes.add(i);
            if (!this.visibleRows.has(i)) {
                let rowElement = this.rowCache.get(i);
                if (!rowElement) {
                    rowElement = this.renderRow(i);
                    this.rowCache.set(i, rowElement);
                }
                rowElement.style.position = 'absolute';
                rowElement.style.top = `${this.getRowTop(i)}px`;
                rowElement.style.width = '100%';
                this.contentContainer.appendChild(rowElement);
                this.visibleRows.set(i, rowElement);
            }
        }
        for (const [index, element] of this.visibleRows) {
            if (!visibleIndexes.has(index)) {
                element.remove();
                this.visibleRows.delete(index);
            }
        }
        if (this.onVisibleRangeChange) {
            this.onVisibleRangeChange(startIndex, endIndex);
        }
    }
    setTotalRows(totalRows) {
        this.totalRows = totalRows;
        this.contentContainer.style.height = `${this.totalRows * this.rowHeight}px`;
    }
    refresh() {
        this.visibleRows.clear();
        this.contentContainer.innerHTML = '';
        this.render();
    }
    destroy() {
        this.resizeObserver.disconnect();
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
        }
        this.scrollContainer.removeEventListener('scroll', this.onScroll);
        this.containerResizeObserver.disconnect();
    }
    invalidateRow(index) {
        this.rowCache.delete(index);
        const rowElement = this.visibleRows.get(index);
        if (rowElement) {
            rowElement.remove();
            this.visibleRows.delete(index);
        }
    }
}

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

var FileSaver_min = {exports: {}};

(function (module, exports) {
	(function(a,b){b();})(commonjsGlobal,function(){function b(a,b){return "undefined"==typeof b?b={autoBom:!1}:"object"!=typeof b&&(console.warn("Deprecated: Expected third argument to be a object"),b={autoBom:!b}),b.autoBom&&/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(a.type)?new Blob(["\uFEFF",a],{type:a.type}):a}function c(a,b,c){var d=new XMLHttpRequest;d.open("GET",a),d.responseType="blob",d.onload=function(){g(d.response,b,c);},d.onerror=function(){console.error("could not download file");},d.send();}function d(a){var b=new XMLHttpRequest;b.open("HEAD",a,!1);try{b.send();}catch(a){}return 200<=b.status&&299>=b.status}function e(a){try{a.dispatchEvent(new MouseEvent("click"));}catch(c){var b=document.createEvent("MouseEvents");b.initMouseEvent("click",!0,!0,window,0,0,0,80,20,!1,!1,!1,!1,0,null),a.dispatchEvent(b);}}var f="object"==typeof window&&window.window===window?window:"object"==typeof self&&self.self===self?self:"object"==typeof commonjsGlobal&&commonjsGlobal.global===commonjsGlobal?commonjsGlobal:void 0,a=f.navigator&&/Macintosh/.test(navigator.userAgent)&&/AppleWebKit/.test(navigator.userAgent)&&!/Safari/.test(navigator.userAgent),g=f.saveAs||("object"!=typeof window||window!==f?function(){}:"download"in HTMLAnchorElement.prototype&&!a?function(b,g,h){var i=f.URL||f.webkitURL,j=document.createElement("a");g=g||b.name||"download",j.download=g,j.rel="noopener","string"==typeof b?(j.href=b,j.origin===location.origin?e(j):d(j.href)?c(b,g,h):e(j,j.target="_blank")):(j.href=i.createObjectURL(b),setTimeout(function(){i.revokeObjectURL(j.href);},4E4),setTimeout(function(){e(j);},0));}:"msSaveOrOpenBlob"in navigator?function(f,g,h){if(g=g||f.name||"download","string"!=typeof f)navigator.msSaveOrOpenBlob(b(f,h),g);else if(d(f))c(f,g,h);else {var i=document.createElement("a");i.href=f,i.target="_blank",setTimeout(function(){e(i);});}}:function(b,d,e,g){if(g=g||open("","_blank"),g&&(g.document.title=g.document.body.innerText="downloading..."),"string"==typeof b)return c(b,d,e);var h="application/octet-stream"===b.type,i=/constructor/i.test(f.HTMLElement)||f.safari,j=/CriOS\/[\d]+/.test(navigator.userAgent);if((j||h&&i||a)&&"undefined"!=typeof FileReader){var k=new FileReader;k.onloadend=function(){var a=k.result;a=j?a:a.replace(/^data:[^;]*;/,"data:attachment/file;"),g?g.location.href=a:location=a,g=null;},k.readAsDataURL(b);}else {var l=f.URL||f.webkitURL,m=l.createObjectURL(b);g?g.location=m:location.href=m,g=null,setTimeout(function(){l.revokeObjectURL(m);},4E4);}});f.saveAs=g.saveAs=g,(module.exports=g);});

	
} (FileSaver_min));

const DATABASE_VIEW_TYPE = 'database-view';
class DatabaseView extends obsidian.ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.tables = [];
        this.tableStates = [];
        this.sortStates = new Map();
        this.tableElements = new Map();
        this.selectedTables = new Set();
        this.virtualScrollers = new Map();
        this.pageSize = 100; // 每页加载的行数
        this.currentPage = 0;
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
            debug("DatabaseView onOpen method called");
            const container = this.containerEl.children[1];
            container.empty();
            container.addClass('database-view-container');
            // 添加顶部栏
            const topBar = container.createEl('div', { cls: 'database-view-top-bar' });
            debug(`Top bar created: ${topBar ? 'success' : 'failed'}`);
            // 添加导出类型选择下拉框
            this.exportTypeSelect = topBar.createEl('select', { cls: 'export-type-select' });
            this.exportTypeSelect.createEl('option', { value: 'csv', text: 'CSV' });
            this.exportTypeSelect.createEl('option', { value: 'json', text: 'JSON' });
            // 加导出按钮
            this.exportButton = new obsidian.ButtonComponent(topBar)
                .setButtonText('导出')
                .onClick(() => this.openExportModal());
            debug(`Export button created: ${this.exportButton ? 'success' : 'failed'}`);
            // 添加导入按钮
            this.importButton = new obsidian.ButtonComponent(topBar)
                .setButtonText('导入')
                .onClick(() => this.importData());
            debug(`Import button created: ${this.importButton ? 'success' : 'failed'}`);
            // 渲染表格
            this.renderTables();
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
            searchTerm: '',
            currentData: table.data.slice(1, this.pageSize + 1) // 从第二行开始加载数据
        }));
        debug(`Tables set: ${tables.length} tables`);
        this.renderTables();
        this.checkButtonVisibility();
        this.app.workspace.updateOptions();
    }
    getTables() {
        return this.tables;
    }
    renderTables() {
        debug(`Rendering tables: ${JSON.stringify(this.tableStates)}`);
        const container = this.containerEl.children[1];
        const tablesContainer = container.querySelector('.database-tables-container') || container.createEl('div', { cls: 'database-tables-container' });
        tablesContainer.empty();
        this.tableStates.forEach(state => {
            const tableContainer = tablesContainer.createEl('div', { cls: 'database-table-container' });
            const tableHeader = tableContainer.createEl('div', { cls: 'database-table-header' });
            tableHeader.createEl('h3', { text: state.table.name });
            const searchInput = new obsidian.TextComponent(tableHeader)
                .setPlaceholder('搜索...')
                .onChange(value => {
                state.searchTerm = value;
                this.updateTable(state);
            });
            searchInput.inputEl.addClass('search-input');
            const tableElement = tableContainer.createEl('div', { cls: 'database-table' });
            this.createVirtualScroller(state, tableElement);
            // 确保数据加载
            this.loadPage(state, 0);
        });
    }
    createVirtualScroller(state, container) {
        console.log('Creating virtual scroller for table:', state.table.name);
        const headerRow = container.createEl('div', { cls: 'database-row header-row' });
        state.table.fields.forEach((field, index) => {
            const th = headerRow.createEl('div', { cls: 'database-cell header-cell', text: field.name });
            th.addEventListener('click', () => this.sortTable(state, index));
        });
        const virtualScroller = new VirtualScroller({
            container: container,
            rowHeight: 30,
            totalRows: state.table.data.length,
            renderRow: (index) => this.renderRow(state, index),
            onVisibleRangeChange: (startIndex, endIndex) => this.onVisibleRangeChange(state, startIndex, endIndex),
        });
        this.virtualScrollers.set(state.table.name, virtualScroller);
    }
    renderRow(state, index) {
        console.log('Rendering row:', index, 'for table:', state.table.name);
        const row = state.table.data[index];
        const rowElement = document.createElement('div');
        rowElement.classList.add('database-row');
        row.forEach((cell, cellIndex) => {
            const cellElement = document.createElement('div');
            cellElement.classList.add('database-cell');
            const field = state.table.fields[cellIndex];
            this.renderCell(cellElement, cell, field);
            rowElement.appendChild(cellElement);
        });
        return rowElement;
    }
    renderCell(td, cell, field) {
        switch (field.type) {
            case 'string':
            case 'number':
            case 'boolean':
            case 'array':
            case 'object':
                renderBasicCell(td, cell, field);
                break;
            case 'date':
            case 'timedelta':
                renderDateTimeCell(td, cell, field);
                break;
            case 'geo':
            case 'polygon':
                renderGeospatialCell(td, cell, field);
                break;
            case 'vector':
            case 'matrix':
            case 'complex':
            case 'decimal':
            case 'uncertainty':
            case 'unit':
            case 'timeseries':
            case 'binary':
            case 'formula':
            case 'distribution':
            case 'function':
            case 'interval':
            case 'currency':
            case 'regex':
            case 'ipaddress':
            case 'uuid':
            case 'version':
            case 'bitfield':
            case 'enum':
            case 'fuzzy':
            case 'quaternion':
                renderScientificCell(td, cell, field);
                break;
            case 'audio_signal':
            case 'frequency_response':
            case 'sound_pressure_level':
                renderAcousticCell(td, cell, field);
                break;
            case 'molecule':
            case 'chemical_formula':
            case 'reaction':
                renderChemicalCell(td, cell, field);
                break;
            case 'color':
                renderVisualCell(td, cell, field);
                break;
            case 'url':
            case 'email':
            case 'phone':
            case 'tag':
            case 'progress':
            case 'category':
                renderMiscCell(td, cell, field);
                break;
            default:
                td.setText(String(cell));
        }
        // 添加完整信息作为 title 属性
        const fullInfo = this.getFullInfo(cell, field);
        td.setAttribute('title', fullInfo);
    }
    getFullInfo(cell, field) {
        switch (field.type) {
            case 'string':
            case 'number':
            case 'boolean':
                return String(cell);
            case 'date':
                return new Date(cell).toLocaleString();
            case 'array':
                return JSON.stringify(cell);
            case 'object':
                return JSON.stringify(cell, null, 2);
            // 添加其他类型的处理...
            default:
                return String(cell);
        }
    }
    sortTable(state, columnIndex) {
        var _a;
        state.table.fields[columnIndex];
        const currentDirection = ((_a = this.sortStates.get(state.table)) === null || _a === void 0 ? void 0 : _a.direction) || 'asc';
        const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
        state.currentData = [...state.currentData].sort((a, b) => {
            const valueA = a[columnIndex];
            const valueB = b[columnIndex];
            let comparison = 0;
            if (valueA < valueB)
                comparison = -1;
            if (valueA > valueB)
                comparison = 1;
            return newDirection === 'asc' ? comparison : -comparison;
        });
        this.sortStates.set(state.table, { column: columnIndex, direction: newDirection });
        this.renderTables();
    }
    openExportModal() {
        new ExportModal(this.app, this.tables, (selectedTables) => {
            const format = this.exportTypeSelect.value;
            if (format) {
                this.exportData(selectedTables, format);
            }
            else {
                new obsidian.Notice('请选择导出格式');
            }
        }).open();
    }
    exportData(selectedTables, format) {
        const tables = this.tables.filter(table => selectedTables.includes(table.name));
        let content = '';
        if (format === 'csv') {
            content = this.generateCSVContent(tables);
        }
        else if (format === 'json') {
            content = this.generateJSONContent(tables);
        }
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        FileSaver_min.exports.saveAs(blob, `database_export.${format}`);
    }
    generateCSVContent(tables) {
        return tables.map(table => {
            const header = `db:${table.name}\n${table.fields.map(f => f.type).join(',')}\n${table.fields.map(f => f.name).join(',')}`;
            const rows = table.data.map(row => row.map((cell, index) => this.formatCellForCSV(cell, table.fields[index].type)).join(','));
            return `${header}\n${rows.join('\n')}`;
        }).join('\n\n');
    }
    generateJSONContent(tables) {
        const data = tables.map(table => ({
            name: table.name,
            fields: table.fields,
            data: table.data.map(row => row.map((cell, index) => this.formatCellForJSON(cell, table.fields[index].type)))
        }));
        return JSON.stringify(data, null, 2);
    }
    formatCellForCSV(value, type) {
        switch (type) {
            case 'array':
            case 'object':
                return `"${value.replace(/"/g, '""')}"`;
            case 'number':
            case 'boolean':
                return value;
            default:
                return `"${value.replace(/"/g, '""')}"`;
        }
    }
    formatCellForJSON(value, type) {
        switch (type) {
            case 'array':
                return value.split(';').map(item => item.trim());
            case 'object':
                try {
                    return JSON.parse(value);
                }
                catch (_a) {
                    return value;
                }
            case 'number':
                return Number(value);
            case 'boolean':
                return value.toLowerCase() === 'true';
            default:
                return value;
        }
    }
    importData() {
        return __awaiter(this, void 0, void 0, function* () {
            new ImportMethodModal(this.app, (method) => __awaiter(this, void 0, void 0, function* () {
                let content = '';
                if (method === 'file') {
                    const file = yield this.selectFile();
                    content = yield file.text();
                }
                else if (method === 'clipboard') {
                    content = yield navigator.clipboard.readText();
                }
                try {
                    const cleanedContent = this.cleanImportedContent(content);
                    const tables = this.parseImportedData(cleanedContent);
                    if (tables.length === 0) {
                        throw new Error('没有解析到任何表格数据');
                    }
                    // 让用户选择目标 Markdown 文件
                    const targetFile = yield this.selectTargetFile();
                    if (!targetFile) {
                        throw new Error('未选择目标文件');
                    }
                    // 将数据写入选择的文件
                    const currentContent = yield this.app.vault.read(targetFile);
                    const newContent = this.formatTablesForOriginalFormat(tables);
                    yield this.app.vault.modify(targetFile, currentContent + '\n\n' + newContent);
                    // 重新读取文件并更新视图
                    yield this.reloadFileAndUpdateView(targetFile);
                    new obsidian.Notice('数据导入成功,请手动添加表格命名和定义行');
                }
                catch (error) {
                    console.error('导入失败:', error);
                    new obsidian.Notice('导入失败,请检查数据格式');
                }
            })).open();
        });
    }
    cleanImportedContent(content) {
        // 去除可能被 Obsidian 识别为特殊语法的字符
        return content.replace(/["'\[\]{}]/g, '');
    }
    parseImportedData(content) {
        const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length < 1)
            throw new Error('导入的数据格式不正确');
        const table = {
            name: 'ImportedTable',
            fields: [],
            data: []
        };
        // 将所有数据作为字符串处理
        for (let i = 0; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            table.data.push(values);
        }
        return [table];
    }
    formatTablesForOriginalFormat(tables) {
        return tables.map(table => {
            const rows = table.data.map(row => row.join(','));
            return `db:${table.name}\n${rows.join('\n')}`;
        }).join('\n\n');
    }
    selectTargetFile() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                const files = this.app.vault.getMarkdownFiles();
                const modal = new FileSuggestModal(this.app, files, (file) => {
                    resolve(file);
                });
                modal.open();
            });
        });
    }
    reloadFileAndUpdateView(file) {
        return __awaiter(this, void 0, void 0, function* () {
            const content = yield this.app.vault.read(file);
            const tables = this.parseTablesFromMarkdown(content);
            this.setTables(tables);
        });
    }
    parseTablesFromMarkdown(content) {
        const tables = [];
        const lines = content.split('\n');
        let currentTable = null;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('db:')) {
                if (currentTable) {
                    tables.push(currentTable);
                }
                currentTable = {
                    name: line.substring(3).trim(),
                    fields: [],
                    data: []
                };
            }
            else if (currentTable) {
                const values = this.parseCSVLine(line);
                if (values.length > 0) {
                    currentTable.data.push(values);
                }
            }
        }
        if (currentTable) {
            tables.push(currentTable);
        }
        return tables;
    }
    parseCSVLine(line) {
        const values = [];
        let currentValue = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            }
            else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim().replace(/^"(.*)"$/, '$1'));
                currentValue = '';
            }
            else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim().replace(/^"(.*)"$/, '$1'));
        return values;
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
            const exportButtonEl = this.exportButton.buttonEl;
            const importButtonEl = this.importButton.buttonEl;
            debug(`Export button visibility: ${exportButtonEl.offsetParent !== null}`);
            debug(`Import button visibility: ${importButtonEl.offsetParent !== null}`);
        }
        else {
            warn('Export or import button not initialized');
        }
    }
    checkButtonVisibilityWithDelay() {
        setTimeout(() => {
            this.checkButtonVisibility();
        }, 100); // 100ms 延迟
    }
    loadPage(state, page) {
        return __awaiter(this, void 0, void 0, function* () {
            const start = page * this.pageSize;
            const end = Math.min(start + this.pageSize, state.table.data.length);
            state.currentData = state.table.data.slice(start, end);
            this.updateTable(state);
        });
    }
    fetchDataRange(table, start, end) {
        return __awaiter(this, void 0, void 0, function* () {
            // 这里应该实现实际的数据获取逻辑
            // 为了示例，我们只返回一个数据子集
            return table.data.slice(start, end);
        });
    }
    onVisibleRangeChange(state, startIndex, endIndex) {
        const requiredPage = Math.floor(startIndex / this.pageSize);
        if (requiredPage !== this.currentPage) {
            this.loadPage(state, requiredPage);
        }
    }
    updateCell(state, rowIndex, columnIndex, newValue) {
        state.currentData[rowIndex][columnIndex] = newValue;
        const virtualScroller = this.virtualScrollers.get(state.table.name);
        if (virtualScroller) {
            virtualScroller.invalidateRow(rowIndex);
        }
    }
    updateTable(state) {
        const virtualScroller = this.virtualScrollers.get(state.table.name);
        if (virtualScroller) {
            virtualScroller.setTotalRows(state.currentData.length);
            virtualScroller.refresh();
        }
        this.updateSortIndicators(state);
    }
    updateSortIndicators(state) {
        const headerCells = this.containerEl.querySelectorAll('.header-cell');
        headerCells.forEach((cell, index) => {
            cell.classList.remove('sorted', 'asc', 'desc');
            const sortState = this.sortStates.get(state.table);
            if (sortState && sortState.column === index) {
                cell.classList.add('sorted', sortState.direction);
            }
        });
    }
    initializeTableState(table) {
        return {
            table: table,
            searchTerm: '',
            currentData: [...table.data], // 创建数据的副本
        };
    }
    selectFile() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.csv,.json';
                input.onchange = (e) => {
                    var _a;
                    const file = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
                    if (file)
                        resolve(file);
                };
                input.click();
            });
        });
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
class FileSuggestModal extends obsidian.FuzzySuggestModal {
    constructor(app, files, onChoose) {
        super(app);
        this.files = files;
        this.onChoose = onChoose;
    }
    getItems() {
        return this.files;
    }
    getItemText(file) {
        return file.path;
    }
    onChooseItem(file, evt) {
        this.onChoose(file);
    }
}

function parseDatabase(markdown) {
    const tables = [];
    const lines = markdown.split('\n');
    let currentTable = null;
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
        }
        else if (currentTable) {
            const cells = trimmedLine.split(',').map(cell => cell.trim());
            if (isParsingFields) {
                // 解析字段类型
                currentTable.fields = cells.map(cell => ({ name: '', type: cell }));
                isParsingFields = false;
            }
            else if (currentTable.fields[0].name === '') {
                // 解析字段名称
                cells.forEach((cell, index) => {
                    if (index < currentTable.fields.length) {
                        currentTable.fields[index].name = cell;
                    }
                });
            }
            else {
                // 解析数据行
                currentTable.data.push(cells);
            }
        }
    }
    if (currentTable) {
        tables.push(currentTable);
    }
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
                new obsidian.Notice('无法创建');
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
                const fieldType = table.fields[index].type;
                const rowValue = this.parseComplexDataType(row[index], table.fields[index]);
                switch (fieldType) {
                    case 'string':
                    case 'number':
                    case 'boolean':
                    case 'date':
                    case 'timedelta':
                    case 'url':
                    case 'email':
                    case 'phone':
                    case 'progress':
                    case 'category':
                    case 'tag':
                    case 'binary':
                        return rowValue.value === value;
                    case 'array':
                        return rowValue.value.every((item) => item === value);
                    case 'object':
                        // 对于对象类型，检查是否包含指定的键值对
                        return Object.entries(value).every(([k, v]) => rowValue.value[k] === v);
                    case 'polygon':
                        // 对于多边形类型，检查是否包含指定的点
                        const point = value;
                        return this.isPointInPolygon(point, rowValue.value);
                    case 'vector':
                        // 对于向量类型，检查是否在指定范围内
                        const queryVector = value;
                        const rowVector = rowValue.value;
                        return this.areVectorsEqual(queryVector, rowVector, 0.01); // 允许0.01的误差
                    case 'matrix':
                        // 对于矩阵类型，检查是否所有元素都相等
                        const queryMatrix = value;
                        const rowMatrix = rowValue.value;
                        return this.areMatricesEqual(queryMatrix, rowMatrix, 0.01); // 允许0.01的误差
                    case 'complex':
                        // 对于复数类型，检查实部和虚部是否在指定范围内
                        const queryComplex = value;
                        const rowComplex = rowValue.value;
                        return Math.abs(queryComplex.real - rowComplex.real) <= 0.01 &&
                            Math.abs(queryComplex.imag - rowComplex.imag) <= 0.01; // 允许0.01的误差
                    case 'molecule':
                        debug(`解析分子数据: ${value}`);
                        const [atoms, bonds] = value.split(';');
                        const atomList = atoms.split('|').map((atom) => {
                            const [element, count] = atom.split(':');
                            return { element, count: parseInt(count) };
                        });
                        const bondList = bonds ? bonds.split('|').map((bond) => {
                            const [atom1, atom2] = bond.split('-').map(Number);
                            return { atom1, atom2 };
                        }) : [];
                        const moleculeValue = { atoms: atomList, bonds: bondList };
                        info(`分子解析结果: ${JSON.stringify(moleculeValue)}`);
                        return { type: 'molecule', value: moleculeValue, metadata: {
                                atomCount: atomList.reduce((sum, atom) => sum + atom.count, 0),
                                bondCount: bondList.length
                            } };
                    case 'chemical_formula':
                        debug(`解析化学式数据: ${value}`);
                        const elements = value.match(/([A-Z][a-z]*)(\d*)/g) || [];
                        const formulaValue = elements.map((element) => {
                            const [, symbol, count] = element.match(/([A-Z][a-z]*)(\d*)/) || [];
                            return { symbol, count: count ? parseInt(count) : 1 };
                        });
                        info(`化学式解析结果: ${JSON.stringify(formulaValue)}`);
                        return { type: 'chemical_formula', value: formulaValue, metadata: {
                                elementCount: formulaValue.length,
                                totalAtoms: formulaValue.reduce((sum, element) => sum + element.count, 0)
                            } };
                    case 'reaction':
                        debug(`解析化学反应数据: ${value}`);
                        const [reactants, products] = value.split('->').map((side) => side.trim().split('+').map((compound) => compound.trim()));
                        const reactionValue = { reactants, products };
                        info(`化学反应解析结果: ${JSON.stringify(reactionValue)}`);
                        return { type: 'reaction', value: reactionValue, metadata: {
                                reactantCount: reactants.length,
                                productCount: products.length,
                                isBalanced: this.isReactionBalanced(reactants, products)
                            } };
                    case 'timeseries':
                        debug(`解析时间序列数据: ${value}`);
                        const timeseriesPoints = value.split('|').map((point) => {
                            const [timestamp, dataValue] = point.split(',');
                            return { timestamp: new Date(timestamp), value: Number(dataValue) };
                        });
                        info(`时间序列解析结果: ${JSON.stringify(timeseriesPoints)}`);
                        return { type: 'timeseries', value: timeseriesPoints, metadata: {
                                pointCount: timeseriesPoints.length,
                                startTime: timeseriesPoints[0].timestamp,
                                endTime: timeseriesPoints[timeseriesPoints.length - 1].timestamp,
                                minValue: Math.min(...timeseriesPoints.map((p) => p.value)),
                                maxValue: Math.max(...timeseriesPoints.map((p) => p.value))
                            } };
                    case 'formula':
                        debug(`解析公式数据: ${value}`);
                        info(`公式解析结果: ${value}`);
                        return { type: 'formula', value, metadata: {
                                variables: value.match(/[a-zA-Z]+/g) || [],
                                operators: value.match(/[\+\-\*\/\^\(\)]/g) || []
                            } };
                    case 'distribution':
                        debug(`解析分布数据: ${value}`);
                        const [distributionType, ...params] = value.split('|');
                        const distributionParams = Object.fromEntries(params.map((param) => {
                            const [key, val] = param.split(':');
                            return [key, Number(val)];
                        }));
                        info(`分布解析结果: ${JSON.stringify({ type: distributionType, params: distributionParams })}`);
                        return { type: 'distribution', value: { type: distributionType, params: distributionParams }, metadata: {
                                distributionType,
                                parameterCount: Object.keys(distributionParams).length
                            } };
                    default:
                        return rowValue.value === value;
                }
            });
        }).map(row => row.map((cell, index) => this.parseComplexDataType(cell, table.fields[index])));
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
        return table.data.slice(start, end + 1).map(row => this.parseComplexDataType(row[columnIndex], table.fields[columnIndex]));
    }
    // 添加一个方法来触发数据更新回调
    triggerDataUpdate(updatedTables) {
        this.dataUpdateCallbacks.forEach(callback => callback(updatedTables));
    }
    // 在数据更新时用此方法
    updateData(updatedTables) {
        // 更新数据的逻辑
        // ...
        // 触发数据更新回调
        this.triggerDataUpdate(updatedTables);
    }
    parseComplexDataType(value, field) {
        const metadata = field.metadata || {};
        switch (field.type) {
            case 'string':
                return { type: 'string', value, metadata: { length: value.length } };
            case 'number':
                return { type: 'number', value, metadata: { isInteger: Number.isInteger(value) } };
            case 'boolean':
                return { type: 'boolean', value, metadata: {} };
            case 'date':
                const date = new Date(value);
                return { type: 'date', value, metadata: {
                        year: date.getFullYear(),
                        month: date.getMonth() + 1,
                        day: date.getDate(),
                        dayOfWeek: date.getDay()
                    } };
            case 'timedelta':
                debug(`解析时间差数据: ${value}`);
                const [amount, unit] = value.split(' ');
                const timeDeltaValue = { amount: Number(amount), unit };
                info(`时间差解析结果: ${JSON.stringify(timeDeltaValue)}`);
                return { type: 'timedelta', value: timeDeltaValue, metadata: {
                        milliseconds: this.convertToMilliseconds(Number(amount), unit)
                    } };
            case 'url':
                const url = new URL(value);
                return { type: 'url', value, metadata: {
                        protocol: url.protocol,
                        hostname: url.hostname,
                        pathname: url.pathname
                    } };
            case 'email':
                const [localPart, domain] = value.split('@');
                return { type: 'email', value, metadata: { localPart, domain } };
            case 'phone':
                return { type: 'phone', value, metadata: {
                        countryCode: value.split(' ')[0],
                        number: value.split(' ').slice(1).join('')
                    } };
            case 'progress':
                const progress = Number(value);
                return { type: 'progress', value, metadata: {
                        percentage: progress,
                        isComplete: progress === 100
                    } };
            case 'category':
            case 'tag':
                return { type: field.type, value, metadata: {} };
            case 'binary':
                return { type: 'binary', value, metadata: { length: value.length } };
            case 'array':
                const arrayValue = value.split(';').map((item) => item.trim());
                return { type: 'array', value: arrayValue, metadata: { length: arrayValue.length } };
            case 'object':
                debug(`解析对象类型数据: ${value}`);
                const objectValue = {};
                value.split('|').forEach((pair) => {
                    const [key, val] = pair.split(':');
                    objectValue[key.trim()] = val.trim();
                });
                info(`对象解析结果: ${JSON.stringify(objectValue)}`);
                return { type: 'object', value: objectValue, metadata: {
                        keys: Object.keys(objectValue),
                        size: Object.keys(objectValue).length
                    } };
            case 'geo':
                debug(`解析地理坐标数据: ${value}`);
                const [lat, lng] = value.split('|').map(Number);
                const geoValue = { lat, lng };
                info(`地理坐标解析结果: ${JSON.stringify(geoValue)}`);
                return { type: 'geo', value: geoValue, metadata: {
                        latitude: lat,
                        longitude: lng
                    } };
            case 'polygon':
                debug(`解析多边形数据: ${value}`);
                const points = value.split('|').map((point) => {
                    const [x, y] = point.split(',').map(Number);
                    return { x, y };
                });
                info(`多边形解析结果: ${JSON.stringify(points)}`);
                return { type: 'polygon', value: points, metadata: {
                        vertices: points.length,
                        perimeter: this.calculatePolygonPerimeter(points)
                    } };
            case 'vector':
                debug(`解析向量数据: ${value}`);
                const components = value.split(',').map(Number);
                info(`向量解析结果: ${JSON.stringify(components)}`);
                return { type: 'vector', value: components, metadata: {
                        dimensions: components.length,
                        magnitude: Math.sqrt(components.reduce((sum, comp) => sum + comp * comp, 0))
                    } };
            case 'matrix':
                debug(`解析矩阵数据: ${value}`);
                const rows = value.split('|').map((row) => row.split(',').map(Number));
                info(`矩阵解析结果: ${JSON.stringify(rows)}`);
                return { type: 'matrix', value: rows, metadata: {
                        rows: rows.length,
                        columns: rows[0].length,
                        isSquare: rows.length === rows[0].length
                    } };
            case 'complex':
                debug(`解析复数数据: ${value}`);
                const [real, imag] = value.split(',').map(Number);
                const complexValue = { real, imag };
                info(`复数解析结果: ${JSON.stringify(complexValue)}`);
                return { type: 'complex', value: complexValue, metadata: {
                        magnitude: Math.sqrt(real * real + imag * imag),
                        angle: Math.atan2(imag, real)
                    } };
            case 'audio_signal':
                debug(`解析音频信号数据: ${value}`);
                const [amplitude, frequency, duration] = value.split(',').map(Number);
                const audioSignalValue = { amplitude, frequency, duration };
                info(`音频信号解析结果: ${JSON.stringify(audioSignalValue)}`);
                return { type: 'audio_signal', value: audioSignalValue, metadata: {
                        maxAmplitude: amplitude,
                        period: 1 / frequency,
                        wavelength: 343 / frequency // 设声速为343m/s
                    } };
            case 'frequency_response':
                debug(`解析频率响应数据: ${value}`);
                const frequencyResponsePoints = value.split('|').map((point) => {
                    const [freq, magnitude] = point.split(',').map(Number);
                    return { frequency: freq, magnitude };
                });
                info(`频率响应解析结果: ${JSON.stringify(frequencyResponsePoints)}`);
                return { type: 'frequency_response', value: frequencyResponsePoints, metadata: {
                        pointCount: frequencyResponsePoints.length,
                        minFrequency: Math.min(...frequencyResponsePoints.map(p => p.frequency)),
                        maxFrequency: Math.max(...frequencyResponsePoints.map(p => p.frequency)),
                        minMagnitude: Math.min(...frequencyResponsePoints.map(p => p.magnitude)),
                        maxMagnitude: Math.max(...frequencyResponsePoints.map(p => p.magnitude))
                    } };
            case 'sound_pressure_level':
                debug(`解析声压级数据: ${value}`);
                const spl = Number(value);
                info(`声压级解析结果: ${spl}`);
                return { type: 'sound_pressure_level', value: spl, metadata: {
                        intensity: Math.pow(10, spl / 10) * 1e-12,
                        pressure: Math.pow(10, spl / 20) * 2e-5 // Pa
                    } };
            default:
                return { type: field.type, value, metadata };
        }
    }
    calculatePolygonPerimeter(points) {
        let perimeter = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            const dx = points[i].x - points[j].x;
            const dy = points[i].y - points[j].y;
            perimeter += Math.sqrt(dx * dx + dy * dy);
        }
        return perimeter;
    }
    isPointInPolygon(point, polygon) {
        // 实现点是否在多边形内的检查逻辑
        // 这里使用射线法来判断点是否多边形内
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect)
                inside = !inside;
        }
        return inside;
    }
    areVectorsEqual(v1, v2, epsilon) {
        if (v1.length !== v2.length)
            return false;
        return v1.every((value, index) => Math.abs(value - v2[index]) <= epsilon);
    }
    areMatricesEqual(m1, m2, epsilon) {
        if (m1.length !== m2.length || m1[0].length !== m2[0].length)
            return false;
        for (let i = 0; i < m1.length; i++) {
            for (let j = 0; j < m1[0].length; j++) {
                if (Math.abs(m1[i][j] - m2[i][j]) > epsilon)
                    return false;
            }
        }
        return true;
    }
    convertToMilliseconds(amount, unit) {
        const conversions = {
            'ms': 1,
            's': 1000,
            'm': 60000,
            'h': 3600000,
            'd': 86400000
        };
        return amount * (conversions[unit] || 0);
    }
    isReactionBalanced(reactants, products) {
        // 这里应该实现一个检查化学反应是否平衡的逻辑
        // 由于这需要复杂的化学计算，这里只是一个简单的占位实现
        return reactants.length === products.length;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInNyYy91dGlscy9sb2dnZXIudHMiLCJzcmMvcmVuZGVyZXJzL0Jhc2ljUmVuZGVyZXIudHMiLCJzcmMvcmVuZGVyZXJzL0RhdGVUaW1lUmVuZGVyZXIudHMiLCJzcmMvcmVuZGVyZXJzL0dlb3NwYXRpYWxSZW5kZXJlci50cyIsInNyYy9yZW5kZXJlcnMvU2NpZW50aWZpY1JlbmRlcmVyLnRzIiwic3JjL3JlbmRlcmVycy9BY291c3RpY1JlbmRlcmVyLnRzIiwic3JjL3JlbmRlcmVycy9DaGVtaWNhbFJlbmRlcmVyLnRzIiwic3JjL3JlbmRlcmVycy9WaXN1YWxSZW5kZXJlci50cyIsInNyYy9yZW5kZXJlcnMvTWlzY1JlbmRlcmVyLnRzIiwic3JjL1ZpcnR1YWxTY3JvbGxlci50cyIsIm5vZGVfbW9kdWxlcy9maWxlLXNhdmVyL2Rpc3QvRmlsZVNhdmVyLm1pbi5qcyIsInNyYy9EYXRhYmFzZVZpZXcudHMiLCJzcmMvZGF0YWJhc2VQYXJzZXIudHMiLCJzcmMvbWFpbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbkNvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLlxyXG5cclxuUGVybWlzc2lvbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgYW5kL29yIGRpc3RyaWJ1dGUgdGhpcyBzb2Z0d2FyZSBmb3IgYW55XHJcbnB1cnBvc2Ugd2l0aCBvciB3aXRob3V0IGZlZSBpcyBoZXJlYnkgZ3JhbnRlZC5cclxuXHJcblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIgQU5EIFRIRSBBVVRIT1IgRElTQ0xBSU1TIEFMTCBXQVJSQU5USUVTIFdJVEhcclxuUkVHQVJEIFRPIFRISVMgU09GVFdBUkUgSU5DTFVESU5HIEFMTCBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZXHJcbkFORCBGSVRORVNTLiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SIEJFIExJQUJMRSBGT1IgQU5ZIFNQRUNJQUwsIERJUkVDVCxcclxuSU5ESVJFQ1QsIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyBPUiBBTlkgREFNQUdFUyBXSEFUU09FVkVSIFJFU1VMVElORyBGUk9NXHJcbkxPU1MgT0YgVVNFLCBEQVRBIE9SIFBST0ZJVFMsIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBORUdMSUdFTkNFIE9SXHJcbk9USEVSIFRPUlRJT1VTIEFDVElPTiwgQVJJU0lORyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBVU0UgT1JcclxuUEVSRk9STUFOQ0UgT0YgVEhJUyBTT0ZUV0FSRS5cclxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi9cclxuLyogZ2xvYmFsIFJlZmxlY3QsIFByb21pc2UsIFN1cHByZXNzZWRFcnJvciwgU3ltYm9sLCBJdGVyYXRvciAqL1xyXG5cclxudmFyIGV4dGVuZFN0YXRpY3MgPSBmdW5jdGlvbihkLCBiKSB7XHJcbiAgICBleHRlbmRTdGF0aWNzID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8XHJcbiAgICAgICAgKHsgX19wcm90b19fOiBbXSB9IGluc3RhbmNlb2YgQXJyYXkgJiYgZnVuY3Rpb24gKGQsIGIpIHsgZC5fX3Byb3RvX18gPSBiOyB9KSB8fFxyXG4gICAgICAgIGZ1bmN0aW9uIChkLCBiKSB7IGZvciAodmFyIHAgaW4gYikgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChiLCBwKSkgZFtwXSA9IGJbcF07IH07XHJcbiAgICByZXR1cm4gZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2V4dGVuZHMoZCwgYikge1xyXG4gICAgaWYgKHR5cGVvZiBiICE9PSBcImZ1bmN0aW9uXCIgJiYgYiAhPT0gbnVsbClcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2xhc3MgZXh0ZW5kcyB2YWx1ZSBcIiArIFN0cmluZyhiKSArIFwiIGlzIG5vdCBhIGNvbnN0cnVjdG9yIG9yIG51bGxcIik7XHJcbiAgICBleHRlbmRTdGF0aWNzKGQsIGIpO1xyXG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XHJcbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19hc3NpZ24gPSBmdW5jdGlvbigpIHtcclxuICAgIF9fYXNzaWduID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiBfX2Fzc2lnbih0KSB7XHJcbiAgICAgICAgZm9yICh2YXIgcywgaSA9IDEsIG4gPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XHJcbiAgICAgICAgICAgIHMgPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSkgdFtwXSA9IHNbcF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIF9fYXNzaWduLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3Jlc3QocywgZSkge1xyXG4gICAgdmFyIHQgPSB7fTtcclxuICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSAmJiBlLmluZGV4T2YocCkgPCAwKVxyXG4gICAgICAgIHRbcF0gPSBzW3BdO1xyXG4gICAgaWYgKHMgIT0gbnVsbCAmJiB0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyA9PT0gXCJmdW5jdGlvblwiKVxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBwID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhzKTsgaSA8IHAubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKGUuaW5kZXhPZihwW2ldKSA8IDAgJiYgT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZS5jYWxsKHMsIHBbaV0pKVxyXG4gICAgICAgICAgICAgICAgdFtwW2ldXSA9IHNbcFtpXV07XHJcbiAgICAgICAgfVxyXG4gICAgcmV0dXJuIHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2RlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19wYXJhbShwYXJhbUluZGV4LCBkZWNvcmF0b3IpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHsgZGVjb3JhdG9yKHRhcmdldCwga2V5LCBwYXJhbUluZGV4KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19lc0RlY29yYXRlKGN0b3IsIGRlc2NyaXB0b3JJbiwgZGVjb3JhdG9ycywgY29udGV4dEluLCBpbml0aWFsaXplcnMsIGV4dHJhSW5pdGlhbGl6ZXJzKSB7XHJcbiAgICBmdW5jdGlvbiBhY2NlcHQoZikgeyBpZiAoZiAhPT0gdm9pZCAwICYmIHR5cGVvZiBmICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJGdW5jdGlvbiBleHBlY3RlZFwiKTsgcmV0dXJuIGY7IH1cclxuICAgIHZhciBraW5kID0gY29udGV4dEluLmtpbmQsIGtleSA9IGtpbmQgPT09IFwiZ2V0dGVyXCIgPyBcImdldFwiIDoga2luZCA9PT0gXCJzZXR0ZXJcIiA/IFwic2V0XCIgOiBcInZhbHVlXCI7XHJcbiAgICB2YXIgdGFyZ2V0ID0gIWRlc2NyaXB0b3JJbiAmJiBjdG9yID8gY29udGV4dEluW1wic3RhdGljXCJdID8gY3RvciA6IGN0b3IucHJvdG90eXBlIDogbnVsbDtcclxuICAgIHZhciBkZXNjcmlwdG9yID0gZGVzY3JpcHRvckluIHx8ICh0YXJnZXQgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgY29udGV4dEluLm5hbWUpIDoge30pO1xyXG4gICAgdmFyIF8sIGRvbmUgPSBmYWxzZTtcclxuICAgIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICAgICAgdmFyIGNvbnRleHQgPSB7fTtcclxuICAgICAgICBmb3IgKHZhciBwIGluIGNvbnRleHRJbikgY29udGV4dFtwXSA9IHAgPT09IFwiYWNjZXNzXCIgPyB7fSA6IGNvbnRleHRJbltwXTtcclxuICAgICAgICBmb3IgKHZhciBwIGluIGNvbnRleHRJbi5hY2Nlc3MpIGNvbnRleHQuYWNjZXNzW3BdID0gY29udGV4dEluLmFjY2Vzc1twXTtcclxuICAgICAgICBjb250ZXh0LmFkZEluaXRpYWxpemVyID0gZnVuY3Rpb24gKGYpIHsgaWYgKGRvbmUpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgYWRkIGluaXRpYWxpemVycyBhZnRlciBkZWNvcmF0aW9uIGhhcyBjb21wbGV0ZWRcIik7IGV4dHJhSW5pdGlhbGl6ZXJzLnB1c2goYWNjZXB0KGYgfHwgbnVsbCkpOyB9O1xyXG4gICAgICAgIHZhciByZXN1bHQgPSAoMCwgZGVjb3JhdG9yc1tpXSkoa2luZCA9PT0gXCJhY2Nlc3NvclwiID8geyBnZXQ6IGRlc2NyaXB0b3IuZ2V0LCBzZXQ6IGRlc2NyaXB0b3Iuc2V0IH0gOiBkZXNjcmlwdG9yW2tleV0sIGNvbnRleHQpO1xyXG4gICAgICAgIGlmIChraW5kID09PSBcImFjY2Vzc29yXCIpIHtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gdm9pZCAwKSBjb250aW51ZTtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gbnVsbCB8fCB0eXBlb2YgcmVzdWx0ICE9PSBcIm9iamVjdFwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IGV4cGVjdGVkXCIpO1xyXG4gICAgICAgICAgICBpZiAoXyA9IGFjY2VwdChyZXN1bHQuZ2V0KSkgZGVzY3JpcHRvci5nZXQgPSBfO1xyXG4gICAgICAgICAgICBpZiAoXyA9IGFjY2VwdChyZXN1bHQuc2V0KSkgZGVzY3JpcHRvci5zZXQgPSBfO1xyXG4gICAgICAgICAgICBpZiAoXyA9IGFjY2VwdChyZXN1bHQuaW5pdCkpIGluaXRpYWxpemVycy51bnNoaWZ0KF8pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChfID0gYWNjZXB0KHJlc3VsdCkpIHtcclxuICAgICAgICAgICAgaWYgKGtpbmQgPT09IFwiZmllbGRcIikgaW5pdGlhbGl6ZXJzLnVuc2hpZnQoXyk7XHJcbiAgICAgICAgICAgIGVsc2UgZGVzY3JpcHRvcltrZXldID0gXztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAodGFyZ2V0KSBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBjb250ZXh0SW4ubmFtZSwgZGVzY3JpcHRvcik7XHJcbiAgICBkb25lID0gdHJ1ZTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3J1bkluaXRpYWxpemVycyh0aGlzQXJnLCBpbml0aWFsaXplcnMsIHZhbHVlKSB7XHJcbiAgICB2YXIgdXNlVmFsdWUgPSBhcmd1bWVudHMubGVuZ3RoID4gMjtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW5pdGlhbGl6ZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFsdWUgPSB1c2VWYWx1ZSA/IGluaXRpYWxpemVyc1tpXS5jYWxsKHRoaXNBcmcsIHZhbHVlKSA6IGluaXRpYWxpemVyc1tpXS5jYWxsKHRoaXNBcmcpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHVzZVZhbHVlID8gdmFsdWUgOiB2b2lkIDA7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19wcm9wS2V5KHgpIHtcclxuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gXCJzeW1ib2xcIiA/IHggOiBcIlwiLmNvbmNhdCh4KTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NldEZ1bmN0aW9uTmFtZShmLCBuYW1lLCBwcmVmaXgpIHtcclxuICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gXCJzeW1ib2xcIikgbmFtZSA9IG5hbWUuZGVzY3JpcHRpb24gPyBcIltcIi5jb25jYXQobmFtZS5kZXNjcmlwdGlvbiwgXCJdXCIpIDogXCJcIjtcclxuICAgIHJldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkoZiwgXCJuYW1lXCIsIHsgY29uZmlndXJhYmxlOiB0cnVlLCB2YWx1ZTogcHJlZml4ID8gXCJcIi5jb25jYXQocHJlZml4LCBcIiBcIiwgbmFtZSkgOiBuYW1lIH0pO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fbWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpIHtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5tZXRhZGF0YSA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4gUmVmbGVjdC5tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0ZXIodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19nZW5lcmF0b3IodGhpc0FyZywgYm9keSkge1xyXG4gICAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZyA9IE9iamVjdC5jcmVhdGUoKHR5cGVvZiBJdGVyYXRvciA9PT0gXCJmdW5jdGlvblwiID8gSXRlcmF0b3IgOiBPYmplY3QpLnByb3RvdHlwZSk7XHJcbiAgICByZXR1cm4gZy5uZXh0ID0gdmVyYigwKSwgZ1tcInRocm93XCJdID0gdmVyYigxKSwgZ1tcInJldHVyblwiXSA9IHZlcmIoMiksIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiAoZ1tTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9KSwgZztcclxuICAgIGZ1bmN0aW9uIHZlcmIobikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHN0ZXAoW24sIHZdKTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc3RlcChvcCkge1xyXG4gICAgICAgIGlmIChmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiR2VuZXJhdG9yIGlzIGFscmVhZHkgZXhlY3V0aW5nLlwiKTtcclxuICAgICAgICB3aGlsZSAoZyAmJiAoZyA9IDAsIG9wWzBdICYmIChfID0gMCkpLCBfKSB0cnkge1xyXG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XHJcbiAgICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcclxuICAgICAgICAgICAgc3dpdGNoIChvcFswXSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xyXG4gICAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XHJcbiAgICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19jcmVhdGVCaW5kaW5nID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIHZhciBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihtLCBrKTtcclxuICAgIGlmICghZGVzYyB8fCAoXCJnZXRcIiBpbiBkZXNjID8gIW0uX19lc01vZHVsZSA6IGRlc2Mud3JpdGFibGUgfHwgZGVzYy5jb25maWd1cmFibGUpKSB7XHJcbiAgICAgICAgZGVzYyA9IHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG1ba107IH0gfTtcclxuICAgIH1cclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgZGVzYyk7XHJcbn0pIDogKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XHJcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xyXG4gICAgb1trMl0gPSBtW2tdO1xyXG59KTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2V4cG9ydFN0YXIobSwgbykge1xyXG4gICAgZm9yICh2YXIgcCBpbiBtKSBpZiAocCAhPT0gXCJkZWZhdWx0XCIgJiYgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvLCBwKSkgX19jcmVhdGVCaW5kaW5nKG8sIG0sIHApO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX192YWx1ZXMobykge1xyXG4gICAgdmFyIHMgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgU3ltYm9sLml0ZXJhdG9yLCBtID0gcyAmJiBvW3NdLCBpID0gMDtcclxuICAgIGlmIChtKSByZXR1cm4gbS5jYWxsKG8pO1xyXG4gICAgaWYgKG8gJiYgdHlwZW9mIG8ubGVuZ3RoID09PSBcIm51bWJlclwiKSByZXR1cm4ge1xyXG4gICAgICAgIG5leHQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKG8gJiYgaSA+PSBvLmxlbmd0aCkgbyA9IHZvaWQgMDtcclxuICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IG8gJiYgb1tpKytdLCBkb25lOiAhbyB9O1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKHMgPyBcIk9iamVjdCBpcyBub3QgaXRlcmFibGUuXCIgOiBcIlN5bWJvbC5pdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3JlYWQobywgbikge1xyXG4gICAgdmFyIG0gPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb1tTeW1ib2wuaXRlcmF0b3JdO1xyXG4gICAgaWYgKCFtKSByZXR1cm4gbztcclxuICAgIHZhciBpID0gbS5jYWxsKG8pLCByLCBhciA9IFtdLCBlO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICB3aGlsZSAoKG4gPT09IHZvaWQgMCB8fCBuLS0gPiAwKSAmJiAhKHIgPSBpLm5leHQoKSkuZG9uZSkgYXIucHVzaChyLnZhbHVlKTtcclxuICAgIH1cclxuICAgIGNhdGNoIChlcnJvcikgeyBlID0geyBlcnJvcjogZXJyb3IgfTsgfVxyXG4gICAgZmluYWxseSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKHIgJiYgIXIuZG9uZSAmJiAobSA9IGlbXCJyZXR1cm5cIl0pKSBtLmNhbGwoaSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZpbmFsbHkgeyBpZiAoZSkgdGhyb3cgZS5lcnJvcjsgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGFyO1xyXG59XHJcblxyXG4vKiogQGRlcHJlY2F0ZWQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkKCkge1xyXG4gICAgZm9yICh2YXIgYXIgPSBbXSwgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspXHJcbiAgICAgICAgYXIgPSBhci5jb25jYXQoX19yZWFkKGFyZ3VtZW50c1tpXSkpO1xyXG4gICAgcmV0dXJuIGFyO1xyXG59XHJcblxyXG4vKiogQGRlcHJlY2F0ZWQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkQXJyYXlzKCkge1xyXG4gICAgZm9yICh2YXIgcyA9IDAsIGkgPSAwLCBpbCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBpbDsgaSsrKSBzICs9IGFyZ3VtZW50c1tpXS5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciByID0gQXJyYXkocyksIGsgPSAwLCBpID0gMDsgaSA8IGlsOyBpKyspXHJcbiAgICAgICAgZm9yICh2YXIgYSA9IGFyZ3VtZW50c1tpXSwgaiA9IDAsIGpsID0gYS5sZW5ndGg7IGogPCBqbDsgaisrLCBrKyspXHJcbiAgICAgICAgICAgIHJba10gPSBhW2pdO1xyXG4gICAgcmV0dXJuIHI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZEFycmF5KHRvLCBmcm9tLCBwYWNrKSB7XHJcbiAgICBpZiAocGFjayB8fCBhcmd1bWVudHMubGVuZ3RoID09PSAyKSBmb3IgKHZhciBpID0gMCwgbCA9IGZyb20ubGVuZ3RoLCBhcjsgaSA8IGw7IGkrKykge1xyXG4gICAgICAgIGlmIChhciB8fCAhKGkgaW4gZnJvbSkpIHtcclxuICAgICAgICAgICAgaWYgKCFhcikgYXIgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChmcm9tLCAwLCBpKTtcclxuICAgICAgICAgICAgYXJbaV0gPSBmcm9tW2ldO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiB0by5jb25jYXQoYXIgfHwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZnJvbSkpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdCh2KSB7XHJcbiAgICByZXR1cm4gdGhpcyBpbnN0YW5jZW9mIF9fYXdhaXQgPyAodGhpcy52ID0gdiwgdGhpcykgOiBuZXcgX19hd2FpdCh2KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNHZW5lcmF0b3IodGhpc0FyZywgX2FyZ3VtZW50cywgZ2VuZXJhdG9yKSB7XHJcbiAgICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgdmFyIGcgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSksIGksIHEgPSBbXTtcclxuICAgIHJldHVybiBpID0gT2JqZWN0LmNyZWF0ZSgodHlwZW9mIEFzeW5jSXRlcmF0b3IgPT09IFwiZnVuY3Rpb25cIiA/IEFzeW5jSXRlcmF0b3IgOiBPYmplY3QpLnByb3RvdHlwZSksIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiwgYXdhaXRSZXR1cm4pLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICBmdW5jdGlvbiBhd2FpdFJldHVybihmKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHYpLnRoZW4oZiwgcmVqZWN0KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gdmVyYihuLCBmKSB7IGlmIChnW25dKSB7IGlbbl0gPSBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKGEsIGIpIHsgcS5wdXNoKFtuLCB2LCBhLCBiXSkgPiAxIHx8IHJlc3VtZShuLCB2KTsgfSk7IH07IGlmIChmKSBpW25dID0gZihpW25dKTsgfSB9XHJcbiAgICBmdW5jdGlvbiByZXN1bWUobiwgdikgeyB0cnkgeyBzdGVwKGdbbl0odikpOyB9IGNhdGNoIChlKSB7IHNldHRsZShxWzBdWzNdLCBlKTsgfSB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKHIpIHsgci52YWx1ZSBpbnN0YW5jZW9mIF9fYXdhaXQgPyBQcm9taXNlLnJlc29sdmUoci52YWx1ZS52KS50aGVuKGZ1bGZpbGwsIHJlamVjdCkgOiBzZXR0bGUocVswXVsyXSwgcik7IH1cclxuICAgIGZ1bmN0aW9uIGZ1bGZpbGwodmFsdWUpIHsgcmVzdW1lKFwibmV4dFwiLCB2YWx1ZSk7IH1cclxuICAgIGZ1bmN0aW9uIHJlamVjdCh2YWx1ZSkgeyByZXN1bWUoXCJ0aHJvd1wiLCB2YWx1ZSk7IH1cclxuICAgIGZ1bmN0aW9uIHNldHRsZShmLCB2KSB7IGlmIChmKHYpLCBxLnNoaWZ0KCksIHEubGVuZ3RoKSByZXN1bWUocVswXVswXSwgcVswXVsxXSk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNEZWxlZ2F0b3Iobykge1xyXG4gICAgdmFyIGksIHA7XHJcbiAgICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIsIGZ1bmN0aW9uIChlKSB7IHRocm93IGU7IH0pLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuLCBmKSB7IGlbbl0gPSBvW25dID8gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIChwID0gIXApID8geyB2YWx1ZTogX19hd2FpdChvW25dKHYpKSwgZG9uZTogZmFsc2UgfSA6IGYgPyBmKHYpIDogdjsgfSA6IGY7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNWYWx1ZXMobykge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBtID0gb1tTeW1ib2wuYXN5bmNJdGVyYXRvcl0sIGk7XHJcbiAgICByZXR1cm4gbSA/IG0uY2FsbChvKSA6IChvID0gdHlwZW9mIF9fdmFsdWVzID09PSBcImZ1bmN0aW9uXCIgPyBfX3ZhbHVlcyhvKSA6IG9bU3ltYm9sLml0ZXJhdG9yXSgpLCBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaSk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgaVtuXSA9IG9bbl0gJiYgZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHsgdiA9IG9bbl0odiksIHNldHRsZShyZXNvbHZlLCByZWplY3QsIHYuZG9uZSwgdi52YWx1ZSk7IH0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCBkLCB2KSB7IFByb21pc2UucmVzb2x2ZSh2KS50aGVuKGZ1bmN0aW9uKHYpIHsgcmVzb2x2ZSh7IHZhbHVlOiB2LCBkb25lOiBkIH0pOyB9LCByZWplY3QpOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX21ha2VUZW1wbGF0ZU9iamVjdChjb29rZWQsIHJhdykge1xyXG4gICAgaWYgKE9iamVjdC5kZWZpbmVQcm9wZXJ0eSkgeyBPYmplY3QuZGVmaW5lUHJvcGVydHkoY29va2VkLCBcInJhd1wiLCB7IHZhbHVlOiByYXcgfSk7IH0gZWxzZSB7IGNvb2tlZC5yYXcgPSByYXc7IH1cclxuICAgIHJldHVybiBjb29rZWQ7XHJcbn07XHJcblxyXG52YXIgX19zZXRNb2R1bGVEZWZhdWx0ID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgXCJkZWZhdWx0XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHYgfSk7XHJcbn0pIDogZnVuY3Rpb24obywgdikge1xyXG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9faW1wb3J0U3Rhcihtb2QpIHtcclxuICAgIGlmIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpIHJldHVybiBtb2Q7XHJcbiAgICB2YXIgcmVzdWx0ID0ge307XHJcbiAgICBpZiAobW9kICE9IG51bGwpIGZvciAodmFyIGsgaW4gbW9kKSBpZiAoayAhPT0gXCJkZWZhdWx0XCIgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1vZCwgaykpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwgayk7XHJcbiAgICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9faW1wb3J0RGVmYXVsdChtb2QpIHtcclxuICAgIHJldHVybiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSA/IG1vZCA6IHsgZGVmYXVsdDogbW9kIH07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkR2V0KHJlY2VpdmVyLCBzdGF0ZSwga2luZCwgZikge1xyXG4gICAgaWYgKGtpbmQgPT09IFwiYVwiICYmICFmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBhY2Nlc3NvciB3YXMgZGVmaW5lZCB3aXRob3V0IGEgZ2V0dGVyXCIpO1xyXG4gICAgaWYgKHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgIT09IHN0YXRlIHx8ICFmIDogIXN0YXRlLmhhcyhyZWNlaXZlcikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgcmVhZCBwcml2YXRlIG1lbWJlciBmcm9tIGFuIG9iamVjdCB3aG9zZSBjbGFzcyBkaWQgbm90IGRlY2xhcmUgaXRcIik7XHJcbiAgICByZXR1cm4ga2luZCA9PT0gXCJtXCIgPyBmIDoga2luZCA9PT0gXCJhXCIgPyBmLmNhbGwocmVjZWl2ZXIpIDogZiA/IGYudmFsdWUgOiBzdGF0ZS5nZXQocmVjZWl2ZXIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZFNldChyZWNlaXZlciwgc3RhdGUsIHZhbHVlLCBraW5kLCBmKSB7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJtXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIG1ldGhvZCBpcyBub3Qgd3JpdGFibGVcIik7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJhXCIgJiYgIWYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIGFjY2Vzc29yIHdhcyBkZWZpbmVkIHdpdGhvdXQgYSBzZXR0ZXJcIik7XHJcbiAgICBpZiAodHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciAhPT0gc3RhdGUgfHwgIWYgOiAhc3RhdGUuaGFzKHJlY2VpdmVyKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCB3cml0ZSBwcml2YXRlIG1lbWJlciB0byBhbiBvYmplY3Qgd2hvc2UgY2xhc3MgZGlkIG5vdCBkZWNsYXJlIGl0XCIpO1xyXG4gICAgcmV0dXJuIChraW5kID09PSBcImFcIiA/IGYuY2FsbChyZWNlaXZlciwgdmFsdWUpIDogZiA/IGYudmFsdWUgPSB2YWx1ZSA6IHN0YXRlLnNldChyZWNlaXZlciwgdmFsdWUpKSwgdmFsdWU7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkSW4oc3RhdGUsIHJlY2VpdmVyKSB7XHJcbiAgICBpZiAocmVjZWl2ZXIgPT09IG51bGwgfHwgKHR5cGVvZiByZWNlaXZlciAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgcmVjZWl2ZXIgIT09IFwiZnVuY3Rpb25cIikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgdXNlICdpbicgb3BlcmF0b3Igb24gbm9uLW9iamVjdFwiKTtcclxuICAgIHJldHVybiB0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyID09PSBzdGF0ZSA6IHN0YXRlLmhhcyhyZWNlaXZlcik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZShlbnYsIHZhbHVlLCBhc3luYykge1xyXG4gICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB2b2lkIDApIHtcclxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiB2YWx1ZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IGV4cGVjdGVkLlwiKTtcclxuICAgICAgICB2YXIgZGlzcG9zZSwgaW5uZXI7XHJcbiAgICAgICAgaWYgKGFzeW5jKSB7XHJcbiAgICAgICAgICAgIGlmICghU3ltYm9sLmFzeW5jRGlzcG9zZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0Rpc3Bvc2UgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgICAgICAgICBkaXNwb3NlID0gdmFsdWVbU3ltYm9sLmFzeW5jRGlzcG9zZV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChkaXNwb3NlID09PSB2b2lkIDApIHtcclxuICAgICAgICAgICAgaWYgKCFTeW1ib2wuZGlzcG9zZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5kaXNwb3NlIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgICAgICAgICAgZGlzcG9zZSA9IHZhbHVlW1N5bWJvbC5kaXNwb3NlXTtcclxuICAgICAgICAgICAgaWYgKGFzeW5jKSBpbm5lciA9IGRpc3Bvc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0eXBlb2YgZGlzcG9zZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IG5vdCBkaXNwb3NhYmxlLlwiKTtcclxuICAgICAgICBpZiAoaW5uZXIpIGRpc3Bvc2UgPSBmdW5jdGlvbigpIHsgdHJ5IHsgaW5uZXIuY2FsbCh0aGlzKTsgfSBjYXRjaCAoZSkgeyByZXR1cm4gUHJvbWlzZS5yZWplY3QoZSk7IH0gfTtcclxuICAgICAgICBlbnYuc3RhY2sucHVzaCh7IHZhbHVlOiB2YWx1ZSwgZGlzcG9zZTogZGlzcG9zZSwgYXN5bmM6IGFzeW5jIH0pO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoYXN5bmMpIHtcclxuICAgICAgICBlbnYuc3RhY2sucHVzaCh7IGFzeW5jOiB0cnVlIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG5cclxufVxyXG5cclxudmFyIF9TdXBwcmVzc2VkRXJyb3IgPSB0eXBlb2YgU3VwcHJlc3NlZEVycm9yID09PSBcImZ1bmN0aW9uXCIgPyBTdXBwcmVzc2VkRXJyb3IgOiBmdW5jdGlvbiAoZXJyb3IsIHN1cHByZXNzZWQsIG1lc3NhZ2UpIHtcclxuICAgIHZhciBlID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xyXG4gICAgcmV0dXJuIGUubmFtZSA9IFwiU3VwcHJlc3NlZEVycm9yXCIsIGUuZXJyb3IgPSBlcnJvciwgZS5zdXBwcmVzc2VkID0gc3VwcHJlc3NlZCwgZTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2Rpc3Bvc2VSZXNvdXJjZXMoZW52KSB7XHJcbiAgICBmdW5jdGlvbiBmYWlsKGUpIHtcclxuICAgICAgICBlbnYuZXJyb3IgPSBlbnYuaGFzRXJyb3IgPyBuZXcgX1N1cHByZXNzZWRFcnJvcihlLCBlbnYuZXJyb3IsIFwiQW4gZXJyb3Igd2FzIHN1cHByZXNzZWQgZHVyaW5nIGRpc3Bvc2FsLlwiKSA6IGU7XHJcbiAgICAgICAgZW52Lmhhc0Vycm9yID0gdHJ1ZTtcclxuICAgIH1cclxuICAgIHZhciByLCBzID0gMDtcclxuICAgIGZ1bmN0aW9uIG5leHQoKSB7XHJcbiAgICAgICAgd2hpbGUgKHIgPSBlbnYuc3RhY2sucG9wKCkpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGlmICghci5hc3luYyAmJiBzID09PSAxKSByZXR1cm4gcyA9IDAsIGVudi5zdGFjay5wdXNoKHIpLCBQcm9taXNlLnJlc29sdmUoKS50aGVuKG5leHQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHIuZGlzcG9zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSByLmRpc3Bvc2UuY2FsbChyLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoci5hc3luYykgcmV0dXJuIHMgfD0gMiwgUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCkudGhlbihuZXh0LCBmdW5jdGlvbihlKSB7IGZhaWwoZSk7IHJldHVybiBuZXh0KCk7IH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBzIHw9IDE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIGZhaWwoZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHMgPT09IDEpIHJldHVybiBlbnYuaGFzRXJyb3IgPyBQcm9taXNlLnJlamVjdChlbnYuZXJyb3IpIDogUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgaWYgKGVudi5oYXNFcnJvcikgdGhyb3cgZW52LmVycm9yO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5leHQoKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmV3cml0ZVJlbGF0aXZlSW1wb3J0RXh0ZW5zaW9uKHBhdGgsIHByZXNlcnZlSnN4KSB7XHJcbiAgICBpZiAodHlwZW9mIHBhdGggPT09IFwic3RyaW5nXCIgJiYgL15cXC5cXC4/XFwvLy50ZXN0KHBhdGgpKSB7XHJcbiAgICAgICAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFwuKHRzeCkkfCgoPzpcXC5kKT8pKCg/OlxcLlteLi9dKz8pPylcXC4oW2NtXT8pdHMkL2ksIGZ1bmN0aW9uIChtLCB0c3gsIGQsIGV4dCwgY20pIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRzeCA/IHByZXNlcnZlSnN4ID8gXCIuanN4XCIgOiBcIi5qc1wiIDogZCAmJiAoIWV4dCB8fCAhY20pID8gbSA6IChkICsgZXh0ICsgXCIuXCIgKyBjbS50b0xvd2VyQ2FzZSgpICsgXCJqc1wiKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiBwYXRoO1xyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCB7XHJcbiAgICBfX2V4dGVuZHM6IF9fZXh0ZW5kcyxcclxuICAgIF9fYXNzaWduOiBfX2Fzc2lnbixcclxuICAgIF9fcmVzdDogX19yZXN0LFxyXG4gICAgX19kZWNvcmF0ZTogX19kZWNvcmF0ZSxcclxuICAgIF9fcGFyYW06IF9fcGFyYW0sXHJcbiAgICBfX2VzRGVjb3JhdGU6IF9fZXNEZWNvcmF0ZSxcclxuICAgIF9fcnVuSW5pdGlhbGl6ZXJzOiBfX3J1bkluaXRpYWxpemVycyxcclxuICAgIF9fcHJvcEtleTogX19wcm9wS2V5LFxyXG4gICAgX19zZXRGdW5jdGlvbk5hbWU6IF9fc2V0RnVuY3Rpb25OYW1lLFxyXG4gICAgX19tZXRhZGF0YTogX19tZXRhZGF0YSxcclxuICAgIF9fYXdhaXRlcjogX19hd2FpdGVyLFxyXG4gICAgX19nZW5lcmF0b3I6IF9fZ2VuZXJhdG9yLFxyXG4gICAgX19jcmVhdGVCaW5kaW5nOiBfX2NyZWF0ZUJpbmRpbmcsXHJcbiAgICBfX2V4cG9ydFN0YXI6IF9fZXhwb3J0U3RhcixcclxuICAgIF9fdmFsdWVzOiBfX3ZhbHVlcyxcclxuICAgIF9fcmVhZDogX19yZWFkLFxyXG4gICAgX19zcHJlYWQ6IF9fc3ByZWFkLFxyXG4gICAgX19zcHJlYWRBcnJheXM6IF9fc3ByZWFkQXJyYXlzLFxyXG4gICAgX19zcHJlYWRBcnJheTogX19zcHJlYWRBcnJheSxcclxuICAgIF9fYXdhaXQ6IF9fYXdhaXQsXHJcbiAgICBfX2FzeW5jR2VuZXJhdG9yOiBfX2FzeW5jR2VuZXJhdG9yLFxyXG4gICAgX19hc3luY0RlbGVnYXRvcjogX19hc3luY0RlbGVnYXRvcixcclxuICAgIF9fYXN5bmNWYWx1ZXM6IF9fYXN5bmNWYWx1ZXMsXHJcbiAgICBfX21ha2VUZW1wbGF0ZU9iamVjdDogX19tYWtlVGVtcGxhdGVPYmplY3QsXHJcbiAgICBfX2ltcG9ydFN0YXI6IF9faW1wb3J0U3RhcixcclxuICAgIF9faW1wb3J0RGVmYXVsdDogX19pbXBvcnREZWZhdWx0LFxyXG4gICAgX19jbGFzc1ByaXZhdGVGaWVsZEdldDogX19jbGFzc1ByaXZhdGVGaWVsZEdldCxcclxuICAgIF9fY2xhc3NQcml2YXRlRmllbGRTZXQ6IF9fY2xhc3NQcml2YXRlRmllbGRTZXQsXHJcbiAgICBfX2NsYXNzUHJpdmF0ZUZpZWxkSW46IF9fY2xhc3NQcml2YXRlRmllbGRJbixcclxuICAgIF9fYWRkRGlzcG9zYWJsZVJlc291cmNlOiBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZSxcclxuICAgIF9fZGlzcG9zZVJlc291cmNlczogX19kaXNwb3NlUmVzb3VyY2VzLFxyXG4gICAgX19yZXdyaXRlUmVsYXRpdmVJbXBvcnRFeHRlbnNpb246IF9fcmV3cml0ZVJlbGF0aXZlSW1wb3J0RXh0ZW5zaW9uLFxyXG59O1xyXG4iLCJlbnVtIExvZ0xldmVsIHtcclxuICBERUJVRyA9IDAsXHJcbiAgSU5GTyA9IDEsXHJcbiAgV0FSTiA9IDIsXHJcbiAgRVJST1IgPSAzXHJcbn1cclxuXHJcbmxldCBjdXJyZW50TG9nTGV2ZWw6IExvZ0xldmVsID0gTG9nTGV2ZWwuSU5GTztcclxuXHJcbmZ1bmN0aW9uIHNldExvZ0xldmVsKGxldmVsOiBMb2dMZXZlbCk6IHZvaWQge1xyXG4gIGlmIChPYmplY3QudmFsdWVzKExvZ0xldmVsKS5pbmNsdWRlcyhsZXZlbCkpIHtcclxuICAgIGN1cnJlbnRMb2dMZXZlbCA9IGxldmVsO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCfml6DmlYjnmoTml6Xlv5fnuqfliKsnKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvZyhsZXZlbDogTG9nTGV2ZWwsIG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xyXG4gIGlmIChsZXZlbCA+PSBjdXJyZW50TG9nTGV2ZWwpIHtcclxuICAgIGNvbnN0IHRpbWVzdGFtcCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcclxuICAgIGNvbnN0IGxldmVsTmFtZSA9IExvZ0xldmVsW2xldmVsXTtcclxuICAgIGNvbnNvbGUubG9nKGBbJHt0aW1lc3RhbXB9XSBbJHtsZXZlbE5hbWV9XSAke21lc3NhZ2V9YCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkZWJ1ZyhtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcclxuICBsb2coTG9nTGV2ZWwuREVCVUcsIG1lc3NhZ2UpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpbmZvKG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xyXG4gIGxvZyhMb2dMZXZlbC5JTkZPLCBtZXNzYWdlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gd2FybihtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcclxuICBsb2coTG9nTGV2ZWwuV0FSTiwgbWVzc2FnZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVycm9yKG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xyXG4gIGxvZyhMb2dMZXZlbC5FUlJPUiwgbWVzc2FnZSk7XHJcbn1cclxuXHJcbmV4cG9ydCB7XHJcbiAgTG9nTGV2ZWwsXHJcbiAgc2V0TG9nTGV2ZWwsXHJcbiAgZGVidWcsXHJcbiAgaW5mbyxcclxuICB3YXJuLFxyXG4gIGVycm9yXHJcbn07XHJcblxyXG5zZXRMb2dMZXZlbChMb2dMZXZlbC5ERUJVRyk7XHJcblxyXG4iLCJpbXBvcnQgeyBEYXRhYmFzZUZpZWxkLCBEYXRhYmFzZUZpZWxkVHlwZSB9IGZyb20gJy4uL3R5cGVzJztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJCYXNpY0NlbGwodGQ6IEhUTUxFbGVtZW50LCBjZWxsOiBhbnksIGZpZWxkOiBEYXRhYmFzZUZpZWxkKSB7XHJcbiAgc3dpdGNoIChmaWVsZC50eXBlIGFzIERhdGFiYXNlRmllbGRUeXBlKSB7XHJcbiAgICBjYXNlICdzdHJpbmcnOlxyXG4gICAgICB0ZC5zZXRUZXh0KFN0cmluZyhjZWxsKSk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAnbnVtYmVyJzpcclxuICAgICAgdGQuc2V0VGV4dChOdW1iZXIoY2VsbCkudG9TdHJpbmcoKSk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAnYm9vbGVhbic6XHJcbiAgICAgIHRkLnNldFRleHQoQm9vbGVhbihjZWxsKS50b1N0cmluZygpKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlICdhcnJheSc6XHJcbiAgICAgIHJlbmRlckFycmF5KHRkLCBjZWxsLCBmaWVsZCk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAnb2JqZWN0JzpcclxuICAgICAgcmVuZGVyT2JqZWN0KHRkLCBjZWxsLCBmaWVsZCk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgZGVmYXVsdDpcclxuICAgICAgdGQuc2V0VGV4dChTdHJpbmcoY2VsbCkpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyQXJyYXkodGQ6IEhUTUxFbGVtZW50LCBhcnJheTogc3RyaW5nLCBmaWVsZDogRGF0YWJhc2VGaWVsZCkge1xyXG4gIGNvbnN0IGVsZW1lbnRzID0gYXJyYXkuc3BsaXQoJzsnKTtcclxuICB0ZC5zZXRUZXh0KGBBcnJheSAoJHtlbGVtZW50cy5sZW5ndGh9KWApO1xyXG4gIGNvbnN0IHRvb2x0aXAgPSBlbGVtZW50cy5tYXAoKGl0ZW0sIGluZGV4KSA9PiBgJHtpbmRleH06ICR7aXRlbX1gKS5qb2luKCdcXG4nKTtcclxuICB0ZC5zZXRBdHRyaWJ1dGUoJ3RpdGxlJywgdG9vbHRpcCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlck9iamVjdCh0ZDogSFRNTEVsZW1lbnQsIG9iajogc3RyaW5nLCBmaWVsZDogRGF0YWJhc2VGaWVsZCkge1xyXG4gIGNvbnN0IHBhaXJzID0gb2JqLnNwbGl0KCd8Jyk7XHJcbiAgdGQuc2V0VGV4dCgnT2JqZWN0Jyk7XHJcbiAgY29uc3QgdG9vbHRpcCA9IHBhaXJzLm1hcChwYWlyID0+IHtcclxuICAgIGNvbnN0IFtrZXksIHZhbHVlXSA9IHBhaXIuc3BsaXQoJzonKTtcclxuICAgIHJldHVybiBgJHtrZXl9OiAke3ZhbHVlfWA7XHJcbiAgfSkuam9pbignXFxuJyk7XHJcbiAgdGQuc2V0QXR0cmlidXRlKCd0aXRsZScsIHRvb2x0aXApO1xyXG59XHJcbiIsImltcG9ydCB7IERhdGFiYXNlRmllbGQgfSBmcm9tICcuLi90eXBlcyc7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyRGF0ZVRpbWVDZWxsKHRkOiBIVE1MRWxlbWVudCwgY2VsbDogYW55LCBmaWVsZDogRGF0YWJhc2VGaWVsZCkge1xyXG4gIHN3aXRjaCAoZmllbGQudHlwZSkge1xyXG4gICAgY2FzZSAnZGF0ZSc6XHJcbiAgICAgIHRkLnNldFRleHQobmV3IERhdGUoY2VsbCkudG9Mb2NhbGVEYXRlU3RyaW5nKCkpO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgJ3RpbWVkZWx0YSc6XHJcbiAgICAgIHRkLnNldFRleHQoZm9ybWF0VGltZURlbHRhKHBhcnNlSW50KGNlbGwpKSk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgZGVmYXVsdDpcclxuICAgICAgdGQuc2V0VGV4dChTdHJpbmcoY2VsbCkpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZm9ybWF0VGltZURlbHRhKHRpbWVEZWx0YTogbnVtYmVyKTogc3RyaW5nIHtcclxuICBjb25zdCBkYXlzID0gTWF0aC5mbG9vcih0aW1lRGVsdGEgLyAoMjQgKiA2MCAqIDYwICogMTAwMCkpO1xyXG4gIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcigodGltZURlbHRhICUgKDI0ICogNjAgKiA2MCAqIDEwMDApKSAvICg2MCAqIDYwICogMTAwMCkpO1xyXG4gIGNvbnN0IG1pbnV0ZXMgPSBNYXRoLmZsb29yKCh0aW1lRGVsdGEgJSAoNjAgKiA2MCAqIDEwMDApKSAvICg2MCAqIDEwMDApKTtcclxuICBjb25zdCBzZWNvbmRzID0gTWF0aC5mbG9vcigodGltZURlbHRhICUgKDYwICogMTAwMCkpIC8gMTAwMCk7XHJcblxyXG4gIHJldHVybiBgJHtkYXlzfWQgJHtob3Vyc31oICR7bWludXRlc31tICR7c2Vjb25kc31zYDtcclxufVxyXG4iLCJpbXBvcnQgeyBEYXRhYmFzZUZpZWxkIH0gZnJvbSAnLi4vdHlwZXMnO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckdlb3NwYXRpYWxDZWxsKHRkOiBIVE1MRWxlbWVudCwgY2VsbDogYW55LCBmaWVsZDogRGF0YWJhc2VGaWVsZCkge1xyXG4gIHN3aXRjaCAoZmllbGQudHlwZSkge1xyXG4gICAgY2FzZSAnZ2VvJzpcclxuICAgICAgcmVuZGVyR2VvKHRkLCBjZWxsLCBmaWVsZCk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAncG9seWdvbic6XHJcbiAgICAgIHJlbmRlclBvbHlnb24odGQsIGNlbGwsIGZpZWxkKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBkZWZhdWx0OlxyXG4gICAgICB0ZC5zZXRUZXh0KFN0cmluZyhjZWxsKSk7XHJcbiAgfVxyXG5cclxuICB0ZC5hZGRDbGFzcygnZ2Vvc3BhdGlhbC1jZWxsJyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlckdlbyh0ZDogSFRNTEVsZW1lbnQsIGdlbzogc3RyaW5nLCBmaWVsZDogRGF0YWJhc2VGaWVsZCkge1xyXG4gIGNvbnN0IFtsYXQsIGxuZ10gPSBnZW8uc3BsaXQoJ3wnKS5tYXAoTnVtYmVyKTtcclxuICB0ZC5zZXRUZXh0KGAoJHtsYXQudG9GaXhlZCg0KX0sICR7bG5nLnRvRml4ZWQoNCl9KWApO1xyXG4gIHRkLnNldEF0dHJpYnV0ZSgndGl0bGUnLCBgTGF0aXR1ZGU6ICR7bGF0fVxcbkxvbmdpdHVkZTogJHtsbmd9YCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlclBvbHlnb24odGQ6IEhUTUxFbGVtZW50LCBwb2x5Z29uOiBzdHJpbmcsIGZpZWxkOiBEYXRhYmFzZUZpZWxkKSB7XHJcbiAgY29uc3QgcG9pbnRzID0gcG9seWdvbi5zcGxpdCgnOycpLm1hcChwb2ludCA9PiBwb2ludC5zcGxpdCgnfCcpLm1hcChOdW1iZXIpKTtcclxuICB0ZC5zZXRUZXh0KGBQb2x5Z29uOiAke3BvaW50cy5sZW5ndGh9IHBvaW50c2ApO1xyXG4gIGNvbnN0IHBvaW50c1N0cmluZyA9IHBvaW50cy5tYXAoKHBvaW50LCBpbmRleCkgPT4gXHJcbiAgICBgUG9pbnQgJHtpbmRleCArIDF9OiAoJHtwb2ludFswXS50b0ZpeGVkKDQpfSwgJHtwb2ludFsxXS50b0ZpeGVkKDQpfSlgXHJcbiAgKS5qb2luKCdcXG4nKTtcclxuICB0ZC5zZXRBdHRyaWJ1dGUoJ3RpdGxlJywgcG9pbnRzU3RyaW5nKTtcclxufVxyXG4iLCJpbXBvcnQgeyBEYXRhYmFzZUZpZWxkIH0gZnJvbSAnLi4vdHlwZXMnO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlclNjaWVudGlmaWNDZWxsKHRkOiBIVE1MRWxlbWVudCwgY2VsbDogYW55LCBmaWVsZDogRGF0YWJhc2VGaWVsZCkge1xyXG4gIHN3aXRjaCAoZmllbGQudHlwZSkge1xyXG4gICAgY2FzZSAndmVjdG9yJzpcclxuICAgICAgcmVuZGVyVmVjdG9yKHRkLCBjZWxsLCBmaWVsZCk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAnbWF0cml4JzpcclxuICAgICAgcmVuZGVyTWF0cml4KHRkLCBjZWxsLCBmaWVsZCk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAnY29tcGxleCc6XHJcbiAgICAgIHJlbmRlckNvbXBsZXgodGQsIGNlbGwsIGZpZWxkKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlICdkZWNpbWFsJzpcclxuICAgICAgcmVuZGVyRGVjaW1hbCh0ZCwgY2VsbCwgZmllbGQpO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgJ3VuY2VydGFpbnR5JzpcclxuICAgICAgcmVuZGVyVW5jZXJ0YWludHkodGQsIGNlbGwsIGZpZWxkKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlICd1bml0JzpcclxuICAgICAgcmVuZGVyVW5pdCh0ZCwgY2VsbCwgZmllbGQpO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgJ3RpbWVzZXJpZXMnOlxyXG4gICAgICByZW5kZXJUaW1lc2VyaWVzKHRkLCBjZWxsLCBmaWVsZCk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAnYmluYXJ5JzpcclxuICAgICAgcmVuZGVyQmluYXJ5KHRkLCBjZWxsLCBmaWVsZCk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAnZm9ybXVsYSc6XHJcbiAgICAgIHJlbmRlckZvcm11bGEodGQsIGNlbGwsIGZpZWxkKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlICdkaXN0cmlidXRpb24nOlxyXG4gICAgICByZW5kZXJEaXN0cmlidXRpb24odGQsIGNlbGwsIGZpZWxkKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBkZWZhdWx0OlxyXG4gICAgICB0ZC5zZXRUZXh0KFN0cmluZyhjZWxsKSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJWZWN0b3IodGQ6IEhUTUxFbGVtZW50LCB2ZWN0b3I6IHN0cmluZywgZmllbGQ6IERhdGFiYXNlRmllbGQpIHtcclxuICBjb25zdCBlbGVtZW50cyA9IHZlY3Rvci5zcGxpdCgnOycpLm1hcChOdW1iZXIpO1xyXG4gIHRkLnNldFRleHQoYFske2VsZW1lbnRzLmpvaW4oJywgJyl9XWApO1xyXG4gIHRkLnNldEF0dHJpYnV0ZSgndGl0bGUnLCBgVmVjdG9yOiAke2VsZW1lbnRzLmpvaW4oJywgJyl9YCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlck1hdHJpeCh0ZDogSFRNTEVsZW1lbnQsIG1hdHJpeDogc3RyaW5nLCBmaWVsZDogRGF0YWJhc2VGaWVsZCkge1xyXG4gIGNvbnN0IHJvd3MgPSBtYXRyaXguc3BsaXQoJzsnKS5tYXAocm93ID0+IHJvdy5zcGxpdCgnfCcpLm1hcChOdW1iZXIpKTtcclxuICB0ZC5zZXRUZXh0KGBNYXRyaXg6ICR7cm93cy5sZW5ndGh9eCR7cm93c1swXS5sZW5ndGh9YCk7XHJcbiAgY29uc3QgbWF0cml4U3RyaW5nID0gcm93cy5tYXAocm93ID0+IHJvdy5qb2luKCdcXHQnKSkuam9pbignXFxuJyk7XHJcbiAgdGQuc2V0QXR0cmlidXRlKCd0aXRsZScsIG1hdHJpeFN0cmluZyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlckNvbXBsZXgodGQ6IEhUTUxFbGVtZW50LCBjb21wbGV4OiBzdHJpbmcsIGZpZWxkOiBEYXRhYmFzZUZpZWxkKSB7XHJcbiAgY29uc3QgW3JlYWwsIGltYWddID0gY29tcGxleC5zcGxpdCgnfCcpLm1hcChOdW1iZXIpO1xyXG4gIHRkLnNldFRleHQoYCR7cmVhbH0gKyAke2ltYWd9aWApO1xyXG4gIHRkLnNldEF0dHJpYnV0ZSgndGl0bGUnLCBgQ29tcGxleDogJHtyZWFsfSArICR7aW1hZ31pYCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlckRlY2ltYWwodGQ6IEhUTUxFbGVtZW50LCBkZWNpbWFsOiBzdHJpbmcsIGZpZWxkOiBEYXRhYmFzZUZpZWxkKSB7XHJcbiAgY29uc3QgdmFsdWUgPSBwYXJzZUZsb2F0KGRlY2ltYWwpO1xyXG4gIGNvbnN0IHByZWNpc2lvbiA9IGZpZWxkLnByZWNpc2lvbiAhPT0gdW5kZWZpbmVkID8gZmllbGQucHJlY2lzaW9uIDogMjtcclxuICB0ZC5zZXRUZXh0KHZhbHVlLnRvRml4ZWQocHJlY2lzaW9uKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlclVuY2VydGFpbnR5KHRkOiBIVE1MRWxlbWVudCwgdW5jZXJ0YWludHk6IHN0cmluZywgZmllbGQ6IERhdGFiYXNlRmllbGQpIHtcclxuICBjb25zdCBbdmFsdWUsIGVycm9yXSA9IHVuY2VydGFpbnR5LnNwbGl0KCd8JykubWFwKE51bWJlcik7XHJcbiAgdGQuc2V0VGV4dChgJHt2YWx1ZX0gwrEgJHtlcnJvcn1gKTtcclxuICB0ZC5zZXRBdHRyaWJ1dGUoJ3RpdGxlJywgYFZhbHVlOiAke3ZhbHVlfVxcblVuY2VydGFpbnR5OiAke2Vycm9yfWApO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJVbml0KHRkOiBIVE1MRWxlbWVudCwgdW5pdDogc3RyaW5nLCBmaWVsZDogRGF0YWJhc2VGaWVsZCkge1xyXG4gIGNvbnN0IFt2YWx1ZSwgdW5pdFN5bWJvbF0gPSB1bml0LnNwbGl0KCd8Jyk7XHJcbiAgdGQuc2V0VGV4dChgJHt2YWx1ZX0gJHt1bml0U3ltYm9sfWApO1xyXG4gIHRkLnNldEF0dHJpYnV0ZSgndGl0bGUnLCBgVmFsdWU6ICR7dmFsdWV9XFxuVW5pdDogJHt1bml0U3ltYm9sfWApO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJUaW1lc2VyaWVzKHRkOiBIVE1MRWxlbWVudCwgdGltZXNlcmllczogc3RyaW5nLCBmaWVsZDogRGF0YWJhc2VGaWVsZCkge1xyXG4gIGNvbnN0IHBvaW50cyA9IHRpbWVzZXJpZXMuc3BsaXQoJzsnKS5tYXAocG9pbnQgPT4gcG9pbnQuc3BsaXQoJ3wnKS5tYXAoTnVtYmVyKSk7XHJcbiAgdGQuc2V0VGV4dChgVGltZXNlcmllczogJHtwb2ludHMubGVuZ3RofSBwb2ludHNgKTtcclxuICBjb25zdCB0b29sdGlwID0gcG9pbnRzLm1hcCgoW3RpbWUsIHZhbHVlXSkgPT4gYCR7bmV3IERhdGUodGltZSkudG9JU09TdHJpbmcoKX06ICR7dmFsdWV9YCkuam9pbignXFxuJyk7XHJcbiAgdGQuc2V0QXR0cmlidXRlKCd0aXRsZScsIHRvb2x0aXApO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJCaW5hcnkodGQ6IEhUTUxFbGVtZW50LCBiaW5hcnk6IHN0cmluZywgZmllbGQ6IERhdGFiYXNlRmllbGQpIHtcclxuICB0ZC5zZXRUZXh0KGBCaW5hcnk6ICR7YmluYXJ5Lmxlbmd0aH0gYnl0ZXNgKTtcclxuICB0ZC5zZXRBdHRyaWJ1dGUoJ3RpdGxlJywgYEJpbmFyeSBkYXRhOiAke2JpbmFyeS5zdWJzdHJpbmcoMCwgMjApfS4uLmApO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJGb3JtdWxhKHRkOiBIVE1MRWxlbWVudCwgZm9ybXVsYTogc3RyaW5nLCBmaWVsZDogRGF0YWJhc2VGaWVsZCkge1xyXG4gIHRkLnNldFRleHQoZm9ybXVsYSk7XHJcbiAgdGQuc2V0QXR0cmlidXRlKCd0aXRsZScsIGBGb3JtdWxhOiAke2Zvcm11bGF9YCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlckRpc3RyaWJ1dGlvbih0ZDogSFRNTEVsZW1lbnQsIGRpc3RyaWJ1dGlvbjogc3RyaW5nLCBmaWVsZDogRGF0YWJhc2VGaWVsZCkge1xyXG4gIGNvbnN0IFt0eXBlLCBwYXJhbXNdID0gZGlzdHJpYnV0aW9uLnNwbGl0KCd8Jyk7XHJcbiAgdGQuc2V0VGV4dChgRGlzdHJpYnV0aW9uOiAke3R5cGV9YCk7XHJcbiAgdGQuc2V0QXR0cmlidXRlKCd0aXRsZScsIGBUeXBlOiAke3R5cGV9XFxuUGFyYW1ldGVyczogJHtwYXJhbXN9YCk7XHJcbn1cclxuIiwiaW1wb3J0IHsgRGF0YWJhc2VGaWVsZCB9IGZyb20gJy4uL3R5cGVzJztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJBY291c3RpY0NlbGwodGQ6IEhUTUxFbGVtZW50LCBjZWxsOiBhbnksIGZpZWxkOiBEYXRhYmFzZUZpZWxkKSB7XHJcbiAgdGQuYWRkQ2xhc3MoJ2Fjb3VzdGljLWNlbGwnKTtcclxuICB0ZC5zZXRBdHRyaWJ1dGUoJ2RhdGEtdHlwZScsIGZpZWxkLnR5cGUpO1xyXG5cclxuICBzd2l0Y2ggKGZpZWxkLnR5cGUpIHtcclxuICAgIGNhc2UgJ2F1ZGlvX3NpZ25hbCc6XHJcbiAgICAgIHJlbmRlckF1ZGlvU2lnbmFsKHRkLCBjZWxsLCBmaWVsZCk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAnZnJlcXVlbmN5X3Jlc3BvbnNlJzpcclxuICAgICAgcmVuZGVyRnJlcXVlbmN5UmVzcG9uc2UodGQsIGNlbGwsIGZpZWxkKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlICdzb3VuZF9wcmVzc3VyZV9sZXZlbCc6XHJcbiAgICAgIHJlbmRlclNvdW5kUHJlc3N1cmVMZXZlbCh0ZCwgY2VsbCwgZmllbGQpO1xyXG4gICAgICBicmVhaztcclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgIHRkLnNldFRleHQoU3RyaW5nKGNlbGwpKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlckF1ZGlvU2lnbmFsKHRkOiBIVE1MRWxlbWVudCwgc2lnbmFsOiBzdHJpbmcsIGZpZWxkOiBEYXRhYmFzZUZpZWxkKSB7XHJcbiAgY29uc3Qgc2FtcGxlcyA9IHNpZ25hbC5zcGxpdCgnOycpLm1hcChOdW1iZXIpO1xyXG4gIGNvbnN0IHNhbXBsZVJhdGUgPSBmaWVsZC5zYW1wbGVSYXRlIHx8IDQ0MTAwO1xyXG4gIGNvbnN0IGR1cmF0aW9uID0gc2FtcGxlcy5sZW5ndGggLyBzYW1wbGVSYXRlO1xyXG4gIHRkLnNldFRleHQoYEF1ZGlvOiAke2R1cmF0aW9uLnRvRml4ZWQoMil9c2ApO1xyXG4gIHRkLnNldEF0dHJpYnV0ZSgndGl0bGUnLCBgXHJcbkR1cmF0aW9uOiAke2R1cmF0aW9uLnRvRml4ZWQoMil9IHNlY29uZHNcclxuU2FtcGxlIFJhdGU6ICR7c2FtcGxlUmF0ZX0gSHpcclxuU2FtcGxlczogJHtzYW1wbGVzLmxlbmd0aH1cclxuTWluIEFtcGxpdHVkZTogJHtNYXRoLm1pbiguLi5zYW1wbGVzKS50b0ZpeGVkKDIpfVxyXG5NYXggQW1wbGl0dWRlOiAke01hdGgubWF4KC4uLnNhbXBsZXMpLnRvRml4ZWQoMil9XHJcbiAgYC50cmltKCkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJGcmVxdWVuY3lSZXNwb25zZSh0ZDogSFRNTEVsZW1lbnQsIHJlc3BvbnNlOiBzdHJpbmcsIGZpZWxkOiBEYXRhYmFzZUZpZWxkKSB7XHJcbiAgY29uc3QgcG9pbnRzID0gcmVzcG9uc2Uuc3BsaXQoJzsnKS5tYXAocG9pbnQgPT4gcG9pbnQuc3BsaXQoJ3wnKS5tYXAoTnVtYmVyKSk7XHJcbiAgY29uc3QgbWluRnJlcSA9IHBvaW50c1swXVswXTtcclxuICBjb25zdCBtYXhGcmVxID0gcG9pbnRzW3BvaW50cy5sZW5ndGggLSAxXVswXTtcclxuICB0ZC5zZXRUZXh0KGBGcmVxIFJlc3BvbnNlOiAke21pbkZyZXF9LSR7bWF4RnJlcX1IemApO1xyXG4gIHRkLnNldEF0dHJpYnV0ZSgndGl0bGUnLCBgXHJcbkZyZXF1ZW5jeSBSYW5nZTogJHttaW5GcmVxfSBIeiAtICR7bWF4RnJlcX0gSHpcclxuUG9pbnRzOiAke3BvaW50cy5sZW5ndGh9XHJcbk1pbiBNYWduaXR1ZGU6ICR7TWF0aC5taW4oLi4ucG9pbnRzLm1hcChwID0+IHBbMV0pKS50b0ZpeGVkKDIpfSBkQlxyXG5NYXggTWFnbml0dWRlOiAke01hdGgubWF4KC4uLnBvaW50cy5tYXAocCA9PiBwWzFdKSkudG9GaXhlZCgyKX0gZEJcclxuICBgLnRyaW0oKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlclNvdW5kUHJlc3N1cmVMZXZlbCh0ZDogSFRNTEVsZW1lbnQsIHNwbDogbnVtYmVyLCBmaWVsZDogRGF0YWJhc2VGaWVsZCkge1xyXG4gIHRkLnNldFRleHQoYCR7c3BsLnRvRml4ZWQoMSl9IGRCYCk7XHJcbiAgbGV0IGRlc2NyaXB0aW9uID0gJyc7XHJcbiAgaWYgKHNwbCA8IDIwKSBkZXNjcmlwdGlvbiA9ICdCYXJlbHkgYXVkaWJsZSc7XHJcbiAgZWxzZSBpZiAoc3BsIDwgNDApIGRlc2NyaXB0aW9uID0gJ1F1aWV0JztcclxuICBlbHNlIGlmIChzcGwgPCA2MCkgZGVzY3JpcHRpb24gPSAnTW9kZXJhdGUnO1xyXG4gIGVsc2UgaWYgKHNwbCA8IDgwKSBkZXNjcmlwdGlvbiA9ICdMb3VkJztcclxuICBlbHNlIGlmIChzcGwgPCAxMDApIGRlc2NyaXB0aW9uID0gJ1ZlcnkgbG91ZCc7XHJcbiAgZWxzZSBkZXNjcmlwdGlvbiA9ICdFeHRyZW1lbHkgbG91ZCc7XHJcbiAgdGQuc2V0QXR0cmlidXRlKCd0aXRsZScsIGBcclxuU291bmQgUHJlc3N1cmUgTGV2ZWw6ICR7c3BsLnRvRml4ZWQoMSl9IGRCXHJcbkRlc2NyaXB0aW9uOiAke2Rlc2NyaXB0aW9ufVxyXG5cclxuUmVmZXJlbmNlIGxldmVsczpcclxuMCBkQjogVGhyZXNob2xkIG9mIGhlYXJpbmdcclxuMjAgZEI6IFdoaXNwZXJcclxuNjAgZEI6IE5vcm1hbCBjb252ZXJzYXRpb25cclxuOTAgZEI6IExhd24gbW93ZXJcclxuMTIwIGRCOiBSb2NrIGNvbmNlcnRcclxuMTQwIGRCOiBUaHJlc2hvbGQgb2YgcGFpblxyXG4gIGAudHJpbSgpKTtcclxufVxyXG4iLCJpbXBvcnQgeyBEYXRhYmFzZUZpZWxkIH0gZnJvbSAnLi4vdHlwZXMnO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckNoZW1pY2FsQ2VsbCh0ZDogSFRNTEVsZW1lbnQsIGNlbGw6IGFueSwgZmllbGQ6IERhdGFiYXNlRmllbGQpIHtcclxuICB0ZC5hZGRDbGFzcygnY2hlbWljYWwtY2VsbCcpO1xyXG4gIHRkLnNldEF0dHJpYnV0ZSgnZGF0YS10eXBlJywgZmllbGQudHlwZSk7XHJcblxyXG4gIHN3aXRjaCAoZmllbGQudHlwZSkge1xyXG4gICAgY2FzZSAnbW9sZWN1bGUnOlxyXG4gICAgICByZW5kZXJNb2xlY3VsZSh0ZCwgY2VsbCwgZmllbGQpO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgJ2NoZW1pY2FsX2Zvcm11bGEnOlxyXG4gICAgICByZW5kZXJDaGVtaWNhbEZvcm11bGEodGQsIGNlbGwsIGZpZWxkKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlICdyZWFjdGlvbic6XHJcbiAgICAgIHJlbmRlclJlYWN0aW9uKHRkLCBjZWxsLCBmaWVsZCk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgZGVmYXVsdDpcclxuICAgICAgdGQuc2V0VGV4dChTdHJpbmcoY2VsbCkpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyTW9sZWN1bGUodGQ6IEhUTUxFbGVtZW50LCBtb2xlY3VsZTogc3RyaW5nLCBmaWVsZDogRGF0YWJhc2VGaWVsZCkge1xyXG4gIGNvbnN0IFthdG9tcywgYm9uZHNdID0gbW9sZWN1bGUuc3BsaXQoJzsnKTtcclxuICBjb25zdCBhdG9tQ291bnQgPSBhdG9tcy5zcGxpdCgnfCcpLmxlbmd0aDtcclxuICB0ZC5zZXRUZXh0KGBNb2xlY3VsZTogJHthdG9tQ291bnR9IGF0b21zYCk7XHJcbiAgdGQuc2V0QXR0cmlidXRlKCd0aXRsZScsIGBcclxuQXRvbXM6ICR7YXRvbXMucmVwbGFjZSgnfCcsICcsICcpfVxyXG5Cb25kczogJHtib25kc31cclxuICBgLnRyaW0oKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlckNoZW1pY2FsRm9ybXVsYSh0ZDogSFRNTEVsZW1lbnQsIGZvcm11bGE6IHN0cmluZywgZmllbGQ6IERhdGFiYXNlRmllbGQpIHtcclxuICB0ZC5zZXRUZXh0KGZvcm11bGEpO1xyXG4gIHRkLnNldEF0dHJpYnV0ZSgndGl0bGUnLCBgQ2hlbWljYWwgRm9ybXVsYTogJHtmb3JtdWxhfWApO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJSZWFjdGlvbih0ZDogSFRNTEVsZW1lbnQsIHJlYWN0aW9uOiBzdHJpbmcsIGZpZWxkOiBEYXRhYmFzZUZpZWxkKSB7XHJcbiAgY29uc3QgW3JlYWN0YW50cywgcHJvZHVjdHMsIGNvbmRpdGlvbnNdID0gcmVhY3Rpb24uc3BsaXQoJzsnKTtcclxuICBjb25zdCByZWFjdGlvblN0cmluZyA9IGAke3JlYWN0YW50cy5yZXBsYWNlKCd8JywgJyArICcpfSDihpIgJHtwcm9kdWN0cy5yZXBsYWNlKCd8JywgJyArICcpfWA7XHJcbiAgdGQuc2V0VGV4dChyZWFjdGlvblN0cmluZyk7XHJcbiAgdGQuc2V0QXR0cmlidXRlKCd0aXRsZScsIGBcclxuUmVhY3Rpb246XHJcbiR7cmVhY3Rpb25TdHJpbmd9XHJcbiR7Y29uZGl0aW9ucyA/IGBDb25kaXRpb25zOiAke2NvbmRpdGlvbnN9YCA6ICcnfVxyXG4gIGAudHJpbSgpKTtcclxufVxyXG4iLCJpbXBvcnQgeyBEYXRhYmFzZUZpZWxkIH0gZnJvbSAnLi4vdHlwZXMnO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlclZpc3VhbENlbGwodGQ6IEhUTUxFbGVtZW50LCBjZWxsOiBhbnksIGZpZWxkOiBEYXRhYmFzZUZpZWxkKSB7XHJcbiAgdGQuYWRkQ2xhc3MoJ3Zpc3VhbC1jZWxsJyk7XHJcbiAgdGQuc2V0QXR0cmlidXRlKCdkYXRhLXR5cGUnLCBmaWVsZC50eXBlKTtcclxuXHJcbiAgc3dpdGNoIChmaWVsZC50eXBlKSB7XHJcbiAgICBjYXNlICdjb2xvcic6XHJcbiAgICAgIHJlbmRlckNvbG9yKHRkLCBjZWxsLCBmaWVsZCk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgZGVmYXVsdDpcclxuICAgICAgdGQuc2V0VGV4dChTdHJpbmcoY2VsbCkpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyQ29sb3IodGQ6IEhUTUxFbGVtZW50LCBjb2xvcjogc3RyaW5nLCBmaWVsZDogRGF0YWJhc2VGaWVsZCkge1xyXG4gIHRkLnNldFRleHQoY29sb3IpO1xyXG4gIHRkLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IGNvbG9yO1xyXG4gIHRkLnN0eWxlLmNvbG9yID0gZ2V0Q29udHJhc3RDb2xvcihjb2xvcik7XHJcbiAgdGQuc2V0QXR0cmlidXRlKCd0aXRsZScsIGBDb2xvcjogJHtjb2xvcn1gKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0Q29udHJhc3RDb2xvcihoZXhDb2xvcjogc3RyaW5nKTogc3RyaW5nIHtcclxuICBjb25zdCByID0gcGFyc2VJbnQoaGV4Q29sb3Iuc3Vic3RyKDEsMiksIDE2KTtcclxuICBjb25zdCBnID0gcGFyc2VJbnQoaGV4Q29sb3Iuc3Vic3RyKDMsMiksIDE2KTtcclxuICBjb25zdCBiID0gcGFyc2VJbnQoaGV4Q29sb3Iuc3Vic3RyKDUsMiksIDE2KTtcclxuICBjb25zdCB5aXEgPSAoKHIgKiAyOTkpICsgKGcgKiA1ODcpICsgKGIgKiAxMTQpKSAvIDEwMDA7XHJcbiAgcmV0dXJuICh5aXEgPj0gMTI4KSA/ICdibGFjaycgOiAnd2hpdGUnO1xyXG59XHJcbiIsImltcG9ydCB7IERhdGFiYXNlRmllbGQgfSBmcm9tICcuLi90eXBlcyc7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyTWlzY0NlbGwodGQ6IEhUTUxFbGVtZW50LCBjZWxsOiBhbnksIGZpZWxkOiBEYXRhYmFzZUZpZWxkKSB7XHJcbiAgdGQuYWRkQ2xhc3MoJ21pc2MtY2VsbCcpO1xyXG4gIHRkLnNldEF0dHJpYnV0ZSgnZGF0YS10eXBlJywgZmllbGQudHlwZSk7XHJcblxyXG4gIHN3aXRjaCAoZmllbGQudHlwZSkge1xyXG4gICAgY2FzZSAndXJsJzpcclxuICAgICAgcmVuZGVyVXJsKHRkLCBjZWxsLCBmaWVsZCk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAnZW1haWwnOlxyXG4gICAgICByZW5kZXJFbWFpbCh0ZCwgY2VsbCwgZmllbGQpO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgJ3Bob25lJzpcclxuICAgICAgcmVuZGVyUGhvbmUodGQsIGNlbGwsIGZpZWxkKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlICd0YWcnOlxyXG4gICAgICByZW5kZXJUYWcodGQsIGNlbGwsIGZpZWxkKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlICdwcm9ncmVzcyc6XHJcbiAgICAgIHJlbmRlclByb2dyZXNzKHRkLCBjZWxsLCBmaWVsZCk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAnY2F0ZWdvcnknOlxyXG4gICAgICByZW5kZXJDYXRlZ29yeSh0ZCwgY2VsbCwgZmllbGQpO1xyXG4gICAgICBicmVhaztcclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgIHRkLnNldFRleHQoU3RyaW5nKGNlbGwpKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlclVybCh0ZDogSFRNTEVsZW1lbnQsIHVybDogc3RyaW5nLCBmaWVsZDogRGF0YWJhc2VGaWVsZCkge1xyXG4gIHRkLnNldFRleHQodXJsKTtcclxuICB0ZC5zZXRBdHRyaWJ1dGUoJ3RpdGxlJywgYFVSTDogJHt1cmx9YCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlckVtYWlsKHRkOiBIVE1MRWxlbWVudCwgZW1haWw6IHN0cmluZywgZmllbGQ6IERhdGFiYXNlRmllbGQpIHtcclxuICB0ZC5zZXRUZXh0KGVtYWlsKTtcclxuICB0ZC5zZXRBdHRyaWJ1dGUoJ3RpdGxlJywgYEVtYWlsOiAke2VtYWlsfWApO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJQaG9uZSh0ZDogSFRNTEVsZW1lbnQsIHBob25lOiBzdHJpbmcsIGZpZWxkOiBEYXRhYmFzZUZpZWxkKSB7XHJcbiAgdGQuc2V0VGV4dChwaG9uZSk7XHJcbiAgdGQuc2V0QXR0cmlidXRlKCd0aXRsZScsIGBQaG9uZTogJHtwaG9uZX1gKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyVGFnKHRkOiBIVE1MRWxlbWVudCwgdGFnczogc3RyaW5nLCBmaWVsZDogRGF0YWJhc2VGaWVsZCkge1xyXG4gIHRkLnNldFRleHQodGFncyk7XHJcbiAgdGQuc2V0QXR0cmlidXRlKCd0aXRsZScsIGBUYWdzOiAke3RhZ3N9YCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlclByb2dyZXNzKHRkOiBIVE1MRWxlbWVudCwgcHJvZ3Jlc3M6IHN0cmluZywgZmllbGQ6IERhdGFiYXNlRmllbGQpIHtcclxuICBjb25zdCBwcm9ncmVzc1ZhbHVlID0gcGFyc2VJbnQocHJvZ3Jlc3MpO1xyXG4gIHRkLnNldFRleHQoYCR7cHJvZ3Jlc3NWYWx1ZX0lYCk7XHJcbiAgdGQuc2V0QXR0cmlidXRlKCd0aXRsZScsIGBQcm9ncmVzczogJHtwcm9ncmVzc1ZhbHVlfSVgKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyQ2F0ZWdvcnkodGQ6IEhUTUxFbGVtZW50LCBjYXRlZ29yeTogc3RyaW5nLCBmaWVsZDogRGF0YWJhc2VGaWVsZCkge1xyXG4gIHRkLnNldFRleHQoY2F0ZWdvcnkpO1xyXG5cclxuICBsZXQgdGl0bGUgPSBgQ2F0ZWdvcnk6ICR7Y2F0ZWdvcnl9YDtcclxuICBcclxuICBpZiAoZmllbGQuY2F0ZWdvcmllcykge1xyXG4gICAgbGV0IGNhdGVnb3JpZXM6IHN0cmluZ1tdO1xyXG4gICAgaWYgKHR5cGVvZiBmaWVsZC5jYXRlZ29yaWVzID09PSAnc3RyaW5nJykge1xyXG4gICAgICBjYXRlZ29yaWVzID0gZmllbGQuY2F0ZWdvcmllcy5zcGxpdCgnOycpO1xyXG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGZpZWxkLmNhdGVnb3JpZXMpKSB7XHJcbiAgICAgIGNhdGVnb3JpZXMgPSBmaWVsZC5jYXRlZ29yaWVzO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY2F0ZWdvcmllcyA9IFtdO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBjb25zdCBpbmRleCA9IGNhdGVnb3JpZXMuaW5kZXhPZihjYXRlZ29yeSk7XHJcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XHJcbiAgICAgIHRpdGxlID0gYENhdGVnb3J5ICR7aW5kZXggKyAxfSBvZiAke2NhdGVnb3JpZXMubGVuZ3RofWA7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB0ZC5zZXRBdHRyaWJ1dGUoJ3RpdGxlJywgdGl0bGUpO1xyXG59XHJcbiIsImludGVyZmFjZSBWaXJ0dWFsU2Nyb2xsZXJPcHRpb25zIHtcclxuICBjb250YWluZXI6IEhUTUxFbGVtZW50O1xyXG4gIHJvd0hlaWdodDogbnVtYmVyO1xyXG4gIHRvdGFsUm93czogbnVtYmVyO1xyXG4gIHJlbmRlclJvdzogKGluZGV4OiBudW1iZXIpID0+IEhUTUxFbGVtZW50O1xyXG4gIG92ZXJzY2FuPzogbnVtYmVyO1xyXG4gIG9uVmlzaWJsZVJhbmdlQ2hhbmdlPzogKHN0YXJ0SW5kZXg6IG51bWJlciwgZW5kSW5kZXg6IG51bWJlcikgPT4gdm9pZDtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFZpcnR1YWxTY3JvbGxlciB7XHJcbiAgcHJpdmF0ZSBjb250YWluZXI6IEhUTUxFbGVtZW50O1xyXG4gIHByaXZhdGUgcm93SGVpZ2h0OiBudW1iZXI7XHJcbiAgcHJpdmF0ZSB0b3RhbFJvd3M6IG51bWJlcjtcclxuICBwcml2YXRlIHJlbmRlclJvdzogKGluZGV4OiBudW1iZXIpID0+IEhUTUxFbGVtZW50O1xyXG4gIHByaXZhdGUgb3ZlcnNjYW46IG51bWJlcjtcclxuICBwcml2YXRlIHZpc2libGVSb3dzOiBNYXA8bnVtYmVyLCBIVE1MRWxlbWVudD4gPSBuZXcgTWFwKCk7XHJcbiAgcHJpdmF0ZSBzY3JvbGxDb250YWluZXIhOiBIVE1MRGl2RWxlbWVudDtcclxuICBwcml2YXRlIGNvbnRlbnRDb250YWluZXIhOiBIVE1MRGl2RWxlbWVudDtcclxuICBwcml2YXRlIHJlc2l6ZU9ic2VydmVyOiBSZXNpemVPYnNlcnZlcjtcclxuICBwcml2YXRlIHJhZklkOiBudW1iZXIgfCBudWxsID0gbnVsbDtcclxuICBwcml2YXRlIHJvd0hlaWdodHM6IE1hcDxudW1iZXIsIG51bWJlcj4gPSBuZXcgTWFwKCk7XHJcbiAgcHJpdmF0ZSBjb250YWluZXJSZXNpemVPYnNlcnZlcjogUmVzaXplT2JzZXJ2ZXI7XHJcbiAgcHJpdmF0ZSBvblZpc2libGVSYW5nZUNoYW5nZTogKChzdGFydEluZGV4OiBudW1iZXIsIGVuZEluZGV4OiBudW1iZXIpID0+IHZvaWQpIHwgdW5kZWZpbmVkO1xyXG4gIHByaXZhdGUgcm93Q2FjaGU6IE1hcDxudW1iZXIsIEhUTUxFbGVtZW50PiA9IG5ldyBNYXAoKTtcclxuXHJcbiAgY29uc3RydWN0b3Iob3B0aW9uczogVmlydHVhbFNjcm9sbGVyT3B0aW9ucykge1xyXG4gICAgdGhpcy5jb250YWluZXIgPSBvcHRpb25zLmNvbnRhaW5lcjtcclxuICAgIHRoaXMucm93SGVpZ2h0ID0gb3B0aW9ucy5yb3dIZWlnaHQ7XHJcbiAgICB0aGlzLnRvdGFsUm93cyA9IG9wdGlvbnMudG90YWxSb3dzO1xyXG4gICAgdGhpcy5yZW5kZXJSb3cgPSBvcHRpb25zLnJlbmRlclJvdztcclxuICAgIHRoaXMub3ZlcnNjYW4gPSBvcHRpb25zLm92ZXJzY2FuIHx8IDU7XHJcbiAgICB0aGlzLm9uVmlzaWJsZVJhbmdlQ2hhbmdlID0gb3B0aW9ucy5vblZpc2libGVSYW5nZUNoYW5nZTtcclxuXHJcbiAgICB0aGlzLmluaXRpYWxpemVET00oKTtcclxuICAgIHRoaXMuYXR0YWNoRXZlbnRMaXN0ZW5lcnMoKTtcclxuICAgIHRoaXMucmVuZGVyKCk7XHJcblxyXG4gICAgdGhpcy5yZXNpemVPYnNlcnZlciA9IG5ldyBSZXNpemVPYnNlcnZlcih0aGlzLm9uUmVzaXplLmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy5yZXNpemVPYnNlcnZlci5vYnNlcnZlKHRoaXMuc2Nyb2xsQ29udGFpbmVyKTtcclxuICAgIHRoaXMuY29udGFpbmVyUmVzaXplT2JzZXJ2ZXIgPSBuZXcgUmVzaXplT2JzZXJ2ZXIodGhpcy5vbkNvbnRhaW5lclJlc2l6ZS5iaW5kKHRoaXMpKTtcclxuICAgIHRoaXMuY29udGFpbmVyUmVzaXplT2JzZXJ2ZXIub2JzZXJ2ZSh0aGlzLmNvbnRhaW5lcik7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGluaXRpYWxpemVET00oKSB7XHJcbiAgICB0aGlzLnNjcm9sbENvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyLmNyZWF0ZUVsKCdkaXYnLCB7IGNsczogJ3ZpcnR1YWwtc2Nyb2xsLWNvbnRhaW5lcicgfSk7XHJcbiAgICB0aGlzLnNjcm9sbENvbnRhaW5lci5zdHlsZS5oZWlnaHQgPSAnMTAwJSc7XHJcbiAgICB0aGlzLnNjcm9sbENvbnRhaW5lci5zdHlsZS5vdmVyZmxvd1kgPSAnYXV0byc7XHJcblxyXG4gICAgdGhpcy5jb250ZW50Q29udGFpbmVyID0gdGhpcy5zY3JvbGxDb250YWluZXIuY3JlYXRlRWwoJ2RpdicsIHsgY2xzOiAndmlydHVhbC1zY3JvbGwtY29udGVudCcgfSk7XHJcbiAgICB0aGlzLmNvbnRlbnRDb250YWluZXIuc3R5bGUuaGVpZ2h0ID0gYCR7dGhpcy50b3RhbFJvd3MgKiB0aGlzLnJvd0hlaWdodH1weGA7XHJcbiAgICB0aGlzLmNvbnRlbnRDb250YWluZXIuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhdHRhY2hFdmVudExpc3RlbmVycygpIHtcclxuICAgIHRoaXMuc2Nyb2xsQ29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsICgpID0+IHtcclxuICAgICAgaWYgKHRoaXMucmFmSWQgPT09IG51bGwpIHtcclxuICAgICAgICB0aGlzLnJhZklkID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMub25TY3JvbGwuYmluZCh0aGlzKSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBvblNjcm9sbCgpIHtcclxuICAgIHRoaXMucmFmSWQgPSBudWxsO1xyXG4gICAgdGhpcy5yZW5kZXIoKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgb25SZXNpemUoZW50cmllczogUmVzaXplT2JzZXJ2ZXJFbnRyeVtdKSB7XHJcbiAgICBmb3IgKGxldCBlbnRyeSBvZiBlbnRyaWVzKSB7XHJcbiAgICAgIGlmIChlbnRyeS50YXJnZXQgPT09IHRoaXMuc2Nyb2xsQ29udGFpbmVyKSB7XHJcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBvbkNvbnRhaW5lclJlc2l6ZShlbnRyaWVzOiBSZXNpemVPYnNlcnZlckVudHJ5W10pIHtcclxuICAgIGZvciAobGV0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgaWYgKGVudHJ5LnRhcmdldCA9PT0gdGhpcy5jb250YWluZXIpIHtcclxuICAgICAgICB0aGlzLnVwZGF0ZVNjcm9sbENvbnRhaW5lclNpemUoKTtcclxuICAgICAgICB0aGlzLnJlbmRlcigpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHVwZGF0ZVNjcm9sbENvbnRhaW5lclNpemUoKSB7XHJcbiAgICB0aGlzLnNjcm9sbENvbnRhaW5lci5zdHlsZS53aWR0aCA9IGAke3RoaXMuY29udGFpbmVyLmNsaWVudFdpZHRofXB4YDtcclxuICAgIHRoaXMuc2Nyb2xsQ29udGFpbmVyLnN0eWxlLmhlaWdodCA9IGAke3RoaXMuY29udGFpbmVyLmNsaWVudEhlaWdodH1weGA7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdldFJvd1RvcChpbmRleDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIGxldCB0b3AgPSAwO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbmRleDsgaSsrKSB7XHJcbiAgICAgIHRvcCArPSB0aGlzLnJvd0hlaWdodHMuZ2V0KGkpIHx8IHRoaXMucm93SGVpZ2h0O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRvcDtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgc2V0Um93SGVpZ2h0KGluZGV4OiBudW1iZXIsIGhlaWdodDogbnVtYmVyKSB7XHJcbiAgICB0aGlzLnJvd0hlaWdodHMuc2V0KGluZGV4LCBoZWlnaHQpO1xyXG4gICAgdGhpcy51cGRhdGVDb250ZW50SGVpZ2h0KCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHVwZGF0ZUNvbnRlbnRIZWlnaHQoKSB7XHJcbiAgICBsZXQgdG90YWxIZWlnaHQgPSAwO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRvdGFsUm93czsgaSsrKSB7XHJcbiAgICAgIHRvdGFsSGVpZ2h0ICs9IHRoaXMucm93SGVpZ2h0cy5nZXQoaSkgfHwgdGhpcy5yb3dIZWlnaHQ7XHJcbiAgICB9XHJcbiAgICB0aGlzLmNvbnRlbnRDb250YWluZXIuc3R5bGUuaGVpZ2h0ID0gYCR7dG90YWxIZWlnaHR9cHhgO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSByZW5kZXIoKSB7XHJcbiAgICBjb25zdCBzY3JvbGxUb3AgPSB0aGlzLnNjcm9sbENvbnRhaW5lci5zY3JvbGxUb3A7XHJcbiAgICBjb25zdCB2aWV3cG9ydEhlaWdodCA9IHRoaXMuc2Nyb2xsQ29udGFpbmVyLmNsaWVudEhlaWdodDtcclxuXHJcbiAgICBsZXQgc3RhcnRJbmRleCA9IDA7XHJcbiAgICBsZXQgY3VycmVudFRvcCA9IDA7XHJcbiAgICB3aGlsZSAoY3VycmVudFRvcCA8IHNjcm9sbFRvcCAmJiBzdGFydEluZGV4IDwgdGhpcy50b3RhbFJvd3MpIHtcclxuICAgICAgY3VycmVudFRvcCArPSB0aGlzLnJvd0hlaWdodHMuZ2V0KHN0YXJ0SW5kZXgpIHx8IHRoaXMucm93SGVpZ2h0O1xyXG4gICAgICBzdGFydEluZGV4Kys7XHJcbiAgICB9XHJcbiAgICBzdGFydEluZGV4ID0gTWF0aC5tYXgoMCwgc3RhcnRJbmRleCAtIHRoaXMub3ZlcnNjYW4pO1xyXG5cclxuICAgIGxldCBlbmRJbmRleCA9IHN0YXJ0SW5kZXg7XHJcbiAgICB3aGlsZSAoY3VycmVudFRvcCA8IHNjcm9sbFRvcCArIHZpZXdwb3J0SGVpZ2h0ICYmIGVuZEluZGV4IDwgdGhpcy50b3RhbFJvd3MpIHtcclxuICAgICAgY3VycmVudFRvcCArPSB0aGlzLnJvd0hlaWdodHMuZ2V0KGVuZEluZGV4KSB8fCB0aGlzLnJvd0hlaWdodDtcclxuICAgICAgZW5kSW5kZXgrKztcclxuICAgIH1cclxuICAgIGVuZEluZGV4ID0gTWF0aC5taW4odGhpcy50b3RhbFJvd3MsIGVuZEluZGV4ICsgdGhpcy5vdmVyc2Nhbik7XHJcblxyXG4gICAgY29uc3QgdmlzaWJsZUluZGV4ZXMgPSBuZXcgU2V0PG51bWJlcj4oKTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gc3RhcnRJbmRleDsgaSA8IGVuZEluZGV4OyBpKyspIHtcclxuICAgICAgdmlzaWJsZUluZGV4ZXMuYWRkKGkpO1xyXG4gICAgICBpZiAoIXRoaXMudmlzaWJsZVJvd3MuaGFzKGkpKSB7XHJcbiAgICAgICAgbGV0IHJvd0VsZW1lbnQgPSB0aGlzLnJvd0NhY2hlLmdldChpKTtcclxuICAgICAgICBpZiAoIXJvd0VsZW1lbnQpIHtcclxuICAgICAgICAgIHJvd0VsZW1lbnQgPSB0aGlzLnJlbmRlclJvdyhpKTtcclxuICAgICAgICAgIHRoaXMucm93Q2FjaGUuc2V0KGksIHJvd0VsZW1lbnQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByb3dFbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcclxuICAgICAgICByb3dFbGVtZW50LnN0eWxlLnRvcCA9IGAke3RoaXMuZ2V0Um93VG9wKGkpfXB4YDtcclxuICAgICAgICByb3dFbGVtZW50LnN0eWxlLndpZHRoID0gJzEwMCUnO1xyXG4gICAgICAgIHRoaXMuY29udGVudENvbnRhaW5lci5hcHBlbmRDaGlsZChyb3dFbGVtZW50KTtcclxuICAgICAgICB0aGlzLnZpc2libGVSb3dzLnNldChpLCByb3dFbGVtZW50KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAoY29uc3QgW2luZGV4LCBlbGVtZW50XSBvZiB0aGlzLnZpc2libGVSb3dzKSB7XHJcbiAgICAgIGlmICghdmlzaWJsZUluZGV4ZXMuaGFzKGluZGV4KSkge1xyXG4gICAgICAgIGVsZW1lbnQucmVtb3ZlKCk7XHJcbiAgICAgICAgdGhpcy52aXNpYmxlUm93cy5kZWxldGUoaW5kZXgpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMub25WaXNpYmxlUmFuZ2VDaGFuZ2UpIHtcclxuICAgICAgdGhpcy5vblZpc2libGVSYW5nZUNoYW5nZShzdGFydEluZGV4LCBlbmRJbmRleCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgc2V0VG90YWxSb3dzKHRvdGFsUm93czogbnVtYmVyKSB7XHJcbiAgICB0aGlzLnRvdGFsUm93cyA9IHRvdGFsUm93cztcclxuICAgIHRoaXMuY29udGVudENvbnRhaW5lci5zdHlsZS5oZWlnaHQgPSBgJHt0aGlzLnRvdGFsUm93cyAqIHRoaXMucm93SGVpZ2h0fXB4YDtcclxuICB9XHJcblxyXG4gIHB1YmxpYyByZWZyZXNoKCkge1xyXG4gICAgdGhpcy52aXNpYmxlUm93cy5jbGVhcigpO1xyXG4gICAgdGhpcy5jb250ZW50Q29udGFpbmVyLmlubmVySFRNTCA9ICcnO1xyXG4gICAgdGhpcy5yZW5kZXIoKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBkZXN0cm95KCkge1xyXG4gICAgdGhpcy5yZXNpemVPYnNlcnZlci5kaXNjb25uZWN0KCk7XHJcbiAgICBpZiAodGhpcy5yYWZJZCAhPT0gbnVsbCkge1xyXG4gICAgICBjYW5jZWxBbmltYXRpb25GcmFtZSh0aGlzLnJhZklkKTtcclxuICAgIH1cclxuICAgIHRoaXMuc2Nyb2xsQ29udGFpbmVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMub25TY3JvbGwpO1xyXG4gICAgdGhpcy5jb250YWluZXJSZXNpemVPYnNlcnZlci5kaXNjb25uZWN0KCk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgaW52YWxpZGF0ZVJvdyhpbmRleDogbnVtYmVyKSB7XHJcbiAgICB0aGlzLnJvd0NhY2hlLmRlbGV0ZShpbmRleCk7XHJcbiAgICBjb25zdCByb3dFbGVtZW50ID0gdGhpcy52aXNpYmxlUm93cy5nZXQoaW5kZXgpO1xyXG4gICAgaWYgKHJvd0VsZW1lbnQpIHtcclxuICAgICAgcm93RWxlbWVudC5yZW1vdmUoKTtcclxuICAgICAgdGhpcy52aXNpYmxlUm93cy5kZWxldGUoaW5kZXgpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG4iLCIoZnVuY3Rpb24oYSxiKXtpZihcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQpZGVmaW5lKFtdLGIpO2Vsc2UgaWYoXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGV4cG9ydHMpYigpO2Vsc2V7YigpLGEuRmlsZVNhdmVyPXtleHBvcnRzOnt9fS5leHBvcnRzfX0pKHRoaXMsZnVuY3Rpb24oKXtcInVzZSBzdHJpY3RcIjtmdW5jdGlvbiBiKGEsYil7cmV0dXJuXCJ1bmRlZmluZWRcIj09dHlwZW9mIGI/Yj17YXV0b0JvbTohMX06XCJvYmplY3RcIiE9dHlwZW9mIGImJihjb25zb2xlLndhcm4oXCJEZXByZWNhdGVkOiBFeHBlY3RlZCB0aGlyZCBhcmd1bWVudCB0byBiZSBhIG9iamVjdFwiKSxiPXthdXRvQm9tOiFifSksYi5hdXRvQm9tJiYvXlxccyooPzp0ZXh0XFwvXFxTKnxhcHBsaWNhdGlvblxcL3htbHxcXFMqXFwvXFxTKlxcK3htbClcXHMqOy4qY2hhcnNldFxccyo9XFxzKnV0Zi04L2kudGVzdChhLnR5cGUpP25ldyBCbG9iKFtcIlxcdUZFRkZcIixhXSx7dHlwZTphLnR5cGV9KTphfWZ1bmN0aW9uIGMoYSxiLGMpe3ZhciBkPW5ldyBYTUxIdHRwUmVxdWVzdDtkLm9wZW4oXCJHRVRcIixhKSxkLnJlc3BvbnNlVHlwZT1cImJsb2JcIixkLm9ubG9hZD1mdW5jdGlvbigpe2coZC5yZXNwb25zZSxiLGMpfSxkLm9uZXJyb3I9ZnVuY3Rpb24oKXtjb25zb2xlLmVycm9yKFwiY291bGQgbm90IGRvd25sb2FkIGZpbGVcIil9LGQuc2VuZCgpfWZ1bmN0aW9uIGQoYSl7dmFyIGI9bmV3IFhNTEh0dHBSZXF1ZXN0O2Iub3BlbihcIkhFQURcIixhLCExKTt0cnl7Yi5zZW5kKCl9Y2F0Y2goYSl7fXJldHVybiAyMDA8PWIuc3RhdHVzJiYyOTk+PWIuc3RhdHVzfWZ1bmN0aW9uIGUoYSl7dHJ5e2EuZGlzcGF0Y2hFdmVudChuZXcgTW91c2VFdmVudChcImNsaWNrXCIpKX1jYXRjaChjKXt2YXIgYj1kb2N1bWVudC5jcmVhdGVFdmVudChcIk1vdXNlRXZlbnRzXCIpO2IuaW5pdE1vdXNlRXZlbnQoXCJjbGlja1wiLCEwLCEwLHdpbmRvdywwLDAsMCw4MCwyMCwhMSwhMSwhMSwhMSwwLG51bGwpLGEuZGlzcGF0Y2hFdmVudChiKX19dmFyIGY9XCJvYmplY3RcIj09dHlwZW9mIHdpbmRvdyYmd2luZG93LndpbmRvdz09PXdpbmRvdz93aW5kb3c6XCJvYmplY3RcIj09dHlwZW9mIHNlbGYmJnNlbGYuc2VsZj09PXNlbGY/c2VsZjpcIm9iamVjdFwiPT10eXBlb2YgZ2xvYmFsJiZnbG9iYWwuZ2xvYmFsPT09Z2xvYmFsP2dsb2JhbDp2b2lkIDAsYT1mLm5hdmlnYXRvciYmL01hY2ludG9zaC8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSYmL0FwcGxlV2ViS2l0Ly50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpJiYhL1NhZmFyaS8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSxnPWYuc2F2ZUFzfHwoXCJvYmplY3RcIiE9dHlwZW9mIHdpbmRvd3x8d2luZG93IT09Zj9mdW5jdGlvbigpe306XCJkb3dubG9hZFwiaW4gSFRNTEFuY2hvckVsZW1lbnQucHJvdG90eXBlJiYhYT9mdW5jdGlvbihiLGcsaCl7dmFyIGk9Zi5VUkx8fGYud2Via2l0VVJMLGo9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIik7Zz1nfHxiLm5hbWV8fFwiZG93bmxvYWRcIixqLmRvd25sb2FkPWcsai5yZWw9XCJub29wZW5lclwiLFwic3RyaW5nXCI9PXR5cGVvZiBiPyhqLmhyZWY9YixqLm9yaWdpbj09PWxvY2F0aW9uLm9yaWdpbj9lKGopOmQoai5ocmVmKT9jKGIsZyxoKTplKGosai50YXJnZXQ9XCJfYmxhbmtcIikpOihqLmhyZWY9aS5jcmVhdGVPYmplY3RVUkwoYiksc2V0VGltZW91dChmdW5jdGlvbigpe2kucmV2b2tlT2JqZWN0VVJMKGouaHJlZil9LDRFNCksc2V0VGltZW91dChmdW5jdGlvbigpe2Uoail9LDApKX06XCJtc1NhdmVPck9wZW5CbG9iXCJpbiBuYXZpZ2F0b3I/ZnVuY3Rpb24oZixnLGgpe2lmKGc9Z3x8Zi5uYW1lfHxcImRvd25sb2FkXCIsXCJzdHJpbmdcIiE9dHlwZW9mIGYpbmF2aWdhdG9yLm1zU2F2ZU9yT3BlbkJsb2IoYihmLGgpLGcpO2Vsc2UgaWYoZChmKSljKGYsZyxoKTtlbHNle3ZhciBpPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO2kuaHJlZj1mLGkudGFyZ2V0PVwiX2JsYW5rXCIsc2V0VGltZW91dChmdW5jdGlvbigpe2UoaSl9KX19OmZ1bmN0aW9uKGIsZCxlLGcpe2lmKGc9Z3x8b3BlbihcIlwiLFwiX2JsYW5rXCIpLGcmJihnLmRvY3VtZW50LnRpdGxlPWcuZG9jdW1lbnQuYm9keS5pbm5lclRleHQ9XCJkb3dubG9hZGluZy4uLlwiKSxcInN0cmluZ1wiPT10eXBlb2YgYilyZXR1cm4gYyhiLGQsZSk7dmFyIGg9XCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIj09PWIudHlwZSxpPS9jb25zdHJ1Y3Rvci9pLnRlc3QoZi5IVE1MRWxlbWVudCl8fGYuc2FmYXJpLGo9L0NyaU9TXFwvW1xcZF0rLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpO2lmKChqfHxoJiZpfHxhKSYmXCJ1bmRlZmluZWRcIiE9dHlwZW9mIEZpbGVSZWFkZXIpe3ZhciBrPW5ldyBGaWxlUmVhZGVyO2sub25sb2FkZW5kPWZ1bmN0aW9uKCl7dmFyIGE9ay5yZXN1bHQ7YT1qP2E6YS5yZXBsYWNlKC9eZGF0YTpbXjtdKjsvLFwiZGF0YTphdHRhY2htZW50L2ZpbGU7XCIpLGc/Zy5sb2NhdGlvbi5ocmVmPWE6bG9jYXRpb249YSxnPW51bGx9LGsucmVhZEFzRGF0YVVSTChiKX1lbHNle3ZhciBsPWYuVVJMfHxmLndlYmtpdFVSTCxtPWwuY3JlYXRlT2JqZWN0VVJMKGIpO2c/Zy5sb2NhdGlvbj1tOmxvY2F0aW9uLmhyZWY9bSxnPW51bGwsc2V0VGltZW91dChmdW5jdGlvbigpe2wucmV2b2tlT2JqZWN0VVJMKG0pfSw0RTQpfX0pO2Yuc2F2ZUFzPWcuc2F2ZUFzPWcsXCJ1bmRlZmluZWRcIiE9dHlwZW9mIG1vZHVsZSYmKG1vZHVsZS5leHBvcnRzPWcpfSk7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPUZpbGVTYXZlci5taW4uanMubWFwIiwiaW1wb3J0IHsgSXRlbVZpZXcsIFdvcmtzcGFjZUxlYWYsIEFwcCwgVGV4dENvbXBvbmVudCwgRHJvcGRvd25Db21wb25lbnQsIEJ1dHRvbkNvbXBvbmVudCwgTm90aWNlLCBNYXJrZG93blZpZXcsIE1vZGFsLCBTZXR0aW5nLCBGdXp6eVN1Z2dlc3RNb2RhbCwgVEZvbGRlciwgVEZpbGUgfSBmcm9tICdvYnNpZGlhbic7XHJcbmltcG9ydCB7IERhdGFiYXNlVGFibGUsIERhdGFiYXNlVmlld0ludGVyZmFjZSwgVGFibGVTdGF0ZSwgU29ydFN0YXRlLCBEYXRhYmFzZVBsdWdpbkludGVyZmFjZSwgRGF0YWJhc2VGaWVsZCwgRGF0YWJhc2VGaWVsZFR5cGUgfSBmcm9tICcuL3R5cGVzJztcclxuaW1wb3J0IHsgZGVidWcsIGluZm8sIHdhcm4sIGVycm9yIH0gZnJvbSAnLi91dGlscy9sb2dnZXInO1xyXG5pbXBvcnQgeyBcclxuICByZW5kZXJCYXNpY0NlbGwsIFxyXG4gIHJlbmRlckRhdGVUaW1lQ2VsbCwgXHJcbiAgcmVuZGVyR2Vvc3BhdGlhbENlbGwsIFxyXG4gIHJlbmRlclNjaWVudGlmaWNDZWxsLCBcclxuICByZW5kZXJBY291c3RpY0NlbGwsIFxyXG4gIHJlbmRlckNoZW1pY2FsQ2VsbCwgXHJcbiAgcmVuZGVyVmlzdWFsQ2VsbCwgXHJcbiAgcmVuZGVyTWlzY0NlbGwgXHJcbn0gZnJvbSAnLi9yZW5kZXJlcnMnO1xyXG5pbXBvcnQgeyBWaXJ0dWFsU2Nyb2xsZXIgfSBmcm9tICcuL1ZpcnR1YWxTY3JvbGxlcic7XHJcbmltcG9ydCBKU1ppcCBmcm9tICdqc3ppcCc7XHJcbmltcG9ydCB7IHNhdmVBcyB9IGZyb20gJ2ZpbGUtc2F2ZXInO1xyXG5pbXBvcnQgRGVjaW1hbCBmcm9tICdkZWNpbWFsLmpzJztcclxuXHJcbmV4cG9ydCBjb25zdCBEQVRBQkFTRV9WSUVXX1RZUEUgPSAnZGF0YWJhc2Utdmlldyc7XHJcblxyXG5leHBvcnQgY2xhc3MgRGF0YWJhc2VWaWV3IGV4dGVuZHMgSXRlbVZpZXcgaW1wbGVtZW50cyBEYXRhYmFzZVZpZXdJbnRlcmZhY2Uge1xyXG4gIHByaXZhdGUgdGFibGVzOiBEYXRhYmFzZVRhYmxlW10gPSBbXTtcclxuICBwcml2YXRlIHRhYmxlU3RhdGVzOiBUYWJsZVN0YXRlW10gPSBbXTtcclxuICBwcml2YXRlIHNvcnRTdGF0ZXM6IE1hcDxEYXRhYmFzZVRhYmxlLCB7IGNvbHVtbjogbnVtYmVyOyBkaXJlY3Rpb246ICdhc2MnIHwgJ2Rlc2MnIH0+ID0gbmV3IE1hcCgpO1xyXG4gIHByaXZhdGUgdGFibGVFbGVtZW50czogTWFwPERhdGFiYXNlVGFibGUsIEhUTUxFbGVtZW50PiA9IG5ldyBNYXAoKTtcclxuICBwcml2YXRlIGV4cG9ydERyb3Bkb3duPzogRHJvcGRvd25Db21wb25lbnQ7XHJcbiAgcHJpdmF0ZSBleHBvcnRCdXR0b24/OiBCdXR0b25Db21wb25lbnQ7XHJcbiAgcHJpdmF0ZSBpbXBvcnRCdXR0b24/OiBCdXR0b25Db21wb25lbnQ7XHJcbiAgcHJpdmF0ZSBwbHVnaW46IERhdGFiYXNlUGx1Z2luSW50ZXJmYWNlO1xyXG4gIHByaXZhdGUgc2VsZWN0ZWRUYWJsZXM6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpO1xyXG4gIHByaXZhdGUgdmlydHVhbFNjcm9sbGVyczogTWFwPHN0cmluZywgVmlydHVhbFNjcm9sbGVyPiA9IG5ldyBNYXAoKTtcclxuICBwcml2YXRlIHBhZ2VTaXplOiBudW1iZXIgPSAxMDA7IC8vIOavj+mhteWKoOi9veeahOihjOaVsFxyXG4gIHByaXZhdGUgY3VycmVudFBhZ2U6IG51bWJlciA9IDA7XHJcbiAgcHJpdmF0ZSBleHBvcnRUeXBlU2VsZWN0ITogSFRNTFNlbGVjdEVsZW1lbnQ7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGxlYWY6IFdvcmtzcGFjZUxlYWYsIHBsdWdpbjogRGF0YWJhc2VQbHVnaW5JbnRlcmZhY2UpIHtcclxuICAgIHN1cGVyKGxlYWYpO1xyXG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcbiAgICB0aGlzLnRhYmxlcyA9IFtdOyAvLyDliJ3lp4vljJbkuLrnqbrmlbDnu4RcclxuICB9XHJcblxyXG4gIGdldFZpZXdUeXBlKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gREFUQUJBU0VfVklFV19UWVBFO1xyXG4gIH1cclxuXHJcbiAgZ2V0RGlzcGxheVRleHQoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiAn5pWw5o2u5bqT6KeG5Zu+JztcclxuICB9XHJcblxyXG4gIGFzeW5jIG9uT3BlbigpIHtcclxuICAgIGRlYnVnKFwiRGF0YWJhc2VWaWV3IG9uT3BlbiBtZXRob2QgY2FsbGVkXCIpO1xyXG4gICAgY29uc3QgY29udGFpbmVyID0gdGhpcy5jb250YWluZXJFbC5jaGlsZHJlblsxXTtcclxuICAgIGNvbnRhaW5lci5lbXB0eSgpO1xyXG4gICAgY29udGFpbmVyLmFkZENsYXNzKCdkYXRhYmFzZS12aWV3LWNvbnRhaW5lcicpO1xyXG5cclxuICAgIC8vIOa3u+WKoOmhtumDqOagj1xyXG4gICAgY29uc3QgdG9wQmFyID0gY29udGFpbmVyLmNyZWF0ZUVsKCdkaXYnLCB7IGNsczogJ2RhdGFiYXNlLXZpZXctdG9wLWJhcicgfSk7XHJcbiAgICBkZWJ1ZyhgVG9wIGJhciBjcmVhdGVkOiAke3RvcEJhciA/ICdzdWNjZXNzJyA6ICdmYWlsZWQnfWApO1xyXG4gICAgXHJcbiAgICAvLyDmt7vliqDlr7zlh7rnsbvlnovpgInmi6nkuIvmi4nmoYZcclxuICAgIHRoaXMuZXhwb3J0VHlwZVNlbGVjdCA9IHRvcEJhci5jcmVhdGVFbCgnc2VsZWN0JywgeyBjbHM6ICdleHBvcnQtdHlwZS1zZWxlY3QnIH0pO1xyXG4gICAgdGhpcy5leHBvcnRUeXBlU2VsZWN0LmNyZWF0ZUVsKCdvcHRpb24nLCB7IHZhbHVlOiAnY3N2JywgdGV4dDogJ0NTVicgfSk7XHJcbiAgICB0aGlzLmV4cG9ydFR5cGVTZWxlY3QuY3JlYXRlRWwoJ29wdGlvbicsIHsgdmFsdWU6ICdqc29uJywgdGV4dDogJ0pTT04nIH0pO1xyXG5cclxuICAgIC8vIOWKoOWvvOWHuuaMiemSrlxyXG4gICAgdGhpcy5leHBvcnRCdXR0b24gPSBuZXcgQnV0dG9uQ29tcG9uZW50KHRvcEJhcilcclxuICAgICAgLnNldEJ1dHRvblRleHQoJ+WvvOWHuicpXHJcbiAgICAgIC5vbkNsaWNrKCgpID0+IHRoaXMub3BlbkV4cG9ydE1vZGFsKCkpO1xyXG4gICAgZGVidWcoYEV4cG9ydCBidXR0b24gY3JlYXRlZDogJHt0aGlzLmV4cG9ydEJ1dHRvbiA/ICdzdWNjZXNzJyA6ICdmYWlsZWQnfWApO1xyXG5cclxuICAgIC8vIOa3u+WKoOWvvOWFpeaMiemSrlxyXG4gICAgdGhpcy5pbXBvcnRCdXR0b24gPSBuZXcgQnV0dG9uQ29tcG9uZW50KHRvcEJhcilcclxuICAgICAgLnNldEJ1dHRvblRleHQoJ+WvvOWFpScpXHJcbiAgICAgIC5vbkNsaWNrKCgpID0+IHRoaXMuaW1wb3J0RGF0YSgpKTtcclxuICAgIGRlYnVnKGBJbXBvcnQgYnV0dG9uIGNyZWF0ZWQ6ICR7dGhpcy5pbXBvcnRCdXR0b24gPyAnc3VjY2VzcycgOiAnZmFpbGVkJ31gKTtcclxuXHJcbiAgICAvLyDmuLLmn5PooajmoLxcclxuICAgIHRoaXMucmVuZGVyVGFibGVzKCk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBvbkNsb3NlKCkge1xyXG4gICAgLy8g5riF55CG5bel5L2cXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgc2V0VGFibGVzKHRhYmxlczogRGF0YWJhc2VUYWJsZVtdKTogdm9pZCB7XHJcbiAgICB0aGlzLnRhYmxlcyA9IHRhYmxlcztcclxuICAgIHRoaXMudGFibGVTdGF0ZXMgPSB0YWJsZXMubWFwKCh0YWJsZSwgaW5kZXgpID0+ICh7XHJcbiAgICAgIHRhYmxlLFxyXG4gICAgICBpZDogaW5kZXgsXHJcbiAgICAgIHNlYXJjaFRlcm06ICcnLFxyXG4gICAgICBjdXJyZW50RGF0YTogdGFibGUuZGF0YS5zbGljZSgxLCB0aGlzLnBhZ2VTaXplICsgMSkgLy8g5LuO56ys5LqM6KGM5byA5aeL5Yqg6L295pWw5o2uXHJcbiAgICB9KSk7XHJcbiAgICBcclxuICAgIGRlYnVnKGBUYWJsZXMgc2V0OiAke3RhYmxlcy5sZW5ndGh9IHRhYmxlc2ApO1xyXG4gICAgdGhpcy5yZW5kZXJUYWJsZXMoKTtcclxuICAgIHRoaXMuY2hlY2tCdXR0b25WaXNpYmlsaXR5KCk7XHJcblxyXG4gICAgdGhpcy5hcHAud29ya3NwYWNlLnVwZGF0ZU9wdGlvbnMoKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBnZXRUYWJsZXMoKTogRGF0YWJhc2VUYWJsZVtdIHtcclxuICAgIHJldHVybiB0aGlzLnRhYmxlcztcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcmVuZGVyVGFibGVzKCkge1xyXG4gICAgZGVidWcoYFJlbmRlcmluZyB0YWJsZXM6ICR7SlNPTi5zdHJpbmdpZnkodGhpcy50YWJsZVN0YXRlcyl9YCk7XHJcbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLmNvbnRhaW5lckVsLmNoaWxkcmVuWzFdO1xyXG4gICAgY29uc3QgdGFibGVzQ29udGFpbmVyID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy5kYXRhYmFzZS10YWJsZXMtY29udGFpbmVyJykgfHwgY29udGFpbmVyLmNyZWF0ZUVsKCdkaXYnLCB7IGNsczogJ2RhdGFiYXNlLXRhYmxlcy1jb250YWluZXInIH0pO1xyXG4gICAgdGFibGVzQ29udGFpbmVyLmVtcHR5KCk7XHJcblxyXG4gICAgdGhpcy50YWJsZVN0YXRlcy5mb3JFYWNoKHN0YXRlID0+IHtcclxuICAgICAgY29uc3QgdGFibGVDb250YWluZXIgPSB0YWJsZXNDb250YWluZXIuY3JlYXRlRWwoJ2RpdicsIHsgY2xzOiAnZGF0YWJhc2UtdGFibGUtY29udGFpbmVyJyB9KTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IHRhYmxlSGVhZGVyID0gdGFibGVDb250YWluZXIuY3JlYXRlRWwoJ2RpdicsIHsgY2xzOiAnZGF0YWJhc2UtdGFibGUtaGVhZGVyJyB9KTtcclxuICAgICAgdGFibGVIZWFkZXIuY3JlYXRlRWwoJ2gzJywgeyB0ZXh0OiBzdGF0ZS50YWJsZS5uYW1lIH0pO1xyXG5cclxuICAgICAgY29uc3Qgc2VhcmNoSW5wdXQgPSBuZXcgVGV4dENvbXBvbmVudCh0YWJsZUhlYWRlcilcclxuICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJ+aQnOe0oi4uLicpXHJcbiAgICAgICAgLm9uQ2hhbmdlKHZhbHVlID0+IHtcclxuICAgICAgICAgIHN0YXRlLnNlYXJjaFRlcm0gPSB2YWx1ZTtcclxuICAgICAgICAgIHRoaXMudXBkYXRlVGFibGUoc3RhdGUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICBzZWFyY2hJbnB1dC5pbnB1dEVsLmFkZENsYXNzKCdzZWFyY2gtaW5wdXQnKTtcclxuXHJcbiAgICAgIGNvbnN0IHRhYmxlRWxlbWVudCA9IHRhYmxlQ29udGFpbmVyLmNyZWF0ZUVsKCdkaXYnLCB7IGNsczogJ2RhdGFiYXNlLXRhYmxlJyB9KTtcclxuICAgICAgdGhpcy5jcmVhdGVWaXJ0dWFsU2Nyb2xsZXIoc3RhdGUsIHRhYmxlRWxlbWVudCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyDnoa7kv53mlbDmja7liqDovb1cclxuICAgICAgdGhpcy5sb2FkUGFnZShzdGF0ZSwgMCk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlVmlydHVhbFNjcm9sbGVyKHN0YXRlOiBUYWJsZVN0YXRlLCBjb250YWluZXI6IEhUTUxFbGVtZW50KSB7XHJcbiAgICBjb25zb2xlLmxvZygnQ3JlYXRpbmcgdmlydHVhbCBzY3JvbGxlciBmb3IgdGFibGU6Jywgc3RhdGUudGFibGUubmFtZSk7XHJcbiAgICBjb25zdCBoZWFkZXJSb3cgPSBjb250YWluZXIuY3JlYXRlRWwoJ2RpdicsIHsgY2xzOiAnZGF0YWJhc2Utcm93IGhlYWRlci1yb3cnIH0pO1xyXG4gICAgc3RhdGUudGFibGUuZmllbGRzLmZvckVhY2goKGZpZWxkLCBpbmRleCkgPT4ge1xyXG4gICAgICBjb25zdCB0aCA9IGhlYWRlclJvdy5jcmVhdGVFbCgnZGl2JywgeyBjbHM6ICdkYXRhYmFzZS1jZWxsIGhlYWRlci1jZWxsJywgdGV4dDogZmllbGQubmFtZSB9KTtcclxuICAgICAgdGguYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLnNvcnRUYWJsZShzdGF0ZSwgaW5kZXgpKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHZpcnR1YWxTY3JvbGxlciA9IG5ldyBWaXJ0dWFsU2Nyb2xsZXIoe1xyXG4gICAgICBjb250YWluZXI6IGNvbnRhaW5lcixcclxuICAgICAgcm93SGVpZ2h0OiAzMCxcclxuICAgICAgdG90YWxSb3dzOiBzdGF0ZS50YWJsZS5kYXRhLmxlbmd0aCxcclxuICAgICAgcmVuZGVyUm93OiAoaW5kZXgpID0+IHRoaXMucmVuZGVyUm93KHN0YXRlLCBpbmRleCksXHJcbiAgICAgIG9uVmlzaWJsZVJhbmdlQ2hhbmdlOiAoc3RhcnRJbmRleCwgZW5kSW5kZXgpID0+IHRoaXMub25WaXNpYmxlUmFuZ2VDaGFuZ2Uoc3RhdGUsIHN0YXJ0SW5kZXgsIGVuZEluZGV4KSxcclxuICAgIH0pO1xyXG4gICAgdGhpcy52aXJ0dWFsU2Nyb2xsZXJzLnNldChzdGF0ZS50YWJsZS5uYW1lLCB2aXJ0dWFsU2Nyb2xsZXIpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSByZW5kZXJSb3coc3RhdGU6IFRhYmxlU3RhdGUsIGluZGV4OiBudW1iZXIpIHtcclxuICAgIGNvbnNvbGUubG9nKCdSZW5kZXJpbmcgcm93OicsIGluZGV4LCAnZm9yIHRhYmxlOicsIHN0YXRlLnRhYmxlLm5hbWUpO1xyXG4gICAgY29uc3Qgcm93ID0gc3RhdGUudGFibGUuZGF0YVtpbmRleF07XHJcbiAgICBjb25zdCByb3dFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICByb3dFbGVtZW50LmNsYXNzTGlzdC5hZGQoJ2RhdGFiYXNlLXJvdycpO1xyXG5cclxuICAgIHJvdy5mb3JFYWNoKChjZWxsLCBjZWxsSW5kZXgpID0+IHtcclxuICAgICAgY29uc3QgY2VsbEVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgY2VsbEVsZW1lbnQuY2xhc3NMaXN0LmFkZCgnZGF0YWJhc2UtY2VsbCcpO1xyXG4gICAgICBjb25zdCBmaWVsZCA9IHN0YXRlLnRhYmxlLmZpZWxkc1tjZWxsSW5kZXhdO1xyXG4gICAgICB0aGlzLnJlbmRlckNlbGwoY2VsbEVsZW1lbnQsIGNlbGwsIGZpZWxkKTtcclxuICAgICAgcm93RWxlbWVudC5hcHBlbmRDaGlsZChjZWxsRWxlbWVudCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gcm93RWxlbWVudDtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcmVuZGVyQ2VsbCh0ZDogSFRNTEVsZW1lbnQsIGNlbGw6IGFueSwgZmllbGQ6IERhdGFiYXNlRmllbGQpIHtcclxuICAgIHN3aXRjaCAoZmllbGQudHlwZSkge1xyXG4gICAgICBjYXNlICdzdHJpbmcnOlxyXG4gICAgICBjYXNlICdudW1iZXInOlxyXG4gICAgICBjYXNlICdib29sZWFuJzpcclxuICAgICAgY2FzZSAnYXJyYXknOlxyXG4gICAgICBjYXNlICdvYmplY3QnOlxyXG4gICAgICAgIHJlbmRlckJhc2ljQ2VsbCh0ZCwgY2VsbCwgZmllbGQpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlICdkYXRlJzpcclxuICAgICAgY2FzZSAndGltZWRlbHRhJzpcclxuICAgICAgICByZW5kZXJEYXRlVGltZUNlbGwodGQsIGNlbGwsIGZpZWxkKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAnZ2VvJzpcclxuICAgICAgY2FzZSAncG9seWdvbic6XHJcbiAgICAgICAgcmVuZGVyR2Vvc3BhdGlhbENlbGwodGQsIGNlbGwsIGZpZWxkKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAndmVjdG9yJzpcclxuICAgICAgY2FzZSAnbWF0cml4JzpcclxuICAgICAgY2FzZSAnY29tcGxleCc6XHJcbiAgICAgIGNhc2UgJ2RlY2ltYWwnOlxyXG4gICAgICBjYXNlICd1bmNlcnRhaW50eSc6XHJcbiAgICAgIGNhc2UgJ3VuaXQnOlxyXG4gICAgICBjYXNlICd0aW1lc2VyaWVzJzpcclxuICAgICAgY2FzZSAnYmluYXJ5JzpcclxuICAgICAgY2FzZSAnZm9ybXVsYSc6XHJcbiAgICAgIGNhc2UgJ2Rpc3RyaWJ1dGlvbic6XHJcbiAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcclxuICAgICAgY2FzZSAnaW50ZXJ2YWwnOlxyXG4gICAgICBjYXNlICdjdXJyZW5jeSc6XHJcbiAgICAgIGNhc2UgJ3JlZ2V4JzpcclxuICAgICAgY2FzZSAnaXBhZGRyZXNzJzpcclxuICAgICAgY2FzZSAndXVpZCc6XHJcbiAgICAgIGNhc2UgJ3ZlcnNpb24nOlxyXG4gICAgICBjYXNlICdiaXRmaWVsZCc6XHJcbiAgICAgIGNhc2UgJ2VudW0nOlxyXG4gICAgICBjYXNlICdmdXp6eSc6XHJcbiAgICAgIGNhc2UgJ3F1YXRlcm5pb24nOlxyXG4gICAgICAgIHJlbmRlclNjaWVudGlmaWNDZWxsKHRkLCBjZWxsLCBmaWVsZCk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgJ2F1ZGlvX3NpZ25hbCc6XHJcbiAgICAgIGNhc2UgJ2ZyZXF1ZW5jeV9yZXNwb25zZSc6XHJcbiAgICAgIGNhc2UgJ3NvdW5kX3ByZXNzdXJlX2xldmVsJzpcclxuICAgICAgICByZW5kZXJBY291c3RpY0NlbGwodGQsIGNlbGwsIGZpZWxkKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAnbW9sZWN1bGUnOlxyXG4gICAgICBjYXNlICdjaGVtaWNhbF9mb3JtdWxhJzpcclxuICAgICAgY2FzZSAncmVhY3Rpb24nOlxyXG4gICAgICAgIHJlbmRlckNoZW1pY2FsQ2VsbCh0ZCwgY2VsbCwgZmllbGQpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlICdjb2xvcic6XHJcbiAgICAgICAgcmVuZGVyVmlzdWFsQ2VsbCh0ZCwgY2VsbCwgZmllbGQpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlICd1cmwnOlxyXG4gICAgICBjYXNlICdlbWFpbCc6XHJcbiAgICAgIGNhc2UgJ3Bob25lJzpcclxuICAgICAgY2FzZSAndGFnJzpcclxuICAgICAgY2FzZSAncHJvZ3Jlc3MnOlxyXG4gICAgICBjYXNlICdjYXRlZ29yeSc6XHJcbiAgICAgICAgcmVuZGVyTWlzY0NlbGwodGQsIGNlbGwsIGZpZWxkKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICB0ZC5zZXRUZXh0KFN0cmluZyhjZWxsKSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g5re75Yqg5a6M5pW05L+h5oGv5L2c5Li6IHRpdGxlIOWxnuaAp1xyXG4gICAgY29uc3QgZnVsbEluZm8gPSB0aGlzLmdldEZ1bGxJbmZvKGNlbGwsIGZpZWxkKTtcclxuICAgIHRkLnNldEF0dHJpYnV0ZSgndGl0bGUnLCBmdWxsSW5mbyk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdldEZ1bGxJbmZvKGNlbGw6IGFueSwgZmllbGQ6IERhdGFiYXNlRmllbGQpOiBzdHJpbmcge1xyXG4gICAgc3dpdGNoIChmaWVsZC50eXBlKSB7XHJcbiAgICAgIGNhc2UgJ3N0cmluZyc6XHJcbiAgICAgIGNhc2UgJ251bWJlcic6XHJcbiAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxyXG4gICAgICAgIHJldHVybiBTdHJpbmcoY2VsbCk7XHJcbiAgICAgIGNhc2UgJ2RhdGUnOlxyXG4gICAgICAgIHJldHVybiBuZXcgRGF0ZShjZWxsKS50b0xvY2FsZVN0cmluZygpO1xyXG4gICAgICBjYXNlICdhcnJheSc6XHJcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGNlbGwpO1xyXG4gICAgICBjYXNlICdvYmplY3QnOlxyXG4gICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShjZWxsLCBudWxsLCAyKTtcclxuICAgICAgLy8g5re75Yqg5YW25LuW57G75Z6L55qE5aSE55CGLi4uXHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgcmV0dXJuIFN0cmluZyhjZWxsKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgc29ydFRhYmxlKHN0YXRlOiBUYWJsZVN0YXRlLCBjb2x1bW5JbmRleDogbnVtYmVyKSB7XHJcbiAgICBjb25zdCBmaWVsZCA9IHN0YXRlLnRhYmxlLmZpZWxkc1tjb2x1bW5JbmRleF07XHJcbiAgICBjb25zdCBjdXJyZW50RGlyZWN0aW9uID0gdGhpcy5zb3J0U3RhdGVzLmdldChzdGF0ZS50YWJsZSk/LmRpcmVjdGlvbiB8fCAnYXNjJztcclxuICAgIGNvbnN0IG5ld0RpcmVjdGlvbiA9IGN1cnJlbnREaXJlY3Rpb24gPT09ICdhc2MnID8gJ2Rlc2MnIDogJ2FzYyc7XHJcblxyXG4gICAgc3RhdGUuY3VycmVudERhdGEgPSBbLi4uc3RhdGUuY3VycmVudERhdGFdLnNvcnQoKGEsIGIpID0+IHtcclxuICAgICAgY29uc3QgdmFsdWVBID0gYVtjb2x1bW5JbmRleF07XHJcbiAgICAgIGNvbnN0IHZhbHVlQiA9IGJbY29sdW1uSW5kZXhdO1xyXG4gICAgICBcclxuICAgICAgbGV0IGNvbXBhcmlzb24gPSAwO1xyXG4gICAgICBpZiAodmFsdWVBIDwgdmFsdWVCKSBjb21wYXJpc29uID0gLTE7XHJcbiAgICAgIGlmICh2YWx1ZUEgPiB2YWx1ZUIpIGNvbXBhcmlzb24gPSAxO1xyXG5cclxuICAgICAgcmV0dXJuIG5ld0RpcmVjdGlvbiA9PT0gJ2FzYycgPyBjb21wYXJpc29uIDogLWNvbXBhcmlzb247XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLnNvcnRTdGF0ZXMuc2V0KHN0YXRlLnRhYmxlLCB7IGNvbHVtbjogY29sdW1uSW5kZXgsIGRpcmVjdGlvbjogbmV3RGlyZWN0aW9uIH0pO1xyXG4gICAgdGhpcy5yZW5kZXJUYWJsZXMoKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgb3BlbkV4cG9ydE1vZGFsKCkge1xyXG4gICAgbmV3IEV4cG9ydE1vZGFsKHRoaXMuYXBwLCB0aGlzLnRhYmxlcywgKHNlbGVjdGVkVGFibGVzOiBzdHJpbmdbXSkgPT4ge1xyXG4gICAgICBjb25zdCBmb3JtYXQgPSB0aGlzLmV4cG9ydFR5cGVTZWxlY3QudmFsdWUgYXMgJ2NzdicgfCAnanNvbic7XHJcbiAgICAgIGlmIChmb3JtYXQpIHtcclxuICAgICAgICB0aGlzLmV4cG9ydERhdGEoc2VsZWN0ZWRUYWJsZXMsIGZvcm1hdCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbmV3IE5vdGljZSgn6K+36YCJ5oup5a+85Ye65qC85byPJyk7XHJcbiAgICAgIH1cclxuICAgIH0pLm9wZW4oKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZXhwb3J0RGF0YShzZWxlY3RlZFRhYmxlczogc3RyaW5nW10sIGZvcm1hdDogJ2NzdicgfCAnanNvbicpIHtcclxuICAgIGNvbnN0IHRhYmxlcyA9IHRoaXMudGFibGVzLmZpbHRlcih0YWJsZSA9PiBzZWxlY3RlZFRhYmxlcy5pbmNsdWRlcyh0YWJsZS5uYW1lKSk7XHJcbiAgICBcclxuICAgIGxldCBjb250ZW50ID0gJyc7XHJcbiAgICBpZiAoZm9ybWF0ID09PSAnY3N2Jykge1xyXG4gICAgICBjb250ZW50ID0gdGhpcy5nZW5lcmF0ZUNTVkNvbnRlbnQodGFibGVzKTtcclxuICAgIH0gZWxzZSBpZiAoZm9ybWF0ID09PSAnanNvbicpIHtcclxuICAgICAgY29udGVudCA9IHRoaXMuZ2VuZXJhdGVKU09OQ29udGVudCh0YWJsZXMpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbY29udGVudF0sIHsgdHlwZTogJ3RleHQvcGxhaW47Y2hhcnNldD11dGYtOCcgfSk7XHJcbiAgICBzYXZlQXMoYmxvYiwgYGRhdGFiYXNlX2V4cG9ydC4ke2Zvcm1hdH1gKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2VuZXJhdGVDU1ZDb250ZW50KHRhYmxlczogRGF0YWJhc2VUYWJsZVtdKTogc3RyaW5nIHtcclxuICAgIHJldHVybiB0YWJsZXMubWFwKHRhYmxlID0+IHtcclxuICAgICAgY29uc3QgaGVhZGVyID0gYGRiOiR7dGFibGUubmFtZX1cXG4ke3RhYmxlLmZpZWxkcy5tYXAoZiA9PiBmLnR5cGUpLmpvaW4oJywnKX1cXG4ke3RhYmxlLmZpZWxkcy5tYXAoZiA9PiBmLm5hbWUpLmpvaW4oJywnKX1gO1xyXG4gICAgICBjb25zdCByb3dzID0gdGFibGUuZGF0YS5tYXAocm93ID0+IFxyXG4gICAgICAgIHJvdy5tYXAoKGNlbGwsIGluZGV4KSA9PiB0aGlzLmZvcm1hdENlbGxGb3JDU1YoY2VsbCwgdGFibGUuZmllbGRzW2luZGV4XS50eXBlKSkuam9pbignLCcpXHJcbiAgICAgICk7XHJcbiAgICAgIHJldHVybiBgJHtoZWFkZXJ9XFxuJHtyb3dzLmpvaW4oJ1xcbicpfWA7XHJcbiAgICB9KS5qb2luKCdcXG5cXG4nKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2VuZXJhdGVKU09OQ29udGVudCh0YWJsZXM6IERhdGFiYXNlVGFibGVbXSk6IHN0cmluZyB7XHJcbiAgICBjb25zdCBkYXRhID0gdGFibGVzLm1hcCh0YWJsZSA9PiAoe1xyXG4gICAgICBuYW1lOiB0YWJsZS5uYW1lLFxyXG4gICAgICBmaWVsZHM6IHRhYmxlLmZpZWxkcyxcclxuICAgICAgZGF0YTogdGFibGUuZGF0YS5tYXAocm93ID0+IFxyXG4gICAgICAgIHJvdy5tYXAoKGNlbGwsIGluZGV4KSA9PiB0aGlzLmZvcm1hdENlbGxGb3JKU09OKGNlbGwsIHRhYmxlLmZpZWxkc1tpbmRleF0udHlwZSkpXHJcbiAgICAgIClcclxuICAgIH0pKTtcclxuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCAyKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZm9ybWF0Q2VsbEZvckNTVih2YWx1ZTogc3RyaW5nLCB0eXBlOiBEYXRhYmFzZUZpZWxkVHlwZSk6IHN0cmluZyB7XHJcbiAgICBzd2l0Y2ggKHR5cGUpIHtcclxuICAgICAgY2FzZSAnYXJyYXknOlxyXG4gICAgICBjYXNlICdvYmplY3QnOlxyXG4gICAgICAgIHJldHVybiBgXCIke3ZhbHVlLnJlcGxhY2UoL1wiL2csICdcIlwiJyl9XCJgO1xyXG4gICAgICBjYXNlICdudW1iZXInOlxyXG4gICAgICBjYXNlICdib29sZWFuJzpcclxuICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgcmV0dXJuIGBcIiR7dmFsdWUucmVwbGFjZSgvXCIvZywgJ1wiXCInKX1cImA7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGZvcm1hdENlbGxGb3JKU09OKHZhbHVlOiBzdHJpbmcsIHR5cGU6IERhdGFiYXNlRmllbGRUeXBlKTogYW55IHtcclxuICAgIHN3aXRjaCAodHlwZSkge1xyXG4gICAgICBjYXNlICdhcnJheSc6XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlLnNwbGl0KCc7JykubWFwKGl0ZW0gPT4gaXRlbS50cmltKCkpO1xyXG4gICAgICBjYXNlICdvYmplY3QnOlxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZSh2YWx1ZSk7XHJcbiAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgfVxyXG4gICAgICBjYXNlICdudW1iZXInOlxyXG4gICAgICAgIHJldHVybiBOdW1iZXIodmFsdWUpO1xyXG4gICAgICBjYXNlICdib29sZWFuJzpcclxuICAgICAgICByZXR1cm4gdmFsdWUudG9Mb3dlckNhc2UoKSA9PT0gJ3RydWUnO1xyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgaW1wb3J0RGF0YSgpIHtcclxuICAgIG5ldyBJbXBvcnRNZXRob2RNb2RhbCh0aGlzLmFwcCwgYXN5bmMgKG1ldGhvZCkgPT4ge1xyXG4gICAgICBsZXQgY29udGVudCA9ICcnO1xyXG4gICAgICBpZiAobWV0aG9kID09PSAnZmlsZScpIHtcclxuICAgICAgICBjb25zdCBmaWxlID0gYXdhaXQgdGhpcy5zZWxlY3RGaWxlKCk7XHJcbiAgICAgICAgY29udGVudCA9IGF3YWl0IGZpbGUudGV4dCgpO1xyXG4gICAgICB9IGVsc2UgaWYgKG1ldGhvZCA9PT0gJ2NsaXBib2FyZCcpIHtcclxuICAgICAgICBjb250ZW50ID0gYXdhaXQgbmF2aWdhdG9yLmNsaXBib2FyZC5yZWFkVGV4dCgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IGNsZWFuZWRDb250ZW50ID0gdGhpcy5jbGVhbkltcG9ydGVkQ29udGVudChjb250ZW50KTtcclxuICAgICAgICBjb25zdCB0YWJsZXMgPSB0aGlzLnBhcnNlSW1wb3J0ZWREYXRhKGNsZWFuZWRDb250ZW50KTtcclxuICAgICAgICBpZiAodGFibGVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCfmsqHmnInop6PmnpDliLDku7vkvZXooajmoLzmlbDmja4nKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g6K6p55So5oi36YCJ5oup55uu5qCHIE1hcmtkb3duIOaWh+S7tlxyXG4gICAgICAgIGNvbnN0IHRhcmdldEZpbGUgPSBhd2FpdCB0aGlzLnNlbGVjdFRhcmdldEZpbGUoKTtcclxuICAgICAgICBpZiAoIXRhcmdldEZpbGUpIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcign5pyq6YCJ5oup55uu5qCH5paH5Lu2Jyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyDlsIbmlbDmja7lhpnlhaXpgInmi6nnmoTmlofku7ZcclxuICAgICAgICBjb25zdCBjdXJyZW50Q29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQodGFyZ2V0RmlsZSk7XHJcbiAgICAgICAgY29uc3QgbmV3Q29udGVudCA9IHRoaXMuZm9ybWF0VGFibGVzRm9yT3JpZ2luYWxGb3JtYXQodGFibGVzKTtcclxuICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5tb2RpZnkodGFyZ2V0RmlsZSwgY3VycmVudENvbnRlbnQgKyAnXFxuXFxuJyArIG5ld0NvbnRlbnQpO1xyXG5cclxuICAgICAgICAvLyDph43mlrDor7vlj5bmlofku7blubbmm7TmlrDop4blm75cclxuICAgICAgICBhd2FpdCB0aGlzLnJlbG9hZEZpbGVBbmRVcGRhdGVWaWV3KHRhcmdldEZpbGUpO1xyXG5cclxuICAgICAgICBuZXcgTm90aWNlKCfmlbDmja7lr7zlhaXmiJDlip8s6K+35omL5Yqo5re75Yqg6KGo5qC85ZG95ZCN5ZKM5a6a5LmJ6KGMJyk7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcign5a+85YWl5aSx6LSlOicsIGVycm9yKTtcclxuICAgICAgICBuZXcgTm90aWNlKCflr7zlhaXlpLHotKUs6K+35qOA5p+l5pWw5o2u5qC85byPJyk7XHJcbiAgICAgIH1cclxuICAgIH0pLm9wZW4oKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY2xlYW5JbXBvcnRlZENvbnRlbnQoY29udGVudDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIC8vIOWOu+mZpOWPr+iDveiiqyBPYnNpZGlhbiDor4bliKvkuLrnibnmroror63ms5XnmoTlrZfnrKZcclxuICAgIHJldHVybiBjb250ZW50LnJlcGxhY2UoL1tcIidcXFtcXF17fV0vZywgJycpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBwYXJzZUltcG9ydGVkRGF0YShjb250ZW50OiBzdHJpbmcpOiBEYXRhYmFzZVRhYmxlW10ge1xyXG4gICAgY29uc3QgbGluZXMgPSBjb250ZW50LnNwbGl0KCdcXG4nKS5tYXAobGluZSA9PiBsaW5lLnRyaW0oKSkuZmlsdGVyKGxpbmUgPT4gbGluZS5sZW5ndGggPiAwKTtcclxuICAgIGlmIChsaW5lcy5sZW5ndGggPCAxKSB0aHJvdyBuZXcgRXJyb3IoJ+WvvOWFpeeahOaVsOaNruagvOW8j+S4jeato+ehricpO1xyXG5cclxuICAgIGNvbnN0IHRhYmxlOiBEYXRhYmFzZVRhYmxlID0ge1xyXG4gICAgICBuYW1lOiAnSW1wb3J0ZWRUYWJsZScsXHJcbiAgICAgIGZpZWxkczogW10sXHJcbiAgICAgIGRhdGE6IFtdXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIOWwhuaJgOacieaVsOaNruS9nOS4uuWtl+espuS4suWkhOeQhlxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCB2YWx1ZXMgPSB0aGlzLnBhcnNlQ1NWTGluZShsaW5lc1tpXSk7XHJcbiAgICAgIHRhYmxlLmRhdGEucHVzaCh2YWx1ZXMpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBbdGFibGVdO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBmb3JtYXRUYWJsZXNGb3JPcmlnaW5hbEZvcm1hdCh0YWJsZXM6IERhdGFiYXNlVGFibGVbXSk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdGFibGVzLm1hcCh0YWJsZSA9PiB7XHJcbiAgICAgIGNvbnN0IHJvd3MgPSB0YWJsZS5kYXRhLm1hcChyb3cgPT4gcm93LmpvaW4oJywnKSk7XHJcbiAgICAgIHJldHVybiBgZGI6JHt0YWJsZS5uYW1lfVxcbiR7cm93cy5qb2luKCdcXG4nKX1gO1xyXG4gICAgfSkuam9pbignXFxuXFxuJyk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHNlbGVjdFRhcmdldEZpbGUoKTogUHJvbWlzZTxURmlsZSB8IG51bGw+IHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4gICAgICBjb25zdCBmaWxlcyA9IHRoaXMuYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKTtcclxuICAgICAgY29uc3QgbW9kYWwgPSBuZXcgRmlsZVN1Z2dlc3RNb2RhbCh0aGlzLmFwcCwgZmlsZXMsIChmaWxlKSA9PiB7XHJcbiAgICAgICAgcmVzb2x2ZShmaWxlKTtcclxuICAgICAgfSk7XHJcbiAgICAgIG1vZGFsLm9wZW4oKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyByZWxvYWRGaWxlQW5kVXBkYXRlVmlldyhmaWxlOiBURmlsZSkge1xyXG4gICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XHJcbiAgICBjb25zdCB0YWJsZXMgPSB0aGlzLnBhcnNlVGFibGVzRnJvbU1hcmtkb3duKGNvbnRlbnQpO1xyXG4gICAgdGhpcy5zZXRUYWJsZXModGFibGVzKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcGFyc2VUYWJsZXNGcm9tTWFya2Rvd24oY29udGVudDogc3RyaW5nKTogRGF0YWJhc2VUYWJsZVtdIHtcclxuICAgIGNvbnN0IHRhYmxlczogRGF0YWJhc2VUYWJsZVtdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoJ1xcbicpO1xyXG4gICAgbGV0IGN1cnJlbnRUYWJsZTogRGF0YWJhc2VUYWJsZSB8IG51bGwgPSBudWxsO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnZGI6JykpIHtcclxuICAgICAgICBpZiAoY3VycmVudFRhYmxlKSB7XHJcbiAgICAgICAgICB0YWJsZXMucHVzaChjdXJyZW50VGFibGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdXJyZW50VGFibGUgPSB7XHJcbiAgICAgICAgICBuYW1lOiBsaW5lLnN1YnN0cmluZygzKS50cmltKCksXHJcbiAgICAgICAgICBmaWVsZHM6IFtdLFxyXG4gICAgICAgICAgZGF0YTogW11cclxuICAgICAgICB9O1xyXG4gICAgICB9IGVsc2UgaWYgKGN1cnJlbnRUYWJsZSkge1xyXG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHRoaXMucGFyc2VDU1ZMaW5lKGxpbmUpO1xyXG4gICAgICAgIGlmICh2YWx1ZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgY3VycmVudFRhYmxlLmRhdGEucHVzaCh2YWx1ZXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChjdXJyZW50VGFibGUpIHtcclxuICAgICAgdGFibGVzLnB1c2goY3VycmVudFRhYmxlKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGFibGVzO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBwYXJzZUNTVkxpbmUobGluZTogc3RyaW5nKTogc3RyaW5nW10ge1xyXG4gICAgY29uc3QgdmFsdWVzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgbGV0IGN1cnJlbnRWYWx1ZSA9ICcnO1xyXG4gICAgbGV0IGluUXVvdGVzID0gZmFsc2U7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGNoYXIgPSBsaW5lW2ldO1xyXG4gICAgICBpZiAoY2hhciA9PT0gJ1wiJykge1xyXG4gICAgICAgIGluUXVvdGVzID0gIWluUXVvdGVzO1xyXG4gICAgICB9IGVsc2UgaWYgKGNoYXIgPT09ICcsJyAmJiAhaW5RdW90ZXMpIHtcclxuICAgICAgICB2YWx1ZXMucHVzaChjdXJyZW50VmFsdWUudHJpbSgpLnJlcGxhY2UoL15cIiguKilcIiQvLCAnJDEnKSk7XHJcbiAgICAgICAgY3VycmVudFZhbHVlID0gJyc7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY3VycmVudFZhbHVlICs9IGNoYXI7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHZhbHVlcy5wdXNoKGN1cnJlbnRWYWx1ZS50cmltKCkucmVwbGFjZSgvXlwiKC4qKVwiJC8sICckMScpKTtcclxuXHJcbiAgICByZXR1cm4gdmFsdWVzO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGluc2VydENvbnRlbnQoY29udGVudDogc3RyaW5nKSB7XHJcbiAgICBjb25zdCBhY3RpdmVWaWV3ID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZVZpZXdPZlR5cGUoTWFya2Rvd25WaWV3KTtcclxuICAgIGlmIChhY3RpdmVWaWV3KSB7XHJcbiAgICAgIGNvbnN0IGVkaXRvciA9IGFjdGl2ZVZpZXcuZWRpdG9yO1xyXG4gICAgICBjb25zdCBjdXJzb3IgPSBlZGl0b3IuZ2V0Q3Vyc29yKCk7XHJcbiAgICAgIGVkaXRvci5yZXBsYWNlUmFuZ2UoY29udGVudCwgY3Vyc29yKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIG5ldyBOb3RpY2UoJ+ivt+WFiOaJk+W8gOS4gOS4qiBNYXJrZG93biDmlofku7YnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHB1YmxpYyBjaGVja0J1dHRvblZpc2liaWxpdHkoKSB7XHJcbiAgICBpZiAodGhpcy5leHBvcnRCdXR0b24gJiYgdGhpcy5pbXBvcnRCdXR0b24pIHtcclxuICAgICAgY29uc3QgZXhwb3J0QnV0dG9uRWwgPSB0aGlzLmV4cG9ydEJ1dHRvbi5idXR0b25FbDtcclxuICAgICAgY29uc3QgaW1wb3J0QnV0dG9uRWwgPSB0aGlzLmltcG9ydEJ1dHRvbi5idXR0b25FbDtcclxuICAgICAgZGVidWcoYEV4cG9ydCBidXR0b24gdmlzaWJpbGl0eTogJHtleHBvcnRCdXR0b25FbC5vZmZzZXRQYXJlbnQgIT09IG51bGx9YCk7XHJcbiAgICAgIGRlYnVnKGBJbXBvcnQgYnV0dG9uIHZpc2liaWxpdHk6ICR7aW1wb3J0QnV0dG9uRWwub2Zmc2V0UGFyZW50ICE9PSBudWxsfWApO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgd2FybignRXhwb3J0IG9yIGltcG9ydCBidXR0b24gbm90IGluaXRpYWxpemVkJyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNoZWNrQnV0dG9uVmlzaWJpbGl0eVdpdGhEZWxheSgpIHtcclxuICAgIChzZXRUaW1lb3V0IGFzIFdpbmRvd1snc2V0VGltZW91dCddKSgoKSA9PiB7XHJcbiAgICAgIHRoaXMuY2hlY2tCdXR0b25WaXNpYmlsaXR5KCk7XHJcbiAgICB9LCAxMDApOyAvLyAxMDBtcyDlu7bov59cclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgbG9hZFBhZ2Uoc3RhdGU6IFRhYmxlU3RhdGUsIHBhZ2U6IG51bWJlcikge1xyXG4gICAgY29uc3Qgc3RhcnQgPSBwYWdlICogdGhpcy5wYWdlU2l6ZTtcclxuICAgIGNvbnN0IGVuZCA9IE1hdGgubWluKHN0YXJ0ICsgdGhpcy5wYWdlU2l6ZSwgc3RhdGUudGFibGUuZGF0YS5sZW5ndGgpO1xyXG4gICAgXHJcbiAgICBzdGF0ZS5jdXJyZW50RGF0YSA9IHN0YXRlLnRhYmxlLmRhdGEuc2xpY2Uoc3RhcnQsIGVuZCk7XHJcbiAgICB0aGlzLnVwZGF0ZVRhYmxlKHN0YXRlKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgZmV0Y2hEYXRhUmFuZ2UodGFibGU6IERhdGFiYXNlVGFibGUsIHN0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyKTogUHJvbWlzZTxhbnlbXVtdPiB7XHJcbiAgICAvLyDov5nph4zlupTor6Xlrp7njrDlrp7pmYXnmoTmlbDmja7ojrflj5bpgLvovpFcclxuICAgIC8vIOS4uuS6huekuuS+i++8jOaIkeS7rOWPqui/lOWbnuS4gOS4quaVsOaNruWtkOmbhlxyXG4gICAgcmV0dXJuIHRhYmxlLmRhdGEuc2xpY2Uoc3RhcnQsIGVuZCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIG9uVmlzaWJsZVJhbmdlQ2hhbmdlKHN0YXRlOiBUYWJsZVN0YXRlLCBzdGFydEluZGV4OiBudW1iZXIsIGVuZEluZGV4OiBudW1iZXIpIHtcclxuICAgIGNvbnN0IHJlcXVpcmVkUGFnZSA9IE1hdGguZmxvb3Ioc3RhcnRJbmRleCAvIHRoaXMucGFnZVNpemUpO1xyXG4gICAgaWYgKHJlcXVpcmVkUGFnZSAhPT0gdGhpcy5jdXJyZW50UGFnZSkge1xyXG4gICAgICB0aGlzLmxvYWRQYWdlKHN0YXRlLCByZXF1aXJlZFBhZ2UpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSB1cGRhdGVDZWxsKHN0YXRlOiBUYWJsZVN0YXRlLCByb3dJbmRleDogbnVtYmVyLCBjb2x1bW5JbmRleDogbnVtYmVyLCBuZXdWYWx1ZTogYW55KSB7XHJcbiAgICBzdGF0ZS5jdXJyZW50RGF0YVtyb3dJbmRleF1bY29sdW1uSW5kZXhdID0gbmV3VmFsdWU7XHJcbiAgICBjb25zdCB2aXJ0dWFsU2Nyb2xsZXIgPSB0aGlzLnZpcnR1YWxTY3JvbGxlcnMuZ2V0KHN0YXRlLnRhYmxlLm5hbWUpO1xyXG4gICAgaWYgKHZpcnR1YWxTY3JvbGxlcikge1xyXG4gICAgICB2aXJ0dWFsU2Nyb2xsZXIuaW52YWxpZGF0ZVJvdyhyb3dJbmRleCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHVwZGF0ZVRhYmxlKHN0YXRlOiBUYWJsZVN0YXRlKSB7XHJcbiAgICBjb25zdCB2aXJ0dWFsU2Nyb2xsZXIgPSB0aGlzLnZpcnR1YWxTY3JvbGxlcnMuZ2V0KHN0YXRlLnRhYmxlLm5hbWUpO1xyXG4gICAgaWYgKHZpcnR1YWxTY3JvbGxlcikge1xyXG4gICAgICB2aXJ0dWFsU2Nyb2xsZXIuc2V0VG90YWxSb3dzKHN0YXRlLmN1cnJlbnREYXRhLmxlbmd0aCk7XHJcbiAgICAgIHZpcnR1YWxTY3JvbGxlci5yZWZyZXNoKCk7XHJcbiAgICB9XHJcbiAgICB0aGlzLnVwZGF0ZVNvcnRJbmRpY2F0b3JzKHN0YXRlKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgdXBkYXRlU29ydEluZGljYXRvcnMoc3RhdGU6IFRhYmxlU3RhdGUpIHtcclxuICAgIGNvbnN0IGhlYWRlckNlbGxzID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKCcuaGVhZGVyLWNlbGwnKTtcclxuICAgIGhlYWRlckNlbGxzLmZvckVhY2goKGNlbGwsIGluZGV4KSA9PiB7XHJcbiAgICAgIGNlbGwuY2xhc3NMaXN0LnJlbW92ZSgnc29ydGVkJywgJ2FzYycsICdkZXNjJyk7XHJcbiAgICAgIGNvbnN0IHNvcnRTdGF0ZSA9IHRoaXMuc29ydFN0YXRlcy5nZXQoc3RhdGUudGFibGUpO1xyXG4gICAgICBpZiAoc29ydFN0YXRlICYmIHNvcnRTdGF0ZS5jb2x1bW4gPT09IGluZGV4KSB7XHJcbiAgICAgICAgY2VsbC5jbGFzc0xpc3QuYWRkKCdzb3J0ZWQnLCBzb3J0U3RhdGUuZGlyZWN0aW9uKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGluaXRpYWxpemVUYWJsZVN0YXRlKHRhYmxlOiBEYXRhYmFzZVRhYmxlKTogVGFibGVTdGF0ZSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0YWJsZTogdGFibGUsXHJcbiAgICAgIHNlYXJjaFRlcm06ICcnLFxyXG4gICAgICBjdXJyZW50RGF0YTogWy4uLnRhYmxlLmRhdGFdLCAvLyDliJvlu7rmlbDmja7nmoTlia/mnKxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHNlbGVjdEZpbGUoKTogUHJvbWlzZTxGaWxlPiB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xyXG4gICAgICBpbnB1dC50eXBlID0gJ2ZpbGUnO1xyXG4gICAgICBpbnB1dC5hY2NlcHQgPSAnLmNzdiwuanNvbic7XHJcbiAgICAgIGlucHV0Lm9uY2hhbmdlID0gKGU6IEV2ZW50KSA9PiB7XHJcbiAgICAgICAgY29uc3QgZmlsZSA9IChlLnRhcmdldCBhcyBIVE1MSW5wdXRFbGVtZW50KS5maWxlcz8uWzBdO1xyXG4gICAgICAgIGlmIChmaWxlKSByZXNvbHZlKGZpbGUpO1xyXG4gICAgICB9O1xyXG4gICAgICBpbnB1dC5jbGljaygpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5jbGFzcyBGb2xkZXJTdWdnZXN0TW9kYWwgZXh0ZW5kcyBGdXp6eVN1Z2dlc3RNb2RhbDxURm9sZGVyPiB7XHJcbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHByaXZhdGUgY2FsbGJhY2s6IChmb2xkZXI6IFRGb2xkZXIpID0+IHZvaWQpIHtcclxuICAgIHN1cGVyKGFwcCk7XHJcbiAgfVxyXG5cclxuICBnZXRJdGVtcygpOiBURm9sZGVyW10ge1xyXG4gICAgcmV0dXJuIHRoaXMuYXBwLnZhdWx0LmdldEFsbExvYWRlZEZpbGVzKClcclxuICAgICAgLmZpbHRlcigoZmlsZSk6IGZpbGUgaXMgVEZvbGRlciA9PiBmaWxlIGluc3RhbmNlb2YgVEZvbGRlcik7XHJcbiAgfVxyXG5cclxuICBnZXRJdGVtVGV4dChmb2xkZXI6IFRGb2xkZXIpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIGZvbGRlci5wYXRoO1xyXG4gIH1cclxuXHJcbiAgb25DaG9vc2VJdGVtKGZvbGRlcjogVEZvbGRlciwgZXZ0OiBNb3VzZUV2ZW50IHwgS2V5Ym9hcmRFdmVudCk6IHZvaWQge1xyXG4gICAgdGhpcy5jYWxsYmFjayhmb2xkZXIpO1xyXG4gIH1cclxufVxyXG5cclxuY2xhc3MgSW1wb3J0TWV0aG9kTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHByaXZhdGUgY2FsbGJhY2s6IChtZXRob2Q6ICdmaWxlJyB8ICdjbGlwYm9hcmQnKSA9PiB2b2lkKSB7XHJcbiAgICBzdXBlcihhcHApO1xyXG4gIH1cclxuXHJcbiAgb25PcGVuKCkge1xyXG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICBjb250ZW50RWwuZW1wdHkoKTtcclxuICAgIGNvbnRlbnRFbC5jcmVhdGVFbCgnaDInLCB7IHRleHQ6ICfpgInmi6nlr7zlhaXmlrnlvI8nIH0pO1xyXG5cclxuICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuICAgICAgLnNldE5hbWUoJ+S7juaWh+S7tuWvvOWFpScpXHJcbiAgICAgIC5zZXREZXNjKCfpgInmi6nkuIDkuKogQ1NWIOaIliBKU09OIOaWh+S7ticpXHJcbiAgICAgIC5hZGRCdXR0b24oYnV0dG9uID0+IGJ1dHRvblxyXG4gICAgICAgIC5zZXRCdXR0b25UZXh0KCfpgInmi6nmlofku7YnKVxyXG4gICAgICAgIC5vbkNsaWNrKCgpID0+IHtcclxuICAgICAgICAgIHRoaXMuY2xvc2UoKTtcclxuICAgICAgICAgIHRoaXMuY2FsbGJhY2soJ2ZpbGUnKTtcclxuICAgICAgICB9KSk7XHJcblxyXG4gICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxyXG4gICAgICAuc2V0TmFtZSgn5LuO5Ymq6LS05p2/5a+85YWlJylcclxuICAgICAgLnNldERlc2MoJ+S7juWJqui0tOadv+eymOi0tCBDU1Yg5oiWIEpTT04g5pWw5o2uJylcclxuICAgICAgLmFkZEJ1dHRvbihidXR0b24gPT4gYnV0dG9uXHJcbiAgICAgICAgLnNldEJ1dHRvblRleHQoJ+S7juWJqui0tOadv+WvvCcpXHJcbiAgICAgICAgLm9uQ2xpY2soKCkgPT4ge1xyXG4gICAgICAgICAgdGhpcy5jbG9zZSgpO1xyXG4gICAgICAgICAgdGhpcy5jYWxsYmFjaygnY2xpcGJvYXJkJyk7XHJcbiAgICAgICAgfSkpO1xyXG4gIH1cclxuXHJcbiAgb25DbG9zZSgpIHtcclxuICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xyXG4gICAgY29udGVudEVsLmVtcHR5KCk7XHJcbiAgfVxyXG59XHJcblxyXG5jbGFzcyBFeHBvcnRNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuICBwcml2YXRlIHNlbGVjdGVkVGFibGVzOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKTtcclxuXHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBhcHA6IEFwcCxcclxuICAgIHByaXZhdGUgdGFibGVzOiBEYXRhYmFzZVRhYmxlW10sXHJcbiAgICBwcml2YXRlIG9uU3VibWl0OiAoc2VsZWN0ZWRUYWJsZXM6IHN0cmluZ1tdKSA9PiB2b2lkXHJcbiAgKSB7XHJcbiAgICBzdXBlcihhcHApO1xyXG4gIH1cclxuXHJcbiAgb25PcGVuKCkge1xyXG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICBjb250ZW50RWwuZW1wdHkoKTtcclxuICAgIGNvbnRlbnRFbC5jcmVhdGVFbCgnaDInLCB7IHRleHQ6ICfpgInmi6nopoHlr7zlh7rnmoTooajmoLwnIH0pO1xyXG5cclxuICAgIHRoaXMudGFibGVzLmZvckVhY2godGFibGUgPT4ge1xyXG4gICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcbiAgICAgICAgLnNldE5hbWUodGFibGUubmFtZSlcclxuICAgICAgICAuYWRkVG9nZ2xlKHRvZ2dsZSA9PiB0b2dnbGVcclxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnNlbGVjdGVkVGFibGVzLmhhcyh0YWJsZS5uYW1lKSlcclxuICAgICAgICAgIC5vbkNoYW5nZSh2YWx1ZSA9PiB7XHJcbiAgICAgICAgICAgIGlmICh2YWx1ZSkge1xyXG4gICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRUYWJsZXMuYWRkKHRhYmxlLm5hbWUpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRUYWJsZXMuZGVsZXRlKHRhYmxlLm5hbWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcbiAgICAgIC5hZGRCdXR0b24oYnV0dG9uID0+IGJ1dHRvblxyXG4gICAgICAgIC5zZXRCdXR0b25UZXh0KCflr7zlh7onKVxyXG4gICAgICAgIC5zZXRDdGEoKVxyXG4gICAgICAgIC5vbkNsaWNrKCgpID0+IHtcclxuICAgICAgICAgIHRoaXMub25TdWJtaXQoQXJyYXkuZnJvbSh0aGlzLnNlbGVjdGVkVGFibGVzKSk7XHJcbiAgICAgICAgICB0aGlzLmNsb3NlKCk7XHJcbiAgICAgICAgfSkpO1xyXG4gIH1cclxuXHJcbiAgb25DbG9zZSgpIHtcclxuICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xyXG4gICAgY29udGVudEVsLmVtcHR5KCk7XHJcbiAgfVxyXG59XHJcblxyXG5jbGFzcyBGaWxlU3VnZ2VzdE1vZGFsIGV4dGVuZHMgRnV6enlTdWdnZXN0TW9kYWw8VEZpbGU+IHtcclxuICBjb25zdHJ1Y3RvcihcclxuICAgIGFwcDogQXBwLFxyXG4gICAgcHJpdmF0ZSBmaWxlczogVEZpbGVbXSxcclxuICAgIHByaXZhdGUgb25DaG9vc2U6IChmaWxlOiBURmlsZSkgPT4gdm9pZFxyXG4gICkge1xyXG4gICAgc3VwZXIoYXBwKTtcclxuICB9XHJcblxyXG4gIGdldEl0ZW1zKCk6IFRGaWxlW10ge1xyXG4gICAgcmV0dXJuIHRoaXMuZmlsZXM7XHJcbiAgfVxyXG5cclxuICBnZXRJdGVtVGV4dChmaWxlOiBURmlsZSk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gZmlsZS5wYXRoO1xyXG4gIH1cclxuXHJcbiAgb25DaG9vc2VJdGVtKGZpbGU6IFRGaWxlLCBldnQ6IE1vdXNlRXZlbnQgfCBLZXlib2FyZEV2ZW50KTogdm9pZCB7XHJcbiAgICB0aGlzLm9uQ2hvb3NlKGZpbGUpO1xyXG4gIH1cclxufVxyXG4iLCJpbXBvcnQgeyBkZWJ1ZywgaW5mbyB9IGZyb20gJy4vdXRpbHMvbG9nZ2VyJztcclxuaW1wb3J0IHsgRGF0YWJhc2VUYWJsZSwgRGF0YWJhc2VGaWVsZCwgRGF0YWJhc2VGaWVsZFR5cGUgfSBmcm9tICcuL3R5cGVzJztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwYXJzZURhdGFiYXNlKG1hcmtkb3duOiBzdHJpbmcpOiBEYXRhYmFzZVRhYmxlW10ge1xyXG4gIGNvbnN0IHRhYmxlczogRGF0YWJhc2VUYWJsZVtdID0gW107XHJcbiAgY29uc3QgbGluZXMgPSBtYXJrZG93bi5zcGxpdCgnXFxuJyk7XHJcbiAgbGV0IGN1cnJlbnRUYWJsZTogRGF0YWJhc2VUYWJsZSB8IG51bGwgPSBudWxsO1xyXG4gIGxldCBpc1BhcnNpbmdGaWVsZHMgPSBmYWxzZTtcclxuXHJcbiAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XHJcbiAgICBjb25zdCB0cmltbWVkTGluZSA9IGxpbmUudHJpbSgpO1xyXG4gICAgaWYgKHRyaW1tZWRMaW5lLnN0YXJ0c1dpdGgoJ2RiOicpKSB7XHJcbiAgICAgIGlmIChjdXJyZW50VGFibGUpIHtcclxuICAgICAgICB0YWJsZXMucHVzaChjdXJyZW50VGFibGUpO1xyXG4gICAgICB9XHJcbiAgICAgIGN1cnJlbnRUYWJsZSA9IHtcclxuICAgICAgICBuYW1lOiB0cmltbWVkTGluZS5zdWJzdHJpbmcoMykudHJpbSgpLFxyXG4gICAgICAgIGZpZWxkczogW10sXHJcbiAgICAgICAgZGF0YTogW11cclxuICAgICAgfTtcclxuICAgICAgaXNQYXJzaW5nRmllbGRzID0gdHJ1ZTtcclxuICAgIH0gZWxzZSBpZiAoY3VycmVudFRhYmxlKSB7XHJcbiAgICAgIGNvbnN0IGNlbGxzID0gdHJpbW1lZExpbmUuc3BsaXQoJywnKS5tYXAoY2VsbCA9PiBjZWxsLnRyaW0oKSk7XHJcbiAgICAgIGlmIChpc1BhcnNpbmdGaWVsZHMpIHtcclxuICAgICAgICAvLyDop6PmnpDlrZfmrrXnsbvlnotcclxuICAgICAgICBjdXJyZW50VGFibGUhLmZpZWxkcyA9IGNlbGxzLm1hcChjZWxsID0+ICh7IG5hbWU6ICcnLCB0eXBlOiBjZWxsIGFzIERhdGFiYXNlRmllbGRUeXBlIH0pKTtcclxuICAgICAgICBpc1BhcnNpbmdGaWVsZHMgPSBmYWxzZTtcclxuICAgICAgfSBlbHNlIGlmIChjdXJyZW50VGFibGUhLmZpZWxkc1swXS5uYW1lID09PSAnJykge1xyXG4gICAgICAgIC8vIOino+aekOWtl+auteWQjeensFxyXG4gICAgICAgIGNlbGxzLmZvckVhY2goKGNlbGwsIGluZGV4KSA9PiB7XHJcbiAgICAgICAgICBpZiAoaW5kZXggPCBjdXJyZW50VGFibGUhLmZpZWxkcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgY3VycmVudFRhYmxlIS5maWVsZHNbaW5kZXhdLm5hbWUgPSBjZWxsO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIOino+aekOaVsOaNruihjFxyXG4gICAgICAgIGN1cnJlbnRUYWJsZSEuZGF0YS5wdXNoKGNlbGxzKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKGN1cnJlbnRUYWJsZSkge1xyXG4gICAgdGFibGVzLnB1c2goY3VycmVudFRhYmxlKTtcclxuICB9XHJcblxyXG4gIHJldHVybiB0YWJsZXM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluZmVyRmllbGRUeXBlcyh0YWJsZTogRGF0YWJhc2VUYWJsZSk6IHZvaWQge1xyXG4gIGlmICh0YWJsZS5kYXRhLmxlbmd0aCA+IDApIHtcclxuICAgIHRhYmxlLmZpZWxkcyA9IHRhYmxlLmZpZWxkcy5tYXAoKGZpZWxkLCBpbmRleCkgPT4gXHJcbiAgICAgIGluZmVyRmllbGRUeXBlKGZpZWxkLm5hbWUsIHRhYmxlLmRhdGFbMF1baW5kZXhdKVxyXG4gICAgKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluZmVyRmllbGRUeXBlKGZpZWxkTmFtZTogc3RyaW5nLCBzYW1wbGVEYXRhOiBzdHJpbmcpOiBEYXRhYmFzZUZpZWxkIHtcclxuICBjb25zdCBsb3dlckZpZWxkTmFtZSA9IGZpZWxkTmFtZS50b0xvd2VyQ2FzZSgpO1xyXG4gIGxldCB0eXBlOiBEYXRhYmFzZUZpZWxkVHlwZSA9ICdzdHJpbmcnO1xyXG4gIGxldCB1bml0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbiAgbGV0IHNhbXBsZVJhdGU6IG51bWJlciB8IHVuZGVmaW5lZDtcclxuICBsZXQgZnJlcXVlbmN5UmFuZ2U6IFtudW1iZXIsIG51bWJlcl0gfCB1bmRlZmluZWQ7XHJcbiAgbGV0IHByZWNpc2lvbjogbnVtYmVyIHwgdW5kZWZpbmVkO1xyXG4gIGxldCBvcHRpb25zOiBzdHJpbmdbXSB8IHVuZGVmaW5lZDtcclxuICBsZXQgZm9ybWF0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbiAgbGV0IGRpbWVuc2lvbnM6IG51bWJlciB8IHVuZGVmaW5lZDtcclxuICBsZXQgY29sb3JNb2RlbDogJ1JHQicgfCAnSFNMJyB8ICdDTVlLJyB8IHVuZGVmaW5lZDtcclxuXHJcbiAgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdkYXRlJykgfHwgbG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ3RpbWUnKSkge1xyXG4gICAgdHlwZSA9ICdkYXRlJztcclxuICAgIGZvcm1hdCA9ICdZWVlZLU1NLUREJzsgLy8g6buY6K6k5pel5pyf5qC85byPXHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygncHJpY2UnKSB8fCBsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnYW1vdW50JykpIHtcclxuICAgIHR5cGUgPSAnZGVjaW1hbCc7XHJcbiAgICBwcmVjaXNpb24gPSAyO1xyXG4gICAgdW5pdCA9IGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdwcmljZScpID8gJyQnIDogdW5kZWZpbmVkO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ3F1YW50aXR5JykgfHwgbG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ251bWJlcicpKSB7XHJcbiAgICB0eXBlID0gJ251bWJlcic7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnaXMnKSB8fCBsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnaGFzJykpIHtcclxuICAgIHR5cGUgPSAnYm9vbGVhbic7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnY2F0ZWdvcnknKSB8fCBsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygndHlwZScpKSB7XHJcbiAgICB0eXBlID0gJ2NhdGVnb3J5JztcclxuICAgIG9wdGlvbnMgPSBbXTsgLy8g6L+Z6YeM5Y+v5Lul5qC55o2u5a6e6ZmF5oOF5Ya16K6+572u6YCJ6aG5XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnY29vcmRpbmF0ZScpIHx8IGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdsb2NhdGlvbicpKSB7XHJcbiAgICB0eXBlID0gJ2dlbyc7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnc2VyaWVzJykpIHtcclxuICAgIHR5cGUgPSAndGltZXNlcmllcyc7XHJcbiAgfSBlbHNlIGlmIChzYW1wbGVEYXRhLnN0YXJ0c1dpdGgoJ1snKSAmJiBzYW1wbGVEYXRhLmVuZHNXaXRoKCddJykpIHtcclxuICAgIGlmIChzYW1wbGVEYXRhLmluY2x1ZGVzKCdbJykpIHtcclxuICAgICAgdHlwZSA9ICdtYXRyaXgnO1xyXG4gICAgICBkaW1lbnNpb25zID0gMjsgLy8g5YGH6K6+5pivMkTnn6npmLVcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHR5cGUgPSAndmVjdG9yJztcclxuICAgICAgZGltZW5zaW9ucyA9IHNhbXBsZURhdGEuc3BsaXQoJywnKS5sZW5ndGg7XHJcbiAgICB9XHJcbiAgfSBlbHNlIGlmIChzYW1wbGVEYXRhLnN0YXJ0c1dpdGgoJ3snKSAmJiBzYW1wbGVEYXRhLmVuZHNXaXRoKCd9JykpIHtcclxuICAgIGlmIChzYW1wbGVEYXRhLmluY2x1ZGVzKCdyZWFsJykgJiYgc2FtcGxlRGF0YS5pbmNsdWRlcygnaW1hZycpKSB7XHJcbiAgICAgIHR5cGUgPSAnY29tcGxleCc7XHJcbiAgICB9IGVsc2UgaWYgKHNhbXBsZURhdGEuaW5jbHVkZXMoJ3ZhbHVlJykgJiYgc2FtcGxlRGF0YS5pbmNsdWRlcygndW5jZXJ0YWludHknKSkge1xyXG4gICAgICB0eXBlID0gJ3VuY2VydGFpbnR5JztcclxuICAgIH0gZWxzZSBpZiAoc2FtcGxlRGF0YS5pbmNsdWRlcygncicpICYmIHNhbXBsZURhdGEuaW5jbHVkZXMoJ2cnKSAmJiBzYW1wbGVEYXRhLmluY2x1ZGVzKCdiJykpIHtcclxuICAgICAgdHlwZSA9ICdjb2xvcic7XHJcbiAgICAgIGNvbG9yTW9kZWwgPSAnUkdCJztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHR5cGUgPSAnb2JqZWN0JztcclxuICAgIH1cclxuICB9IGVsc2UgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdmb3JtdWxhJykgfHwgbG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ2VxdWF0aW9uJykpIHtcclxuICAgIHR5cGUgPSAnZm9ybXVsYSc7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnZGlzdHJpYnV0aW9uJykpIHtcclxuICAgIHR5cGUgPSAnZGlzdHJpYnV0aW9uJztcclxuICB9IGVsc2UgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdzcGVjdHJ1bScpKSB7XHJcbiAgICB0eXBlID0gJ3NwZWN0cnVtJztcclxuICB9IGVsc2UgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCd0ZW5zb3InKSkge1xyXG4gICAgdHlwZSA9ICd0ZW5zb3InO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ2dyYXBoJykpIHtcclxuICAgIHR5cGUgPSAnZ3JhcGgnO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ21vbGVjdWxlJykpIHtcclxuICAgIHR5cGUgPSAnbW9sZWN1bGUnO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ3NlcXVlbmNlJykpIHtcclxuICAgIHR5cGUgPSAnc2VxdWVuY2UnO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ2Z1bmN0aW9uJykpIHtcclxuICAgIHR5cGUgPSAnZnVuY3Rpb24nO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ2ludGVydmFsJykpIHtcclxuICAgIHR5cGUgPSAnaW50ZXJ2YWwnO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ2Z1enp5JykpIHtcclxuICAgIHR5cGUgPSAnZnV6enknO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ3F1YXRlcm5pb24nKSkge1xyXG4gICAgdHlwZSA9ICdxdWF0ZXJuaW9uJztcclxuICB9IGVsc2UgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdwb2x5Z29uJykpIHtcclxuICAgIHR5cGUgPSAncG9seWdvbic7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygndGltZWRlbHRhJykpIHtcclxuICAgIHR5cGUgPSAndGltZWRlbHRhJztcclxuICB9IGVsc2UgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdjdXJyZW5jeScpKSB7XHJcbiAgICB0eXBlID0gJ2N1cnJlbmN5JztcclxuICB9IGVsc2UgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdyZWdleCcpKSB7XHJcbiAgICB0eXBlID0gJ3JlZ2V4JztcclxuICB9IGVsc2UgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCd1cmwnKSkge1xyXG4gICAgdHlwZSA9ICd1cmwnO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ2lwJykpIHtcclxuICAgIHR5cGUgPSAnaXBhZGRyZXNzJztcclxuICB9IGVsc2UgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCd1dWlkJykpIHtcclxuICAgIHR5cGUgPSAndXVpZCc7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygndmVyc2lvbicpKSB7XHJcbiAgICB0eXBlID0gJ3ZlcnNpb24nO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ2JpdGZpZWxkJykpIHtcclxuICAgIHR5cGUgPSAnYml0ZmllbGQnO1xyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ2VudW0nKSkge1xyXG4gICAgdHlwZSA9ICdlbnVtJztcclxuICAgIG9wdGlvbnMgPSBbXTsgLy8g6L+Z6YeM5Y+v5Lul5qC55o2u5a6e6ZmF5oOF5Ya16K6+572u6YCJ6aG5XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnYXVkaW8nKSB8fCBsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnc2lnbmFsJykpIHtcclxuICAgIHR5cGUgPSAnYXVkaW9fc2lnbmFsJztcclxuICAgIHNhbXBsZVJhdGUgPSA0NDEwMDsgLy8g6buY6K6k6YeH5qC3546HXHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnZnJlcXVlbmN5X3Jlc3BvbnNlJykpIHtcclxuICAgIHR5cGUgPSAnZnJlcXVlbmN5X3Jlc3BvbnNlJztcclxuICAgIGZyZXF1ZW5jeVJhbmdlID0gWzIwLCAyMDAwMF07IC8vIOm7mOiupOS6uuiAs+WPr+WQrOiMg+WbtFxyXG4gIH0gZWxzZSBpZiAobG93ZXJGaWVsZE5hbWUuaW5jbHVkZXMoJ2ltcHVsc2VfcmVzcG9uc2UnKSkge1xyXG4gICAgdHlwZSA9ICdpbXB1bHNlX3Jlc3BvbnNlJztcclxuICB9IGVsc2UgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCd0cmFuc2Zlcl9mdW5jdGlvbicpKSB7XHJcbiAgICB0eXBlID0gJ3RyYW5zZmVyX2Z1bmN0aW9uJztcclxuICB9IGVsc2UgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdpbXBlZGFuY2UnKSkge1xyXG4gICAgdHlwZSA9ICdhY291c3RpY19pbXBlZGFuY2UnO1xyXG4gICAgdW5pdCA9ICdQYcK3cy9tJztcclxuICB9IGVsc2UgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdyZXZlcmJlcmF0aW9uJykpIHtcclxuICAgIHR5cGUgPSAncmV2ZXJiZXJhdGlvbl90aW1lJztcclxuICAgIHVuaXQgPSAncyc7XHJcbiAgfSBlbHNlIGlmIChsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnbm9pc2UnKSkge1xyXG4gICAgdHlwZSA9ICdub2lzZV9sZXZlbCc7XHJcbiAgICB1bml0ID0gJ2RCJztcclxuICB9IGVsc2UgaWYgKGxvd2VyRmllbGROYW1lLmluY2x1ZGVzKCdzcGwnKSB8fCBsb3dlckZpZWxkTmFtZS5pbmNsdWRlcygnc291bmRfcHJlc3N1cmUnKSkge1xyXG4gICAgdHlwZSA9ICdzb3VuZF9wcmVzc3VyZV9sZXZlbCc7XHJcbiAgICB1bml0ID0gJ2RCJztcclxuICB9XHJcblxyXG4gIGNvbnN0IGZpZWxkOiBEYXRhYmFzZUZpZWxkID0geyBuYW1lOiBmaWVsZE5hbWUsIHR5cGUgfTtcclxuICBpZiAodW5pdCkgZmllbGQudW5pdCA9IHVuaXQ7XHJcbiAgaWYgKHNhbXBsZVJhdGUpIGZpZWxkLnNhbXBsZVJhdGUgPSBzYW1wbGVSYXRlO1xyXG4gIGlmIChmcmVxdWVuY3lSYW5nZSkgZmllbGQuZnJlcXVlbmN5UmFuZ2UgPSBmcmVxdWVuY3lSYW5nZTtcclxuICBpZiAocHJlY2lzaW9uKSBmaWVsZC5wcmVjaXNpb24gPSBwcmVjaXNpb247XHJcbiAgaWYgKG9wdGlvbnMpIGZpZWxkLm9wdGlvbnMgPSBvcHRpb25zO1xyXG4gIGlmIChmb3JtYXQpIGZpZWxkLmZvcm1hdCA9IGZvcm1hdDtcclxuICBpZiAoZGltZW5zaW9ucykgZmllbGQuZGltZW5zaW9ucyA9IGRpbWVuc2lvbnM7XHJcbiAgaWYgKGNvbG9yTW9kZWwpIGZpZWxkLmNvbG9yTW9kZWwgPSBjb2xvck1vZGVsO1xyXG5cclxuICByZXR1cm4gZmllbGQ7XHJcbn1cclxuIiwiaW1wb3J0IHsgUGx1Z2luLCBOb3RpY2UsIFRGaWxlLCBNYXJrZG93blZpZXcsIEV2ZW50cywgQXBwLCBQbHVnaW5NYW5pZmVzdCwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZywgQnV0dG9uQ29tcG9uZW50IH0gZnJvbSAnb2JzaWRpYW4nO1xyXG5pbXBvcnQgeyBEYXRhYmFzZVZpZXcsIERBVEFCQVNFX1ZJRVdfVFlQRSB9IGZyb20gJy4vRGF0YWJhc2VWaWV3JztcclxuaW1wb3J0IHsgcGFyc2VEYXRhYmFzZSB9IGZyb20gJy4vZGF0YWJhc2VQYXJzZXInO1xyXG5pbXBvcnQgeyBkZWJ1ZywgaW5mbywgd2FybiwgZXJyb3IgfSBmcm9tICcuL3V0aWxzL2xvZ2dlcic7XHJcbmltcG9ydCAnLi4vc3R5bGVzLmNzcyc7XHJcbmltcG9ydCB7IERhdGFiYXNlUGx1Z2luU2V0dGluZ3MsIFNpbXBsZURhdGFiYXNlUGx1Z2luLCBEYXRhYmFzZVRhYmxlLCBEYXRhYmFzZUZpZWxkLCBEYXRhYmFzZVZpZXdJbnRlcmZhY2UsIENvbXBsZXhEYXRhVHlwZSB9IGZyb20gJy4vdHlwZXMnO1xyXG5cclxuXHJcbmNvbnN0IERFRkFVTFRfU0VUVElOR1M6IERhdGFiYXNlUGx1Z2luU2V0dGluZ3MgPSB7XHJcbiAgZGVmYXVsdFNvcnREaXJlY3Rpb246ICdhc2MnXHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEYXRhYmFzZVBsdWdpbiBleHRlbmRzIFBsdWdpbiBpbXBsZW1lbnRzIFNpbXBsZURhdGFiYXNlUGx1Z2luIHtcclxuICBwcml2YXRlIGRhdGFiYXNlVmlldzogRGF0YWJhc2VWaWV3SW50ZXJmYWNlIHwgbnVsbCA9IG51bGw7XHJcbiAgc2V0dGluZ3M6IERhdGFiYXNlUGx1Z2luU2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTO1xyXG4gIHByaXZhdGUgZGF0YVVwZGF0ZUNhbGxiYWNrczogKCh1cGRhdGVkVGFibGVzOiBzdHJpbmdbXSkgPT4gdm9pZClbXSA9IFtdO1xyXG5cclxuICBhc3luYyBvbmxvYWQoKSB7XHJcbiAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xyXG4gICAgaW5mbygn5Yqg6L295pWw5o2u5bqT5o+S5Lu2Jyk7XHJcblxyXG4gICAgdGhpcy5yZWdpc3RlclZpZXcoXHJcbiAgICAgIERBVEFCQVNFX1ZJRVdfVFlQRSxcclxuICAgICAgKGxlYWYpID0+IG5ldyBEYXRhYmFzZVZpZXcobGVhZiwgdGhpcylcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgaWQ6ICdwYXJzZS1jdXJyZW50LWZpbGUnLFxyXG4gICAgICBuYW1lOiAn6Kej5p6Q5b2T5YmN5paH5Lu25Lit55qE5pWw5o2u5bqTJyxcclxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMucGFyc2VBbmRVcGRhdGVWaWV3KClcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMucmVnaXN0ZXJFdmVudChcclxuICAgICAgdGhpcy5hcHAud29ya3NwYWNlLm9uKCdmaWxlLW9wZW4nLCAoZmlsZSkgPT4ge1xyXG4gICAgICAgIGlmIChmaWxlICYmIGZpbGUuZXh0ZW5zaW9uID09PSAnbWQnKSB7XHJcbiAgICAgICAgICB0aGlzLnBhcnNlQW5kVXBkYXRlVmlldygpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KFxyXG4gICAgICB0aGlzLmFwcC52YXVsdC5vbignbW9kaWZ5JywgKGZpbGUpID0+IHtcclxuICAgICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlICYmIGZpbGUuZXh0ZW5zaW9uID09PSAnbWQnKSB7XHJcbiAgICAgICAgICB0aGlzLnBhcnNlQW5kVXBkYXRlVmlldygpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5hZGRSaWJib25JY29uKCdkYXRhYmFzZScsICfmiZPlvIDmlbDmja7lupPop4blm74nLCAoKSA9PiB7XHJcbiAgICAgIHRoaXMuYWN0aXZhdGVWaWV3KCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xyXG4gICAgICBpZDogJ29wZW4tZGF0YWJhc2UtdmlldycsXHJcbiAgICAgIG5hbWU6ICfmiZPlvIDmlbDmja7lupPop4blm74nLFxyXG4gICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5hY3RpdmF0ZVZpZXcoKVxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBEYXRhYmFzZVBsdWdpblNldHRpbmdUYWIodGhpcy5hcHAsIHRoaXMpKTtcclxuXHJcbiAgICAvLyDmmrTpnLLmjqXlj6Pnu5nlhbbku5bmj5Lku7ZcclxuICAgICh0aGlzLmFwcCBhcyBhbnkpLnBsdWdpbnMuc2ltcGxlX2RhdGFiYXNlID0gdGhpcztcclxuICB9XHJcblxyXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpIHtcclxuICAgIGNvbnN0IGxvYWRlZERhdGEgPSBhd2FpdCB0aGlzLmxvYWREYXRhKCk7XHJcbiAgICBjb25zdCBwYXJzZWREYXRhID0gbG9hZGVkRGF0YSA/IEpTT04ucGFyc2UobG9hZGVkRGF0YSkgOiB7fTtcclxuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBwYXJzZWREYXRhKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHBhcnNlQW5kVXBkYXRlVmlldygpIHtcclxuICAgIGNvbnN0IGFjdGl2ZVZpZXcgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlVmlld09mVHlwZShNYXJrZG93blZpZXcpO1xyXG4gICAgaWYgKGFjdGl2ZVZpZXcpIHtcclxuICAgICAgY29uc3QgY29udGVudCA9IGFjdGl2ZVZpZXcuZ2V0Vmlld0RhdGEoKTtcclxuICAgICAgZGVidWcoYOiOt+WPluWIsOeahOaWh+S7tuWGheWuuTogJHtjb250ZW50fWApO1xyXG4gICAgICBjb25zdCB0YWJsZXMgPSBwYXJzZURhdGFiYXNlKGNvbnRlbnQpO1xyXG4gICAgICBkZWJ1Zyhg6Kej5p6Q5ZCO55qE6KGo5qC85pWw5o2uOiAke0pTT04uc3RyaW5naWZ5KHRhYmxlcyl9YCk7XHJcblxyXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh0YWJsZXMpICYmIHRhYmxlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5hY3RpdmF0ZVZpZXcoKTtcclxuICAgICAgICBpZiAodGhpcy5kYXRhYmFzZVZpZXcpIHtcclxuICAgICAgICAgIGluZm8oJ+abtOaWsOaVsOaNruW6k+inhuWbvicpO1xyXG4gICAgICAgICAgdGhpcy5kYXRhYmFzZVZpZXcuc2V0VGFibGVzKHRhYmxlcyk7XHJcbiAgICAgICAgICBuZXcgTm90aWNlKCfmlbDmja7lupPop4blm77lt7Lmm7TmlrAnKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgZXJyb3IoJ+aXoOazleWIm+W7uuaIluiOt+WPluaVsOaNruW6k+inhuWbvicpO1xyXG4gICAgICAgICAgbmV3IE5vdGljZSgn5pu05paw5pWw5o2u5bqT6KeG5Zu+5aSx6LSlJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGVycm9yKGDop6PmnpDnu5Pmnpzml6DmlYg6ICR7SlNPTi5zdHJpbmdpZnkodGFibGVzKX1gKTtcclxuICAgICAgICBuZXcgTm90aWNlKCfop6PmnpDmlbDmja7lupPlpLHotKXvvIzor7fmo4Dmn6Xmlofku7bmoLzlvI8nKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgbmV3IE5vdGljZSgn6K+35omT5byA5LiA5LiqIE1hcmtkb3duIOaWh+S7ticpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgYWN0aXZhdGVWaWV3KCkge1xyXG4gICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuYXBwO1xyXG4gICAgbGV0IGxlYWYgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKERBVEFCQVNFX1ZJRVdfVFlQRSlbMF07XHJcbiAgICBpZiAoIWxlYWYpIHtcclxuICAgICAgbGVhZiA9IHdvcmtzcGFjZS5nZXRSaWdodExlYWYoZmFsc2UpO1xyXG4gICAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IERBVEFCQVNFX1ZJRVdfVFlQRSwgYWN0aXZlOiB0cnVlIH0pO1xyXG4gICAgfVxyXG4gICAgd29ya3NwYWNlLnJldmVhbExlYWYobGVhZik7XHJcbiAgICBcclxuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKTtcclxuICAgIFxyXG4gICAgdGhpcy5kYXRhYmFzZVZpZXcgPSBsZWFmLnZpZXcgYXMgRGF0YWJhc2VWaWV3SW50ZXJmYWNlO1xyXG4gICAgaW5mbyhg5pWw5o2u5bqT6KeG5Zu+5bey5r+A5rS7OiAke3RoaXMuZGF0YWJhc2VWaWV3ID8gJ3N1Y2Nlc3MnIDogJ2ZhaWwnfWApO1xyXG4gICAgXHJcbiAgICBpZiAoIXRoaXMuZGF0YWJhc2VWaWV3KSB7XHJcbiAgICAgIGVycm9yKCfmv4DmtLvmlbDmja7lupPop4blm77lpLHotKUnKTtcclxuICAgICAgbmV3IE5vdGljZSgn5peg5rOV5Yib5bu6Jyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBvbnVubG9hZCgpIHtcclxuICAgIGluZm8oJ+WNuOi9veaVsOaNruW6k+aPkuS7ticpO1xyXG5cclxuICAgIC8vIOenu+mZpOaatOmcsueahOaOpeWPo1xyXG4gICAgZGVsZXRlICh0aGlzLmFwcCBhcyBhbnkpLnBsdWdpbnMuc2ltcGxlX2RhdGFiYXNlO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgc2F2ZURhdGEoKSB7XHJcbiAgICBhd2FpdCB0aGlzLnNhdmVTZXR0aW5ncygpO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCkge1xyXG4gICAgYXdhaXQgKHRoaXMuc2F2ZURhdGEgYXMgKGRhdGE6IGFueSkgPT4gUHJvbWlzZTx2b2lkPikoSlNPTi5zdHJpbmdpZnkodGhpcy5zZXR0aW5ncykpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGdldERhdGFiYXNlRGF0YSgpOiBEYXRhYmFzZVRhYmxlW10gfCBudWxsIHtcclxuICAgIGlmICh0aGlzLmRhdGFiYXNlVmlldykge1xyXG4gICAgICByZXR1cm4gdGhpcy5kYXRhYmFzZVZpZXcuZ2V0VGFibGVzKCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbDtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBxdWVyeURhdGEodGFibGVOYW1lOiBzdHJpbmcsIGNvbmRpdGlvbnM6IG9iamVjdCk6IENvbXBsZXhEYXRhVHlwZVtdW10gfCBudWxsIHtcclxuICAgIGNvbnN0IHRhYmxlcyA9IHRoaXMuZ2V0RGF0YWJhc2VEYXRhKCk7XHJcbiAgICBpZiAoIXRhYmxlcykgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgY29uc3QgdGFibGUgPSB0YWJsZXMuZmluZCh0ID0+IHQubmFtZSA9PT0gdGFibGVOYW1lKTtcclxuICAgIGlmICghdGFibGUpIHJldHVybiBudWxsO1xyXG5cclxuICAgIHJldHVybiB0YWJsZS5kYXRhLmZpbHRlcihyb3cgPT4ge1xyXG4gICAgICByZXR1cm4gT2JqZWN0LmVudHJpZXMoY29uZGl0aW9ucykuZXZlcnkoKFtrZXksIHZhbHVlXSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGFibGUuZmllbGRzLmZpbmRJbmRleChmID0+IGYubmFtZSA9PT0ga2V5KTtcclxuICAgICAgICBjb25zdCBmaWVsZFR5cGUgPSB0YWJsZS5maWVsZHNbaW5kZXhdLnR5cGU7XHJcbiAgICAgICAgY29uc3Qgcm93VmFsdWUgPSB0aGlzLnBhcnNlQ29tcGxleERhdGFUeXBlKHJvd1tpbmRleF0sIHRhYmxlLmZpZWxkc1tpbmRleF0pO1xyXG5cclxuICAgICAgICBzd2l0Y2ggKGZpZWxkVHlwZSkge1xyXG4gICAgICAgICAgY2FzZSAnc3RyaW5nJzpcclxuICAgICAgICAgIGNhc2UgJ251bWJlcic6XHJcbiAgICAgICAgICBjYXNlICdib29sZWFuJzpcclxuICAgICAgICAgIGNhc2UgJ2RhdGUnOlxyXG4gICAgICAgICAgY2FzZSAndGltZWRlbHRhJzpcclxuICAgICAgICAgIGNhc2UgJ3VybCc6XHJcbiAgICAgICAgICBjYXNlICdlbWFpbCc6XHJcbiAgICAgICAgICBjYXNlICdwaG9uZSc6XHJcbiAgICAgICAgICBjYXNlICdwcm9ncmVzcyc6XHJcbiAgICAgICAgICBjYXNlICdjYXRlZ29yeSc6XHJcbiAgICAgICAgICBjYXNlICd0YWcnOlxyXG4gICAgICAgICAgY2FzZSAnYmluYXJ5JzpcclxuICAgICAgICAgICAgcmV0dXJuIHJvd1ZhbHVlLnZhbHVlID09PSB2YWx1ZTtcclxuXHJcbiAgICAgICAgICBjYXNlICdhcnJheSc6XHJcbiAgICAgICAgICAgIHJldHVybiByb3dWYWx1ZS52YWx1ZS5ldmVyeSgoaXRlbTogYW55KSA9PiBpdGVtID09PSB2YWx1ZSk7XHJcblxyXG4gICAgICAgICAgY2FzZSAnb2JqZWN0JzpcclxuICAgICAgICAgICAgLy8g5a+55LqO5a+56LGh57G75Z6L77yM5qOA5p+l5piv5ZCm5YyF5ZCr5oyH5a6a55qE6ZSu5YC85a+5XHJcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QuZW50cmllcyh2YWx1ZSBhcyBSZWNvcmQ8c3RyaW5nLCBhbnk+KS5ldmVyeSgoW2ssIHZdKSA9PiByb3dWYWx1ZS52YWx1ZVtrXSA9PT0gdik7XHJcblxyXG4gICAgICAgICAgY2FzZSAncG9seWdvbic6XHJcbiAgICAgICAgICAgIC8vIOWvueS6juWkmui+ueW9ouexu+Wei++8jOajgOafpeaYr+WQpuWMheWQq+aMh+WumueahOeCuVxyXG4gICAgICAgICAgICBjb25zdCBwb2ludCA9IHZhbHVlIGFzIHsgeDogbnVtYmVyLCB5OiBudW1iZXIgfTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNQb2ludEluUG9seWdvbihwb2ludCwgcm93VmFsdWUudmFsdWUpO1xyXG5cclxuICAgICAgICAgIGNhc2UgJ3ZlY3Rvcic6XHJcbiAgICAgICAgICAgIC8vIOWvueS6juWQkemHj+exu+Wei++8jOajgOafpeaYr+WQpuWcqOaMh+WumuiMg+WbtOWGhVxyXG4gICAgICAgICAgICBjb25zdCBxdWVyeVZlY3RvciA9IHZhbHVlIGFzIG51bWJlcltdO1xyXG4gICAgICAgICAgICBjb25zdCByb3dWZWN0b3IgPSByb3dWYWx1ZS52YWx1ZSBhcyBudW1iZXJbXTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXJlVmVjdG9yc0VxdWFsKHF1ZXJ5VmVjdG9yLCByb3dWZWN0b3IsIDAuMDEpOyAvLyDlhYHorrgwLjAx55qE6K+v5beuXHJcblxyXG4gICAgICAgICAgY2FzZSAnbWF0cml4JzpcclxuICAgICAgICAgICAgLy8g5a+55LqO55+p6Zi157G75Z6L77yM5qOA5p+l5piv5ZCm5omA5pyJ5YWD57Sg6YO955u4562JXHJcbiAgICAgICAgICAgIGNvbnN0IHF1ZXJ5TWF0cml4ID0gdmFsdWUgYXMgbnVtYmVyW11bXTtcclxuICAgICAgICAgICAgY29uc3Qgcm93TWF0cml4ID0gcm93VmFsdWUudmFsdWUgYXMgbnVtYmVyW11bXTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXJlTWF0cmljZXNFcXVhbChxdWVyeU1hdHJpeCwgcm93TWF0cml4LCAwLjAxKTsgLy8g5YWB6K64MC4wMeeahOivr+W3rlxyXG5cclxuICAgICAgICAgIGNhc2UgJ2NvbXBsZXgnOlxyXG4gICAgICAgICAgICAvLyDlr7nkuo7lpI3mlbDnsbvlnovvvIzmo4Dmn6Xlrp7pg6jlkozomZrpg6jmmK/lkKblnKjmjIflrprojIPlm7TlhoVcclxuICAgICAgICAgICAgY29uc3QgcXVlcnlDb21wbGV4ID0gdmFsdWUgYXMgeyByZWFsOiBudW1iZXIsIGltYWc6IG51bWJlciB9O1xyXG4gICAgICAgICAgICBjb25zdCByb3dDb21wbGV4ID0gcm93VmFsdWUudmFsdWUgYXMgeyByZWFsOiBudW1iZXIsIGltYWc6IG51bWJlciB9O1xyXG4gICAgICAgICAgICByZXR1cm4gTWF0aC5hYnMocXVlcnlDb21wbGV4LnJlYWwgLSByb3dDb21wbGV4LnJlYWwpIDw9IDAuMDEgJiZcclxuICAgICAgICAgICAgICAgICAgIE1hdGguYWJzKHF1ZXJ5Q29tcGxleC5pbWFnIC0gcm93Q29tcGxleC5pbWFnKSA8PSAwLjAxOyAvLyDlhYHorrgwLjAx55qE6K+v5beuXHJcblxyXG4gICAgICAgICAgY2FzZSAnbW9sZWN1bGUnOlxyXG4gICAgICAgICAgICBkZWJ1Zyhg6Kej5p6Q5YiG5a2Q5pWw5o2uOiAke3ZhbHVlfWApO1xyXG4gICAgICAgICAgICBjb25zdCBbYXRvbXMsIGJvbmRzXSA9IHZhbHVlLnNwbGl0KCc7Jyk7XHJcbiAgICAgICAgICAgIGNvbnN0IGF0b21MaXN0OiBBcnJheTx7IGVsZW1lbnQ6IHN0cmluZzsgY291bnQ6IG51bWJlciB9PiA9IGF0b21zLnNwbGl0KCd8JykubWFwKChhdG9tOiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgICBjb25zdCBbZWxlbWVudCwgY291bnRdID0gYXRvbS5zcGxpdCgnOicpO1xyXG4gICAgICAgICAgICAgIHJldHVybiB7IGVsZW1lbnQsIGNvdW50OiBwYXJzZUludChjb3VudCkgfTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGJvbmRMaXN0OiBBcnJheTx7IGF0b20xOiBudW1iZXI7IGF0b20yOiBudW1iZXIgfT4gPSBib25kcyA/IGJvbmRzLnNwbGl0KCd8JykubWFwKChib25kOiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgICBjb25zdCBbYXRvbTEsIGF0b20yXSA9IGJvbmQuc3BsaXQoJy0nKS5tYXAoTnVtYmVyKTtcclxuICAgICAgICAgICAgICByZXR1cm4geyBhdG9tMSwgYXRvbTIgfTtcclxuICAgICAgICAgICAgfSkgOiBbXTtcclxuICAgICAgICAgICAgY29uc3QgbW9sZWN1bGVWYWx1ZSA9IHsgYXRvbXM6IGF0b21MaXN0LCBib25kczogYm9uZExpc3QgfTtcclxuICAgICAgICAgICAgaW5mbyhg5YiG5a2Q6Kej5p6Q57uT5p6cOiAke0pTT04uc3RyaW5naWZ5KG1vbGVjdWxlVmFsdWUpfWApO1xyXG4gICAgICAgICAgICByZXR1cm4geyB0eXBlOiAnbW9sZWN1bGUnLCB2YWx1ZTogbW9sZWN1bGVWYWx1ZSwgbWV0YWRhdGE6IHtcclxuICAgICAgICAgICAgICBhdG9tQ291bnQ6IGF0b21MaXN0LnJlZHVjZSgoc3VtLCBhdG9tKSA9PiBzdW0gKyBhdG9tLmNvdW50LCAwKSxcclxuICAgICAgICAgICAgICBib25kQ291bnQ6IGJvbmRMaXN0Lmxlbmd0aFxyXG4gICAgICAgICAgICB9fTtcclxuXHJcbiAgICAgICAgICBjYXNlICdjaGVtaWNhbF9mb3JtdWxhJzpcclxuICAgICAgICAgICAgZGVidWcoYOino+aekOWMluWtpuW8j+aVsOaNrjogJHt2YWx1ZX1gKTtcclxuICAgICAgICAgICAgY29uc3QgZWxlbWVudHMgPSB2YWx1ZS5tYXRjaCgvKFtBLVpdW2Etel0qKShcXGQqKS9nKSB8fCBbXTtcclxuICAgICAgICAgICAgY29uc3QgZm9ybXVsYVZhbHVlOiBBcnJheTx7IHN5bWJvbDogc3RyaW5nOyBjb3VudDogbnVtYmVyIH0+ID0gZWxlbWVudHMubWFwKChlbGVtZW50OiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgICBjb25zdCBbLCBzeW1ib2wsIGNvdW50XSA9IGVsZW1lbnQubWF0Y2goLyhbQS1aXVthLXpdKikoXFxkKikvKSB8fCBbXTtcclxuICAgICAgICAgICAgICByZXR1cm4geyBzeW1ib2wsIGNvdW50OiBjb3VudCA/IHBhcnNlSW50KGNvdW50KSA6IDEgfTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGluZm8oYOWMluWtpuW8j+ino+aekOe7k+aenDogJHtKU09OLnN0cmluZ2lmeShmb3JtdWxhVmFsdWUpfWApO1xyXG4gICAgICAgICAgICByZXR1cm4geyB0eXBlOiAnY2hlbWljYWxfZm9ybXVsYScsIHZhbHVlOiBmb3JtdWxhVmFsdWUsIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgICAgICAgZWxlbWVudENvdW50OiBmb3JtdWxhVmFsdWUubGVuZ3RoLFxyXG4gICAgICAgICAgICAgIHRvdGFsQXRvbXM6IGZvcm11bGFWYWx1ZS5yZWR1Y2UoKHN1bSwgZWxlbWVudCkgPT4gc3VtICsgZWxlbWVudC5jb3VudCwgMClcclxuICAgICAgICAgICAgfX07XHJcblxyXG4gICAgICAgICAgY2FzZSAncmVhY3Rpb24nOlxyXG4gICAgICAgICAgICBkZWJ1Zyhg6Kej5p6Q5YyW5a2m5Y+N5bqU5pWw5o2uOiAke3ZhbHVlfWApO1xyXG4gICAgICAgICAgICBjb25zdCBbcmVhY3RhbnRzLCBwcm9kdWN0c10gPSB2YWx1ZS5zcGxpdCgnLT4nKS5tYXAoKHNpZGU6IHN0cmluZykgPT4gXHJcbiAgICAgICAgICAgICAgc2lkZS50cmltKCkuc3BsaXQoJysnKS5tYXAoKGNvbXBvdW5kOiBzdHJpbmcpID0+IGNvbXBvdW5kLnRyaW0oKSlcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgY29uc3QgcmVhY3Rpb25WYWx1ZTogeyByZWFjdGFudHM6IHN0cmluZ1tdOyBwcm9kdWN0czogc3RyaW5nW10gfSA9IHsgcmVhY3RhbnRzLCBwcm9kdWN0cyB9O1xyXG4gICAgICAgICAgICBpbmZvKGDljJblrablj43lupTop6PmnpDnu5Pmnpw6ICR7SlNPTi5zdHJpbmdpZnkocmVhY3Rpb25WYWx1ZSl9YCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHR5cGU6ICdyZWFjdGlvbicsIHZhbHVlOiByZWFjdGlvblZhbHVlLCBtZXRhZGF0YToge1xyXG4gICAgICAgICAgICAgIHJlYWN0YW50Q291bnQ6IHJlYWN0YW50cy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgcHJvZHVjdENvdW50OiBwcm9kdWN0cy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgaXNCYWxhbmNlZDogdGhpcy5pc1JlYWN0aW9uQmFsYW5jZWQocmVhY3RhbnRzLCBwcm9kdWN0cylcclxuICAgICAgICAgICAgfX07XHJcblxyXG4gICAgICAgICAgY2FzZSAndGltZXNlcmllcyc6XHJcbiAgICAgICAgICAgIGRlYnVnKGDop6PmnpDml7bpl7Tluo/liJfmlbDmja46ICR7dmFsdWV9YCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHRpbWVzZXJpZXNQb2ludHMgPSB2YWx1ZS5zcGxpdCgnfCcpLm1hcCgocG9pbnQ6IHN0cmluZykgPT4ge1xyXG4gICAgICAgICAgICAgIGNvbnN0IFt0aW1lc3RhbXAsIGRhdGFWYWx1ZV0gPSBwb2ludC5zcGxpdCgnLCcpO1xyXG4gICAgICAgICAgICAgIHJldHVybiB7IHRpbWVzdGFtcDogbmV3IERhdGUodGltZXN0YW1wKSwgdmFsdWU6IE51bWJlcihkYXRhVmFsdWUpIH07XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBpbmZvKGDml7bpl7Tluo/liJfop6PmnpDnu5Pmnpw6ICR7SlNPTi5zdHJpbmdpZnkodGltZXNlcmllc1BvaW50cyl9YCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHR5cGU6ICd0aW1lc2VyaWVzJywgdmFsdWU6IHRpbWVzZXJpZXNQb2ludHMsIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgICAgICAgcG9pbnRDb3VudDogdGltZXNlcmllc1BvaW50cy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgc3RhcnRUaW1lOiB0aW1lc2VyaWVzUG9pbnRzWzBdLnRpbWVzdGFtcCxcclxuICAgICAgICAgICAgICBlbmRUaW1lOiB0aW1lc2VyaWVzUG9pbnRzW3RpbWVzZXJpZXNQb2ludHMubGVuZ3RoIC0gMV0udGltZXN0YW1wLFxyXG4gICAgICAgICAgICAgIG1pblZhbHVlOiBNYXRoLm1pbiguLi50aW1lc2VyaWVzUG9pbnRzLm1hcCgocDogeyB2YWx1ZTogbnVtYmVyIH0pID0+IHAudmFsdWUpKSxcclxuICAgICAgICAgICAgICBtYXhWYWx1ZTogTWF0aC5tYXgoLi4udGltZXNlcmllc1BvaW50cy5tYXAoKHA6IHsgdmFsdWU6IG51bWJlciB9KSA9PiBwLnZhbHVlKSlcclxuICAgICAgICAgICAgfX07XHJcblxyXG4gICAgICAgICAgY2FzZSAnZm9ybXVsYSc6XHJcbiAgICAgICAgICAgIGRlYnVnKGDop6PmnpDlhazlvI/mlbDmja46ICR7dmFsdWV9YCk7XHJcbiAgICAgICAgICAgIGluZm8oYOWFrOW8j+ino+aekOe7k+aenDogJHt2YWx1ZX1gKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogJ2Zvcm11bGEnLCB2YWx1ZSwgbWV0YWRhdGE6IHtcclxuICAgICAgICAgICAgICB2YXJpYWJsZXM6IHZhbHVlLm1hdGNoKC9bYS16QS1aXSsvZykgfHwgW10sXHJcbiAgICAgICAgICAgICAgb3BlcmF0b3JzOiB2YWx1ZS5tYXRjaCgvW1xcK1xcLVxcKlxcL1xcXlxcKFxcKV0vZykgfHwgW11cclxuICAgICAgICAgICAgfX07XHJcblxyXG4gICAgICAgICAgY2FzZSAnZGlzdHJpYnV0aW9uJzpcclxuICAgICAgICAgICAgZGVidWcoYOino+aekOWIhuW4g+aVsOaNrjogJHt2YWx1ZX1gKTtcclxuICAgICAgICAgICAgY29uc3QgW2Rpc3RyaWJ1dGlvblR5cGUsIC4uLnBhcmFtc10gPSB2YWx1ZS5zcGxpdCgnfCcpO1xyXG4gICAgICAgICAgICBjb25zdCBkaXN0cmlidXRpb25QYXJhbXMgPSBPYmplY3QuZnJvbUVudHJpZXMoXHJcbiAgICAgICAgICAgICAgcGFyYW1zLm1hcCgocGFyYW06IHN0cmluZykgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgW2tleSwgdmFsXSA9IHBhcmFtLnNwbGl0KCc6Jyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gW2tleSwgTnVtYmVyKHZhbCldO1xyXG4gICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGluZm8oYOWIhuW4g+ino+aekOe7k+aenDogJHtKU09OLnN0cmluZ2lmeSh7IHR5cGU6IGRpc3RyaWJ1dGlvblR5cGUsIHBhcmFtczogZGlzdHJpYnV0aW9uUGFyYW1zIH0pfWApO1xyXG4gICAgICAgICAgICByZXR1cm4geyB0eXBlOiAnZGlzdHJpYnV0aW9uJywgdmFsdWU6IHsgdHlwZTogZGlzdHJpYnV0aW9uVHlwZSwgcGFyYW1zOiBkaXN0cmlidXRpb25QYXJhbXMgfSwgbWV0YWRhdGE6IHtcclxuICAgICAgICAgICAgICBkaXN0cmlidXRpb25UeXBlLFxyXG4gICAgICAgICAgICAgIHBhcmFtZXRlckNvdW50OiBPYmplY3Qua2V5cyhkaXN0cmlidXRpb25QYXJhbXMpLmxlbmd0aFxyXG4gICAgICAgICAgICB9fTtcclxuXHJcbiAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICByZXR1cm4gcm93VmFsdWUudmFsdWUgPT09IHZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9KS5tYXAocm93ID0+IHJvdy5tYXAoKGNlbGwsIGluZGV4KSA9PiB0aGlzLnBhcnNlQ29tcGxleERhdGFUeXBlKGNlbGwsIHRhYmxlLmZpZWxkc1tpbmRleF0pKSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZ2V0VGFibGVTY2hlbWEodGFibGVOYW1lOiBzdHJpbmcpOiBEYXRhYmFzZUZpZWxkW10gfCBudWxsIHtcclxuICAgIGNvbnN0IHRhYmxlcyA9IHRoaXMuZ2V0RGF0YWJhc2VEYXRhKCk7XHJcbiAgICBpZiAoIXRhYmxlcykgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgY29uc3QgdGFibGUgPSB0YWJsZXMuZmluZCh0ID0+IHQubmFtZSA9PT0gdGFibGVOYW1lKTtcclxuICAgIHJldHVybiB0YWJsZSA/IHRhYmxlLmZpZWxkcyA6IG51bGw7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgb25EYXRhVXBkYXRlKGNhbGxiYWNrOiAodXBkYXRlZFRhYmxlczogc3RyaW5nW10pID0+IHZvaWQpOiB2b2lkIHtcclxuICAgIHRoaXMuZGF0YVVwZGF0ZUNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBnZXRDb2x1bW5TdGF0cyh0YWJsZU5hbWU6IHN0cmluZywgY29sdW1uTmFtZTogc3RyaW5nKTogeyBtaW46IG51bWJlcjsgbWF4OiBudW1iZXI7IGF2ZXJhZ2U6IG51bWJlcjsgbWVkaWFuOiBudW1iZXI7IH0gfCBudWxsIHtcclxuICAgIGNvbnN0IHRhYmxlcyA9IHRoaXMuZ2V0RGF0YWJhc2VEYXRhKCk7XHJcbiAgICBpZiAoIXRhYmxlcykgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgY29uc3QgdGFibGUgPSB0YWJsZXMuZmluZCh0ID0+IHQubmFtZSA9PT0gdGFibGVOYW1lKTtcclxuICAgIGlmICghdGFibGUpIHJldHVybiBudWxsO1xyXG5cclxuICAgIGNvbnN0IGNvbHVtbkluZGV4ID0gdGFibGUuZmllbGRzLmZpbmRJbmRleChmID0+IGYubmFtZSA9PT0gY29sdW1uTmFtZSk7XHJcbiAgICBpZiAoY29sdW1uSW5kZXggPT09IC0xKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICBjb25zdCBjb2x1bW5EYXRhID0gdGFibGUuZGF0YS5tYXAocm93ID0+IHBhcnNlRmxvYXQocm93W2NvbHVtbkluZGV4XSkpLmZpbHRlcih2YWx1ZSA9PiAhaXNOYU4odmFsdWUpKTtcclxuICAgIGlmIChjb2x1bW5EYXRhLmxlbmd0aCA9PT0gMCkgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgY29sdW1uRGF0YS5zb3J0KChhLCBiKSA9PiBhIC0gYik7XHJcbiAgICBjb25zdCBtaW4gPSBjb2x1bW5EYXRhWzBdO1xyXG4gICAgY29uc3QgbWF4ID0gY29sdW1uRGF0YVtjb2x1bW5EYXRhLmxlbmd0aCAtIDFdO1xyXG4gICAgY29uc3Qgc3VtID0gY29sdW1uRGF0YS5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiLCAwKTtcclxuICAgIGNvbnN0IGF2ZXJhZ2UgPSBzdW0gLyBjb2x1bW5EYXRhLmxlbmd0aDtcclxuICAgIGNvbnN0IG1lZGlhbiA9IGNvbHVtbkRhdGEubGVuZ3RoICUgMiA9PT0gMFxyXG4gICAgICA/IChjb2x1bW5EYXRhW2NvbHVtbkRhdGEubGVuZ3RoIC8gMiAtIDFdICsgY29sdW1uRGF0YVtjb2x1bW5EYXRhLmxlbmd0aCAvIDJdKSAvIDJcclxuICAgICAgOiBjb2x1bW5EYXRhW01hdGguZmxvb3IoY29sdW1uRGF0YS5sZW5ndGggLyAyKV07XHJcblxyXG4gICAgcmV0dXJuIHsgbWluLCBtYXgsIGF2ZXJhZ2UsIG1lZGlhbiB9O1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGdldERhdGFSYW5nZSh0YWJsZU5hbWU6IHN0cmluZywgY29sdW1uTmFtZTogc3RyaW5nLCBzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlcik6IENvbXBsZXhEYXRhVHlwZVtdIHwgbnVsbCB7XHJcbiAgICBjb25zdCB0YWJsZXMgPSB0aGlzLmdldERhdGFiYXNlRGF0YSgpO1xyXG4gICAgaWYgKCF0YWJsZXMpIHJldHVybiBudWxsO1xyXG5cclxuICAgIGNvbnN0IHRhYmxlID0gdGFibGVzLmZpbmQodCA9PiB0Lm5hbWUgPT09IHRhYmxlTmFtZSk7XHJcbiAgICBpZiAoIXRhYmxlKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICBjb25zdCBjb2x1bW5JbmRleCA9IHRhYmxlLmZpZWxkcy5maW5kSW5kZXgoZiA9PiBmLm5hbWUgPT09IGNvbHVtbk5hbWUpO1xyXG4gICAgaWYgKGNvbHVtbkluZGV4ID09PSAtMSkgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgcmV0dXJuIHRhYmxlLmRhdGEuc2xpY2Uoc3RhcnQsIGVuZCArIDEpLm1hcChyb3cgPT4gdGhpcy5wYXJzZUNvbXBsZXhEYXRhVHlwZShyb3dbY29sdW1uSW5kZXhdLCB0YWJsZS5maWVsZHNbY29sdW1uSW5kZXhdKSk7XHJcbiAgfVxyXG5cclxuICAvLyDmt7vliqDkuIDkuKrmlrnms5XmnaXop6blj5HmlbDmja7mm7TmlrDlm57osINcclxuICBwcml2YXRlIHRyaWdnZXJEYXRhVXBkYXRlKHVwZGF0ZWRUYWJsZXM6IHN0cmluZ1tdKTogdm9pZCB7XHJcbiAgICB0aGlzLmRhdGFVcGRhdGVDYWxsYmFja3MuZm9yRWFjaChjYWxsYmFjayA9PiBjYWxsYmFjayh1cGRhdGVkVGFibGVzKSk7XHJcbiAgfVxyXG5cclxuICAvLyDlnKjmlbDmja7mm7TmlrDml7bnlKjmraTmlrnms5VcclxuICBwcml2YXRlIHVwZGF0ZURhdGEodXBkYXRlZFRhYmxlczogc3RyaW5nW10pOiB2b2lkIHtcclxuICAgIC8vIOabtOaWsOaVsOaNrueahOmAu+i+kVxyXG4gICAgLy8gLi4uXHJcblxyXG4gICAgLy8g6Kem5Y+R5pWw5o2u5pu05paw5Zue6LCDXHJcbiAgICB0aGlzLnRyaWdnZXJEYXRhVXBkYXRlKHVwZGF0ZWRUYWJsZXMpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBwYXJzZUNvbXBsZXhEYXRhVHlwZSh2YWx1ZTogYW55LCBmaWVsZDogRGF0YWJhc2VGaWVsZCk6IENvbXBsZXhEYXRhVHlwZSB7XHJcbiAgICBjb25zdCBtZXRhZGF0YTogUmVjb3JkPHN0cmluZywgYW55PiA9IGZpZWxkLm1ldGFkYXRhIHx8IHt9O1xyXG5cclxuICAgIHN3aXRjaCAoZmllbGQudHlwZSkge1xyXG4gICAgICBjYXNlICdzdHJpbmcnOlxyXG4gICAgICAgIHJldHVybiB7IHR5cGU6ICdzdHJpbmcnLCB2YWx1ZSwgbWV0YWRhdGE6IHsgbGVuZ3RoOiB2YWx1ZS5sZW5ndGggfSB9O1xyXG5cclxuICAgICAgY2FzZSAnbnVtYmVyJzpcclxuICAgICAgICByZXR1cm4geyB0eXBlOiAnbnVtYmVyJywgdmFsdWUsIG1ldGFkYXRhOiB7IGlzSW50ZWdlcjogTnVtYmVyLmlzSW50ZWdlcih2YWx1ZSkgfSB9O1xyXG5cclxuICAgICAgY2FzZSAnYm9vbGVhbic6XHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogJ2Jvb2xlYW4nLCB2YWx1ZSwgbWV0YWRhdGE6IHt9IH07XHJcblxyXG4gICAgICBjYXNlICdkYXRlJzpcclxuICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUodmFsdWUpO1xyXG4gICAgICAgIHJldHVybiB7IHR5cGU6ICdkYXRlJywgdmFsdWUsIG1ldGFkYXRhOiB7IFxyXG4gICAgICAgICAgeWVhcjogZGF0ZS5nZXRGdWxsWWVhcigpLFxyXG4gICAgICAgICAgbW9udGg6IGRhdGUuZ2V0TW9udGgoKSArIDEsXHJcbiAgICAgICAgICBkYXk6IGRhdGUuZ2V0RGF0ZSgpLFxyXG4gICAgICAgICAgZGF5T2ZXZWVrOiBkYXRlLmdldERheSgpXHJcbiAgICAgICAgfX07XHJcblxyXG4gICAgICBjYXNlICd0aW1lZGVsdGEnOlxyXG4gICAgICAgIGRlYnVnKGDop6PmnpDml7bpl7Tlt67mlbDmja46ICR7dmFsdWV9YCk7XHJcbiAgICAgICAgY29uc3QgW2Ftb3VudCwgdW5pdF0gPSB2YWx1ZS5zcGxpdCgnICcpO1xyXG4gICAgICAgIGNvbnN0IHRpbWVEZWx0YVZhbHVlID0geyBhbW91bnQ6IE51bWJlcihhbW91bnQpLCB1bml0IH07XHJcbiAgICAgICAgaW5mbyhg5pe26Ze05beu6Kej5p6Q57uT5p6cOiAke0pTT04uc3RyaW5naWZ5KHRpbWVEZWx0YVZhbHVlKX1gKTtcclxuICAgICAgICByZXR1cm4geyB0eXBlOiAndGltZWRlbHRhJywgdmFsdWU6IHRpbWVEZWx0YVZhbHVlLCBtZXRhZGF0YToge1xyXG4gICAgICAgICAgbWlsbGlzZWNvbmRzOiB0aGlzLmNvbnZlcnRUb01pbGxpc2Vjb25kcyhOdW1iZXIoYW1vdW50KSwgdW5pdClcclxuICAgICAgICB9fTtcclxuXHJcbiAgICAgIGNhc2UgJ3VybCc6XHJcbiAgICAgICAgY29uc3QgdXJsID0gbmV3IFVSTCh2YWx1ZSk7XHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogJ3VybCcsIHZhbHVlLCBtZXRhZGF0YTogeyBcclxuICAgICAgICAgIHByb3RvY29sOiB1cmwucHJvdG9jb2wsXHJcbiAgICAgICAgICBob3N0bmFtZTogdXJsLmhvc3RuYW1lLFxyXG4gICAgICAgICAgcGF0aG5hbWU6IHVybC5wYXRobmFtZVxyXG4gICAgICAgIH19O1xyXG5cclxuICAgICAgY2FzZSAnZW1haWwnOlxyXG4gICAgICAgIGNvbnN0IFtsb2NhbFBhcnQsIGRvbWFpbl0gPSB2YWx1ZS5zcGxpdCgnQCcpO1xyXG4gICAgICAgIHJldHVybiB7IHR5cGU6ICdlbWFpbCcsIHZhbHVlLCBtZXRhZGF0YTogeyBsb2NhbFBhcnQsIGRvbWFpbiB9IH07XHJcblxyXG4gICAgICBjYXNlICdwaG9uZSc6XHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogJ3Bob25lJywgdmFsdWUsIG1ldGFkYXRhOiB7IFxyXG4gICAgICAgICAgY291bnRyeUNvZGU6IHZhbHVlLnNwbGl0KCcgJylbMF0sXHJcbiAgICAgICAgICBudW1iZXI6IHZhbHVlLnNwbGl0KCcgJykuc2xpY2UoMSkuam9pbignJylcclxuICAgICAgICB9fTtcclxuXHJcbiAgICAgIGNhc2UgJ3Byb2dyZXNzJzpcclxuICAgICAgICBjb25zdCBwcm9ncmVzcyA9IE51bWJlcih2YWx1ZSk7XHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogJ3Byb2dyZXNzJywgdmFsdWUsIG1ldGFkYXRhOiB7IFxyXG4gICAgICAgICAgcGVyY2VudGFnZTogcHJvZ3Jlc3MsXHJcbiAgICAgICAgICBpc0NvbXBsZXRlOiBwcm9ncmVzcyA9PT0gMTAwXHJcbiAgICAgICAgfX07XHJcblxyXG4gICAgICBjYXNlICdjYXRlZ29yeSc6XHJcbiAgICAgIGNhc2UgJ3RhZyc6XHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogZmllbGQudHlwZSwgdmFsdWUsIG1ldGFkYXRhOiB7fSB9O1xyXG5cclxuICAgICAgY2FzZSAnYmluYXJ5JzpcclxuICAgICAgICByZXR1cm4geyB0eXBlOiAnYmluYXJ5JywgdmFsdWUsIG1ldGFkYXRhOiB7IGxlbmd0aDogdmFsdWUubGVuZ3RoIH0gfTtcclxuXHJcbiAgICAgIGNhc2UgJ2FycmF5JzpcclxuICAgICAgICBjb25zdCBhcnJheVZhbHVlID0gdmFsdWUuc3BsaXQoJzsnKS5tYXAoKGl0ZW06IHN0cmluZykgPT4gaXRlbS50cmltKCkpO1xyXG4gICAgICAgIHJldHVybiB7IHR5cGU6ICdhcnJheScsIHZhbHVlOiBhcnJheVZhbHVlLCBtZXRhZGF0YTogeyBsZW5ndGg6IGFycmF5VmFsdWUubGVuZ3RoIH0gfTtcclxuXHJcbiAgICAgIGNhc2UgJ29iamVjdCc6XHJcbiAgICAgICAgZGVidWcoYOino+aekOWvueixoeexu+Wei+aVsOaNrjogJHt2YWx1ZX1gKTtcclxuICAgICAgICBjb25zdCBvYmplY3RWYWx1ZTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xyXG4gICAgICAgIHZhbHVlLnNwbGl0KCd8JykuZm9yRWFjaCgocGFpcjogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICBjb25zdCBba2V5LCB2YWxdID0gcGFpci5zcGxpdCgnOicpO1xyXG4gICAgICAgICAgb2JqZWN0VmFsdWVba2V5LnRyaW0oKV0gPSB2YWwudHJpbSgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGluZm8oYOWvueixoeino+aekOe7k+aenDogJHtKU09OLnN0cmluZ2lmeShvYmplY3RWYWx1ZSl9YCk7XHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogJ29iamVjdCcsIHZhbHVlOiBvYmplY3RWYWx1ZSwgbWV0YWRhdGE6IHsgXHJcbiAgICAgICAgICBrZXlzOiBPYmplY3Qua2V5cyhvYmplY3RWYWx1ZSksXHJcbiAgICAgICAgICBzaXplOiBPYmplY3Qua2V5cyhvYmplY3RWYWx1ZSkubGVuZ3RoXHJcbiAgICAgICAgfX07XHJcblxyXG4gICAgICBjYXNlICdnZW8nOlxyXG4gICAgICAgIGRlYnVnKGDop6PmnpDlnLDnkIblnZDmoIfmlbDmja46ICR7dmFsdWV9YCk7XHJcbiAgICAgICAgY29uc3QgW2xhdCwgbG5nXSA9IHZhbHVlLnNwbGl0KCd8JykubWFwKE51bWJlcik7XHJcbiAgICAgICAgY29uc3QgZ2VvVmFsdWUgPSB7IGxhdCwgbG5nIH07XHJcbiAgICAgICAgaW5mbyhg5Zyw55CG5Z2Q5qCH6Kej5p6Q57uT5p6cOiAke0pTT04uc3RyaW5naWZ5KGdlb1ZhbHVlKX1gKTtcclxuICAgICAgICByZXR1cm4geyB0eXBlOiAnZ2VvJywgdmFsdWU6IGdlb1ZhbHVlLCBtZXRhZGF0YTogeyBcclxuICAgICAgICAgIGxhdGl0dWRlOiBsYXQsXHJcbiAgICAgICAgICBsb25naXR1ZGU6IGxuZ1xyXG4gICAgICAgIH19O1xyXG5cclxuICAgICAgY2FzZSAncG9seWdvbic6XHJcbiAgICAgICAgZGVidWcoYOino+aekOWkmui+ueW9ouaVsOaNrjogJHt2YWx1ZX1gKTtcclxuICAgICAgICBjb25zdCBwb2ludHMgPSB2YWx1ZS5zcGxpdCgnfCcpLm1hcCgocG9pbnQ6IHN0cmluZykgPT4ge1xyXG4gICAgICAgICAgY29uc3QgW3gsIHldID0gcG9pbnQuc3BsaXQoJywnKS5tYXAoTnVtYmVyKTtcclxuICAgICAgICAgIHJldHVybiB7IHgsIHkgfTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBpbmZvKGDlpJrovrnlvaLop6PmnpDnu5Pmnpw6ICR7SlNPTi5zdHJpbmdpZnkocG9pbnRzKX1gKTtcclxuICAgICAgICByZXR1cm4geyB0eXBlOiAncG9seWdvbicsIHZhbHVlOiBwb2ludHMsIG1ldGFkYXRhOiB7IFxyXG4gICAgICAgICAgdmVydGljZXM6IHBvaW50cy5sZW5ndGgsXHJcbiAgICAgICAgICBwZXJpbWV0ZXI6IHRoaXMuY2FsY3VsYXRlUG9seWdvblBlcmltZXRlcihwb2ludHMpXHJcbiAgICAgICAgfX07XHJcblxyXG4gICAgICBjYXNlICd2ZWN0b3InOlxyXG4gICAgICAgIGRlYnVnKGDop6PmnpDlkJHph4/mlbDmja46ICR7dmFsdWV9YCk7XHJcbiAgICAgICAgY29uc3QgY29tcG9uZW50cyA9IHZhbHVlLnNwbGl0KCcsJykubWFwKE51bWJlcik7XHJcbiAgICAgICAgaW5mbyhg5ZCR6YeP6Kej5p6Q57uT5p6cOiAke0pTT04uc3RyaW5naWZ5KGNvbXBvbmVudHMpfWApO1xyXG4gICAgICAgIHJldHVybiB7IHR5cGU6ICd2ZWN0b3InLCB2YWx1ZTogY29tcG9uZW50cywgbWV0YWRhdGE6IHsgXHJcbiAgICAgICAgICBkaW1lbnNpb25zOiBjb21wb25lbnRzLmxlbmd0aCxcclxuICAgICAgICAgIG1hZ25pdHVkZTogTWF0aC5zcXJ0KGNvbXBvbmVudHMucmVkdWNlKChzdW06IG51bWJlciwgY29tcDogbnVtYmVyKSA9PiBzdW0gKyBjb21wICogY29tcCwgMCkpXHJcbiAgICAgICAgfX07XHJcblxyXG4gICAgICBjYXNlICdtYXRyaXgnOlxyXG4gICAgICAgIGRlYnVnKGDop6PmnpDnn6npmLXmlbDmja46ICR7dmFsdWV9YCk7XHJcbiAgICAgICAgY29uc3Qgcm93cyA9IHZhbHVlLnNwbGl0KCd8JykubWFwKChyb3c6IHN0cmluZykgPT4gcm93LnNwbGl0KCcsJykubWFwKE51bWJlcikpO1xyXG4gICAgICAgIGluZm8oYOefqemYteino+aekOe7k+aenDogJHtKU09OLnN0cmluZ2lmeShyb3dzKX1gKTtcclxuICAgICAgICByZXR1cm4geyB0eXBlOiAnbWF0cml4JywgdmFsdWU6IHJvd3MsIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgICByb3dzOiByb3dzLmxlbmd0aCxcclxuICAgICAgICAgIGNvbHVtbnM6IHJvd3NbMF0ubGVuZ3RoLFxyXG4gICAgICAgICAgaXNTcXVhcmU6IHJvd3MubGVuZ3RoID09PSByb3dzWzBdLmxlbmd0aFxyXG4gICAgICAgIH19O1xyXG5cclxuICAgICAgY2FzZSAnY29tcGxleCc6XHJcbiAgICAgICAgZGVidWcoYOino+aekOWkjeaVsOaVsOaNrjogJHt2YWx1ZX1gKTtcclxuICAgICAgICBjb25zdCBbcmVhbCwgaW1hZ10gPSB2YWx1ZS5zcGxpdCgnLCcpLm1hcChOdW1iZXIpO1xyXG4gICAgICAgIGNvbnN0IGNvbXBsZXhWYWx1ZSA9IHsgcmVhbCwgaW1hZyB9O1xyXG4gICAgICAgIGluZm8oYOWkjeaVsOino+aekOe7k+aenDogJHtKU09OLnN0cmluZ2lmeShjb21wbGV4VmFsdWUpfWApO1xyXG4gICAgICAgIHJldHVybiB7IHR5cGU6ICdjb21wbGV4JywgdmFsdWU6IGNvbXBsZXhWYWx1ZSwgbWV0YWRhdGE6IHtcclxuICAgICAgICAgIG1hZ25pdHVkZTogTWF0aC5zcXJ0KHJlYWwgKiByZWFsICsgaW1hZyAqIGltYWcpLFxyXG4gICAgICAgICAgYW5nbGU6IE1hdGguYXRhbjIoaW1hZywgcmVhbClcclxuICAgICAgICB9fTtcclxuXHJcbiAgICAgIGNhc2UgJ2F1ZGlvX3NpZ25hbCc6XHJcbiAgICAgICAgZGVidWcoYOino+aekOmfs+mikeS/oeWPt+aVsOaNrjogJHt2YWx1ZX1gKTtcclxuICAgICAgICBjb25zdCBbYW1wbGl0dWRlLCBmcmVxdWVuY3ksIGR1cmF0aW9uXSA9IHZhbHVlLnNwbGl0KCcsJykubWFwKE51bWJlcik7XHJcbiAgICAgICAgY29uc3QgYXVkaW9TaWduYWxWYWx1ZSA9IHsgYW1wbGl0dWRlLCBmcmVxdWVuY3ksIGR1cmF0aW9uIH07XHJcbiAgICAgICAgaW5mbyhg6Z+z6aKR5L+h5Y+36Kej5p6Q57uT5p6cOiAke0pTT04uc3RyaW5naWZ5KGF1ZGlvU2lnbmFsVmFsdWUpfWApO1xyXG4gICAgICAgIHJldHVybiB7IHR5cGU6ICdhdWRpb19zaWduYWwnLCB2YWx1ZTogYXVkaW9TaWduYWxWYWx1ZSwgbWV0YWRhdGE6IHtcclxuICAgICAgICAgIG1heEFtcGxpdHVkZTogYW1wbGl0dWRlLFxyXG4gICAgICAgICAgcGVyaW9kOiAxIC8gZnJlcXVlbmN5LFxyXG4gICAgICAgICAgd2F2ZWxlbmd0aDogMzQzIC8gZnJlcXVlbmN5IC8vIOiuvuWjsOmAn+S4ujM0M20vc1xyXG4gICAgICAgIH19O1xyXG5cclxuICAgICAgY2FzZSAnZnJlcXVlbmN5X3Jlc3BvbnNlJzpcclxuICAgICAgICBkZWJ1Zyhg6Kej5p6Q6aKR546H5ZON5bqU5pWw5o2uOiAke3ZhbHVlfWApO1xyXG4gICAgICAgIGNvbnN0IGZyZXF1ZW5jeVJlc3BvbnNlUG9pbnRzOiBBcnJheTx7IGZyZXF1ZW5jeTogbnVtYmVyOyBtYWduaXR1ZGU6IG51bWJlciB9PiA9IHZhbHVlLnNwbGl0KCd8JykubWFwKChwb2ludDogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICBjb25zdCBbZnJlcSwgbWFnbml0dWRlXSA9IHBvaW50LnNwbGl0KCcsJykubWFwKE51bWJlcik7XHJcbiAgICAgICAgICByZXR1cm4geyBmcmVxdWVuY3k6IGZyZXEsIG1hZ25pdHVkZSB9O1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGluZm8oYOmikeeOh+WTjeW6lOino+aekOe7k+aenDogJHtKU09OLnN0cmluZ2lmeShmcmVxdWVuY3lSZXNwb25zZVBvaW50cyl9YCk7XHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogJ2ZyZXF1ZW5jeV9yZXNwb25zZScsIHZhbHVlOiBmcmVxdWVuY3lSZXNwb25zZVBvaW50cywgbWV0YWRhdGE6IHtcclxuICAgICAgICAgIHBvaW50Q291bnQ6IGZyZXF1ZW5jeVJlc3BvbnNlUG9pbnRzLmxlbmd0aCxcclxuICAgICAgICAgIG1pbkZyZXF1ZW5jeTogTWF0aC5taW4oLi4uZnJlcXVlbmN5UmVzcG9uc2VQb2ludHMubWFwKHAgPT4gcC5mcmVxdWVuY3kpKSxcclxuICAgICAgICAgIG1heEZyZXF1ZW5jeTogTWF0aC5tYXgoLi4uZnJlcXVlbmN5UmVzcG9uc2VQb2ludHMubWFwKHAgPT4gcC5mcmVxdWVuY3kpKSxcclxuICAgICAgICAgIG1pbk1hZ25pdHVkZTogTWF0aC5taW4oLi4uZnJlcXVlbmN5UmVzcG9uc2VQb2ludHMubWFwKHAgPT4gcC5tYWduaXR1ZGUpKSxcclxuICAgICAgICAgIG1heE1hZ25pdHVkZTogTWF0aC5tYXgoLi4uZnJlcXVlbmN5UmVzcG9uc2VQb2ludHMubWFwKHAgPT4gcC5tYWduaXR1ZGUpKVxyXG4gICAgICAgIH19O1xyXG5cclxuICAgICAgY2FzZSAnc291bmRfcHJlc3N1cmVfbGV2ZWwnOlxyXG4gICAgICAgIGRlYnVnKGDop6PmnpDlo7DljovnuqfmlbDmja46ICR7dmFsdWV9YCk7XHJcbiAgICAgICAgY29uc3Qgc3BsID0gTnVtYmVyKHZhbHVlKTtcclxuICAgICAgICBpbmZvKGDlo7Dljovnuqfop6PmnpDnu5Pmnpw6ICR7c3BsfWApO1xyXG4gICAgICAgIHJldHVybiB7IHR5cGU6ICdzb3VuZF9wcmVzc3VyZV9sZXZlbCcsIHZhbHVlOiBzcGwsIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgICBpbnRlbnNpdHk6IE1hdGgucG93KDEwLCBzcGwgLyAxMCkgKiAxZS0xMiwgLy8gVy9tXjJcclxuICAgICAgICAgIHByZXNzdXJlOiBNYXRoLnBvdygxMCwgc3BsIC8gMjApICogMmUtNSAvLyBQYVxyXG4gICAgICAgIH19O1xyXG5cclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICByZXR1cm4geyB0eXBlOiBmaWVsZC50eXBlLCB2YWx1ZSwgbWV0YWRhdGEgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgY2FsY3VsYXRlUG9seWdvblBlcmltZXRlcihwb2ludHM6IHsgeDogbnVtYmVyLCB5OiBudW1iZXIgfVtdKTogbnVtYmVyIHtcclxuICAgIGxldCBwZXJpbWV0ZXIgPSAwO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwb2ludHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgaiA9IChpICsgMSkgJSBwb2ludHMubGVuZ3RoO1xyXG4gICAgICBjb25zdCBkeCA9IHBvaW50c1tpXS54IC0gcG9pbnRzW2pdLng7XHJcbiAgICAgIGNvbnN0IGR5ID0gcG9pbnRzW2ldLnkgLSBwb2ludHNbal0ueTtcclxuICAgICAgcGVyaW1ldGVyICs9IE1hdGguc3FydChkeCAqIGR4ICsgZHkgKiBkeSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcGVyaW1ldGVyO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBpc1BvaW50SW5Qb2x5Z29uKHBvaW50OiB7IHg6IG51bWJlciwgeTogbnVtYmVyIH0sIHBvbHlnb246IHsgeDogbnVtYmVyLCB5OiBudW1iZXIgfVtdKTogYm9vbGVhbiB7XHJcbiAgICAvLyDlrp7njrDngrnmmK/lkKblnKjlpJrovrnlvaLlhoXnmoTmo4Dmn6XpgLvovpFcclxuICAgIC8vIOi/memHjOS9v+eUqOWwhOe6v+azleadpeWIpOaWreeCueaYr+WQpuWkmui+ueW9ouWGhVxyXG4gICAgbGV0IGluc2lkZSA9IGZhbHNlO1xyXG4gICAgZm9yIChsZXQgaSA9IDAsIGogPSBwb2x5Z29uLmxlbmd0aCAtIDE7IGkgPCBwb2x5Z29uLmxlbmd0aDsgaiA9IGkrKykge1xyXG4gICAgICBjb25zdCB4aSA9IHBvbHlnb25baV0ueCwgeWkgPSBwb2x5Z29uW2ldLnk7XHJcbiAgICAgIGNvbnN0IHhqID0gcG9seWdvbltqXS54LCB5aiA9IHBvbHlnb25bal0ueTtcclxuICAgICAgY29uc3QgaW50ZXJzZWN0ID0gKCh5aSA+IHBvaW50LnkpICE9PSAoeWogPiBwb2ludC55KSlcclxuICAgICAgICAgICYmIChwb2ludC54IDwgKHhqIC0geGkpICogKHBvaW50LnkgLSB5aSkgLyAoeWogLSB5aSkgKyB4aSk7XHJcbiAgICAgIGlmIChpbnRlcnNlY3QpIGluc2lkZSA9ICFpbnNpZGU7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gaW5zaWRlO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhcmVWZWN0b3JzRXF1YWwodjE6IG51bWJlcltdLCB2MjogbnVtYmVyW10sIGVwc2lsb246IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgaWYgKHYxLmxlbmd0aCAhPT0gdjIubGVuZ3RoKSByZXR1cm4gZmFsc2U7XHJcbiAgICByZXR1cm4gdjEuZXZlcnkoKHZhbHVlLCBpbmRleCkgPT4gTWF0aC5hYnModmFsdWUgLSB2MltpbmRleF0pIDw9IGVwc2lsb24pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhcmVNYXRyaWNlc0VxdWFsKG0xOiBudW1iZXJbXVtdLCBtMjogbnVtYmVyW11bXSwgZXBzaWxvbjogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgICBpZiAobTEubGVuZ3RoICE9PSBtMi5sZW5ndGggfHwgbTFbMF0ubGVuZ3RoICE9PSBtMlswXS5sZW5ndGgpIHJldHVybiBmYWxzZTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbTEubGVuZ3RoOyBpKyspIHtcclxuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBtMVswXS5sZW5ndGg7IGorKykge1xyXG4gICAgICAgIGlmIChNYXRoLmFicyhtMVtpXVtqXSAtIG0yW2ldW2pdKSA+IGVwc2lsb24pIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNvbnZlcnRUb01pbGxpc2Vjb25kcyhhbW91bnQ6IG51bWJlciwgdW5pdDogc3RyaW5nKTogbnVtYmVyIHtcclxuICAgIGNvbnN0IGNvbnZlcnNpb25zOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0ge1xyXG4gICAgICAnbXMnOiAxLFxyXG4gICAgICAncyc6IDEwMDAsXHJcbiAgICAgICdtJzogNjAwMDAsXHJcbiAgICAgICdoJzogMzYwMDAwMCxcclxuICAgICAgJ2QnOiA4NjQwMDAwMFxyXG4gICAgfTtcclxuICAgIHJldHVybiBhbW91bnQgKiAoY29udmVyc2lvbnNbdW5pdF0gfHwgMCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGlzUmVhY3Rpb25CYWxhbmNlZChyZWFjdGFudHM6IHN0cmluZ1tdLCBwcm9kdWN0czogc3RyaW5nW10pOiBib29sZWFuIHtcclxuICAgIC8vIOi/memHjOW6lOivpeWunueOsOS4gOS4quajgOafpeWMluWtpuWPjeW6lOaYr+WQpuW5s+ihoeeahOmAu+i+kVxyXG4gICAgLy8g55Sx5LqO6L+Z6ZyA6KaB5aSN5p2C55qE5YyW5a2m6K6h566X77yM6L+Z6YeM5Y+q5piv5LiA5Liq566A5Y2V55qE5Y2g5L2N5a6e546wXHJcbiAgICByZXR1cm4gcmVhY3RhbnRzLmxlbmd0aCA9PT0gcHJvZHVjdHMubGVuZ3RoO1xyXG4gIH1cclxufVxyXG5cclxuY2xhc3MgRGF0YWJhc2VQbHVnaW5TZXR0aW5nVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XHJcbiAgcGx1Z2luOiBEYXRhYmFzZVBsdWdpbjtcclxuXHJcbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogRGF0YWJhc2VQbHVnaW4pIHtcclxuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcclxuICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG4gIH1cclxuXHJcbiAgZGlzcGxheSgpOiB2b2lkIHtcclxuICAgIGxldCB7Y29udGFpbmVyRWx9ID0gdGhpcztcclxuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XHJcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDInLCB7dGV4dDogJ+aVsOaNruW6k+aPkuS7tuiuvue9rid9KTtcclxuXHJcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgLnNldE5hbWUoJ+m7mOiupOaOkuW6j+aWueWQkScpXHJcbiAgICAgIC5zZXREZXNjKCforr7nva7ooajmoLznmoTpu5jorqTmjpLluo/mlrnlkJEnKVxyXG4gICAgICAuYWRkRHJvcGRvd24oZHJvcGRvd24gPT4gZHJvcGRvd25cclxuICAgICAgICAuYWRkT3B0aW9uKCdhc2MnLCAn5Y2H5bqPJylcclxuICAgICAgICAuYWRkT3B0aW9uKCdkZXNjJywgJ+mZjeW6jycpXHJcbiAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRTb3J0RGlyZWN0aW9uKVxyXG4gICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRTb3J0RGlyZWN0aW9uID0gdmFsdWUgYXMgJ2FzYycgfCAnZGVzYyc7XHJcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICB9KSk7XHJcbiAgfVxyXG59XHJcbiJdLCJuYW1lcyI6WyJ0aGlzIiwiZ2xvYmFsIiwiSXRlbVZpZXciLCJCdXR0b25Db21wb25lbnQiLCJUZXh0Q29tcG9uZW50IiwiTm90aWNlIiwic2F2ZUFzIiwiTWFya2Rvd25WaWV3IiwiTW9kYWwiLCJTZXR0aW5nIiwiRnV6enlTdWdnZXN0TW9kYWwiLCJQbHVnaW4iLCJURmlsZSIsIlBsdWdpblNldHRpbmdUYWIiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBb0dBO0FBQ08sU0FBUyxTQUFTLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFO0FBQzdELElBQUksU0FBUyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsT0FBTyxLQUFLLFlBQVksQ0FBQyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxVQUFVLE9BQU8sRUFBRSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO0FBQ2hILElBQUksT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsT0FBTyxDQUFDLEVBQUUsVUFBVSxPQUFPLEVBQUUsTUFBTSxFQUFFO0FBQy9ELFFBQVEsU0FBUyxTQUFTLENBQUMsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtBQUNuRyxRQUFRLFNBQVMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUks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LENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsb0RBQW9ELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsNEVBQTRFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLHlCQUF5QixFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxPQUFPLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU9DLGNBQU0sRUFBRUEsY0FBTSxDQUFDLE1BQU0sR0FBR0EsY0FBTSxDQUFDQSxjQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxRQUFRLEVBQUUsT0FBTyxNQUFNLEVBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxVQUFVLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsMEJBQTBCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxXQUFXLEVBQUUsT0FBTyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFD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
