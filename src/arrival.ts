import * as vscode from 'vscode';
import * as path from 'path';
import { TracableSymbol } from './tracableSymbol';
import { debugLog } from './debug';
import { productIconPath } from './util';

export interface TreeItemInterface {
    toTreeItem: () => vscode.TreeItem;
}

export interface ArrivalObjectInterface {
    symbol: TracableSymbol;
    word: string;
    children?: ArrivalObjectInterface[];
}

export class Delimiter implements TreeItemInterface {
    constructor(public readonly representation: string) { }

    toTreeItem(): vscode.TreeItem {
        const treeItem = new vscode.TreeItem('', vscode.TreeItemCollapsibleState.None);
        treeItem.description = this.representation;
        treeItem.contextValue = 'delimiter';
        return treeItem;
    }
}

export type SortOrder = 'ascending' | 'descending';
export type SortField = 'time' | 'encore';
export type SectionDelimiterReprOptions = {
    sortOrder: SortOrder;
    sortField: SortField;
    hideHistory: boolean;
    unpinHideThreshold: number;
}

export class SectionDelimiter implements TreeItemInterface {
    public representation: string;

    constructor(
        pinnedCount: number,
        unpinnedCount: number,
        reprOptions: SectionDelimiterReprOptions
    ) {
        const orderIcon = reprOptions.sortOrder === 'ascending' ? '↑' : '↓';
        const hideHistoryStatus = reprOptions.hideHistory ? `${reprOptions.unpinHideThreshold}` : 'all';
        const delimiterInfo: string[] = [
            ...(pinnedCount > 0 ? [`↑ ${pinnedCount} pinned`] : []),
            `↓ ${unpinnedCount} unpinned`,
            `sorted by (${reprOptions.sortField})`,
            `order (${orderIcon})`,
            `show (${hideHistoryStatus})`,
        ];

        this.representation = delimiterInfo.join(' | ');
    }

    toTreeItem(): vscode.TreeItem {
        const treeItem = new vscode.TreeItem('', vscode.TreeItemCollapsibleState.None);
        treeItem.description = this.representation;
        treeItem.iconPath = new vscode.ThemeIcon('kebab-horizontal');
        treeItem.contextValue = 'sectionDelimiter';
        return treeItem;
    }
}

export class HistoryPlaceholder implements TreeItemInterface {
    constructor() { }

    toTreeItem(): vscode.TreeItem {
        const treeItem = new vscode.TreeItem('... history hidden', vscode.TreeItemCollapsibleState.None);
        treeItem.iconPath = new vscode.ThemeIcon('history');
        treeItem.command = {
            command: 'navigationHistory.showHistory',
            title: 'Show History'
        };
        treeItem.contextValue = 'historyPlaceholder';
        return treeItem;
    }
}

export interface ArrivalReprOptions {
    showFilename: boolean;
    showPosition: boolean;
}

export class Arrival implements ArrivalObjectInterface, TreeItemInterface {
    public symbol: TracableSymbol;
    public word: string;
    public children: Arrival[] = [];
    public parent: Arrival | undefined | null = null;
    public isPinned: boolean = false;
    private _encoreCount: number;
    public representationOptions: ArrivalReprOptions;

    /**
     * 
     * @param symbol which symbol does this arrival represent
     * @param word the word under current cursor of this arrival
     * @param isDelimiter whether this arrival is a delimiter
     */
    constructor(
        symbol: TracableSymbol,
        word: string,
        representationOptions: ArrivalReprOptions = {
            showFilename: true,
            showPosition: true,
        }
    ) {
        this.symbol = symbol;
        this.word = word;
        this._encoreCount = 0;
        this.representationOptions = representationOptions;
    }

    get root(): Arrival {
        let root: Arrival = this;
        while (root.parent) {
            root = root.parent;
        }
        return root;
    }

    /**
     * The encore count of the arrival itself.
     */
    get selfEncoreCount() {
        return this._encoreCount;
    }

    /**
     * The total encore count of the arrival and all its children.
     */
    get treeEncoreCount() {
        return this.selfEncoreCount + this.children.reduce((acc, child): number => acc + child.treeEncoreCount, 0);
    }

    /**
     * Increment the encore count of the arrival itself.
     */
    encore() {
        ++this._encoreCount;
    }

    get collapsibleState(): vscode.TreeItemCollapsibleState {
        return this.children?.length > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None;
    }

    static createFrom(arrivalInfo: ArrivalObjectInterface): Arrival {
        const arrival = new Arrival(arrivalInfo.symbol, arrivalInfo.word);

        const children = (arrivalInfo.children || []).map(child => Arrival.createFrom(child));
        children.forEach(child => { child.parent = arrival; });
        arrival.children = children;

        return arrival;
    }

    isOnSameSymbolOf(other: ArrivalObjectInterface): boolean {
        return this.symbol.isEqual(other.symbol);
    }

    addChild(child: Arrival): Arrival {
        if (this.children.find(existingChild => existingChild.isOnSameSymbolOf(child))) {
            return this;
        }

        this.children.push(child);
        child.parent = this;

        return this;
    }

    removeChild(child: Arrival) {
        this.children = this.children.filter(c => c !== child);
        child.parent = undefined;
    }

    public toTreeItem(): vscode.TreeItem {
        debugLog(`${this.symbol.name}.collapseState = ${this.collapsibleState}`, false);

        const symbolDisplayName = (this.symbol.kind === vscode.SymbolKind.Method) ? `.${this.symbol.name}` : this.symbol.name;
        let treeItem = new vscode.TreeItem(symbolDisplayName, this.collapsibleState);

        const relativeFilePath: string = vscode.workspace.asRelativePath(this.symbol.uri, false);
        const filenameInDescription = this.representationOptions.showFilename ? path.basename(this.symbol.uri.fsPath) : '';
        const range = this.symbol.range;
        const lineNumInDescription = range.start.line + 1;
        const columnNumInDescription = range.start.character + 1;
        const positionInDescription = this.representationOptions.showPosition ? ` ${lineNumInDescription}:${columnNumInDescription}` : '';

        // there are 3 kinds of arrival as for contextValue, extension will use different contextValue to determine the UI behavior
        // arrival: the normal arrival, this includes all the arrival
        // arrivalRoot: the root arrival, this is the root of the arrival tree
        // arrivalRootPinned: the root arrival and it is pinned
        treeItem.contextValue = `arrival${!this.parent ? 'Root' : ''}${this.isPinned ? 'Pinned' : ''}`;
        treeItem.iconPath = productIconPath(this.symbol.kind);
        treeItem.description = `${filenameInDescription}${positionInDescription}`;
        treeItem.tooltip = relativeFilePath;
        treeItem.resourceUri = this.symbol.tracingUri;
        treeItem.command = {
            command: 'vscode.open',
            arguments: [
                this.symbol.uri,
                {
                    selection: new vscode.Range(range.start, range.start),
                    preview: true
                }],
            title: 'Open File'
        };

        return treeItem;
    }
}

