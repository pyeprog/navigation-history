import * as vscode from 'vscode';
import { TracableSymbol } from './tracableSymbol';
import { debugLog } from './debug';


export class Arrival implements NavigationIterface {
    constructor(
        public symbol: TracableSymbol,
        public word: string,
        public children: Arrival[] = [],
        public parent: Arrival | undefined | null = null,
    ) { }
        
    get collapsibleState(): vscode.TreeItemCollapsibleState {
        return this.children?.length > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None;
    }

    static createFrom(navigationInfo: NavigationIterface): Arrival {
        let navigationItem = new Arrival(
            navigationInfo.symbol,
            navigationInfo.word,
            navigationInfo.children?.map(child => Arrival.createFrom(child)));

        navigationItem.children.forEach(child => {
            child.parent = navigationItem;
        });

        return navigationItem;
    }

    isOnSameSymbolOf(other: NavigationIterface): boolean {
        return this.symbol.isEqual(other.symbol);
    }

    public treeItemAdapter(): vscode.TreeItem {
        debugLog(`${this.symbol.name}.collapseState = ${this.collapsibleState}`, false);

        const symbolDisplayName = (this.symbol.kind === vscode.SymbolKind.Method) ? `.${this.symbol.name}` : this.symbol.name;
        let treeItem = new vscode.TreeItem(symbolDisplayName, this.collapsibleState);

        switch (this.symbol.kind) {
            case vscode.SymbolKind.Class:
                treeItem.iconPath = new vscode.ThemeIcon('symbol-class');
                break;

            case vscode.SymbolKind.Variable:
                treeItem.iconPath = new vscode.ThemeIcon('symbol-variable');
                break;

            case vscode.SymbolKind.Function:
            case vscode.SymbolKind.Method:
                treeItem.iconPath = new vscode.ThemeIcon('symbol-function');
                break;

            default:
                treeItem.iconPath = new vscode.ThemeIcon('symbol-object');
                break;
        }

        const uriFsPath = this.symbol.uri.fsPath;
        const filename = uriFsPath.split('/').pop();
        const range = this.symbol.range;
        // Position.line is 0-indexed in vscode, so we need to add 1 to make it 1-indexed, so is Position.character
        const lineNum = range.start.line + 1;
        const columnNum = range.start.character + 1;

        treeItem.description = `${filename} ${lineNum}:${columnNum}`;
        treeItem.tooltip = uriFsPath;
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

export interface NavigationIterface {
    symbol: TracableSymbol;
    word: string;
    children?: NavigationIterface[];
}

