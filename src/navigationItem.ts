import * as vscode from 'vscode';
import { TracableSymbol } from './tracableSymbol';


export class NavigationItem implements NavigationIterface {
    constructor(
        public symbol: TracableSymbol,
        public word: string,
        public uri: vscode.Uri,
        public range: vscode.Range,
        public type: vscode.SymbolKind,
        public children: NavigationItem[] = [],
        public parent: NavigationItem | undefined | null = null,
    ) { }

    static createFrom(navigationInfo: NavigationIterface): NavigationItem {
        let navigationItem = new NavigationItem(
            TracableSymbol.createFrom(navigationInfo.symbol),
            navigationInfo.word,
            navigationInfo.uri,
            navigationInfo.range,
            navigationInfo.type,
            navigationInfo.children?.map(child => NavigationItem.createFrom(child)));

        navigationItem.children.forEach(child => {
            child.parent = navigationItem;
        });

        return navigationItem;
    }

    isEqual(other: NavigationIterface): boolean {
        return this.symbol.name === other.symbol.name
            && this.uri.fsPath === other.uri.fsPath
            && this.range.isEqual(other.range)
            && this.type === other.type;
    }

    public treeItemAdapter(): vscode.TreeItem {
        const collpaseState = (this.children && this.children.length > 0) ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;

        let treeItem = new vscode.TreeItem(this.symbol.name, collpaseState);

        switch (this.type) {
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

        const filename = this.uri.fsPath.split('/').pop();
        // Position.line is 0-indexed in vscode, so we need to add 1 to make it 1-indexed, so is Position.character
        const lineNum = this.range.start.line + 1;
        const columnNum = this.range.start.character + 1;

        treeItem.description = `${filename} ${lineNum}:${columnNum}`;
        treeItem.tooltip = this.uri.fsPath;
        treeItem.command = {
            command: 'vscode.executeCommand',
            arguments: ['vscode.open',
                this.uri,
                {
                    selection: new vscode.Range(this.range.start, this.range.start),
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
    uri: vscode.Uri;
    range: vscode.Range;
    type: vscode.SymbolKind;
    children?: NavigationIterface[];
}

