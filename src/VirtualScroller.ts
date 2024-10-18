interface VirtualScrollerOptions {
  container: HTMLElement;
  rowHeight: number;
  totalRows: number;
  renderRow: (index: number) => HTMLElement;
  overscan?: number;
  onVisibleRangeChange?: (startIndex: number, endIndex: number) => void;
}

export class VirtualScroller {
  private container: HTMLElement;
  private rowHeight: number;
  private totalRows: number;
  private renderRow: (index: number) => HTMLElement;
  private overscan: number;
  private visibleRows: Map<number, HTMLElement> = new Map();
  private scrollContainer!: HTMLDivElement;
  private contentContainer!: HTMLDivElement;
  private resizeObserver: ResizeObserver;
  private rafId: number | null = null;
  private rowHeights: Map<number, number> = new Map();
  private containerResizeObserver: ResizeObserver;
  private onVisibleRangeChange: ((startIndex: number, endIndex: number) => void) | undefined;
  private rowCache: Map<number, HTMLElement> = new Map();

  constructor(options: VirtualScrollerOptions) {
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

  private initializeDOM() {
    this.scrollContainer = this.container.createEl('div', { cls: 'virtual-scroll-container' });
    this.scrollContainer.style.height = '100%';
    this.scrollContainer.style.overflowY = 'auto';

    this.contentContainer = this.scrollContainer.createEl('div', { cls: 'virtual-scroll-content' });
    this.contentContainer.style.height = `${this.totalRows * this.rowHeight}px`;
    this.contentContainer.style.position = 'relative';
  }

  private attachEventListeners() {
    this.scrollContainer.addEventListener('scroll', () => {
      if (this.rafId === null) {
        this.rafId = requestAnimationFrame(this.onScroll.bind(this));
      }
    });
  }

  private onScroll() {
    this.rafId = null;
    this.render();
  }

  private onResize(entries: ResizeObserverEntry[]) {
    for (let entry of entries) {
      if (entry.target === this.scrollContainer) {
        this.render();
        break;
      }
    }
  }

  private onContainerResize(entries: ResizeObserverEntry[]) {
    for (let entry of entries) {
      if (entry.target === this.container) {
        this.updateScrollContainerSize();
        this.render();
        break;
      }
    }
  }

  private updateScrollContainerSize() {
    this.scrollContainer.style.width = `${this.container.clientWidth}px`;
    this.scrollContainer.style.height = `${this.container.clientHeight}px`;
  }

  private getRowTop(index: number): number {
    let top = 0;
    for (let i = 0; i < index; i++) {
      top += this.rowHeights.get(i) || this.rowHeight;
    }
    return top;
  }

  private setRowHeight(index: number, height: number) {
    this.rowHeights.set(index, height);
    this.updateContentHeight();
  }

  private updateContentHeight() {
    let totalHeight = 0;
    for (let i = 0; i < this.totalRows; i++) {
      totalHeight += this.rowHeights.get(i) || this.rowHeight;
    }
    this.contentContainer.style.height = `${totalHeight}px`;
  }

  private render() {
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

    const visibleIndexes = new Set<number>();

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

  public setTotalRows(totalRows: number) {
    this.totalRows = totalRows;
    this.contentContainer.style.height = `${this.totalRows * this.rowHeight}px`;
  }

  public refresh() {
    this.visibleRows.clear();
    this.contentContainer.innerHTML = '';
    this.render();
  }

  public destroy() {
    this.resizeObserver.disconnect();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    this.scrollContainer.removeEventListener('scroll', this.onScroll);
    this.containerResizeObserver.disconnect();
  }

  public invalidateRow(index: number) {
    this.rowCache.delete(index);
    const rowElement = this.visibleRows.get(index);
    if (rowElement) {
      rowElement.remove();
      this.visibleRows.delete(index);
    }
  }
}
