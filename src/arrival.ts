import * as vscode from 'vscode';
import { TracableSymbol } from './tracableSymbol';
import { debugLog } from './debug';
import { productIconPath } from './util';
import assert from 'assert';


export class Arrival implements ArrivalIterface {
    public symbol: TracableSymbol;
    public word: string;
    public children: Arrival[] = [];
    public parent: Arrival | undefined | null = null;
    public isPinned: boolean = false;
    private _encoreCount: number;

    // for UI, the priority is delimiterString > isFoldPlaceholder, if option of higher priority is set, lower priority one is ignored
    public delimiterString: string = '';
    private _isSectionDelimiter: boolean = false;
    public isFoldPlaceholder: boolean = false;

    constructor(
        symbol: TracableSymbol,
        word: string,
    ) {
        this.symbol = symbol;
        this.word = word;
        this._encoreCount = 0;
    }

    static createDelimiter(delimiterString: string, isSectionDelimiter: boolean = false): Arrival {
        assert(delimiterString, 'delimiterString is required to be a non-empty string');
        const delimiter = new Arrival(TracableSymbol.empty(), '');
        delimiter.delimiterString = delimiterString;
        delimiter._isSectionDelimiter = isSectionDelimiter;
        return delimiter;
    }
    
    static createFoldPlaceholder(): Arrival {
        const placeholder = new Arrival(TracableSymbol.empty(), '');
        placeholder.isFoldPlaceholder = true;
        return placeholder;
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

    static createFrom(arrivalInfo: ArrivalIterface): Arrival {
        const arrival = new Arrival(arrivalInfo.symbol, arrivalInfo.word);

        const children = (arrivalInfo.children || []).map(child => Arrival.createFrom(child));
        children.forEach(child => { child.parent = arrival; });
        arrival.children = children;

        return arrival;
    }

    isOnSameSymbolOf(other: ArrivalIterface): boolean {
        return this.symbol.isEqual(other.symbol);
    }

    setParent(parent: Arrival): Arrival {
        this.parent = parent;
        if (!parent.children.find(child => child.isOnSameSymbolOf(this))) {
            parent.addChild(this);
        }

        return this;
    }

    addChild(child: Arrival): Arrival {
        if (this.children.find(child => child.isOnSameSymbolOf(this))) {
            return this;
        }

        this.children.push(child);
        child.parent = this;

        return this;
    }

    removeChild(child: Arrival) {
        this.children = this.children.filter(c => c.symbol.tracingUri.toString() !== child.symbol.tracingUri.toString());
        child.parent = undefined;
    }

    public treeItemAdapter(): vscode.TreeItem {
        debugLog(`${this.symbol.name}.collapseState = ${this.collapsibleState}`, false);

        if (this.delimiterString) {
            const treeItem = new vscode.TreeItem('', vscode.TreeItemCollapsibleState.None);
            treeItem.description = this.delimiterString;
            if (this._isSectionDelimiter) {
                treeItem.iconPath = new vscode.ThemeIcon('kebab-horizontal');
            }
            return treeItem;
        }
        
        if (this.isFoldPlaceholder) {
            const treeItem = new vscode.TreeItem('... history folded', vscode.TreeItemCollapsibleState.None);
            treeItem.iconPath = new vscode.ThemeIcon('history');
            treeItem.command = {
                command: 'navigationHistory.unfold',
                title: 'unfold'
            };
            return treeItem;
        }

        const symbolDisplayName = (this.symbol.kind === vscode.SymbolKind.Method) ? `.${this.symbol.name}` : this.symbol.name;
        let treeItem = new vscode.TreeItem(symbolDisplayName, this.collapsibleState);

        const uriFsPath = this.symbol.uri.fsPath;
        const filename = uriFsPath.split('/').pop();
        const range = this.symbol.range;
        // Position.line is 0-indexed in vscode, so we need to add 1 to make it 1-indexed, so is Position.character
        const lineNum = range.start.line + 1;
        const columnNum = range.start.character + 1;

        treeItem.contextValue = `arrival${!this.parent ? 'Root' : ''}${this.isPinned ? 'Pinned' : ''}`;
        treeItem.iconPath = productIconPath(this.symbol.kind);
        treeItem.description = `${filename} ${lineNum}:${columnNum}`;
        treeItem.tooltip = uriFsPath;
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

export interface ArrivalIterface {
    symbol: TracableSymbol;
    word: string;
    children?: ArrivalIterface[];
}

